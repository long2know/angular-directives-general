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

    var keyTimer;
    var serverError = function () {
        var directive = {
            restrict: 'A',
            require: 'ngModel',
            link: function (scope, elm, attrs, ctrl) {
                var
                    isClearOnClick = attrs.serverError = '' ? false : scope.$parent.$eval(attrs.serverError),
                    clearError = function (apply) {
                        if (ctrl.$invalid && ctrl.$error.server) {
                            ctrl.$setValidity('server', true);
                            ctrl.$setValidity('serverMessage', true);
                            if (apply) {
                                scope.$apply();
                            }
                        }
                    };

                if (isClearOnClick) {
                    elm.on('click', function () {
                        clearError();
                    });

                    var inputGroup = elm.parents('.input-group');
                    var inputGroupBtn = $(inputGroup, '.input-group-btn > button:first');
                    inputGroupBtn.on('click', function () {
                        clearError(true);
                    });
                };

                // Always clear on key press.
                elm.on('keyup', function () {
                    if (ctrl.$invalid && ctrl.$error.server) {
                        clearInterval(keyTimer);
                        keyTimer = setTimeout(function () {
                            clearError(true);
                        }, 200);
                    }
                });
            }
        };
        return serverError;
    }

    serverError.$inject = [];
    angular.module("long2know.directives")
        .directive('serverError', serverError);
})()
