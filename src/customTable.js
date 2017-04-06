(function () {
    var long2know;
    try {
        long2know = angular.module("long2know")
    } catch (err) {
        long2know = null;
    }

    if (!long2know) {
        angular.module('long2know.services', ['ngResource', 'ngAnimate']);
        angular.module('long2know.controllers', []);
        angular.module('long2know.directives', []);
        angular.module('long2know.constants', []);
        angular.module('long2know',
            [
                'long2know.services',
                'long2know.controllers',
                'long2know.directives',
                'long2know.constants'
            ]);
    }

    String.prototype.toDate = function(dateFormat) {
        var dateStr = formattedStr = this;
        if (dateFormat) {
            var delimiter = dateFormat.match(/\W/g)[0];
            var arr = dateFormat.split(delimiter);
            var replaceStr = '$' + (arr.indexOf('YYYY') + 1) + '-$' + (arr.indexOf('MM')+1) + '-$' + (arr.indexOf('dd')+1);
            formattedStr = dateStr.replace(/(\d+)-(\d+)-(\d+)/, replaceStr);
            console.log(replaceStr + ' ' + formattedStr);
        }
        if (formattedStr.indexOf(':') === -1)
            formattedStr += ' 00:00';	
        var date = new Date(formattedStr);
        if (date.getTime() === date.getTime())
            return date;
        return new Date(-8640000000000000);
    };

    var euroTest = /[-+]?\s[0-9]{1,3}(.[0-9]{3}),[0-9]+/;
    var replaceFunc = function (x) { return x == "," ? "." : ","; }
    String.prototype.toFloat = function() {
        var str = this;
        var isEuroFormat = euroTest.test(str);
        // Swap commas and decimals
        if (isEuroFormat) { str = str.replace(/[,.]/g, replaceFunc(x)); }
        var retValue = parseFloat(str.replace(/[^0-9.-]+/g, ''));
        return isNaN(retValue) ? 0.0 : retValue;                           
    };

    var customTableController = function ($scope, $attrs, $parse, $timeout, $animate, $log, $window) {
        var
            tblCtrl = this,
            isSorting = false,
            preserveSelection = false,
            attachedDelegates = false,
            start, end, time,
            ngModelCtrl = { $setViewValue: angular.noop },
            init = function () {
                document.msCSSOMElementFloatMetrics = true;
                tblCtrl.records = $scope.options.records;
                tblCtrl.pagedData = $scope.pagedData;

                tblCtrl.repeatFinish = function () {
                    end = new Date().getTime();
                    time = end - start;
                    $log.log('Render table time: ' + time);
                    redrawHeader(true);
                };

                if (tblCtrl.clientPaging && !tblCtrl.displayPager) {
                    $scope.$watch('options.config.pageNumber', function () {
                        tblCtrl.pageChanged();
                    });

                    $scope.$watch('options.config.pageSize', function () {
                        tblCtrl.pageSizeChanged();
                    });
                };

                $scope.$watchCollection('options.records', function () {
                    tblCtrl.records = $scope.options.records;
                    start = new Date().getTime();

                    if (tblCtrl.clientPaging) {
                        tblCtrl.pageData();
                    } else {
                        $scope.pagedData = $scope.options.records;
                    }

                    // onRepeatFinish seems to only fire on page one..
                    if (tblCtrl.useRepeat === false) {
                        redrawTable();
                        redrawHeader();
                    }

                    if (tblCtrl.useRepeat === true) {
                        // Trigger when number of children changes,
                        // including by directives like ng-repeat
                        var watch = $scope.$watch(function () {
                            return $scope.element.children().length;
                        }, function () {
                            // Wait for templates to render
                            $scope.$evalAsync(function () {
                                // Finally, directives are evaluated
                                // and templates are renderer here
                                tblCtrl.repeatFinish();
                                watch();
                            });
                        });
                    }

                    // Setup delegates
                    if (tblCtrl.useRepeat === false && attachedDelegates === false) {
                        initDelegates();
                    };

                    // Attach updatedRecords watcher
                    if (tblCtrl.useRepeat === false && attachedDelegates === false) {
                        $scope.$watch('options.updatedRecords', function () {
                            updateRows();
                        });
                        attachedDelegates = true;
                    };

                    if (!isSorting) {
                        $scope.$broadcast("masterSetOff");
                        isSorting = false;
                    } else {
                        if (preserveSelection && tblCtrl.clientSort) {
                            $scope.$broadcast("childClick");
                        }
                    }
                });
            },
            initDelegates = function () {
                var $tbody = $(tblCtrl.element.find("tbody"));

                $tbody.on('click', 'td.td-checkbox > input[type="checkbox"]', function (e) {
                    var $this = $(this);
                    var $tr = $this.parents("tr:first");
                    var model = $scope.$eval($tr.data("model"));
                    model.isSelected = $this.is(':checked');
                    if (tblCtrl.singleSelect) {
                        angular.forEach($scope.pagedData, function (tempModel) {
                            if (tempModel != model) {
                                tempModel.isSelected = false;
                            }
                        });
                        var $rows = $(tblCtrl.element.find("tbody > tr"));
                        $.each($rows, function (index, row) {
                            var $row = $(row);
                            var $checkbox = $row.find("td.td-checkbox > input[type='checkbox']");
                            $checkbox.prop('checked', false);
                        });

                        $this.prop('checked', model.isSelected);
                    };

                    if ($scope.options.callbacks && $scope.options.callbacks.checkboxClicked) {
                        $scope.options.callbacks.checkboxClicked({ item: model });
                    }

                    $scope.$broadcast("childClick", model);
                    $scope.$broadcast("tableUpdated");
                });

                $tbody.on('click', 'td.td-callback > a.callback', function (e) {
                    var $this = $(this);
                    var $tr = $this.parents("tr:first");
                    var model = $tr.data("model");
                    var callback = 'options.callbacks.' + $this.data("callback").replace(/r\./g, model + ".").replace(/\(r\)/g, '(' + model + ')');
                    $scope.$eval(callback);
                });

                $tbody.on('click', 'td > a[ui-sref]', function (e) {

                });
            },

            redrawHeader = function () {
                if (tblCtrl.isStickyHeader && $scope.options.records && $scope.options.records.length > 0) {
                    $timeout(function () { angular.element($window).trigger('redraw.customStickyHeader'); }, 20, false);
                } else if (tblCtrl.isStickyHeader && (!$scope.options.records || $scope.options.records.length == 0)) {
                    $timeout(function () { angular.element($window).trigger('hide.customStickyHeader'); }, 1, false);
                }
            },
            redrawTable = function () {
                start = new Date().getTime();
                var tableRows = tblCtrl.getNonRepeatRows();
                end = new Date().getTime();
                time = end - start;
                $log.log('Render rows time: ' + time);
                start = new Date().getTime();
                var tbody = $scope.element.find("tbody")[0];
                tbody.innerHTML = tableRows;

                // Attach popover
                if (typeof $.fn.popover !== 'undefined') {
                    $('.norepeat-popover').popover();
                }

                end = new Date().getTime();
                time = end - start;
                $log.log('Insert rows time: ' + time);
            },
            updateRows = function () {
                if ($scope.options.updatedRecords) {
                    if ($scope.options.updatedRecords.length > 10) {
                        redrawTable();
                    }
                    else {
                        var $rows = [],
                            indexes = [],
                            previousError = [],
                            $tbody = $(tblCtrl.element.find("tbody")),
                            indexRegex = /([\d]+)/g;
                        angular.forEach($scope.options.updatedRecords, function (model) {
                            var key = model.id;
                            $row = $tbody.find("tr[data-key=\"" + key + "\"]");
                            previousError.push($row.hasClass("is-error"));
                            var recordModel = $row.data("model");
                            $rows.push($row);
                            var index = recordModel.match(indexRegex)[0];
                            indexes.push(index);
                        });

                        var tableRows = tblCtrl.getNonRepeatRows(indexes);
                        var className = "is-error";
                        for (var i = 0; i < $rows.length; i++) {
                            var $newRow = $(tableRows[i]);
                            var isError = $scope.options.updatedRecords[i].isError;
                            if (isError || previousError[i]) {
                                if (previousError[i]) {
                                    $animate.addClass($newRow, className);
                                } else {
                                    $newRow.addClass(className);
                                }
                            }
                            $rows[i].replaceWith($newRow);

                            if (previousError[i] && !isError) {
                                $animate.removeClass($newRow, className);
                            };
                        }
                    }
                }
            },
            clearSelection = function () {
                $scope.$broadcast("masterSetOff");
                angular.forEach(tblCtrl.pagedData, function (model) {
                    model.isSelected = false;
                });

                if (tblCtrl.useRepeat === false) {
                    var $rows = $(tblCtrl.element.find("tbody > tr"));
                    $.each($rows, function (index, row) {
                        var $row = $(row);
                        var $checkbox = $row.find("td.td-checkbox > input[type='checkbox']");
                        $checkbox.prop('checked', false);
                    });
                }
            },
            sort = function (array, fieldName, direction, dataType, dateFormat) {
                var sortFunc = function (field, rev, primer) {
                    // Return the required a,b function
                    return function (a, b) {
                        // Reset a, b to the field
                        a = primer(pathValue(a, field)), b = primer(pathValue(b, field));
                        // Do actual sorting, reverse as needed
                        return ((a < b) ? -1 : ((a > b) ? 1 : 0)) * (rev ? -1 : 1);
                    }
                };

                // Have to handle deep paths
                var pathValue = function (obj, path) {
                    for (var i = 0, path = path.split('.'), len = path.length; i < len; i++) {
                        obj = obj[path[i]];
                    };
                    return obj;
                };
                
                var primer;
                switch (dataType) {
                    case 'numeric':
                        primer = function (a) {
                            var str = String(a);
                            return str.toFloat();                               
                        };
                        break;
                    case 'date':
                    case 'date-time':
                    case 'datetime':
                        primer = function (a) {
                            var dateStr = String(a);
                            return dateStr.toDate(dateFormat);
                        }
                        break;
                    default:
                        primer = function (a) { return String(a).toUpperCase(); };
                        break;
                };

                isSorting = true;
                start = new Date().getTime();
                array.sort(sortFunc(fieldName, direction === 'desc', primer));
                end = new Date().getTime();
                time = end - start;
                $log.log('Sort time: ' + time);
            };

        tblCtrl.init = init;

        tblCtrl.isSorting = function (name) {
            return tblCtrl.config.sortBy !== name && name !== '';
        };

        tblCtrl.isSortAsc = function (name) {
            var isSortAsc = tblCtrl.config.sortBy == name && tblCtrl.config.sortDirection == 'asc';
            return isSortAsc;
        };

        tblCtrl.isSortDesc = function (name) {
            var isSortDesc = tblCtrl.config.sortBy == name && tblCtrl.config.sortDirection == 'desc';
            return isSortDesc;
        };

        tblCtrl.sortHeaderClicked = function (headerName) {
            if (!preserveSelection && tblCtrl.clientSort) {
                clearSelection();
            }

            if (headerName) {
                if (tblCtrl.config.sortBy == headerName) {
                    tblCtrl.config.sortDirection = tblCtrl.config.sortDirection == 'asc' ? 'desc' : 'asc';
                }
                tblCtrl.config.sortBy = headerName;
                if (tblCtrl.clientSort) {
                    // Is numeric?
                    var column = $scope.options.columnDefns.filter(function (c) { return c.value === tblCtrl.config.sortBy })[0];
                    var dataType = column.dataType;
                    var dataFormat = column.dataFormat;
                    if (!column.dataType) {
                        var isNumeric = (column.filter && column.filter.indexOf("currency") != -1) || (column.isNumeric === true);
                        if (isNumeric) {
                            dataType = 'numeric';                            
                        } else {
                            dataType = 'string';
                        }
                    }

                    sort(tblCtrl.records, tblCtrl.config.sortBy, tblCtrl.config.sortDirection, dataType, dataFormat);
                    if (tblCtrl.useRepeat === false) {
                        //redrawTable(); --> watchCollection should pickup
                    }
                    redrawHeader();
                } else {
                    if ($scope.options.callbacks && $scope.options.callbacks.sortHeaderClicked) {
                        $scope.options.callbacks.sortHeaderClicked({ sortBy: tblCtrl.config.sortBy, sortDirection: tblCtrl.config.sortDirection });
                    } else {
                        $scope.$emit("tableSortHeaderClicked", { sortBy: tblCtrl.config.sortBy, sortDirection: tblCtrl.config.sortDirection });
                    }
                }
            }
        };

        tblCtrl.selectionChanged = function (model) {
            if (tblCtrl.singleSelect) {
                angular.forEach($scope.pagedData, function (tempModel) {
                    if (tempModel != model) {
                        tempModel.isSelected = false;
                    }
                });
            }

            if ($scope.options.callbacks && $scope.options.callbacks.checkboxClicked) {
                $scope.options.callbacks.checkboxClicked({ item: model });
            }

            $scope.$broadcast("childClick", model);
            $scope.$broadcast("tableUpdated");
        };

        tblCtrl.masterChange = function () {
            if (tblCtrl.useRepeat === false) {
                var $rows = $(tblCtrl.element.find("tbody > tr"));
                $.each($rows, function (index, row) {
                    var $row = $(row);
                    var model = $scope.$eval($row.data("model"));
                    var $checkbox = $row.find("td.td-checkbox > input[type='checkbox']");
                    $checkbox.prop('checked', model ? model.isSelected : false);
                });
            }
        };

        tblCtrl.masterClicked = function () {
            if ($scope.options.callbacks && $scope.options.callbacks.masterClicked) {
                $scope.options.callbacks.masterClicked();
            }
        };

        tblCtrl.pageSizeChanged = function () {
            if (tblCtrl.clientPaging) {
                if (!preserveSelection) {
                    clearSelection();
                }

                tblCtrl.pageData();
                if (tblCtrl.useRepeat === false) {
                    redrawTable();
                }

                if (preserveSelection) {
                    $scope.$broadcast("childClick");
                    $scope.$broadcast("tableUpdated");
                }

                redrawHeader();
            } else {
                if ($scope.options.callbacks && $scope.options.callbacks.pageSizeChanged) {
                    $scope.options.callbacks.pageSizeChanged();
                } else {
                    $scope.$emit("tablePageSizeChanged");
                }
            }
        };

        tblCtrl.pageChanged = function () {
            if (tblCtrl.clientPaging) {
                if (!preserveSelection) {
                    clearSelection();
                }

                tblCtrl.pageData();
                if (tblCtrl.useRepeat === false) {
                    redrawTable();
                }

                if (preserveSelection) {
                    $scope.$broadcast("childClick");
                    $scope.$broadcast("tableUpdated");
                }

                redrawHeader();
            } else {
                if ($scope.options.callbacks && $scope.options.callbacks.pageChanged) {
                    $scope.options.callbacks.pageChanged();
                } else {
                    $scope.$emit("tablePageChanged");
                }
            }
        };
    };

    var customTableConfig = {
        showSelectCheckbox: true,
        showSelectAll: true,
        singleSelect: false,
        showSort: true,
        fixedHeader: false,
        useRepeat: true,
        trackBy: '$index',
        clientSort: false,
        clientPaging: false,
        displayPager: false,
        displayPageSize: false,
        pageNumber: 1,
        pageSize: 10,
        stickyHeader: false,
        stickyHeaderOffset: 0,
        pageSizes: [
            { key: 50, value: "50" },
            { key: 75, value: "75" },
            { key: 100, value: "100" },
            { key: 250, value: "250" },
            { key: 500, value: "500" },
            { key: 1000, value: "1000" }
        ]
    };

    var customTable = function ($q, $http, $parse, $compile, $templateCache, $state, tableConfig) {
        return {
            restrict: 'EA',
            priorty: 1,
            scope: {
                options: '=',
                ngModel: '='
            },
            require: ['customTable', '?ngModel'],
            controller: 'customTableCtrl',
            controllerAs: 'tblCtrl',
            link: function (scope, element, attrs, ctrls) {
                var tblCtrl = ctrls[0], ngModelCtrl = ctrls[1];
                // Setup configuration parameters
                scope.vm = scope.$parent;
                var showSelectCheckbox = angular.isDefined(scope.options.config.showSelectCheckbox) ? scope.options.config.showSelectCheckbox : tableConfig.showSelectCheckbox,
                    singleSelect = showSelectCheckbox && (angular.isDefined(scope.options.config.singleSelect) ? scope.options.config.singleSelect : tableConfig.singleSelect),
                    showSelectAll = showSelectCheckbox && !singleSelect && (angular.isDefined(scope.options.config.showSelectAll) ? scope.options.config.showSelectAll : tableConfig.showSelectAll),
                    showSort = angular.isDefined(scope.options.config.showSort) ? scope.options.config.showSort : tableConfig.showSort,
                    useRepeat = angular.isDefined(scope.options.config.useRepeat) ? scope.options.config.useRepeat : tableConfig.useRepeat,
                    trackBy = angular.isDefined(scope.options.config.trackBy) ? scope.options.config.trackBy : tableConfig.trackBy,
                    clientSort = angular.isDefined(scope.options.config.clientSort) ? scope.options.config.clientSort : tableConfig.clientSort,
                    clientPaging = angular.isDefined(scope.options.config.clientPaging) ? scope.options.config.clientPaging : tableConfig.clientPaging,
                    displayPager = angular.isDefined(scope.options.config.displayPager) ? scope.options.config.displayPager : tableConfig.displayPager,
                    displayPageSize = angular.isDefined(scope.options.config.displayPageSize) ? scope.options.config.displayPageSize : tableConfig.displayPageSize,
                    isStickyHeader = angular.isDefined(scope.options.config.stickyHeader) ? scope.options.config.stickyHeader : tableConfig.stickyHeader,
                    stickyHeaderOffset = angular.isDefined(scope.options.config.stickyHeaderOffset) ? scope.options.config.stickyHeaderOffset : tableConfig.stickyHeaderOffset,
                    stickyContainer = angular.isDefined(scope.options.config.stickyContainer) ? scope.options.config.stickyContainer : '',
                    tableTemplate,
                    tableHeadTemplate,
                    tableHeadNoSelectTemplate,
                    tableHeadNoTristateTemplate,
                    tableHeadSortTemplate,
                    tableBodyTemplate,
                    tableRowTemplate,
                    tableRowNoSelectTemplate,
                    tableCellTemplate,
                    tableComputedCellTemplate,
                    tableHoverOverCellTemplate,
                    tableCallbackCellTemplate,
                    tablePagerTemplate,
                    tablePagerWithSizeTemplate,
                    tableRowNoRepeatTemplate,
                    tableRowNoSelectNoRepeatTemplate,
                    tableCellNoRepeatTemplate,
                    tableComputedCellNoRepeatTemplate,
                    tableHoverOverCellNoRepeatTemplate,
                    tableCallbackCellNoRepeatTemplate;

                if (clientPaging) {
                    if (typeof (scope.options.config.pageNumber) == "undefined" || scope.options.config.pageNumber == null) {
                        scope.options.config.pageNumber = tableConfig.pageNumber;
                    }

                    if (typeof (scope.options.config.pageSize) == "undefined" || scope.options.config.pageSize == null) {
                        scope.options.config.pageSize = tableConfig.pageSize;
                    }

                    if (typeof (scope.options.config.maxSize) == "undefined" || scope.options.config.maxSize == null) {
                        scope.options.config.maxSize = tableConfig.maxSize;
                    }

                    if (typeof (scope.options.config.totalCount) == "undefined" || scope.options.config.totalCount == null) {
                        scope.options.config.totalCount = 0;
                    }

                    if (typeof (scope.options.config.totalPages) == "undefined" || scope.options.config.totalPages == null) {
                        scope.options.config.totalPages = 0;
                    }

                    if (typeof (scope.options.config.lowerRange) == "undefined" || scope.options.config.lowerRange == null) {
                        scope.options.config.lowerRange = 0;
                    }

                    if (typeof (scope.options.config.upperRange) == "undefined" || scope.options.config.upperRange == null) {
                        scope.options.config.upperRange = 0;
                    }
                }

                if (!angular.isDefined(scope.options.config.pageSizes)) {
                    scope.options.config.pageSizes = tableConfig.pageSizes;
                }

                tblCtrl.useRepeat = useRepeat;
                tblCtrl.clientSort = clientSort;
                tblCtrl.clientPaging = clientPaging;
                tblCtrl.displayPager = displayPager;
                tblCtrl.displayPageSize = displayPageSize;
                tblCtrl.config = scope.options.config;
                tblCtrl.trackBy = trackBy;
                tblCtrl.isStickyHeader = scope.options.config.stickyHeader = isStickyHeader;
                tblCtrl.stickyHeaderOffset = scope.options.config.stickyHeaderOffset = stickyHeaderOffset;
                tblCtrl.stickyContainer = scope.options.config.stickyContainer = stickyContainer;
                tblCtrl.singleSelect = singleSelect;

                scope.pagedData = clientPaging ? [] : scope.options.records;
                scope.options.pagedData = scope.pagedData;

                //if (!ngModelCtrl) {
                //    return; // do nothing if no ng-model
                //}

                scope.getTemplates = function () {
                    var promise = $q.all([
                        $http.get('template/table/customTable.html', { cache: $templateCache }),
                        $http.get('template/table/customTableHead.html', { cache: $templateCache }),
                        $http.get('template/table/customTableHeadNoSelect.html', { cache: $templateCache }),
                        $http.get('template/table/customTableHeadNoTristate.html', { cache: $templateCache }),
                        $http.get('template/table/customTableHeadSort.html', { cache: $templateCache }),
                        $http.get('template/table/customTableBody.html', { cache: $templateCache }),
                        $http.get('template/table/customTableRow.html', { cache: $templateCache }),
                        $http.get('template/table/customTableRowNoSelect.html', { cache: $templateCache }),
                        $http.get('template/table/customTableCell.html', { cache: $templateCache }),
                        $http.get('template/table/customTableComputedCell.html', { cache: $templateCache }),
                        $http.get('template/table/customTableHoverOverCell.html', { cache: $templateCache }),
                        $http.get('template/table/customTableCallbackCell.html', { cache: $templateCache }),
                        $http.get('template/table/customTablePager.html', { cache: $templateCache }),
                        $http.get('template/table/customTablePagerWithSize.html', { cache: $templateCache }),
                        // NoRepeat templates
                        $http.get('template/table/customTableRowNoRepeat.html', { cache: $templateCache }),
                        $http.get('template/table/customTableRowNoSelectNoRepeat.html', { cache: $templateCache }),
                        $http.get('template/table/customTableCellNoRepeat.html', { cache: $templateCache }),
                        $http.get('template/table/customTableComputedCellNoRepeat.html', { cache: $templateCache }),
                        $http.get('template/table/customTableHoverOverCellNoRepeat.html', { cache: $templateCache }),
                        $http.get('template/table/customTableCallbackCellNoRepeat.html', { cache: $templateCache })

                    ]).then(function (templates) {
                        var i = 0;
                        tableTemplate = templates[i++].data;
                        tableHeadTemplate = templates[i++].data;
                        tableHeadNoSelectTemplate = templates[i++].data;
                        tableHeadNoTristateTemplate = templates[i++].data;
                        tableHeadSortTemplate = templates[i++].data;
                        tableBodyTemplate = templates[i++].data;
                        tableRowTemplate = templates[i++].data;
                        tableRowNoSelectTemplate = templates[i++].data;
                        tableCellTemplate = templates[i++].data;
                        tableComputedCellTemplate = templates[i++].data;
                        tableHoverOverCellTemplate = templates[i++].data;
                        tableCallbackCellTemplate = templates[i++].data;
                        tablePagerTemplate = templates[i++].data;
                        tablePagerWithSizeTemplate = templates[i++].data;
                        // NoRepeat templates
                        tableRowNoRepeatTemplate = templates[i++].data;
                        tableRowNoSelectNoRepeatTemplate = templates[i++].data;
                        tableCellNoRepeatTemplate = templates[i++].data;
                        tableComputedCellNoRepeatTemplate = templates[i++].data;
                        tableHoverOverCellNoRepeatTemplate = templates[i++].data;
                        tableCallbackCellNoRepeatTemplate = templates[i++].data;
                    });

                    return promise;
                };

                var getRepeatTable = function () {
                    var
                        tableCells = '',
                        tableRows = '',
                        tableBody = '',
                        tableHead = '',
                        tableHtml = '',
                        tableColumn,
                        recordName = 'r',
                        recordKey = trackBy,
                        tableCell = '',
                        cellClasses = '',
                        itemClasses = '',
                        pagerId = 'clientPager-' + scope.$id + '-' + Math.floor(Math.random() * 10000);

                    if (scope.options.rowDefns) {
                        itemClasses = scope.options.rowDefns.computedClass;
                    };

                    for (var i = 0; i < scope.options.columnDefns.length; i++) {
                        tableColumn = scope.options.columnDefns[i];
                        cellClasses = '';
                        var binding = tableColumn.isComputed || tableColumn.isHoverOver ?
                            tableColumn.binding.replace(/r\./g, recordName + ".") :
                            recordName + "." + tableColumn.binding;
                        if (tableColumn.callback && tableColumn.isNotBound) {
                            binding = "'" + tableColumn.binding + "'";
                        };

                        if (tableColumn.computedClass) {
                            cellClasses = tableColumn.computedClass.replace(/r\./g, recordName + ".");
                        }

                        if (binding === 'r.') {
                            binding = '';
                        } else {
                            binding = tableColumn.isWatched === false ? "::(" + binding + ")" : binding;
                        }

                        if (tableColumn.isAnchor) {
                            tableCell = tableComputedCellTemplate.replace('<--BIND-->', binding)
                                .replace('<--SREF-->', tableColumn.srefBinding);
                        } else if (tableColumn.isHoverOver) {
                            var hoverBinding = tableColumn.hoverBinding.replace(/r\./g, recordName + ".");
                            var hoverVisibility = tableColumn.hoverVisibility.replace(/r\./g, recordName + ".");
                            var hoverPlacement = tableColumn.hoverPlacement ? tableColumn.hoverPlacement : "left";
                            tableCell = tableHoverOverCellTemplate.replace('<--BIND-->', binding)
                                .replace('<--HOVERBIND-->', hoverBinding)
                                .replace('<--HOVERVISIBILITY-->', hoverVisibility)
                                .replace('<--HOVERPLACEMENT-->', hoverPlacement)
                                .replace('<--DISPLAYTEXT-->', tableColumn.name);
                        } else if (tableColumn.callback) {
                            tableCell = tableCallbackCellTemplate.replace('<--BIND-->', binding)
                                .replace('<--CALLBACK-->', tableColumn.callback);
                        }
                        else {
                            var filter = tableColumn.filter ? ' | ' + tableColumn.filter : '';
                            tableCell = tableCellTemplate.replace('<--RECORD-->.<--BIND-->', binding).replace('<--FILTER-->', filter);
                        }

                        tableCell = tableCell.replace('<--CELLSTYLE-->', tableColumn.bodyStyle ? tableColumn.bodyStyle : 'no-style').replace('<--CELLCLASS-->', cellClasses);
                        tableCells += tableCell;
                    };

                    //for (var i = 0; i < ngModelCtrl.$viewValue.length; i++) {
                    //    tableRows += tableRowTemplate.replace('<--CELLS-->', tableCells);
                    //}

                    tableRows = showSelectCheckbox ? tableRowTemplate.replace('<--CELLS-->', tableCells) : tableRowNoSelectTemplate.replace('<--CELLS-->', tableCells);
                    tableRows = tableRows.replace(/<--RECORDKEY-->/g, recordKey !== tableConfig.trackBy ? 'r.' + recordKey : recordKey);
                    tableRows = tableRows.replace('<--REPEATFINISH-->', ''); // 'on-repeat-finish=\"tblCtrl.repeatFinish()\"');
                    tableRows = tableRows.replace(/<--COMPUTEDCLASS-->/g, itemClasses);
                    tableBody = tableBodyTemplate.replace('<--ROWS-->', tableRows).replace('<--RECORD-->', recordName);
                    if (showSelectAll) {
                        tableHead = tableHeadTemplate.replace('<--ROWS-->', '');
                    } else {
                        if (showSelectCheckbox) {
                            tableHead = tableHeadNoTristateTemplate.replace('<--ROWS-->', '');
                        }
                        else {
                            tableHead = tableHeadNoSelectTemplate.replace('<--ROWS-->', '');
                        }
                    }
                    tableHead = showSort ? tableHead.replace('<--SORT-->', tableHeadSortTemplate) : tableHead.replace('<--SORT-->', '');
                    tableHtml = tableTemplate.replace('<--BODY-->', tableBody).replace('<--HEAD-->', tableHead).replace('<--FOOT-->', '');
                    tableHtml = tableHtml.replace(/<--RECORD-->/g, recordName);

                    // If is sticky header ..
                    if (scope.options.config.stickyHeader) {
                        var containerId = 'fixedHeaderContainer-' + scope.$id + '-' + Math.floor(Math.random() * 10000),
                            headerId = 'fixedHeader-' + scope.$id + '-' + Math.floor(Math.random() * 10000),
                            tableId = 'fixedTable-' + scope.$id + '-' + Math.floor(Math.random() * 10000),
                            dupeTable = "<div id=\"" + containerId + "\" style=\"display:none;\">" +
                                tableTemplate
                                    .replace("<--STYLE-->", "style=\"table-layout:fixed;\"")
                                    .replace('<--STICKY-->', "")
                                    .replace('<--HEAD-->', tableHead)
                                    .replace('<--STICKYHEAD-->', "id=\"" + headerId + "\"")
                                    .replace('<--BODY-->', "")
                                    .replace('<--FOOT-->', "") +
                                "</div>";

                        scope.tableId = tableId;
                        tableHtml = tableHtml
                            .replace("<--STYLE-->", "")
                            .replace('<--STICKY-->', "id=\"" + tableId + "\"")
                            .replace('<--STICKYHEAD-->', "custom-sticky-header client-pager=\"'#" + pagerId + "'\" move-pager=\"'" + scope.options.config.displayPager + "'\" scroll-header=\"'#" + containerId + "'\" scroll-body=\"'" + scope.options.config.stickyContainer + "'\" scroll-stop=\"" + scope.options.config.stickyHeaderOffset.toString() + "\" scrollable-container=\"'" + scope.options.config.stickyContainer + "'\"");

                        tableHtml = dupeTable + tableHtml;
                    } else {
                        tableHtml = tableHtml
                            .replace("<--STYLE-->", "")
                            .replace('<--STICKY-->', "")
                            .replace('<--STICKYHEAD-->', "");
                    }

                    if (scope.options.config.displayPager) {
                        var pagerTemplate = scope.options.config.displayPageSize ? tablePagerWithSizeTemplate : tablePagerTemplate;
                        tableHtml += pagerTemplate.replace("<--PAGERID-->", pagerId);
                    }

                    return tableHtml;
                };

                var getNonRepeatTable = function () {
                    var
                        tableCells = '',
                        tableRows = '',
                        tableBody = '',
                        tableHead = '',
                        tableHtml = '',
                        tableRows = '',
                        pagerId = 'clientPager-' + scope.$id + '-' + Math.floor(Math.random() * 10000);

                    tableBody = tableBodyTemplate.replace('<--ROWS-->', tableRows);
                    if (showSelectAll) {
                        tableHead = tableHeadTemplate.replace('<--ROWS-->', '');
                    } else {
                        if (showSelectCheckbox) {
                            tableHead = tableHeadNoTristateTemplate.replace('<--ROWS-->', '');
                        }
                        else {
                            tableHead = tableHeadNoSelectTemplate.replace('<--ROWS-->', '');
                        }
                    }
                    tableHead = showSort ? tableHead.replace('<--SORT-->', tableHeadSortTemplate) : tableHead.replace('<--SORT-->', '');
                    tableHtml = tableTemplate.replace('<--BODY-->', tableBody).replace('<--HEAD-->', tableHead).replace('<--FOOT-->', '');

                    // If is sticky header ..
                    if (scope.options.config.stickyHeader) {
                        var containerId = 'fixedHeaderContainer-' + scope.$id + '-' + Math.floor(Math.random() * 10000),
                            headerId = 'fixedHeader-' + scope.$id + '-' + Math.floor(Math.random() * 10000),
                            tableId = 'fixedTable-' + scope.$id + '-' + Math.floor(Math.random() * 10000),
                            dupeTable = "<div id=\"" + containerId + "\" style=\"display:none;\">" +
                                tableTemplate
                                    .replace("<--STYLE-->", "style=\"table-layout:fixed;\"")
                                    .replace('<--STICKY-->', "")
                                    .replace('<--HEAD-->', tableHead)
                                    .replace('<--STICKYHEAD-->', "id=\"" + headerId + "\"")
                                    .replace('<--BODY-->', "")
                                    .replace('<--FOOT-->', "") +
                                "</div>";

                        scope.tableId = tableId;
                        tableHtml = tableHtml
                            .replace("<--STYLE-->", "")
                            .replace('<--STICKY-->', "id=\"" + tableId + "\"")
                            .replace('<--STICKYHEAD-->', "custom-sticky-header client-pager=\"'#" + pagerId + "'\" move-pager=\"'" + scope.options.config.displayPager + "'\" scroll-header=\"'#" + containerId + "'\" scroll-body=\"'" + scope.options.config.stickyContainer + "'\" scroll-stop=\"" + scope.options.config.stickyHeaderOffset.toString() + "\" scrollable-container=\"'" + scope.options.config.stickyContainer + "'\"");

                        tableHtml = dupeTable + tableHtml;
                    } else {
                        tableHtml = tableHtml
                            .replace("<--STYLE-->", "")
                            .replace('<--STICKY-->', "")
                            .replace('<--STICKYHEAD-->', "");
                    }

                    if (scope.options.config.displayPager) {
                        var pagerTemplate = scope.options.config.displayPageSize ? tablePagerWithSizeTemplate : tablePagerTemplate;
                        tableHtml += pagerTemplate.replace("<--PAGERID-->", pagerId)
                    }

                    return tableHtml;
                };

                var getNonRepeatRows = function (indexes) {
                    var
                        recordName = 'r',
                        binding = '',
                        filter = '',
                        itemValue = '',
                        itemKey = '',
                        itemClasses = '',
                        keyName = trackBy ? trackBy : 'id',
                        tableColumn,
                        tableCells,
                        cellClasses = '',
                        objRegex = /{(.*?)}/,
                        rowsArray = [],
                        isArray = (indexes && indexes instanceof Array);

                    if (scope.pagedData) {
                        var upperLimit = isArray ? indexes.length : scope.pagedData.length;
                        for (var index = 0; index < upperLimit; index++) {
                            var rowNum = isArray ? indexes[index] : index;
                            recordName = "pagedData[" + rowNum.toString() + "]";
                            tableCells = '';
                            itemClasses = '';
                            itemKey = scope.$eval(recordName + '.' + keyName);
                            // Computed row classes
                            if (scope.options.rowDefns && scope.options.rowDefns.computedClass) {
                                var obj = scope.$eval(scope.options.rowDefns.computedClass.replace(/r\./g, recordName + "."))
                                for (var k in obj) {
                                    if (obj[k] === true) {
                                        itemClasses += k + ' ';
                                    }
                                }
                            }
                            //itemClasses = scope.$eval(tableColumn.computedClass.replace(/r\./g, recordName + "."));
                            for (var i = 0; i < scope.options.columnDefns.length; i++) {
                                tableColumn = scope.options.columnDefns[i];
                                binding = tableColumn.isComputed || tableColumn.isHoverOver ?
                                    tableColumn.binding.replace(/r\./g, recordName + ".") :
                                    recordName + "." + tableColumn.binding;

                                filter = tableColumn.filter ? ' | ' + tableColumn.filter : '';
                                itemValue = scope.$eval(binding + filter);
                                itemValue = itemValue == null ? '' : itemValue;
                                cellClasses = '';
                                tableCell = '';
                                // Computed class for cell
                                if (tableColumn.computedClass) {
                                    var obj = scope.$eval(tableColumn.computedClass.replace(/r\./g, recordName + "."))
                                    for (var k in obj) {
                                        if (obj[k] === true) {
                                            cellClasses += k + ' ';
                                        }
                                    }
                                }

                                if (tableColumn.isAnchor) {
                                    var json = tableColumn.srefBinding.match(objRegex)[0];
                                    var params = scope.$eval(json.replace(/r\./g, recordName + "."));
                                    var path = tableColumn.srefBinding.replace(objRegex, '').replace(/[{()}]/g, '');
                                    var href = $state.href(path, params);
                                    tableCell = tableComputedCellNoRepeatTemplate
                                        .replace('ui-sref', 'href')
                                        .replace('<--SREF-->', href)
                                } else if (tableColumn.isHoverOver) {
                                    var displayText = tableColumn.name;
                                    var hoverValue = scope.$eval(tableColumn.hoverBinding.replace(/r\./g, recordName + "."));
                                    var hoverVisible = scope.$eval(tableColumn.hoverVisibility.replace(/r\./g, recordName + "."));
                                    var hoverPlacement = tableColumn.hoverPlacement ? tableColumn.hoverPlacement : "left";
                                    if (hoverVisible) {
                                        tableCell = tableHoverOverCellNoRepeatTemplate
                                            .replace('<--HOVERBIND-->', hoverValue)
                                            .replace('<--HOVERPLACEMENT-->', hoverPlacement)
                                            .replace('<--DISPLAYTEXT-->', displayText);
                                    }
                                    else {
                                        tableCell = "<td></td>";
                                    }
                                } else if (tableColumn.callback) {
                                    tableCell = tableCallbackCellNoRepeatTemplate.replace('<--CALLBACK-->', tableColumn.callback);
                                } else {
                                    tableCell = tableCellNoRepeatTemplate;
                                }

                                tableCell = tableCell.replace('<--BIND-->', itemValue).replace('<--CELLCLASS-->', cellClasses);
                                tableCells += tableCell;
                            };

                            var tableRow = showSelectCheckbox ?
                                tableRowNoRepeatTemplate.replace('<--CELLS-->', tableCells) :
                                tableRowNoSelectNoRepeatTemplate.replace('<--CELLS-->', tableCells);
                            tableRow = tableRow.replace(/<--RECORD-->/g, recordName).replace(/<--RECORDKEY-->/g, itemKey).replace(/<--COMPUTEDCLASS-->/g, itemClasses);
                            rowsArray.push(tableRow);
                        };
                    };

                    return isArray ? rowsArray : rowsArray.join("\n");
                };

                scope.getHtml = function () {
                    var tableHtml = useRepeat ? getRepeatTable() : getNonRepeatTable();

                    scope.element = element;
                    tblCtrl.element = element;
                    //element.html(tableHtml);
                    element[0].innerHTML = tableHtml;
                    $compile(element.contents())(scope);

                    if (!useRepeat) {
                        var
                            tbody = element.find("tbody"),
                            tableRows = getNonRepeatRows(),
                            tableBody = tableBodyTemplate.replace('<--ROWS-->', tableRows);
                        tbody.replaceWith(angular.element(tableBody));
                    }
                };

                $q.when(scope.getTemplates()).then(function () {
                    scope.getHtml();
                    tblCtrl.init();
                });

                var pageData = function () {
                    scope.pagedData.length = 0;
                    if (scope.options.records) {
                        var arrLength = scope.options.records.length;
                        tblCtrl.config.totalCount = scope.options.config.totalCount = arrLength;
                        var startIndex = (tblCtrl.config.pageNumber - 1) * tblCtrl.config.pageSize;
                        var endIndex = (tblCtrl.config.pageNumber - 1) * tblCtrl.config.pageSize + tblCtrl.config.pageSize;
                        endIndex = endIndex > arrLength ? arrLength : endIndex;
                        for (var i = startIndex; i < endIndex; i++) {
                            scope.pagedData.push(scope.options.records[i]);
                        }
                        tblCtrl.config.lowerRange = ((tblCtrl.config.pageNumber - 1) * tblCtrl.config.pageSize) + 1;
                        if (!tblCtrl.clientPaging) {
                            tblCtrl.config.upperRange = tblCtrl.config.lowerRange + tblCtrl.records.length - 1;
                        } else {
                            tblCtrl.config.upperRange = tblCtrl.config.lowerRange + tblCtrl.config.pageSize - 1;
                            if (tblCtrl.config.upperRange > tblCtrl.records.length) {
                                tblCtrl.config.upperRange = tblCtrl.records.length;
                            }
                        }
                        tblCtrl.config.totalPages = parseInt(Math.ceil(tblCtrl.config.totalCount / tblCtrl.config.pageSize));
                    }
                    else {
                        tblCtrl.config.lowerRange = 0;
                        tblCtrl.config.upperRange = 0;
                        tblCtrl.config.totalPages = 0;
                        tblCtrl.config.totalCount = 0;
                    }
                };

                scope.getNonRepeatRows = getNonRepeatRows;
                tblCtrl.getNonRepeatRows = getNonRepeatRows;
                scope.pageData = pageData;
                tblCtrl.pageData = pageData;
            }
        }
    };

    var customStickyHeader = function ($log, $window, $timeout) {
        var directive = {
            restrict: 'EA',
            replace: false,
            scope: {
                scrollBody: '=',
                scrollStop: '=',
                scrollableContainer: '=',
                scrollHeader: '=',
                contentOffset: '=',
                movePager: '=',
                clientPager: '='
            },
            link: function (scope, element, attributes, control) {
                var
                    prevWidth = 0,
                    prevLeftScroll = 0,
                    resizeDebounce,
                    scrollDebounce,
                    firstScroll = true,
                    topSet = false,
                    header = $(element, this),
                    clonedHeader = $(scope.scrollHeader), scrollableContainer = $(scope.scrollableContainer),
                    clientPager = $(scope.clientPager),
                    calculateSize = function (isForced) {
                        var headerWidth = header.outerWidth();
                        if (prevWidth == headerWidth && !isForced) {
                            return;
                        }
                        var
                            offsetTop = scope.scrollStop + scrollableContainer.offset().top,
                            windowScrollTop = angular.element($window).scrollTop(),
                            headerLeft = header.offset().left - 0.5,
                            headerScrollLeft = 0,
                            hasHorizontalScrollbar = scrollableContainer[0].scrollWidth > scrollableContainer[0].clientWidth;
                        offsetTop -= windowScrollTop;
                        if (hasHorizontalScrollbar) {
                            var scrollBarWidth = scrollableContainer[0].offsetWidth - scrollableContainer[0].clientWidth;
                            headerWidth = scrollableContainer.outerWidth() - scrollBarWidth;
                            headerScrollLeft = scrollableContainer.scrollLeft();
                            headerLeft = scrollableContainer.offset().left;
                            clonedHeader.scrollLeft(headerScrollLeft);
                            clonedHeader.css({
                                overflow: 'hidden'
                            });
                            clonedHeader.addClass('custom-sticky-header-horizontal-scroll');
                        } else {
                            clonedHeader.removeClass('custom-sticky-header-horizontal-scroll');
                        }

                        clonedHeader.css({
                            width: headerWidth,
                            left: headerLeft
                        });

                        // If we're using a sticky header in a scrollable container, and the user wants us to move
                        // their pager outside of the scrollable container, do it ..
                        if (clientPager && clientPager.length > 0) { // !$document.contains(clientPager[0])) {
                            scrollableContainer.after(clientPager);
                        }

                        // Top must be set for an absolutely positioned element inside a flex layout for IE Edge.
                        // For now, let's focus on IE11 - and revisit this.
                        //if (!topSet && offsetTop > 0) {
                        //    clonedHeader.css({
                        //        top: offsetTop + 'px'
                        //    });
                        //    topSet = true;
                        //}

                        prevWidth = headerWidth;
                    },

                    setColumnHeaderSizes = function () {
                        var sum = 0.0;
                        var hasHorizontalScrollbar = scrollableContainer[0].scrollWidth > scrollableContainer[0].clientWidth;
                        var bodyColumns = header.parent().find("tbody > tr:first td");
                        var clonedColumns = clonedHeader.find('th');
                        header.find('th').each(function (index, column) {
                            var width = $(column).width();
                            var clonedColumn = $(clonedColumns[index]);
                            clonedColumn.width(width);
                            clonedColumn.css({
                                'max-width': 'none',
                                'min-width': '0'
                            });
                            sum += column.offsetWidth;
                        });

                        $log.log('Set column header sizes.');
                    },

                    containerScroll = function (e) {
                        if (firstScroll) {
                            calculateSize();
                            setColumnHeaderSizes();
                            //clonedHeader[0].style.cssText = null;
                            clonedHeader[0].style.display = 'block';
                        } else {
                            $log.log('Container scroll triggered.');
                            $timeout.cancel(scrollDebounce);
                            scrollDebounce = $timeout(function () {
                                var containerScrollLeft = scrollableContainer.scrollLeft();
                                if (containerScrollLeft != prevLeftScroll) {
                                    calculateSize();
                                    prevLeftScroll = containerScrollLeft;
                                }
                            }, 50, false);
                        }
                        firstScroll = false;
                        clonedHeader[0].style.display = 'block';
                    },

                    containerRedraw = function (e) {
                        $log.log('Container redraw triggered.');
                        createClone(true);
                        calculateSize(true);
                        setColumnHeaderSizes();
                    },

                    hideContainer = function (e) {
                        $log.log('Container hidden');
                        clonedHeader[0].style.display = 'none';
                        firstScoll = true;
                    },

                    windowResize = function (e) {
                        $log.log('Window resize triggered.');

                        $timeout.cancel(resizeDebounce);
                        resizeDebounce = $timeout(function () {
                            topSet = false;
                            calculateSize(true);
                            setColumnHeaderSizes();
                        }, 50, false);
                    },

                    windowScroll = function (e) {
                        $log.log('Window scroll triggered.');
                    },

                    createClone = function (isForced) {
                        if (!scope.scrollHeader) {
                            clonedHeader = header;
                            header = clonedHeader.clone();
                            clonedHeader.after(header);
                            clonedHeader.addClass('custom-sticky-header');
                        } else if (firstScroll) {
                            // Moved the clone before our scrollable container so we can use absolute positioning
                            // Lastest Chrome breaks this behavior.  flex-children have have to be in the same
                            // container.  There probably needs to be a check to determine if flex-layout is being used.
                            //  I just happen to know that all of of the layouts in Commissions use flex-layout
                            //clonedHeader.insertBefore(scrollableContainer);
                            clonedHeader[0].style.position = 'absolute';
                        }
                        setColumnHeaderSizes();
                    };

                clonedHeader.find('table').addClass('sticky-header');
                // Pickup first scroll to trigger our initial scrolling
                scrollableContainer.on('scroll.customStickyHeader', containerScroll);
                scrollableContainer.on('resize.customStickyHeader', containerRedraw);
                angular.element($window).on('redraw.customStickyHeader', containerRedraw);
                angular.element($window).on('hide.customStickyHeader', hideContainer);
                angular.element($window).resize(function (e) {
                    windowResize(e);
                });

                scope.$on('$destroy', function () {
                    scrollableContainer.off('.customStickyHeader');
                    scrollableContainer.off('resize.customStickyHeader', containerRedraw);
                    angular.element($window).off('redraw.customStickyHeader', containerRedraw);
                    angular.element($window).off('hide.customStickyHeader', hideContainer);
                    angular.element($window).off('resize', containerRedraw);
                    clonedHeader.remove();
                });
            }
        };

        return directive;
    };

    customStickyHeader.$inject = ['$log', '$window', '$timeout'];

    customTableController.$inject = ['$scope', '$attrs', '$parse', '$timeout', '$animate', '$log', '$window'];
    customTable.$inject = ['$q', '$http', '$parse', '$compile', '$templateCache', '$state', 'customTableConfig'];

    var customPaginationController = function ($scope, $attrs, $parse) {
        var self = this,
            ngModelCtrl = { $setViewValue: angular.noop }, // nullModelCtrl
            setNumPages = $attrs.numPages ? $parse($attrs.numPages).assign : angular.noop;

        this.init = function (ngModelCtrl_, config) {
            ngModelCtrl = ngModelCtrl_;
            this.config = config;

            ngModelCtrl.$render = function () {
                self.render();
            };

            if ($attrs.itemsPerPage) {
                $scope.$parent.$watch($parse($attrs.itemsPerPage), function (value) {
                    self.itemsPerPage = parseInt(value, 10);
                    $scope.totalPages = self.calculateTotalPages();
                });
            } else {
                this.itemsPerPage = config.itemsPerPage;
            }
        };

        this.calculateTotalPages = function () {
            var totalPages = this.itemsPerPage < 1 ? 1 : Math.ceil($scope.totalItems / this.itemsPerPage);
            return Math.max(totalPages || 0, 1);
        };

        this.render = function () {
            $scope.page = parseInt(ngModelCtrl.$viewValue, 10) || 1;
        };

        $scope.selectPage = function (page) {
            if ($scope.page !== page && page > 0 && page <= $scope.totalPages) {
                ngModelCtrl.$setViewValue(page);
                ngModelCtrl.$render();
            }
        };

        $scope.getText = function (key) {
            return $scope[key + 'Text'] || self.config[key + 'Text'];
        };
        $scope.noPrevious = function () {
            return $scope.page === 1;
        };
        $scope.noNext = function () {
            return $scope.page === $scope.totalPages;
        };

        $scope.$watch('totalItems', function () {
            $scope.totalPages = self.calculateTotalPages();
        });

        $scope.$watch('totalPages', function (value) {
            setNumPages($scope.$parent, value); // Readonly variable

            if ($scope.page > value) {
                $scope.selectPage(value);
            } else {
                ngModelCtrl.$render();
            }
        });
    };

    var customPaginationConfig = {
        itemsPerPage: 10,
        boundaryLinks: false,
        directionLinks: true,
        firstText: 'First',
        previousText: 'Previous',
        nextText: 'Next',
        lastText: 'Last',
        rotate: true,
        adjacents: 2
    };

    var customPagination = function ($parse, paginationConfig) {
        return {
            restrict: 'EA',
            scope: {
                totalItems: '=',
                firstText: '@',
                previousText: '@',
                nextText: '@',
                lastText: '@',
                adjacents: '@'
            },
            require: ['customPagination', '?ngModel'],
            controller: 'customPaginationCtrl',
            templateUrl: 'template/pagination/customPagination.html',
            replace: true,
            link: function (scope, element, attrs, ctrls) {
                var paginationCtrl = ctrls[0], ngModelCtrl = ctrls[1];

                if (!ngModelCtrl) {
                    return; // do nothing if no ng-model
                }

                // Setup configuration parameters
                var maxSize = angular.isDefined(attrs.maxSize) ? scope.$parent.$eval(attrs.maxSize) : paginationConfig.maxSize,
                    rotate = angular.isDefined(attrs.rotate) ? scope.$parent.$eval(attrs.rotate) : paginationConfig.rotate,
                    adjacents = angular.isDefined(attrs.adjacents) ? scope.$parent.$eval(attrs.adjacents) : paginationConfig.adjacents;
                scope.boundaryLinks = angular.isDefined(attrs.boundaryLinks) ? scope.$parent.$eval(attrs.boundaryLinks) : paginationConfig.boundaryLinks;
                scope.directionLinks = angular.isDefined(attrs.directionLinks) ? scope.$parent.$eval(attrs.directionLinks) : paginationConfig.directionLinks;

                paginationCtrl.init(ngModelCtrl, paginationConfig);

                if (attrs.maxSize) {
                    scope.$parent.$watch($parse(attrs.maxSize), function (value) {
                        maxSize = parseInt(value, 10);
                        paginationCtrl.render();
                    });
                }

                // Create page object used in template
                function makePage(number, text, isActive) {
                    return {
                        number: number,
                        text: text,
                        active: isActive
                    };
                }

                function getPages(currentPage, totalPages) {
                    var pages = [];

                    // Default page limits
                    var startPage = 1, endPage = totalPages;
                    var isMaxSized = (angular.isDefined(maxSize) && maxSize < totalPages);

                    var calcedMaxSize = isMaxSized ? maxSize : 0;

                    // If we want to limit the maxSize within the constraint of the adjacents, we can do so like this.
                    // This adjusts the maxSize based on current page and current page and whether the front-end adjacents are added.
                    if (isMaxSized && !rotate && adjacents > 0 && currentPage >= (calcedMaxSize - 1) && totalPages >= (calcedMaxSize + (adjacents * 2))) {
                        calcedMaxSize = maxSize - adjacents;
                    }

                    // Adjust max size if we are going to add the adjacents
                    if (isMaxSized && !rotate && adjacents > 0) {
                        var tempStartPage = ((Math.ceil(currentPage / calcedMaxSize) - 1) * calcedMaxSize) + 1;
                        var tempEndPage = Math.min(tempStartPage + calcedMaxSize - 1, totalPages);

                        if (tempEndPage < totalPages) {
                            if (totalPages - adjacents > currentPage) { // && currentPage > adjacents) {
                                calcedMaxSize = calcedMaxSize - adjacents;
                            }
                        }
                    }

                    // recompute if maxSize
                    if (isMaxSized) {
                        if (rotate) {
                            // Current page is displayed in the middle of the visible ones
                            startPage = Math.max(currentPage - Math.floor(calcedMaxSize / 2), 1);
                            endPage = startPage + calcedMaxSize - 1;

                            // Adjust if limit is exceeded
                            if (endPage > totalPages) {
                                endPage = totalPages;
                                startPage = endPage - calcedMaxSize + 1;
                            }
                        } else {
                            // Visible pages are paginated with maxSize
                            startPage = ((Math.ceil(currentPage / calcedMaxSize) - 1) * calcedMaxSize) + 1;

                            // Adjust last page if limit is exceeded
                            endPage = Math.min(startPage + calcedMaxSize - 1, totalPages);
                        }
                    }

                    // Add page number links
                    for (var number = startPage; number <= endPage; number++) {
                        var page = makePage(number, number, number === currentPage);
                        pages.push(page);
                    }

                    // Add links to move between page sets
                    if (isMaxSized && !rotate) {
                        if (startPage > 1) {
                            var previousPageSet = makePage(startPage - 1, '...', false);
                            pages.unshift(previousPageSet);
                            if (adjacents > 0) {
                                if (totalPages >= maxSize + (adjacents * 2)) {
                                    pages.unshift(makePage(2, '2', false));
                                    pages.unshift(makePage(1, '1', false));
                                }
                            }
                        }

                        if (endPage < totalPages) {
                            var nextPageSet = makePage(endPage + 1, '...', false);
                            var addedNextPageSet = false;
                            if (adjacents > 0) {
                                if (totalPages - adjacents > currentPage) { // && currentPage > adjacents) {
                                    var removedLast = false;
                                    addedNextPageSet = true;
                                    if (pages && pages.length > 1 && pages[pages.length - 1].number == totalPages - 1) {
                                        pages.splice(pages.length - 1, 1);
                                        removedLast = true;
                                    }
                                    pages.push(nextPageSet);
                                    if (removedLast || pages[pages.length - 1].number < totalPages - 2 || pages[pages.length - 2].number < totalPages - 2) {
                                        pages.push(makePage(totalPages - 1, (totalPages - 1).toString(), false));
                                    }

                                    pages.push(makePage(totalPages, (totalPages).toString(), false));
                                }
                            }

                            if (!addedNextPageSet) {
                                pages.push(nextPageSet);
                            }
                        }
                    }

                    return pages;
                }

                var originalRender = paginationCtrl.render;
                paginationCtrl.render = function () {
                    originalRender();
                    if (scope.page > 0 && scope.page <= scope.totalPages) {
                        scope.pages = getPages(scope.page, scope.totalPages);
                    }
                };
            }
        };
    };

    customPaginationController.$inject = ['$scope', '$attrs', '$parse'];
    customPagination.$inject = ['$parse', 'customPaginationConfig'];

    angular.module("long2know").run(["$templateCache", function ($templateCache) {
        $templateCache.put("template/table/customTable.html",
            "<table <--STICKY--> class=\"table-striped table-hover custom-table\" <--STYLE-->>\n" +
            "  <--HEAD-->\n" +
            "  <--BODY-->\n" +
            "</table>" +
            "<--FOOT-->");

        $templateCache.put("template/table/customTableBody.html",
            "<tbody>\n" +
            "  <--ROWS-->\n" +
            "</tbody>");

        $templateCache.put("template/table/customTableRow.html",
            //"<tr ng-repeat='<--RECORD--> in ngModel track by $index' is-state='r.isError' is-state-class='is-error'>\n" +
            "<tr ng-repeat='<--RECORD--> in pagedData track by <--RECORDKEY-->' ng-class=\"<--COMPUTEDCLASS-->\" <--REPEATFINISH-->>\n" +
            "  <td class=\"td-checkbox\"><input type=\"checkbox\" ng-model=\"<--RECORD-->.isSelected\" ng-click=\"tblCtrl.selectionChanged(<--RECORD-->)\" /></td>\n" +
            "  <--CELLS-->\n" +
            "</tr>");

        $templateCache.put("template/table/customTableRowNoRepeat.html",
            "<tr data-key=\"<--RECORDKEY-->\" data-model=\"<--RECORD-->\" class=\"<--COMPUTEDCLASS-->\">\n" +
            "  <td class=\"td-checkbox\"><input type=\"checkbox\" ng-model=\"<--RECORD-->.isSelected\" ng-click=\"tblCtrl.selectionChanged(<--RECORD-->)\" /></td>\n" +
            "  <--CELLS-->\n" +
            "</tr>");

        $templateCache.put("template/table/customTableRowNoSelect.html",
            "<tr ng-repeat='<--RECORD--> in pagedData track by <--RECORDKEY-->' ng-class=\"<--COMPUTEDCLASS-->\" <--REPEATFINISH-->>\n" +
            "  <--CELLS-->\n" +
            "</tr>");

        $templateCache.put("template/table/customTableRowNoSelectNoRepeat.html",
            "<tr data-key=\"<--RECORDKEY-->\" data-model=\"<--RECORD-->\" class=\"<--COMPUTEDCLASS-->\">\n" +
            "  <--CELLS-->\n" +
            "</tr>");

        $templateCache.put("template/table/customTableCell.html",
            "<td class='<--CELLSTYLE-->' ng-class='<--CELLCLASS-->' ng-bind='<--RECORD-->.<--BIND--><--FILTER-->'></td>"
        );

        $templateCache.put("template/table/customTableCellNoRepeat.html",
            "<td class='<--CELLCLASS-->'><--BIND--></td>"
        );

        $templateCache.put("template/table/customTableComputedCell.html",
            "<td ng-class='<--CELLCLASS-->' style=\"white-space:nowrap;\">\n" +
            "  <a ui-sref=\"<--SREF-->\" class=\"link\" ng-bind=\"<--BIND-->\"></a>\n" +
            "</td>"
        );

        $templateCache.put("template/table/customTableHoverOverCell.html",
            "<td ng-class='<--CELLCLASS-->' style=\"white-space:nowrap;\">\n" +
            "  <button uib-popover=\"{{<--HOVERBIND-->}}\" popover-title='{{<--BIND-->}}' popover-placement=\"<--HOVERPLACEMENT-->\" type=\"button\" class=\"btn btn-default\" ng-if=\"<--HOVERVISIBILITY-->\"><--DISPLAYTEXT--></button>\n" +
            "</td>"
        );

        $templateCache.put("template/table/customTableCallbackCell.html",
            "<td ng-class='<--CELLCLASS-->' style=\"white-space:nowrap;\">\n" +
            "  <a class=\"link\" ng-bind=\"<--BIND-->\" ng-click=\"options.callbacks.<--CALLBACK-->\"></a>\n" +
            "</td>"
        );

        $templateCache.put("template/table/customTableComputedCellNoRepeat.html",
            "<td class='<--CELLCLASS-->' style=\"white-space:nowrap;\">\n" +
            "  <a ui-sref=\"<--SREF-->\" class=\"link\"><--BIND--></a>\n" +
            "</td>"
        );

        $templateCache.put("template/table/customTableHoverOverCellNoRepeat.html",
            "<td class='<--CELLCLASS-->' style=\"white-space:nowrap;\">\n" +
            "  <button type=\"button\" class=\"btn btn-default norepeat-popover\" data-toggle=\"popover\" data-placement=\"<--HOVERPLACEMENT-->\" title=\"<--BIND-->\" data-content=\"<--HOVERBIND-->\"><--DISPLAYTEXT--></button>\n" +
            "</td>"
        );

        $templateCache.put("template/table/customTableCallbackCellNoRepeat.html",
            "<td class='td-callback <--CELLCLASS-->' style=\"white-space:nowrap;\">\n" +
            "  <a class=\"link callback\" data-callback=\"<--CALLBACK-->\"><--BIND--></a>\n" +
            "</td>"
        );

        $templateCache.put("template/table/customTableHead.html",
            "<thead <--STICKYHEAD-->>\n" +
            "  <tr>\n" +
            "    <th class=\"th-checkbox\">\n" +
            "      <tri-state-checkbox class=\"toggle-all\" checkboxes=\"pagedData\" master-set-off=\"masterSetOff\" master-change=\"tblCtrl.masterChange()\" master-clicked=\"tblCtrl.masterClicked\" child-click=\"childClick\"></tri-state-checkbox>\n" +
            "    </th>\n" +
            "    <th bindonce ng-repeat=\"c in options.columnDefns track by $index\"<--SORT-->" +
            "      ng-click=\"tblCtrl.sortHeaderClicked(c.value)\" class=\"{{c.style}}\"><span ng-bind=\"c.name\">\n" +
            "    </th>\n" +
            "  </tr>\n" +
            "</thead>"
        );

        $templateCache.put("template/table/customTableHeadNoSelect.html",
            "<thead <--STICKYHEAD-->>\n" +
            "  <tr>\n" +
            "    <th bindonce ng-repeat=\"c in options.columnDefns track by $index\"<--SORT-->" +
            "      ng-click=\"tblCtrl.sortHeaderClicked(c.value)\" class=\"{{c.style}}\"><span ng-bind=\"c.name\">\n" +
            "    </th>\n" +
            "  </tr>\n" +
            "</thead>"
        );

        $templateCache.put("template/table/customTableHeadNoTristate.html",
            "<thead <--STICKYHEAD-->>\n" +
            "  <tr>\n" +
            "    <th class=\"th-checkbox\">\n" +
            "    </th>\n" +
            "    <th bindonce ng-repeat=\"c in options.columnDefns track by $index\"<--SORT-->" +
            "      ng-click=\"tblCtrl.sortHeaderClicked(c.value)\" class=\"{{c.style}}\"><span ng-bind=\"c.name\">\n" +
            "    </th>\n" +
            "  </tr>\n" +
            "</thead>"
        );

        $templateCache.put("template/table/customTableHeadSort.html",
            " ng-class=\"{ 'sorting': tblCtrl.isSorting(c.value), 'sorting_asc': tblCtrl.isSortAsc(c.value), 'sorting_desc': tblCtrl.isSortDesc(c.value) }\""
        );

        $templateCache.put("template/table/customTablePager.html",
            "<div id=\"<--PAGERID-->\" class=\"row\" ng-hide=\"tblCtrl.totalPages < 2\">\n" +
            "  <custom-pagination class=\"pull-right\" total-items=\"tblCtrl.config.totalCount\" ng-model=\"tblCtrl.config.pageNumber\" max-size=\"tblCtrl.config.maxSize\" rotate=\"false\" items-per-page=\"tblCtrl.config.pageSize\" boundary-links=\"true\"\n" +
            "    first-text=\"«\" last-text=\"»\" previous-text=\"‹\" next-text=\"›\" ng-change=\"tblCtrl.pageChanged()\">\n" +
            "  </custom-pagination>\n" +
            "</div>"
        );

        $templateCache.put("template/table/customTablePagerWithSize.html",
            "<div id=\"<--PAGERID-->\" class=\"row\">\n" +
            "  <div class=\"pull-left pagination\" ng-hide=\"tblCtrl.config.totalCount == 0\">\n" +
            "    <span>Displaying </span><span ng-bind=\"tblCtrl.config.lowerRange\"></span> - <span ng-bind=\"tblCtrl.config.upperRange\"></span> of <span ng-bind=\"tblCtrl.config.totalCount\"></span>\n" +
            "  </div>\n" +
            "  <div class=\"pull-right\">" +
            "    <div class=\"pagination\" style=\"display: inline-block;\" ng-hide=\"!tblCtrl.config.pageSizes || tblCtrl.config.totalCount == 0\">\n" +
            "      <span class=\"multiselect-label\">Page Size</span>\n" +
            "      <multiselect class=\"input-xlarge multiselect\" ng-model=\"tblCtrl.config.pageSize\" options=\"p.key as p.value for p in tblCtrl.config.pageSizes\"\n" +
            "        header=\"Page Size\" multiple=\"false\" enable-filter=\"false\" ng-change=\"tblCtrl.pageSizeChanged()\" complex-models=\"false\">\n" +
            "      </multiselect>\n" +
            "    </div>\n" +
            "    <custom-pagination ng-hide=\"tblCtrl.totalPages < 2\" class=\"pull-right\" total-items=\"tblCtrl.config.totalCount\" ng-model=\"tblCtrl.config.pageNumber\" max-size=\"tblCtrl.config.maxSize\" rotate=\"false\" items-per-page=\"tblCtrl.config.pageSize\" boundary-links=\"true\"\n" +
            "      first-text=\"«\" last-text=\"»\" previous-text=\"‹\" next-text=\"›\" ng-change=\"tblCtrl.pageChanged()\">\n" +
            "    </custom-pagination>\n" +
            "  </div>\n" +
            "</div>\n");

        $templateCache.put("template/pagination/customPagination.html",
            "<ul class=\"pagination\">\n" +
            "  <li ng-if=\"boundaryLinks\" ng-class=\"{disabled: noPrevious()}\"><a href ng-click=\"selectPage(1)\">{{getText('first')}}</a></li>\n" +
            "  <li ng-if=\"directionLinks\" ng-class=\"{disabled: noPrevious()}\"><a href ng-click=\"selectPage(page - 1)\">{{getText('previous')}}</a></li>\n" +
            "  <li ng-repeat=\"page in pages track by $index\" ng-class=\"{active: page.active}\"><a href ng-click=\"selectPage(page.number)\">{{page.text}}</a></li>\n" +
            "  <li ng-if=\"directionLinks\" ng-class=\"{disabled: noNext()}\"><a href ng-click=\"selectPage(page + 1)\">{{getText('next')}}</a></li>\n" +
            "  <li ng-if=\"boundaryLinks\" ng-class=\"{disabled: noNext()}\"><a href ng-click=\"selectPage(totalPages)\">{{getText('last')}}</a></li>\n" +
            "</ul>");
    }]);

    angular
        .module('long2know.controllers')
        .controller('customTableCtrl', customTableController);

    angular
        .module('long2know.controllers')
        .controller('customPaginationCtrl', customPaginationController);

    angular
        .module('long2know.directives')
        .directive('customTable', customTable);

    angular
        .module('long2know.directives')
        .directive('customPagination', customPagination);

    angular.module('long2know.directives')
        .directive('customStickyHeader', customStickyHeader);

    angular
        .module('long2know.constants')
        .constant('customTableConfig', customTableConfig);

    angular
        .module('long2know.constants')
        .constant('customPaginationConfig', customPaginationConfig);
})()
