(function () {
    angular.module('myApp.controllers', []);
    angular.module('myApp.services', ['ngResource', 'ngAnimate']);

    var myApp = angular.module('myApp', [
        'myApp.controllers',
        'myApp.services',
        'long2know',
        'ngSanitize',
        'ui.bootstrap',
        'ui.router',
        'ui']);

    var myController = function ($scope, $timeout, $animate, $log) {
        var vm = this,
            initItems = function () {
                vm.items = [];
                vm.items2 = [];
                for (var i = 1; i < 6; i++) {
                    vm.items.push({ id: 'list1_' + i.toString(), name: "Item1 " + i.toString() });
                    vm.items2.push({ id: 'list2_' + i.toString(), name: "Item2 " + i.toString() });
                }
            },
            init = function () {
                vm.timeout = 3000;
                vm.className = 'is-state';
                $timeout(function () { setTimeout(initItems(), 2000) }, 0);
            };

        vm.addItem = function () {
            vm.items.push({ name: "Item " + vm.items.length.toString() });
        };

        vm.itemListClick = function (item) {
            $timeout(function () { item.isSelected = false; }, vm.timeout);
        };

        init();
    };

    myController.$inject = ['$scope', '$timeout', '$animate', '$log'];
    angular.module('myApp.controllers')
        .controller('myCtrl', myController);

    myApp.run(['$log', function ($log) { $log.log("Start."); }]);
})()