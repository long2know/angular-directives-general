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

    var customTableController = function ($scope, $attrs, $parse, $timeout, $animate, $log) {
        var
            tblCtrl = this,
            isSorting = false,
            attachedDelegates = false,
            start, end, time,
            ngModelCtrl = { $setViewValue: angular.noop },
            init = function () {
                tblCtrl.ngModel = $scope.ngModel;
                $scope.$watchCollection('ngModel', function () {
                    start = new Date().getTime();
                    if (tblCtrl.useRepeat === false) {
                        redrawTable();
                    }

                    // Setup delegates
                    if (tblCtrl.useRepeat === false && attachedDelegates === false) {
                        initDelegates();
                    };

                    // Attach updatedRows watcher
                    if (tblCtrl.useRepeat === false && attachedDelegates === false) {
                        $scope.$watch('updatedRows', function () {
                            updateRows();
                        });
                        attachedDelegates = true;
                    };

                    if (!isSorting) {
                        $scope.$broadcast("masterSetOff");
                        isSorting = false;
                    }
                });

                $scope.$on('ngRepeatFinished', function () {
                    end = new Date().getTime();
                    time = end - start;
                    $log.log('Render table time: ' + time);
                });
            },
            initDelegates = function () {
                var $tbody = $(tblCtrl.element.find("tbody"));

                $tbody.on('click', 'td.td-checkbox > input[type="checkbox"]', function (e) {
                    var $this = $(this);
                    var $tr = $this.parents("tr:first");
                    var model = $scope.$eval($tr.data("model"));
                    model.isSelected = $this.is(':checked');
                    $scope.$broadcast("childClick", model);
                    $scope.$broadcast("tableUpdated");
                });

                $tbody.on('click', 'td > a[ui-sref]', function (e) {

                });
            },
            redrawTable = function () {
                start = new Date().getTime();
                var tableRows = tblCtrl.getNonRepeatRows();
                end = new Date().getTime();
                time = end - start;
                $log.log('Render rows time: ' + time);

                //$scope.element.find("tbody").html(tableRows);
                start = new Date().getTime();
                var tbody = $scope.element.find("tbody")[0];
                
                // Attempting to speed up the insert
                //var display = tbody.style.display || 'block';
                //var parent = tbody.parentNode;
                //tbody.style.display = 'none';
                //parent.removeChild(tbody);
                tbody.innerHTML = tableRows;
                //parent.appendChild(tbody);
                //tbody.style.display = display;
                end = new Date().getTime();
                time = end - start;
                $log.log('Insert rows time: ' + time);
            },
            updateRows = function () {
                var $rows = [],
                    indexes = [],
                    previousError = [],
                    $tbody = $(tblCtrl.element.find("tbody")),
                    indexRegex = /([\d]+)/g;
                angular.forEach($scope.updatedRows, function (model) {
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
                    var isError = $scope.updatedRows[i].isError;
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
            },
            sort = function (array, fieldName, direction, isNumeric) {
                var sortFunc = function (field, rev, primer) {
                    // Return the required a,b function
                    return function (a, b) {
                        // Reset a, b to the field
                        a = primer(a[field]), b = primer(b[field]);
                        // Do actual sorting, reverse as needed
                        return ((a < b) ? -1 : ((a > b) ? 1 : 0)) * (rev ? -1 : 1);
                    }
                };

                var primer = isNumeric ? function (a) { return parseFloat(String(a).replace(/[^0-9.-]+/g, '')); } :
                    function (a) { return String(a).toUpperCase(); };

                isSorting = true;
                start = new Date().getTime();
                array.sort(sortFunc(fieldName, direction === 'desc', primer));
                end = new Date().getTime();
                time = end - start;
                $log.log('Sort time: ' + time);
            };

        tblCtrl.init = init;

        tblCtrl.isSorting = function (name) {
            return tblCtrl.sortBy !== name;
        };

        tblCtrl.isSortAsc = function (name) {
            var isSortAsc = tblCtrl.sortBy == name && tblCtrl.sortDirection == 'asc';
            return isSortAsc;
        };

        tblCtrl.isSortDesc = function (name) {
            var isSortDesc = tblCtrl.sortBy == name && tblCtrl.sortDirection == 'desc';
            return isSortDesc;
        };

        tblCtrl.sortHeaderClicked = function (headerName) {
            if (tblCtrl.sortBy == headerName) {
                tblCtrl.sortDirection = tblCtrl.sortDirection == 'asc' ? 'desc' : 'asc';
            }
            tblCtrl.sortBy = headerName;
            $scope.$emit("tableSortHeaderClicked", { sortBy: tblCtrl.sortBy, sortDirection: tblCtrl.sortDirection });
            if (tblCtrl.clientSort) {
                sort(tblCtrl.ngModel, tblCtrl.sortBy, tblCtrl.sortDirection, false);
                if (tblCtrl.useRepeat === false) {
                    //redrawTable(); --> watchCollection should pickup
                }
            };
        };

        tblCtrl.selectionChanged = function (model) {
            $scope.$broadcast("childClick", model);
            $scope.$broadcast("tableUpdated");
        };

        tblCtrl.masterClick = function () {
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

        tblCtrl.pageChanged = function () {

        };
    };

    var customTableConfig = {
        showSelectCheckbox: true,
        showSelectAll: true,
        showSort: true,
        fixedHeader: false,
        useRepeat: true,
        trackBy: '$index',
        clientSort: false
    };

    var customTable = function ($q, $http, $parse, $compile, $templateCache, $state, tableConfig) {
        return {
            restrict: 'EA',
            priorty: 1,
            scope: {
                tableColumns: '=',
                sortBy: '=',
                sortDirection: '=',
                ngModel: '=',
                updatedRows: '=',
                totalItems: '=',
                pageNumber: '=',
                ngChange: '=',
                callbacks: '=',
                useRepeat: '@',
                firstText: '@',
                previousText: '@',
                nextText: '@',
                lastText: '@',
                adjacents: '@',
                clientSort: '@',
                trackBy: '@'
            },
            //compile: function (tElem, tAttrs) {
            //    console.log(name + ': compile => ' + tElem.html());
            //    return {
            //        pre: function (scope, iElem, iAttrs) {
            //            console.log(name + ': pre link => ' + iElem.html());
            //        },
            //        post: function (scope, iElem, iAttrs) {
            //            console.log(name + ': post link => ' + iElem.html());
            //        }
            //    }
            //},
            require: ['customTable', '?ngModel'],
            controller: 'customTableCtrl',
            controllerAs: 'tblCtrl',
            link: function (scope, element, attrs, ctrls) {
                var tblCtrl = ctrls[0], ngModelCtrl = ctrls[1];
                // Setup configuration parameters
                var showSelectCheckbox = angular.isDefined(attrs.showSelectCheckbox) ? scope.$parent.$eval(attrs.showSelectCheckbox) : tableConfig.showSelectCheckbox,
                    showSelectAll = angular.isDefined(attrs.showSelectAll) ? scope.$parent.$eval(attrs.showSelectAll) : tableConfig.showSelectAll,
                    showSort = angular.isDefined(attrs.showSort) ? scope.$parent.$eval(attrs.showSort) : tableConfig.showSort,
                    useRepeat = angular.isDefined(attrs.useRepeat) ? scope.$parent.$eval(attrs.useRepeat) : tableConfig.useRepeat,
                    trackBy = angular.isDefined(attrs.trackBy) ? attrs.trackBy : tableConfig.trackBy,
                    clientSort = angular.isDefined(attrs.clientSort) ? scope.$parent.$eval(attrs.clientSort) : tableConfig.clientSort,
                    tableTemplate,
                    tableHeadTemplate,
                    tableHeadNoSelectTemplate,
                    tableHeadSortTemplate,
                    tableBodyTemplate,
                    tableRowTemplate,
                    tableRowNoSelectTemplate,
                    tableCellTemplate,
                    tableComputedCellTemplate,
                    tableCallbackCellTemplate,
                    tableFootTemplate,
                    tableRowNoRepeatTemplate,
                    tableRowNoSelectNoRepeatTemplate,
                    tableCellNoRepeatTemplate,
                    tableComputedCellNoRepeatTemplate;

                tblCtrl.useRepeat = useRepeat;
                tblCtrl.sortBy = scope.sortBy;
                tblCtrl.sortDirection = scope.sortDirection;
                tblCtrl.clientSort = clientSort;
                tblCtrl.trackBy = trackBy;

                if (!ngModelCtrl) {
                    return; // do nothing if no ng-model
                }

                scope.getTemplates = function () {
                    var promise = $q.all([
                        $http.get('template/table/customTable.html', { cache: $templateCache }),
                        $http.get('template/table/customTableHead.html', { cache: $templateCache }),
                        $http.get('template/table/customTableHeadNoSelect.html', { cache: $templateCache }),
                        $http.get('template/table/customTableHeadSort.html', { cache: $templateCache }),
                        $http.get('template/table/customTableBody.html', { cache: $templateCache }),
                        $http.get('template/table/customTableRow.html', { cache: $templateCache }),
                        $http.get('template/table/customTableRowNoSelect.html', { cache: $templateCache }),
                        $http.get('template/table/customTableCell.html', { cache: $templateCache }),
                        $http.get('template/table/customTableComputedCell.html', { cache: $templateCache }),
                        $http.get('template/table/customTableCallbackCell.html', { cache: $templateCache }),
                        $http.get('template/table/customTableFoot.html', { cache: $templateCache }),
                        // NoRepeat templates
                        $http.get('template/table/customTableRowNoRepeat.html', { cache: $templateCache }),
                        $http.get('template/table/customTableRowNoSelectNoRepeat.html', { cache: $templateCache }),
                        $http.get('template/table/customTableCellNoRepeat.html', { cache: $templateCache }),
                        $http.get('template/table/customTableComputedCellNoRepeat.html', { cache: $templateCache })

                    ]).then(function (templates) {
                        var i = 0;
                        tableTemplate = templates[i++].data;
                        tableHeadTemplate = templates[i++].data;
                        tableHeadNoSelectTemplate = templates[i++].data;
                        tableHeadSortTemplate = templates[i++].data;
                        tableBodyTemplate = templates[i++].data;
                        tableRowTemplate = templates[i++].data;
                        tableRowNoSelectTemplate = templates[i++].data;
                        tableCellTemplate = templates[i++].data;
                        tableComputedCellTemplate = templates[i++].data;
                        tableCallbackCellTemplate = templates[i++].data;
                        tableFootTemplate = templates[i++].data;
                        // NoRepeat templates
                        tableRowNoRepeatTemplate = templates[i++].data;
                        tableRowNoSelectNoRepeatTemplate = templates[i++].data;
                        tableCellNoRepeatTemplate = templates[i++].data;
                        tableComputedCellNoRepeatTemplate = templates[i++].data;
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
                        recordKey = trackBy;

                    for (var i = 0; i < scope.tableColumns.length; i++) {
                        tableColumn = scope.tableColumns[i];
                        var binding = tableColumn.isComputed ?
                            tableColumn.binding.replace(/r\./g, recordName + ".") :
                            recordName + "." + tableColumn.binding;
                        binding = tableColumn.isWatched === false ? "::(" + binding + ")" : binding;
                        if (tableColumn.isAnchor) {
                            tableCells += tableComputedCellTemplate.replace('<--BIND-->', binding)
                                .replace('<--SREF-->', tableColumn.srefBinding);
                        } else if (tableColumn.callback) {
                            tableCells += tableCallbackCellTemplate.replace('<--BIND-->', binding)
                                .replace('<--CALLBACK-->', tableColumn.callback);
                        }
                        else {
                            var filter = tableColumn.filter ? ' | ' + tableColumn.filter : '';
                            tableCells += tableCellTemplate.replace('<--RECORD-->.<--BIND-->', binding).replace('<--FILTER-->', filter);
                        }
                    };

                    //for (var i = 0; i < ngModelCtrl.$viewValue.length; i++) {
                    //    tableRows += tableRowTemplate.replace('<--CELLS-->', tableCells);
                    //}

                    tableRows = showSelectCheckbox ? tableRowTemplate.replace('<--CELLS-->', tableCells) : tableRowNoSelectTemplate.replace('<--CELLS-->', tableCells);
                    tableRows = tableRows.replace(/<--RECORDKEY-->/g, recordKey !== tableConfig.trackBy ? 'r.' + recordKey : recordKey);
                    tableRows = tableRows.replace('<--REPEATFINISH-->', 'on-repeat-finish');
                    tableBody = tableBodyTemplate.replace('<--ROWS-->', tableRows).replace('<--RECORD-->', recordName);
                    tableHead = showSelectAll ? tableHeadTemplate.replace('<--ROWS-->', '') : tableHeadNoSelectTemplate.replace('<--ROWS-->', '');
                    tableHead = showSort ? tableHead.replace('<--SORT-->', tableHeadSortTemplate) : tableHead.replace('<--SORT-->', '');
                    tableHtml = tableTemplate.replace('<--BODY-->', tableBody).replace('<--HEAD-->', tableHead).replace('<--FOOT-->', '');
                    tableHtml = tableHtml.replace(/<--RECORD-->/g, recordName);

                    // If is sticky header ..
                    var useStickyHeader = false;
                    if (useStickyHeader) {
                        var dupeTable = tableTemplate
                            .replace('<--STICKY-->', "")
                            .replace('<--HEAD-->', tableHead)
                            .replace('<--STICKYHEAD-->', "id=\"fixedHeader\"")
                            .replace('<--BODY-->', "")
                            .replace('<--FOOT-->', "");

                        tableHtml = tableHtml
                            .replace('<--STICKY-->', "id=\"tableId\"")
                            .replace('<--STICKYHEAD-->', "custom-sticky-header scrollable-container=\"'.flex-scroll-content'\" scroll-body=\"'#tableId'\" scroll-stop=\"0\" header-selector=\"#fixedHeader\"");

                        tableHtml = dupeTable + tableHtml;
                    } else {
                        tableHtml = tableHtml
                            .replace('<--STICKY-->', "")
                            .replace('<--STICKYHEAD-->', "");
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
                        tableRows = '';
                    tableBody = tableBodyTemplate.replace('<--ROWS-->', tableRows);
                    tableHead = showSelectAll ? tableHeadTemplate.replace('<--ROWS-->', '') : tableHeadNoSelectTemplate.replace('<--ROWS-->', '');
                    tableHead = showSort ? tableHead.replace('<--SORT-->', tableHeadSortTemplate) : tableHead.replace('<--SORT-->', '');
                    tableHtml = tableTemplate.replace('<--BODY-->', tableBody).replace('<--HEAD-->', tableHead).replace('<--FOOT-->', '');

                    // If is sticky header ..
                    var useStickyHeader = false;
                    if (useStickyHeader) {
                        var dupeTable = tableTemplate
                            .replace('<--STICKY-->', "")
                            .replace('<--HEAD-->', tableHead)
                            .replace('<--STICKYHEAD-->', "id=\"fixedHeader\"")
                            .replace('<--BODY-->', "")
                            .replace('<--FOOT-->', "");

                        tableHtml = tableHtml
                            .replace('<--STICKY-->', "id=\"tableId\"")
                            .replace('<--STICKYHEAD-->', "custom-sticky-header scrollable-container=\"'.flex-scroll-content'\" scroll-body=\"'#tableId'\" scroll-stop=\"0\" header-selector=\"#fixedHeader\"");

                        tableHtml = dupeTable + tableHtml;
                    } else {
                        tableHtml = tableHtml
                            .replace('<--STICKY-->', "")
                            .replace('<--STICKYHEAD-->', "");
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
                        keyName = trackBy ? trackBy : 'id',
                        tableColumn,
                        tableCells,
                        objRegex = /{(.*?)}/,
                        rowsArray = [],
                        isArray = (indexes && indexes.length > 0);

                    if (scope.ngModel) {
                        var upperLimit = isArray ? indexes.length : scope.ngModel.length;
                        for (var index = 0; index < upperLimit; index++) {
                            var rowNum = isArray ? indexes[index] : index;
                            recordName = "ngModel[" + rowNum.toString() + "]";
                            tableCells = '';
                            itemKey = scope.$eval(recordName + '.' + keyName);
                            for (var i = 0; i < scope.tableColumns.length; i++) {
                                tableColumn = scope.tableColumns[i];
                                binding = tableColumn.isComputed ?
                                    tableColumn.binding.replace(/r\./g, recordName + ".") :
                                    recordName + "." + tableColumn.binding;
                                filter = tableColumn.filter ? ' | ' + tableColumn.filter : '';
                                itemValue = scope.$eval(binding + filter);
                                if (tableColumn.isAnchor) {
                                    var json = tableColumn.srefBinding.match(objRegex)[0];
                                    var params = scope.$eval(json.replace(/r\./g, recordName + "."));
                                    var path = tableColumn.srefBinding.replace(objRegex, '').replace(/[{()}]/g, '');
                                    var href = $state.href(path, params);
                                    tableCells += tableComputedCellNoRepeatTemplate.replace('<--BIND-->', itemValue)
                                        .replace('ui-sref', 'href')
                                        .replace('<--SREF-->', href)
                                }
                                else {
                                    tableCells += "<td>" + itemValue + "</td>";
                                }
                            };

                            var tableRow = showSelectCheckbox ?
                                tableRowNoRepeatTemplate.replace('<--CELLS-->', tableCells) :
                                tableRowNoSelectNoRepeatTemplate.replace('<--CELLS-->', tableCells);
                            tableRow = tableRow.replace(/<--RECORD-->/g, recordName).replace(/<--RECORDKEY-->/g, itemKey);
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

                scope.getNonRepeatRows = getNonRepeatRows;
                tblCtrl.getNonRepeatRows = getNonRepeatRows;
            }
        }
    };

    customTableController.$inject = ['$scope', '$attrs', '$parse', '$timeout', '$animate', '$log'];
    customTable.$inject = ['$q', '$http', '$parse', '$compile', '$templateCache', '$state', 'customTableConfig'];

    angular
        .module('long2know.controllers')
        .controller('customTableCtrl', customTableController);

    angular
        .module('long2know.directives')
        .directive('customTable', customTable);

    angular
        .module('long2know.constants')
        .constant('customTableConfig', customTableConfig);

    angular.module("long2know").run(["$templateCache", function ($templateCache) {
        $templateCache.put("template/table/customTable.html",
            "<table <--STICKY--> class=\"table-striped table-hover custom-table\">\n" +
            "  <--HEAD-->\n" +
            "  <--BODY-->\n" +
            "</table>" +
            "<--FOOT-->");

        $templateCache.put("template/table/customTableBody.html",
            "<tbody>\n" +
            "  <--ROWS-->\n" +
            "</tbody>");

        $templateCache.put("template/table/customTableRow.html",
            "<tr ng-repeat='<--RECORD--> in ngModel track by <--RECORDKEY-->' ng-class=\"{ 'is-error': <--RECORD-->.isError }\" <--REPEATFINISH-->>\n" +
            "  <td class=\"td-checkbox\"><input type=\"checkbox\" ng-model=\"<--RECORD-->.isSelected\" ng-click=\"tblCtrl.selectionChanged(<--RECORD-->)\" /></td>\n" +
            "  <--CELLS-->\n" +
            "</tr>");

        $templateCache.put("template/table/customTableRowNoRepeat.html",
            "<tr data-key=\"<--RECORDKEY-->\" data-model=\"<--RECORD-->\" ng-class=\"{ 'is-error': <--RECORD-->.isError }\">\n" +
            "  <td class=\"td-checkbox\"><input type=\"checkbox\" ng-model=\"<--RECORD-->.isSelected\" ng-click=\"tblCtrl.selectionChanged(<--RECORD-->)\" /></td>\n" +
            "  <--CELLS-->\n" +
            "</tr>");

        $templateCache.put("template/table/customTableRowNoSelect.html",
            "<tr ng-repeat='<--RECORD--> in ngModel track by <--RECORDKEY-->' <>\n" +
            "  <--CELLS-->\n" +
            "</tr>");

        $templateCache.put("template/table/customTableRowNoSelectNoRepeat.html",
            "<tr data-key=\"<--RECORDKEY-->\" data-model=\"<--RECORD-->\">\n" +
            "  <--CELLS-->\n" +
            "</tr>");

        $templateCache.put("template/table/customTableCell.html",
            "<td ng-bind='<--RECORD-->.<--BIND--><--FILTER-->'</td>"
            );

        $templateCache.put("template/table/customTableCellNoRepeat.html",
            "<td ng-bind='<--RECORD-->.<--BIND--><--FILTER-->'</td>"
            );

        $templateCache.put("template/table/customTableCallbackCell.html",
          "<td style=\"white-space:nowrap;\">\n" +
          "  <a class=\"link\" ng-bind=\"<--BIND-->\" ng-click=\"callbacks.<--CALLBACK-->\"></a>\n" +
          "</td>"
          );

        $templateCache.put("template/table/customTableComputedCell.html",
            "<td style=\"white-space:nowrap;\">\n" +
            "  <a ui-sref=\"<--SREF-->\" class=\"mtnLink\" ng-bind=\"<--BIND-->\"></a>\n" +
            "</td>"
            );

        $templateCache.put("template/table/customTableComputedCellNoRepeat.html",
            "<td style=\"white-space:nowrap;\">\n" +
            "  <a ui-sref=\"<--SREF-->\" class=\"mtnLink\"><--BIND--></a>\n" +
            "</td>"
            );

        $templateCache.put("template/table/customTableHead.html",
            "<thead>\n" +
            "  <tr <--STICKYHEAD-->>\n" +
            "    <th class=\"th-checkbox\">\n" +
            "      <tri-state-checkbox class=\"toggle-all\" checkboxes=\"ngModel\" master-set-off=\"masterSetOff\" master-click=\"tblCtrl.masterClick()\" child-click=\"childClick\"></tri-state-checkbox>\n" +
            "    </th>\n" +
            "    <th bindonce ng-repeat=\"c in tableColumns track by $index\"<--SORT-->" +
            "      ng-click=\"tblCtrl.sortHeaderClicked(c.value)\"><span ng-bind=\"c.name\">\n" +
            "    </th>\n" +
            "  </tr>\n" +
            "</thead>"
            );

        $templateCache.put("template/table/customTableHeadNoSelect.html",
            "<thead>\n" +
            "  <tr <--STICKYHEAD-->>\n" +
            "    <th bindonce ng-repeat=\"c in tableColumns track by $index\"<--SORT-->" +
            "      ng-click=\"tblCtrl.sortHeaderClicked(c.value)\"><span ng-bind=\"c.name\">\n" +
            "    </th>\n" +
            "  </tr>\n" +
            "</thead>"
            );

        $templateCache.put("template/table/customTableHeadSort.html",
            " ng-class=\"{ 'sorting': tblCtrl.isSorting(c.value), 'sorting_asc': tblCtrl.isSortAsc(c.value), 'sorting_desc': tblCtrl.isSortDesc(c.value) }\""
            );

        $templateCache.put("template/table/customTableFoot.html",
            "<div ng-hide=\"tblCtrl.totalPages < 2\">\n" +
            "  <custom-pagination total-items=\"tblCtrl.totalCount\" ng-model=\"pageNumber\" max-size=\"tblCtrl.maxSize\" rotate=\"false\" items-per-page=\"tblCtrl.pageSize\" boundary-links=\"true\"\n" +
            "    first-text=\"«\" last-text=\"»\" previous-text=\"‹\" next-text=\"›\" ng-change=\"tblCtrl.pageChanged()\">\n" +
            "  </custom-pagination>\n" +
            "</div>");
    }]);
})()