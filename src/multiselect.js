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

    var multiselectParser = function ($parse) {
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

    var multiselect = function ($parse, $timeout, $filter, $document, $compile, $window, $position, optionParser) {
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
                    enableCheckAll = attrs.enableCheckAll ? originalScope.$eval(attrs.enableCheckAll) : true,
                    enableUncheckAll = attrs.enableUncheckAll ? originalScope.$eval(attrs.enableUncheckAll) : true,
                    header = attrs.header ? attrs.header : "Select",
                    selectedHeader = attrs.selectedHeader ? attrs.selectedHeader : 'selected',
                    selectLimit = attrs.selectLimit ? originalScope.$eval(attrs.selectLimit) : 0,
                    useFiltered = attrs.selectLimitUseFiltered ? originalScope.$eval(attrs.selectLimitUseFiltered) : true,
                    filterPlaceholder = attrs.filterPlaceholder ? attrs.filterPlaceholder : "Filter ..",
                    checkAllLabel = attrs.checkAllLabel ? attrs.checkAllLabel : "Check all",
                    uncheckAllLabel = attrs.uncheckAllLabel ? attrs.uncheckAllLabel : "Uncheck all",
                    appendToBody = attrs.appendToBody ? originalScope.$eval(attrs.appendToBody) : false,
                    orderLabel = attrs.orderLabel ? attrs.orderLabel : "$index",
                    required = false,
                    lastSelectedLabel = '',
                    scope = originalScope.$new(true),
                    changeHandler = attrs.change || angular.noop,
                    popUpEl = angular.element('<multiselect-popup></multiselect-popup>'),
                    popupId = 'multiselect-' + scope.$id + '-' + Math.floor(Math.random() * 10000),
                    timeoutEventPromise,
                    eventDebounceTime = 200,

                    isChecked = function (i) {
                        return i.checked === true;
                    },

                    getFilteredItems = function () {
                        var filteredItems = $filter("filter")(scope.items, scope.searchText);
                        return filteredItems;
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
                        var aboveLimit = false;
                        if (selectLimit === 0 || !isMultiple) {
                            belowLimit = true;
                            atLimit = false;
                        } else {
                            var checkedItems = scope.items.filter(isChecked);
                            atLimit = checkedItems.length === selectLimit;
                            aboveLimit = checkedItems.length > selectLimit;
                            belowLimit = checkedItems.length < selectLimit;
                        }
                        scope.maxSelected = atLimit || aboveLimit;
                        return atLimit || belowLimit;
                    },
                    getHeaderText = function () {
                        var localHeader = header;
                        if (isEmpty(modelCtrl.$modelValue)) return scope.header = localHeader;
                        if (isMultiple) {
                            var isArray = modelCtrl.$modelValue instanceof Array;
                            if (isArray && modelCtrl.$modelValue.length > 1) {
                                localHeader = modelCtrl.$modelValue.length + ' ' + selectedHeader;
                            } else {
                                localHeader = getFirstSelectedLabel();
                            }
                        } else {
                            //var local = {};
                            //local[parserResult.itemName] = parseInt(modelCtrl.$modelValue);
                            //localHeader = parserResult.viewMapper(local);
                            localHeader = getFirstSelectedLabel();
                        }
                        scope.header = localHeader;
                    },
                    isEmpty = function (obj) {
                        if (!obj) return true;
                        if (!isComplex && obj) return false;
                        if (obj.length && obj.length > 0) return false;
                        for (var prop in obj) if (obj[prop]) return false;
                        return true;
                    },
                    parseModel = function () {
                        scope.items.length = 0;
                        var model = parserResult.source(originalScope);
                        if (!angular.isDefined(model)) return;
                        isArray = modelCtrl.$modelValue instanceof Array;
                        for (var i = 0; i < model.length; i++) {
                            var local = {};
                            local[parserResult.itemName] = model[i];
                            var value = parserResult.modelMapper(local)
                            var isChecked = isArray ?
                                (modelCtrl.$modelValue.indexOf(value.toString()) != -1 || modelCtrl.$modelValue.indexOf(value) != -1) :
                                (!isEmpty(modelCtrl.$modelValue) && modelCtrl.$modelValue == value);
                            var item = {
                                label: parserResult.viewMapper(local),
                                model: model[i],
                                checked: isChecked
                            };
                            scope.items.push(item);
                        }
                        getHeaderText();
                    },
                    selectSingle = function (item) {
                        if (item.checked) {
                            scope.uncheckAll();
                        } else {
                            scope.uncheckAll();
                            item.checked = true;
                        }
                        setModelValue(false);
                    },
                    selectMultiple = function (item) {
                        if (item.checked) {
                            item.checked = false;
                            canCheck();
                        } else if (!scope.maxSelected) {
                            item.checked = canCheck();
                        }
                        setModelValue(true);
                    },
            getModelValue = function (item) {
                if (isComplex) {
                    value = item.model;
                }
                else {
                    var local = {};
                    local[parserResult.itemName] = item.model;
                    value = parserResult.modelMapper(local);
                }
                return value;
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
                scope.triggered = true;
                modelCtrl.$setViewValue(value);
            },

            markChecked = function (newVal) {
                if (!angular.isArray(newVal)) {
                    angular.forEach(scope.items, function (item) {
                        var value = getModelValue(item);
                        if (angular.equals(value, newVal)) {
                            item.checked = true;
                            return false;
                        }
                    });
                } else {
                    var itemsToCheck = [];
                    var itemsToUncheck = [];
                    var itemValues = [];
                    for (var j = 0; j < scope.items.length; j++) {
                        itemValues.push(getModelValue(scope.items[j]));
                        itemsToUncheck.push(j);
                    };

                    for (var i = 0; i < newVal.length; i++) {
                        for (var j = 0; j < itemValues.length; j++) {
                            if (angular.equals(itemValues[j], newVal[i])) {
                                itemsToCheck.push(scope.items[j]);
                                var index = itemsToUncheck.indexOf(j);
                                itemsToUncheck.splice(index, 1);
                                break;
                            }
                        }
                    }

                    for (var i = 0; i < itemsToCheck.length; i++) {
                        itemsToCheck[i].checked = true;
                    }

                    for (var i = 0; i < itemsToUncheck.length; i++) {
                        scope.items[itemsToUncheck[i]].checked = false;
                    }

                }
            },

            // recalculate actual position and set new values to scope
            // after digest loop is popup in right position
            recalculatePosition = function () {
                scope.position = appendToBody ? $position.offset($popup) : $position.position(element);
                scope.position.top += $popup.prop('offsetHeight');
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
            };

                scope.items = [];
                scope.header = header;
                scope.multiple = isMultiple;
                scope.disabled = false;
                scope.filterPlaceholder = filterPlaceholder;
                scope.checkAllLabel = checkAllLabel;
                scope.uncheckAllLabel = uncheckAllLabel;
                scope.selectLimit = selectLimit;
                scope.enableFilter = enableFilter;
                scope.enableCheckAll = enableCheckAll;
                scope.enableUncheckAll = enableUncheckAll;
                scope.searchText = { label: '' };
                scope.isAutoFocus = isAutoFocus;
                scope.appendToBody = appendToBody;
                scope.moveInProgress = false;
                scope.popupId = popupId;
                scope.recalculatePosition = recalculatePosition;
                scope.isModelValueSet = false;
                scope.orderLabel = orderLabel;
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
                    return $parse(attrs.ngDisabled)(originalScope);
                }, function (newVal) {
                    scope.disabled = newVal;
                });

                //watch single/multiple state for dynamically change single to multiple
                scope.$watch(function () {
                    return $parse(attrs.multiple)(originalScope);
                }, function (newVal) {
                    isMultiple = newVal || false;
                });

                //watch option changes for options that are populated dynamically
                scope.$watch(function () {
                    return parserResult.source(originalScope);
                }, function (newVal) {
                    if (angular.isDefined(newVal)) {
                        parseModel();
                        setModelValue(isMultiple);
                    }
                }, true);

                ////watch model change  --> This has an issue in that it seems that all models are updated to the same value
                scope.$watch(function () {
                    return modelCtrl.$modelValue;
                }, function (newVal, oldVal) {
                    //when directive initializes, newVal is usually undefined. Also, if model value is already set in the controller
                    //for preselected list then we need to mark checked in our scope item. But we don't want to do this every time the
                    //model changes. We need to do this only if it is done outside directive scope, from controller, for example.
                    if (!scope.triggered) {
                        if (angular.isDefined(newVal)) {
                            var isArray = newVal instanceof Array;
                            if ((isArray && newVal.length == 0) || !isArray) {
                                scope.uncheckAll();
                            }
                            markChecked(newVal);
                            scope.isModelValueSet = true;
                            // Technically, defining ngChange will already have a watcher triggering its handler
                            // So, triggering it manually should be redundant
                            //scope.$eval(changeHandler);
                        } else if (scope.isModelValueSet) {
                            // If the model value is cleared externally, and we previously had some things checked,
                            // we need to uncheck them.
                            scope.uncheckAll();
                            scope.isModelValueSet = false;
                        }
                    }
                    getHeaderText();
                    canCheck();
                    modelCtrl.$setValidity('required', scope.valid());
                    scope.triggered = false;
                }, true);

                parseModel();
                var $popup = $compile(popUpEl)(scope);
                element.append($popup);
                $timeout(function () { recalculatePosition(); }, 100);

                scope.valid = function validModel() {
                    if (!required) return true;
                    var value = modelCtrl.$modelValue;
                    return (angular.isArray(value) && value.length > 0) || (!angular.isArray(value) && value != null);
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
                    setModelValue(true);
                };

                scope.uncheckAll = function () {
                    var items = useFiltered ? getFilteredItems() : scope.items;
                    angular.forEach(items, function (item) {
                        item.checked = false;
                    });
                    canCheck();
                    if (isMultiple) {
                        setModelValue(true);
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

                scope.clearFilter = function () {
                    scope.searchText.label = '';
                };
            }
        };
    };

    var multiselectPopup = function ($document) {
        return {
            restrict: 'E',
            replace: true,
            require: ['^ngModel', '?^form'],
            templateUrl: 'template/multiselect/multiselectPopup.html',
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
                scope.isVisible = false;
                scope.isHeightChanged = true;

                var
                    dropdownHeight,
                    dropdownWidth;

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

                    if (scope.isHeightChanged) {
                        dropdownHeight = ulElement.height();
                        dropdownWidth = ulElement.width();
                        scope.isHeightChanged = false;
                    }

                    // If we have no height/width, the element isn't visisble - we can clone it and show it off screen to get
                    // its visibile dimensions. Alternatively, we could just make the element visible and then adjust,
                    // but this might result in some screen flicker... who knows?
                    if (dropdownHeight <= 0 && dropdownWidth <= 0) {
                        var clonedElement = $(ulElement)
                            .clone()
                            .css('position', 'fixed')
                            .css('top', '0')
                            .css('left', '-10000px')
                            .appendTo(parent)
                            .removeClass('ng-hide')
                            .show();

                        dropdownHeight = clonedElement.height();
                        dropdownWidth = clonedElement.width();

                        // Memory clean up - also, if you don't remove the clone from the DOM, IE11 increases the height of the HTML DOM element (buggy piece of junk!)
                        clonedElement.remove();
                        clonedElement = null;
                    }

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

    // IE11 doesn't enable the filter box when parent changes is using disabled attribute - so, use ng-disabled in your own HTML!
    angular.module("long2know").run(["$templateCache", function ($templateCache) {
        $templateCache.put("template/multiselect/multiselectPopup.html",
            "<div class=\"btn-group\" ng-class=\"{ dropup: dropup, single: !multiple }\">" +
                "<button type=\"button\" class=\"btn btn-default dropdown-toggle\" ng-click=\"toggleSelect()\" ng-disabled=\"disabled\" ng-class=\"{'has-error': !valid()}\">" +
                    "<span class=\"pull-left\" ng-bind=\"header\"></span>" +
                    "<span class=\"caret pull-right\"></span>" +
                "</button>" +
                "<ul class=\"dropdown-menu multi-select-popup\" ng-show=\"isOpen && !moveInProgress\" ng-style=\"{ true: {top: position.top +'px', left: position.left +'px'}, false: {} }[appendToBody]\" style=\"display: block;\" role=\"listbox\" aria-hidden=\"{{!isOpen}}\">" +
                    "<li ng-if=\"enableFilter\" class=\"filter-container\">" +
                        "<div class=\"form-group has-feedback filter\">" +
                            "<input class=\"form-control\" type=\"text\" ng-model=\"searchText.label\" placeholder=\"{{ filterPlaceholder }}\" />" +
                            "<span class=\"glyphicon glyphicon-remove-circle form-control-feedback\" ng-click=\"clearFilter()\"></span>" +
                        "</div>" +
                    "</li>" +
                    "<li ng-show=\"multiple && (enableCheckAll || enableUncheckAll)\">" +
                        "<button ng-if=\"enableCheckAll\" type=\"button\" class=\"btn-link btn-small\" ng-click=\"checkAll()\"><i class=\"icon-ok\"></i> {{ checkAllLabel }}</button>" +
                        "<button ng-if=\"enableUncheckAll\" type=\"button\" class=\"btn-link btn-small\" ng-click=\"uncheckAll()\"><i class=\"icon-remove\"></i> {{ uncheckAllLabel }}</button>" +
                    "</li>" +
                    "<li ng-show=\"maxSelected\">" +
                        "<small>Selected maximum of </small><small ng-bind=\"selectLimit\"></small>" +
                    "</li>" +
                    "<li ng-repeat=\"i in items | filter:searchText | orderBy:orderLabel:true\">" +
                        //"<a ng-click=\"select(i); focus()\">" +
                        "<a ng-click=\"select(i);\">" +
                            "<i class=\"glyphicon\" ng-class=\"{'glyphicon-ok': i.checked, 'glyphicon-none': !i.checked}\"></i>" +
                            "<span ng-bind=\"i.label\"></span>" +
                        "</a>" +
                    "</li>" +
                "</ul>" +
            "</div>");
    }]);

    multiselectParser.$inject = ['$parse'];
    multiselect.$inject = ['$parse', '$timeout', '$filter', '$document', '$compile', '$window', '$uibPosition', 'multiselectParser'];
    multiselectPopup.$inject = ['$document'];

    angular
        .module("long2know.services")
        .factory('multiselectParser', multiselectParser);

    angular
        .module('long2know.directives')
        .directive('multiselectPopup', multiselectPopup);

    angular
        .module('long2know.directives')
        .directive('multiselect', multiselect);
})()
