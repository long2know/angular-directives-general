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
        var vm = this,
        getRandomInt = function(min, max) {
            return Math.floor(Math.random() * (max - min + 1) + min);
        };

        vm.options1 = [];
        for (var i = 0; i < 10; i++) {
            vm.options1.push({ key: i + 1, value: 'Prop' + (i + 1).toString() });
        }

        vm.options2 = [];
        for (var i = 0; i < 100; i++) {
            vm.options2.push({ key: i + 1, value: 'Prop' + (i + 1).toString() });
        }

        vm.option6 = 3;
        vm.option7 = [4, 11, 23];
        
        vm.clear = function() {
            vm.option1 = [];
            vm.option2 = [];
            vm.option3 = [];
            vm.option4 = [];
            vm.option5 = [];
            vm.option6 = [];
            vm.option7 = [];
        };
        
        vm.randomSelect = function() {
            vm.clear();
            var arrSelected = [ vm.option1, vm.option2, vm.option3, vm.option4, vm.option5, vm.option6, vm.option7];
            var arrOptions = [ vm.options1, vm.options2, vm.options2, vm.options1, vm.options1, vm.options1, vm.options2 ];
            var arrIsSingle = [ false, false, false, true, false, false, false  ];
            var arrIsSimple = [ true, true, false, false, true, true, true  ];
            
            for (var i = 0; i < arrSelected.length; i++) {
                var selected = arrSelected[i];
                var options = arrOptions[i];
                var isSingle = arrIsSingle[i];
                var isSimple = arrIsSimple[i];
                var min = 0;
                var max = options.length - 1;
                if (isSingle) {
                    var randIndex = getRandomInt(min, max);
                    if (isSimple) {
                        selected.push(options[randIndex].key); 
                    } else {
                        selected.push(options[randIndex]);
                    }
                }
                else
                {
                    var toSelectIndexes = [];
                    var numItems = getRandomInt(0, options.length) + 1;
                    for (var j = 0; j < getRandomInt(1, numItems); j++)
                    {
                        var randIndex = getRandomInt(min, max);
                        var arrIndex = toSelectIndexes.indexOf(randIndex);
                        if (arrIndex == -1) {
                            toSelectIndexes.push(randIndex);
                            if (isSimple) {
                                selected.push(options[randIndex].key); 
                            } else {
                                selected.push(options[randIndex]);   
                            }
                        }
                    }
                }
            }
        }
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