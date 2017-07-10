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
    var copyToClipboard = function (clipboardService) {
        var directive = {
            restrict: 'A',
            //scope: {
            //    ngModel: '='
            //},
            require: ['?ngModel'],
            link: function (scope, el, attrs, ctrls) {
                el.on('click', function () {
                    var value = undefined;
                    if (ctrls && ctrls.length > 0 && ctrls[0]) {
                        var ngModelCtrl = ctrls[0];
                        value = ngModelCtrl.$viewValue;
                    } else {
                        value = scope.$eval(attrs.copyToClipboard);
                    }

                    clipboardService.copy(value);
                });
            }
        };

        return directive;
    };

    copyToClipboard.$inject = ['clipboardService'];
    angular.module("long2know.directives")
        .directive('copyToClipboard', copyToClipboard);
})()