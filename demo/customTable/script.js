(function () {
    angular.module('myApp.controllers', []);

    var myApp = angular.module('myApp', [
        'long2know',
        'myApp.controllers',
        'ngSanitize',
        'ui.bootstrap',
        'ui.router',
        'ui']);

    var myController = function ($scope, $timeout, $animate, $log, watchCountService) {
        var vm = this,
            addItems = function (count) {
                for (var i = 0; i < count; i++) {
                    var suffix = vm.tableData1.length.toString();
                    var money = (Math.random() * 1000).toFixed(2);
                    var date = new Date();
                    date.setDate(date.getDate() + vm.tableData1.length);
                    vm.tableData1.push({
                        id: suffix, column2: "Column2_" + suffix, column3: "Column3_" + suffix, column4: "Column4_" + suffix, column5: "Column5_" + suffix,
                        column6: money, column7: "Column7_" + suffix, column8: date
                    });
                    vm.tableData2.push({
                        id: suffix, column2: "Column2_" + suffix, column3: "Column3_" + suffix, column4: "Column4_" + suffix, column5: "Column5_" + suffix,
                        column6: money, column7: "Column7_" + suffix, column8: date
                    });
                }
            },
            init = function () {
                vm.tableData1 = [];
                vm.tableData2 = [];
                var columns = [
                    { name: 'Column 1', value: 'column1', binding: "r.column3 + \" / \" + r.column4", style: {}, isWatched: true, isAnchor: false, isComputed: true, srefBinding: 'state expression here' },
                    { name: 'Column 2', value: 'column2', binding: 'column2', isWatched: true, style: {} },
                    { name: 'Column 3', value: 'column3', binding: 'column3', isWatechhed: true, style: {} },
                    { name: 'Column 4', value: 'column4', binding: 'column4', isWatched: true, style: {} },
                    { name: 'Column 5', value: 'column5', binding: 'column5', style: {} },
                    { name: 'Column 6', value: 'column6', binding: 'column6', filter: "currency", isWatched: true, style: {} },
                    { name: 'Column 7', value: 'column7', binding: 'column7', style: {} },
                    { name: 'Column 8', value: 'column8', binding: 'column8', filter: "date:\"MM/dd/yyyy\"", style: {} }];
                vm.tableColumns = columns;
                vm.sortDirection1 = "asc";
                vm.sortBy1 = "column1";
                vm.sortDirection2 = "asc";
                vm.sortBy2 = "column1";
                vm.watchCount = 0;
                vm.isTable1Visible = false;
                vm.isTable2Visible = false;

                $scope.$watch(
                    function watchCountExpression() {
                        return (watchCountService.getWatchCount());
                    },
                    function handleWatchCountChange(newValue) {
                        vm.watchCount = newValue;
                    });

                $scope.$on('tableSortHeaderClicked', function (event, data) {

                });

                addItems(100);
                vm.toggleTable1();
                vm.toggleTable2();
            };

        vm.addItems = function (numItems) {
            addItems(numItems);
        };

        vm.removeItems = function (numItems) {
            if (vm.tableData1.length >= numItems) {
                $timeout(function () {
                    vm.tableData1.splice(-1 * numItems, numItems);
                    vm.tableData2.splice(-1 * numItems, numItems);
                    $scope.$apply();
                }, 0);
            }
        };

        vm.toggleTable1 = function () {
            $timeout(function () { vm.isTable1Visible = !vm.isTable1Visible; $scope.$apply(); }, 1);
        };

        vm.toggleTable2 = function () {
            $timeout(function () { vm.isTable2Visible = !vm.isTable2Visible; }, 1);
        };

        init();
    };

    myController.$inject = ['$scope', '$timeout', '$animate', '$log', 'watchCountService'];
    angular.module('myApp.controllers')
        .controller('myCtrl', myController);

    myApp.config(['$modalProvider', '$locationProvider',
        function ($modalProvider, $locationProvider) {
            $modalProvider.options = { dialogFade: true, backdrop: 'static', keyboard: false };
            $locationProvider.html5Mode(false);
        }]);

    myApp.run(['$log', function ($log) { $log.log("Start."); }]);
})()