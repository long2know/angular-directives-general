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

    var triStateCheckbox = function () {
        var directive = {
            replace: true,
            restrict: 'E',
            scope: {
                checkboxes: '=',
                masterSet: '=',
                setMaster: '=',
                masterClicked: '=',
                masterChange: '=',
                masterSetOff: '@masterSetOff',
                childClick: '@childClick'
            },
            template: '<input type="checkbox" ng-click="clicked()" ng-model="master">',
            controller: ['$scope', '$timeout', '$element', function ($scope, $timeout, $element) {
                $scope.setState = function () {
                    var set = 0;
                    for (i = 0; i < $scope.checkboxes.length; i++)
                        set += $scope.checkboxes[i].isSelected ? 1 : 0;
                    $element.prop('indeterminate', false);
                    $scope.master = (set === 0) ? false : true;
                    if (set > 0 && set < i) {
                        $scope.master = false;
                        $element.prop('indeterminate', true);
                    }

                    if ($scope.master === true) {
                        $element.prop('checked', true);
                    } else {
                        $element.prop('checked', false);
                    }
                };

                $scope.$on($scope.masterSetOff, function () {
                    $element.prop('indeterminate', false);
                    $element.prop('checked', false);
                });

                $scope.clicked = function () {
                    $scope.masterChanged();
                    if ($scope.masterClicked) {
                        $scope.masterClicked();
                    }
                }

                $scope.masterChanged = function () {
                    for (i = 0; i < $scope.checkboxes.length; i++) {
                        $scope.checkboxes[i].isSelected = $scope.master;
                    }
                    if ($scope.masterChange) {
                        $scope.masterChange();
                    }
                };

                if (!$scope.childClick) {
                    $scope.$watch('checkboxes', function () {
                        $scope.setState();
                    }, true);
                } else {
                    $scope.$on($scope.childClick, function () {
                        $scope.setState();
                    });
                    $scope.setState();
                }
            }]
        };

        return directive;
    };

    triStateCheckbox.$inject = [];
    angular.module("long2know.directives")
        .directive('triStateCheckbox', triStateCheckbox);
})()