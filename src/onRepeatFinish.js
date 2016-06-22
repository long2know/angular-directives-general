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

    var onRepeatFinish = function ($timeout) {
        var directive = {
            restrict: 'A',
            link: function (scope, element, attr) {
                if (scope.$last === true) {
                    if (attr.onRepeatFinish) {
                        scope.$eval(attr.onRepeatFinish);
                    } else {
                        $timeout(function () {
                            scope.$emit('ngRepeatFinished');
                        });
                    }
                }
            }
        };
        return directive;
    };

    onRepeatFinish.$inject = ['$timeout', '$log'];
    angular.module("long2know.directives")
        .directive('onRepeatFinish', onRepeatFinish);
})()