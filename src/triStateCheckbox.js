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
        angular.module('long2know',
            [
                'long2know.services',
                'long2know.controllers',
                'long2know.directives'
            ]);
    }

    var triStateCheckbox = function () {
        var directive = {
            replace: true,
            restrict: 'E',
            scope: {
                items: '=',
                topLevelClick: '=',
                childClick: '@childClick'
            },
            template: '<input type="checkbox" ng-model="topLevel" ng-change="topLevelChange()">',
            controller: ['$scope', '$element', function ($scope, $element) {

                $scope.setState = function () {
                    var count = 0;
                    for (i = 0; i < $scope.items.length; i++)
                        count += $scope.items[i].isSelected ? 1 : 0;
                    $element.prop('indeterminate', false);
                    $scope.topLevel = (count === 0) ? false : true;
                    if (count > 0 && count < i) {
                        $scope.topLevel = false;
                        $element.prop('indeterminate', true);
                    }
                };

                $scope.topLevelChange = function () {
                    for (i = 0; i < $scope.items.length; i++) {
                        $scope.items[i].isSelected = $scope.topLevel;
                    }
                    if ($scope.topLevelClick) {
                        $scope.topLevelClick();
                    }
                };

                if (!$scope.childClick) {
                    $scope.$watch('items', function () {
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