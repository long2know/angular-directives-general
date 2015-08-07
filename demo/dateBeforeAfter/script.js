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
        vm.minDate = new Date();
        vm.maxDate = new Date();
        vm.minDate = vm.minDate.setDate(vm.minDate.getDate() - 30);
        vm.maxDate = vm.maxDate.setDate(vm.maxDate.getDate() + 30);
        vm.dateFormat = 'MM/dd/yyyy';
        vm.dateOptions = {
            'year-format': "'yyyy'",
            'starting-day': 1
        };

        vm.disabled = function (date, mode) {
            return (mode === 'day' && false); // (date.getDay() === 0 || date.getDay() === 6));
        };

        vm.dateChanged = function () {
            vm.filteredDate1 = { date: vm.date1, filtered: $filter('date')(vm.date1, "MM/dd/yyyy") };
            vm.filteredDate2 = { date: vm.date2, filtered: $filter('date')(vm.date2, "shortDate") };
            vm.filteredDate3 = { date: vm.date3, filtered: $filter('date')(vm.date3, "MM/dd/yyyy") };
            vm.filteredDate4 = { date: vm.date4, filtered: $filter('date')(vm.date4, "shortDate") };
            vm.filteredDate5 = { date: vm.date5, filtered: $filter('date')(vm.date5, "shortDate") };
            vm.filteredDate6 = { date: vm.date6, filtered: $filter('date')(vm.date6, "shortDate") };
            vm.filteredDate7 = { date: vm.date7, filtered: $filter('date')(vm.date7, "shortDate") };
            vm.filteredDate8 = { date: vm.date8, filtered: $filter('date')(vm.date8, "shortDate") };
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