(function () {
    angular.module('myApp.controllers', []);

    var myApp = angular.module('myApp', [
        'myApp.controllers',
        'long2know',
        'ngSanitize',
        'ui.bootstrap',
        'ui.router',
        'ui']);

    var state1Ctrl = function ($filter) {
        var vm = this;

        vm.getDate = function() {
            return new Date();
        };
    };

    state1Ctrl.$inject = ['$filter'];
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