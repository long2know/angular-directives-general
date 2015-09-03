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
                masterClick: '=',
                masterSetOff: '@masterSetOff',
                childClick: '@childClick'
            },
            template: '<input type="checkbox" ng-model="master" ng-change="masterChange()">',
            controller: ['$scope', '$element', function ($scope, $element) {

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
                };

                $scope.$on($scope.masterSetOff, function () {
                    $element.prop('indeterminate', false);
                    $element.attr('checked', false);
                });

                $scope.masterChange = function () {
                    for (i = 0; i < $scope.checkboxes.length; i++) {
                        $scope.checkboxes[i].isSelected = $scope.master;
                    }
                    if ($scope.masterClick) {
                        $scope.masterClick();
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