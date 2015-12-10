(function () {
    angular.module('myApp.controllers', []);

    var myApp = angular.module('myApp', [
        'myApp.controllers',
        'long2know',
        'ngSanitize',
        'ui.bootstrap',
        'ui.router',
        'ui']);

    var state1Ctrl = function () {
        var vm = this;
        
        vm.getStuff = function (val) {
            var list = [];
            for (var i = 0; i < 10; i++) {
                list.push({ key: i + 1, value: 'Prop' + (i + 1).toString() });
            }
            return list;
        };
    };

    state1Ctrl.$inject = [];
    
    angular.module('myApp.controllers')
        .controller('state1Ctrl', state1Ctrl);

    myApp.config(['$locationProvider', '$stateProvider', '$urlRouterProvider',

        function ($locationProvider, $stateProvider, $urlRouterProvider) {

            $locationProvider.html5Mode(false);

            $urlRouterProvider.when('/', '/state1')
                .otherwise("/state1");

            $stateProvider.state('app', {
                abstract: true,
                url: '/',
                views: {
                    'main': {
                        template: '<div ui-view>/div>'
                    }
                }
            })
            .state('app.state1', {
                url: 'state1',
                templateUrl: 'state1.html',
                controller: 'state1Ctrl',
                controllerAs: 'vm',
                reloadOnSearch: false
            })
        }]);

    myApp.run(['$log', function ($log) {
        $log.log("Start.");
    }]);
})()