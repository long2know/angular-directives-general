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

    var customselectParser = function ($parse) {
        //                      00000111000000000000022200000000000000003333333333333330000000000044000
        var TYPEAHEAD_REGEXP = /^\s*([\s\S]+?)(?:\s+as\s+([\s\S]+?))?\s+for\s+(?:([\$\w][\$\w\d]*))\s+in\s+([\s\S]+?)$/;

        return {
            parse: function (input) {

                var match = input.match(TYPEAHEAD_REGEXP);
                if (!match) {
                    throw new Error(
                      'Expected typeahead specification in form of "_modelValue_ (as _label_)? for _item_ in _collection_"' +
                        ' but got "' + input + '".');
                }

                return {
                    itemName: match[3],
                    source: $parse(match[4]),
                    viewMapper: $parse(match[2] || match[1]),
                    modelMapper: $parse(match[1])
                };
            }
        };
    };

    var customselect = function ($q, $timeout, $parse, $filter, $document, $window, $position, $compile, optionParser) {
        return {
            restrict: 'EA',
            require: ['ngModel', '?^form'],
            link: function (originalScope, element, attrs, ctrls) {
                var modelCtrl = ctrls[0];
                var formCtrl = (ctrls.length > 1 && typeof (ctrls[1]) !== 'undefined') ? ctrls[1] : null;

                //model setter executed upon match selection
                var $setModelValue = $parse(attrs.ngModel).assign;

                var
                    parserResult = optionParser.parse(attrs.options),
                    isMultiple = attrs.multiple ? originalScope.$eval(attrs.multiple) : false,
                    isAutoFocus = attrs.autoFocus ? originalScope.$eval(attrs.autoFocus) : false,
                    isComplex = attrs.complexModels ? originalScope.$eval(attrs.complexModels) : false,
                    enableFilter = attrs.enableFilter ? originalScope.$eval(attrs.enableFilter) : true,
                    header = attrs.header ? attrs.header : "Select",
                    selectedHeader = attrs.selectedHeader ? attrs.selectedHeader : 'selected',
                    selectLimit = attrs.selectLimit ? originalScope.$eval(attrs.selectLimit) : 0,
                    useFiltered = attrs.selectLimitUseFiltered ? originalScope.$eval(attrs.selectLimitUseFiltered) : true,
                    filterPlaceholder = attrs.filterPlaceholder ? attrs.filterPlaceholder : "Filter ..",
                    required = false,
                    lastSelectedLabel = '',
                    scope = originalScope.$new(true),
                    changeHandler = attrs.change || angular.noop,
                    onSelectCallback = $parse(attrs.onSelect),
                    onCustomCallback = $parse(attrs.customButtonClick),
                    hasCustomButton = attrs.customButtonText != '',
                    customButtonText = attrs.customButtonText ? attrs.customButtonText : 'Click Me',
                    customButtonShow = $parse(attrs.customButtonShow),
                    isLoadingSetter = $parse(attrs.loading).assign || angular.noop,
                    isNoResultsSetter = $parse(attrs.noResults).assign || angular.noop,
                    appendToBody = attrs.appendToBody ? originalScope.$eval(attrs.appendToBody) : false,
                    focusFirst = originalScope.$eval(attrs.typeaheadFocusFirst) !== false,
                    //If input matches an item of the list exactly, select it automatically
                    selectOnExact = attrs.typeaheadSelectOnExact ? originalScope.$eval(attrs.typeaheadSelectOnExact) : false,
                    eventDebounceTime = 200,
                    waitTime = 100,
                    timeoutEventPromise,
                    timeoutPromise,
                    minLength = 1,
                    itemsSelected = false,
                    popUpEl = angular.element('<customselect-popup></customselect-popup>'),
                    isChecked = function (i) {
                        return i.checked === true;
                    },
                    getFilteredItems = function () {
                        var filteredItems = $filter("filter")(scope.items, scope.searchText);
                        return filteredItems;
                    },
                    popupId = 'customselect-' + scope.$id + '-' + Math.floor(Math.random() * 10000),
                    resetMatches = function () {
                        scope.items = [];
                        //setModelValue(isMultiple);
                        scope.activeIdx = -1;
                    },
                    scheduleSearchWithTimeout = function (inputValue) {
                        if (minLength === 0 || inputValue && inputValue.length >= minLength) {
                            if (waitTime > 0) {
                                cancelPreviousTimeout();
                                timeoutPromise = $timeout(function () {
                                    getMatchesAsync(inputValue);
                                }, waitTime);
                            } else {
                                getMatchesAsync(inputValue);
                            }
                        } else {
                            isLoadingSetter(originalScope, false);
                            scope.loading = false;
                            cancelPreviousTimeout();
                            resetMatches();
                        }
                    },
                    cancelPreviousTimeout = function () {
                        if (timeoutPromise) {
                            $timeout.cancel(timeoutPromise);
                        }
                    },
                    getMatchId = function (index) {
                        return popupId + '-option-' + index;
                    },
                    getMatchesAsync = function (inputValue) {
                        var locals = { $viewValue: inputValue };
                        isLoadingSetter(originalScope, true);
                        scope.loading = true;
                        scope.isNoResults = false;
                        isNoResultsSetter(originalScope, false);
                        $q.when(parserResult.source(originalScope, locals)).then(function (matches) {
                            //it might happen that several async queries were in progress if a user were typing fast
                            //but we are interested only in responses that correspond to the current view value
                            var onCurrentRequest = (inputValue === scope.searchText.label);
                            if (onCurrentRequest) {
                                if (matches && matches.length > 0) {
                                    isNoResultsSetter(originalScope, false);
                                    scope.isNoResults = false;
                                    scope.items.length = 0;

                                    //transform labels
                                    for (var i = 0; i < matches.length; i++) {
                                        locals[parserResult.itemName] = matches[i];
                                        scope.items.push({
                                            id: getMatchId(i),
                                            label: parserResult.viewMapper(scope, locals),
                                            model: matches[i]
                                        });
                                    }

                                    scope.query = inputValue;
                                    //position pop-up with matches - we need to re-calculate its position each time we are opening a window
                                    //with matches as a pop-up might be absolute-positioned and position of an input might have changed on a page
                                    //due to other elements being rendered
                                    recalculatePosition();

                                    element.attr('aria-expanded', true);

                                    //Select the single remaining option if user input matches
                                    if (selectOnExact && scope.items.length === 1 && inputIsExactMatch(inputValue, 0)) {
                                        scope.select(scope.items[0]);
                                    }
                                } else {
                                    resetMatches();
                                    isNoResultsSetter(originalScope, true);
                                    scope.isNoResults = true;
                                }
                            }
                            if (onCurrentRequest) {
                                isLoadingSetter(originalScope, false);
                                scope.loading = false;

                            }
                        }, function () {
                            resetMatches();
                            isLoadingSetter(originalScope, false);
                            isNoResultsSetter(originalScope, true);
                            scope.loading = false;
                            scope.isNoResults = true;
                        });
                    },
                    fireRecalculating = function () {
                        if (!scope.moveInProgress) {
                            scope.moveInProgress = true;
                            scope.$digest();
                        }

                        // Cancel previous timeout
                        if (timeoutEventPromise) {
                            $timeout.cancel(timeoutEventPromise);
                        }

                        // Debounced executing recalculate after events fired
                        timeoutEventPromise = $timeout(function () {
                            // if popup is visible
                            if (scope.isOpen) {
                                recalculatePosition();
                            }
                            scope.moveInProgress = false;
                            scope.$digest();
                        }, eventDebounceTime);
                    },

                    // recalculate actual position and set new values to scope
                    // after digest loop is popup in right position
                recalculatePosition = function () {
                    scope.position = appendToBody ? $position.offset($popup) : $position.position(element);
                    scope.position.top += $popup.prop('offsetHeight');
                },

                getFirstSelectedLabel = function () {
                    for (var i = 0; i < scope.items.length; i++) {
                        if (scope.items[i].checked) {
                            return scope.items[i].label;
                        }
                    }
                    return header;
                },

                canCheck = function () {
                    var belowLimit = false;
                    var atLimit = false;
                    if (selectLimit === 0 || !isMultiple) {
                        belowLimit = true;
                        atLimit = false;
                    } else {
                        var checkedItems = scope.items.filter(isChecked);
                        atLimit = checkedItems.length === selectLimit;
                        belowLimit = checkedItems.length < selectLimit;
                    }
                    scope.maxSelected = atLimit;
                    return atLimit || belowLimit;
                },

                //getHeaderText = function () {
                //    var localHeader = header;
                //    if (isEmpty(modelCtrl.$modelValue)) return scope.header = localHeader;
                //    if (isMultiple) {
                //        var isArray = modelCtrl.$modelValue instanceof Array;
                //        if (isArray && modelCtrl.$modelValue.length > 1) {
                //            localHeader = modelCtrl.$modelValue.length + ' ' + selectedHeader;
                //        } else {
                //            localHeader = getFirstSelectedLabel();
                //        }
                //    } else {
                //        //var local = {};
                //        //local[parserResult.itemName] = parseInt(modelCtrl.$modelValue);
                //        //localHeader = parserResult.viewMapper(local);
                //        localHeader = getFirstSelectedLabel();
                //    }
                //    scope.header = localHeader;
                //},

                isEmpty = function (obj) {
                    if (!obj) return true;
                    if (!isComplex && obj) return false;
                    if (obj.length && obj.length > 0) return false;
                    for (var prop in obj) if (obj[prop]) return false;
                    return true;
                },

                selectSingle = function (item) {
                    if (item.checked) {
                        scope.uncheckAll();
                    } else {
                        scope.uncheckAll();
                        item.checked = true;
                    }
                    //setModelValue(false);
                },

                selectMultiple = function (item) {
                    item.checked = !item.checked;
                    if (!canCheck()) {
                        item.checked = false;
                    }
                    //setModelValue(true);
                },

                setModelValue = function (isMultiple) {
                    var value;
                    if (isMultiple) {
                        value = [];
                        angular.forEach(scope.items, function (item) {
                            // If map simple values
                            if (item.checked) {
                                if (isComplex) {
                                    value.push(item.model);
                                } else {
                                    var local = {};
                                    local[parserResult.itemName] = item.model;
                                    value.push(parserResult.modelMapper(local));
                                }
                            }
                        })
                    } else {
                        angular.forEach(scope.items, function (item) {
                            if (item.checked) {
                                if (isComplex) {
                                    value = item.model;
                                    return false;
                                }
                                else {
                                    var local = {};
                                    local[parserResult.itemName] = item.model;
                                    value = parserResult.modelMapper(local);
                                    return false;
                                }
                            }
                        })
                    }
                    modelCtrl.$setViewValue(value);
                },
                markChecked = function (newVal) {
                    if (!angular.isArray(newVal)) {
                        angular.forEach(scope.items, function (item) {
                            if (angular.equals(item.model, newVal)) {
                                item.checked = true;
                                return false;
                            }
                        });
                    } else {
                        angular.forEach(newVal, function (i) {
                            angular.forEach(scope.items, function (item) {
                                if (angular.equals(item.model, i)) {
                                    item.checked = true;
                                }
                            });
                        });
                    }
                };

                scope.items = [];
                scope.header = header;
                scope.multiple = isMultiple;
                scope.disabled = false;
                scope.filterPlaceholder = filterPlaceholder;
                scope.selectLimit = selectLimit;
                scope.enableFilter = enableFilter;
                scope.searchText = { label: '' };
                scope.isAutoFocus = isAutoFocus;
                scope.scheduleSearchWithTimeout = scheduleSearchWithTimeout;
                scope.appendToBody = appendToBody;
                scope.moveInProgress = false;
                scope.popupId = popupId;
                scope.recalculatePosition = recalculatePosition;
                scope.customButtonShow = customButtonShow();
                scope.customButtonText = customButtonText;

                originalScope.$on('$destroy', function () {
                    scope.$destroy();
                    $document.unbind('click', scope.clickHandler);
                    if (appendToBody) {
                        $('#' + popupId).remove();
                    }
                });

                // bind events only if appendToBody params exist - performance feature
                if (appendToBody) {
                    angular.element($window).bind('resize', fireRecalculating);
                    $document.find('body').bind('scroll', fireRecalculating);
                }

                // required validator
                if (attrs.required || attrs.ngRequired) {
                    required = true;
                }

                attrs.$observe('required', function (newVal) {
                    required = newVal;
                });

                //watch disabled state
                scope.$watch(function () {
                    return $parse(attrs.disabled)(originalScope);
                }, function (newVal) {
                    scope.disabled = newVal;
                });

                //watch show state state
                if (hasCustomButton) {
                    scope.$watch(function () {
                        return $parse(attrs.customButtonShow)(originalScope);
                    }, function (newVal) {
                        scope.customButtonShow = newVal;
                    });
                }

                //watch single/multiple state for dynamically change single to multiple
                scope.$watch(function () {
                    return $parse(attrs.multiple)(originalScope);
                }, function (newVal) {
                    isMultiple = newVal || false;
                });

                ////watch model change  --> This has an issue in that it seems that all models are updated to the same value
                scope.$watch(function () {
                    return modelCtrl.$modelValue;
                }, function (newVal, oldVal) {
                    //when directive initialize, newVal usually undefined. Also, if model value already set in the controller
                    //for preselected list then we need to mark checked in our scope item. But we don't want to do this every time
                    //model changes. We need to do this only if it is done outside directive scope, from controller, for example.
                    if (angular.isDefined(newVal)) {
                        markChecked(newVal);
                        // Technically, defining ngChange will already have a watcher triggering its handler
                        // So, triggering it manually should be redundant
                        //scope.$eval(changeHandler);
                    }
                    //getHeaderText();
                    modelCtrl.$setValidity('required', scope.valid());
                }, true);

                //parseModel();

                var $popup = $compile(popUpEl)(scope);
                element.append($popup);
                $timeout(function () { recalculatePosition(); }, 100);

                scope.valid = function validModel() {
                    if (!required) return true;
                    var value = modelCtrl.$modelValue;
                    var isValid = itemsSelected || (angular.isArray(value) && value.length > 0) || (!angular.isArray(value) && value != null);
                    return isValid;
                };

                scope.checkAll = function () {
                    if (!isMultiple) return;
                    var items = scope.items;
                    var totalChecked = 0;
                    if (useFiltered) {
                        items = getFilteredItems();
                        angular.forEach(items, function (item) {
                            item.checked = false;
                        });
                        totalChecked = scope.items.filter(isChecked).length;
                    }
                    if (selectLimit <= 0 || (items.length < selectLimit - totalChecked)) {
                        angular.forEach(items, function (item) {
                            item.checked = true;
                        });
                    } else {
                        angular.forEach(items, function (item) {
                            item.checked = false;
                        });

                        for (var i = 0; i < (selectLimit - totalChecked) ; i++) {
                            items[i].checked = true;
                        }
                        scope.maxSelected = true;
                    }
                    //setModelValue(true);
                };

                scope.uncheckAll = function () {
                    var items = useFiltered ? getFilteredItems() : scope.items;
                    angular.forEach(items, function (item) {
                        item.checked = false;
                    });
                    canCheck();
                    if (isMultiple) {
                        //setModelValue(true);
                    }
                };

                scope.select = function (item) {
                    if (isMultiple === false) {
                        selectSingle(item);
                        scope.toggleSelect();
                    } else {
                        selectMultiple(item);
                    }
                };

                scope.acceptSelection = function () {
                    setModelValue(isMultiple);
                    modelCtrl.$setValidity('required', scope.valid());
                    if (modelCtrl.$modelValue && modelCtrl.$modelValue.length > 0) {
                        itemsSelected = true;
                        var items = scope.items.filter(isChecked);
                        onSelectCallback(originalScope, { $items: items });
                        scope.clearFilter();
                        scope.toggleSelect();
                    }
                };

                scope.customClick = function () {
                    itemsSelected = true;
                    onCustomCallback(originalScope);
                    modelCtrl.$setValidity('required', scope.valid());
                    scope.clearFilter();
                    scope.toggleSelect();
                }

                scope.clearFilter = function () {
                    resetMatches();
                    scope.searchText.label = '';
                };
            }
        };
    };

    var customselectPopup = function ($document) {
        return {
            restrict: 'E',
            replace: true,
            templateUrl: 'template/customselect/customselectPopup.html',
            link: function (scope, element, attrs, ctrls) {

                var $dropdown = element.find(".dropdown-menu");
                $dropdown.attr("id", scope.popupId);

                if (scope.appendToBody) {
                    $document.find('body').append($dropdown);
                }

                var
                    clickHandler = function (event) {
                        if (elementMatchesAnyInArray(event.target, element.find(event.target.tagName)))
                            return;

                        if (scope.appendToBody) {
                            if (elementMatchesAnyInArray(event.target, $dropdown.find(event.target.tagName)))
                                return;
                        }

                        element.removeClass('open');
                        scope.isOpen = false;
                        $document.unbind('click', clickHandler);
                        scope.$apply();
                    },
                    elementMatchesAnyInArray = function (element, elementArray) {
                        for (var i = 0; i < elementArray.length; i++)
                            if (element == elementArray[i])
                                return true;
                        return false;
                    };

                scope.clickHandler = clickHandler;

                scope.toggleSelect = function () {
                    if (element.hasClass('open') || scope.isOpen) {
                        element.removeClass('open');
                        scope.isOpen = false;
                        $document.unbind('click', clickHandler);
                    } else {
                        element.addClass('open');
                        scope.isOpen = true;
                        $document.bind('click', clickHandler);
                        if (scope.isAutoFocus) {
                            scope.focus();
                        }
                        scope.recalculatePosition();
                    }

                    // Figure out if dropup
                    var parent = element.parent();
                    var windowScrollTop = $(window).scrollTop();
                    var windowHeight = $(window).height();
                    var windowWidth = $(window).width();
                    var ulElement = element.find("ul:first");
                    var dropdownHeight = ulElement.height();
                    var dropdownWidth = ulElement.width();

                    // Determine if outside of visible range when dropping down
                    var elementTop = element.offset().top + element.height() - windowScrollTop;
                    var elementBottom = windowHeight - element.height() - element.offset().top + windowScrollTop;
                    if ((elementBottom < dropdownHeight) && (elementTop > dropdownHeight)) {
                        // Alert should drop up!
                        scope.dropup = true;
                    }
                    else {
                        scope.dropup = false;
                    }

                    // Figure out if we need left adjust
                    if (element.offset().left + dropdownWidth >= windowWidth) {
                        scope.isOffRight = true;
                        var adjust = ((element.offset().left + dropdownWidth - windowWidth) + 10) * -1.0;
                        ulElement.css("left", adjust.toString() + "px");
                    }
                    else {
                        scope.isOffRight = false;
                        ulElement.css("left", "0");
                    }
                };

                scope.focus = function focus() {
                    if (scope.enableFilter) {
                        var searchBox = element.find('input')[0];
                        searchBox.focus();
                    }
                }
            }
        }
    };

    angular.module("long2know").run(["$templateCache", function ($templateCache) {
        $templateCache.put("template/customselect/customselectPopup.html",
            "<div class=\"btn-group\" ng-class=\"{ dropup: dropup, single: !multiple }\">" +
                "<button class=\"btn btn-default dropdown-toggle\" ng-click=\"toggleSelect()\" ng-disabled=\"disabled\" ng-class=\"{'has-error': !valid()}\">" +
                    "<span class=\"pull-left\" ng-bind=\"header\"></span>" +
                    "<span class=\"caret pull-right\"></span>" +
                "</button>" +
                "<ul class=\"dropdown-menu custom-select-popup\" ng-show=\"isOpen && !moveInProgress\" ng-style=\"{ true: {top: position.top +'px', left: position.left +'px'}, false: {}}[appendToBody]\" style=\"display: block;\" role=\"listbox\" aria-hidden=\"{{!isOpen}}\">" +
                    "<li ng-if=\"enableFilter\" class=\"filter-container\">" +
                        "<div class=\"form-group has-feedback filter\">" +
                            "<input class=\"form-control\" type=\"text\" ng-model=\"searchText.label\" ng-change=\"scheduleSearchWithTimeout(searchText.label)\" placeholder=\"{{ filterPlaceholder }}\" />" +
                            "<span class=\"glyphicon glyphicon-remove-circle form-control-feedback\" ng-click=\"clearFilter()\"></span>" +
                        "</div>" +
                            "<i ng-show=\"loading\" class=\"glyphicon glyphicon-refresh\"></i>" +
                            "<div ng-show=\"isNoResults\">" +
                                "<i class=\"glyphicon glyphicon-remove\"></i> No Results Found" +
                            "</div>" +
                    "</li>" +
                    "<li ng-if=\"customButtonShow\">" +
                        "<button class=\"btn-link btn-small\" ng-click=\"customClick()\"><i class=\"icon-remove\"></i> {{ customButtonText }}</button>" +
                    "</li>" +
                    "<li ng-show=\"multiple\">" +
                        "<button class=\"btn-link btn-small\" ng-click=\"checkAll()\"><i class=\"icon-ok\"></i> Check all</button>" +
                        "<button class=\"btn-link btn-small\" ng-click=\"uncheckAll()\"><i class=\"icon-remove\"></i> Uncheck all</button>" +
                        "<button class=\"btn-link btn-small\" ng-click=\"acceptSelection()\"><i class=\"icon-remove\"></i> Add Selected</button>" +
                    "</li>" +
                    "<li ng-show=\"maxSelected\">" +
                        "<small>Selected maximum of </small><small ng-bind=\"selectLimit\"></small>" +
                    "</li>" +
                    "<li ng-repeat=\"i in items | filter:searchText\">" +
                        //"<a ng-click=\"select(i); focus()\">" +
                        "<a ng-click=\"select(i);\">" +
                            "<i class=\"glyphicon\" ng-class=\"{'glyphicon-ok': i.checked, 'glyphicon-none': !i.checked}\"></i>" +
                            "<span ng-bind=\"i.label\"></span>" +
                        "</a>" +
                    "</li>" +
                "</ul>" +
            "</div>");
    }]);

    customselectParser.$inject = ['$parse'];
    customselect.$inject = ['$q', '$timeout', '$parse', '$filter', '$document', '$window', '$uibPosition', '$compile', 'customselectParser'];
    customselectPopup.$inject = ['$document'];

    angular
        .module("long2know.services")
        .factory('customselectParser', customselectParser);

    angular
        .module('long2know.directives')
        .directive('customselectPopup', customselectPopup);

    angular
        .module('long2know.directives')
        .directive('customselect', customselect);
})()