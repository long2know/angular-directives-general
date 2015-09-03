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

    var isStateDirective = function ($animate, $timeout) {
        var directive = {
            restrict: 'A',
            scope: {
                isState: '=',
                isStateClass: '=',
                isStateTimeout: '='
            },
            link: function (scope, element, attrs) {
                var
                    className = angular.isDefined(attrs.isStateClass) ? scope.isStateClass : 'is-state',
                    timeout = angular.isDefined(attrs.isStateTimeout) ? scope.isStateTimeout : 2000,
                    startAnimation = function () {
                        if (scope.isState) {
                            $animate.addClass(element, className);
                            $timeout(function () {
                                scope.isState = false;
                                $animate.removeClass(element, className);
                            }, timeout);
                        } else if (scope.isState === false) {
                            $animate.removeClass(element, className);
                        }
                    };

                // Watch the attribute to toggle
                scope.$watch('isState', function () {
                    startAnimation();
                });
            }
        };
        return directive;
    };

    isStateDirective.$inject = ['$animate', '$timeout'];
    angular.module("long2know.directives")
        .directive('isState', isStateDirective);
})()
