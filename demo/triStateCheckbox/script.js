(function () {
    angular.module('myApp.controllers', []);

    var myApp = angular.module('myApp', [
        'myApp.controllers',
        'long2know',
        'ngSanitize',
        'ui.bootstrap',
        'ui.router',
        'ui']);

    var myController = function ($scope, $timeout, $animate, $log) {
        var vm = this,
            initItems = function () {
                vm.items = [];
                for (var i = 0; i < 5; i++) {
                    vm.items.push({ id: vm.items.length, name: "Item " + i.toString() });
                }
            },
            init = function () {
                initItems();
            };

        vm.addItem = function () {
            vm.items.push({ id: vm.items.length, name: "Item " + vm.items.length.toString() });
            vm.selectionChanged(vm.items[vm.items.length - 1]);
        };

        vm.selectionChanged = function (item) {
            $scope.$broadcast("childClick", item);
        };

        init();
    };

    myController.$inject = ['$scope', '$timeout', '$animate', '$log'];
    angular.module('myApp.controllers')
        .controller('myCtrl', myController);

    myApp.config(['$modalProvider', '$locationProvider',
        function ($modalProvider, $locationProvider) {
            $modalProvider.options = { dialogFade: true, backdrop: 'static', keyboard: false };
            $locationProvider.html5Mode(false);
        }]);

    myApp.run(['$log', function ($log) { $log.log("Start."); }]);
})()