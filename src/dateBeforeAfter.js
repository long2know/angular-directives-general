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

    var dateBefore = function () {
        var directive = {
            require: 'ngModel',
            link: function (scope, el, attrs, ctrl) {
                var isInclusive = attrs.dateOrEquals ? scope.$eval(attrs.dateOrEquals) : false,
                    validate = function (val1, val2) {
                        if ((val1 === undefined || val2 === undefined) || (!val1 || !val2)) {
                            ctrl.$setValidity('dateBefore', true);
                            return;
                        };
                        var isArray = val2 instanceof Array;
                        var isValid = true;
                        var date1 = new Date(val1);
                        if (isArray && val2.length > 0) {
                            for (var i = 0; i < val2.length; i++) {
                                if (val2[i]) {
                                    var date2 = new Date(val2[i]);
                                    isValid = isValid && (isInclusive ? date1 <= date2 : date1 < date2);
                                }
                                if (!isValid)
                                    break;
                            }
                        }
                        else {
                            if (val2) {
                                var date2 = new Date(val2);
                                isValid = isInclusive ? date1 <= date2 : date1 < date2;
                            }
                        }
                        ctrl.$setValidity('dateBefore', isValid);
                    };
                // Watch the value to compare - trigger validate()
                scope.$watch(attrs.dateBefore, function () {
                    validate(ctrl.$viewValue, scope.$eval(attrs.dateBefore));
                });

                ctrl.$parsers.unshift(function (value) {
                    validate(value, scope.$eval(attrs.dateBefore));
                    return value;
                })
            }
        }
        return directive
    };

    var dateAfter = function () {
        var directive = {
            require: 'ngModel',
            link: function (scope, el, attrs, ctrl) {
                var isInclusive = attrs.dateOrEquals ? scope.$eval(attrs.dateOrEquals) : false,
                    validate = function (val1, val2) {
                        if ((val1 === undefined || val2 === undefined) || (!val1 || !val2)) {
                            ctrl.$setValidity('dateAfter', true);
                            return;
                        };
                        var isArray = val2 instanceof Array;
                        var isValid = true;
                        var date1 = new Date(val1);
                        if (isArray && val2.length > 0) {
                            for (var i = 0; i < val2.length; i++) {
                                if (val2[i]) {
                                    var date2 = new Date(val2[i]);
                                    isValid = isValid && (isInclusive ? date1 >= date2 : date1 > date2);
                                }
                                if (!isValid)
                                    break;
                            }
                        }
                        else {
                            if (val2) {
                                var date2 = new Date(val2);
                                isValid = isInclusive ? date1 >= date2 : date1 > date2;
                            }
                        }
                        ctrl.$setValidity('dateAfter', isValid);
                    };
                // Watch the value to compare - trigger validate()
                scope.$watch(attrs.dateAfter, function () {
                    validate(ctrl.$viewValue, scope.$eval(attrs.dateAfter));
                });

                ctrl.$parsers.unshift(function (value) {
                    validate(value, scope.$eval(attrs.dateAfter));
                    return value;
                })
            }
        }
        return directive
    };

    angular.module('long2know.directives')
        .directive('dateBefore', dateBefore);

    angular.module('long2know.directives')
        .directive('dateAfter', dateAfter);
})()