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
                for (var i = 0; i < 10; i++) {
                    vm.items.push({ name: "Item " + i.toString() });
                }
            },
            init = function () {
                $timeout(function () { setTimeout(initItems(), 2000) }, 0);
            };

        vm.addItem = function () {
            vm.items.push({ name: "Item " + vm.items.length.toString() });
        };

        $animate.enabled(false);

        var listener = $scope.$on('ngRepeatFinished', function () {
            $log.log("Message received - turning animations on");
            $animate.enabled(true);

            $log.log("Unregistering listener");
            listener();
            listener = null;
        });

        init();
    };

    var newItem = function ($timeout, $log) {
        var animation = {
            enter: function (element, done) {
                element.addClass('new-item');
                $timeout(function () {
                    element.removeClass('new-item');
                    done();
                }, 2000);
            }
        };

        return animation;
    };

    newItem.$inject = ['$timeout', '$log'];
    angular.module('myApp.services')
        .animation('.new-list-item', newItem);

    myController.$inject = ['$scope', '$timeout', '$animate', '$log'];
    angular.module('myApp.controllers')
        .controller('myCtrl', myController);

    myApp.run(['$log', function ($log) { $log.log("Start."); }]);
})()