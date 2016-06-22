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
                    var suffix = vm.table1Options.records.length.toString();
                    var money = (Math.random() * 1000).toFixed(2);
                    var date = new Date();
                    date.setDate(date.getDate() + vm.table1Options.records.length);
                    vm.table1Options.records.push({
                        id: suffix, column2: "Column2_" + suffix, column3: "Column3_" + suffix, column4: "Column4_" + suffix, column5: "Column5_" + suffix,
                        column6: money, column7: "Column7_" + suffix, column8: date
                    });
                    vm.table2Options.records.push({
                        id: suffix, column2: "Column2_" + suffix, column3: "Column3_" + suffix, column4: "Column4_" + suffix, column5: "Column5_" + suffix,
                        column6: money, column7: "Column7_" + suffix, column8: date
                    });
                }
            },
            init = function () {
                var columns = [
                    { name: 'Column 1', value: 'column1', binding: "r.column3 + \" / \" + r.column4", style: {}, isWatched: true, isAnchor: false, isComputed: true, srefBinding: 'state expression here' },
                    { name: 'Column 2', value: 'column2', binding: 'column2', isWatched: true, style: {} },
                    { name: 'Column 3', value: 'column3', binding: 'column3', isWatechhed: true, style: {} },
                    { name: 'Column 4', value: 'column4', binding: 'column4', isWatched: true, style: {} },
                    { name: 'Column 5', value: 'column5', binding: 'column5', style: {} },
                    { name: 'Column 6', value: 'column6', binding: 'column6', filter: "currency", isWatched: true, style: {} },
                    { name: 'Column 7', value: 'column7', binding: 'column7', style: {} },
                    { name: 'Column 8', value: 'column8', binding: 'column8', filter: "date:\"MM/dd/yyyy\"", style: {} }
                ];

                vm.watchCount = 0;
                vm.isTable1Visible = false;
                vm.isTable2Visible = false;

                vm.table1Options = {
                    records: [],
                    updatedRecords: [],
                    columnDefns: columns,
                    rowDefns: {
                        computedClass: "{ 'is-error': r.isError, 'is-summary': r.isSummary }"
                    },
                    config: {
                        sortBy: "column1",
                        sortDirection: "asc",
                        trackBy: "id",
                        pageSize: 50,
                        pageNumber: 1,
                        totalCount: 0,
                        totalPages: 0,
                        maxSize: 10,
                        useRepeat: true,
                        showSelectCheckbox: true,
                        showSelectAll: true,
                        showSort: true,
                        clientSort: true,
                        clientPaging: true,
                        displayPager: true,
                        displayPageSize: true,
                        stickyHeader: true,
                        stickyHeaderOffset: 0,
                        stickyContainer: '.table1-container'
                    },
                    callbacks: {
                        sortHeaderClicked: function (data) { },
                        pageChanged: function (data) { },
                        pageSizeChanged: function (data) { },
                        checkboxClicked: function (data) {
                            data.item.isError = data.item.isSelected;
                        },
                        masterClicked: function () {
                            var updatedRecords = [];
                            angular.forEach(vm.table1Options.pagedData, function (item) {
                                item.isError = item.isSelected;
                                updatedRecords.push(item);
                            });
                            $timeout(function () {
                                vm.table1Options.updatedRecords = updatedRecords;
                            }, 0);
                        },
                    }
                };

                vm.table2Options = {
                    records: [],
                    updatedRecords: [],
                    columnDefns: columns,
                    rowDefns: {
                        computedClass: "{ 'is-error': r.isError, 'is-summary': r.isSummary }"
                    },
                    config: {
                        sortBy: "column1",
                        sortDirection: "asc",
                        trackBy: "id",
                        pageSize: 20,
                        pageNumber: 1,
                        totalCount: 0,
                        totalPages: 0,
                        maxSize: 10,
                        useRepeat: false,
                        showSelectCheckbox: true,
                        showSelectAll: true,
                        showSort: true,
                        clientSort: true,
                        clientPaging: false,
                        stickyHeader: true,
                        stickyHeaderOffset: 0,
                        stickyContainer: '.table2-container'
                    },
                    callbacks: {
                        sortHeaderClicked: function (data) { },
                        pageChanged: function (data) { },
                        pageSizeChanged: function (data) { },
                        checkboxClicked: function (data) {
                            data.item.isSummary = data.item.isSelected;
                            var updatedRecords = [data.item];
                            $timeout(function () {
                                vm.table2Options.updatedRecords = updatedRecords;
                            }, 0);
                        },
                        masterClicked: function () {
                            var updatedRecords = [];
                            angular.forEach(vm.table2Options.pagedData, function (item) {
                                item.isSummary = item.isSelected;
                                updatedRecords.push(item);
                            });
                            $timeout(function () {
                                vm.table2Options.updatedRecords = updatedRecords;
                            }, 0);
                        },
                    }
                };

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
            if (vm.table1Options.records.length >= numItems) {
                $timeout(function () {
                    vm.table1Options.records.splice(-1 * numItems, numItems);
                    vm.table2Options.records.splice(-1 * numItems, numItems);
                    $scope.$apply();
                }, 0);
            }
        };

        vm.toggleTable1 = function () {
            $timeout(function () {
                vm.isTable1Visible = !vm.isTable1Visible; $scope.$apply();
            }, 1);
        };

        vm.toggleTable2 = function () {
            $timeout(function () {
                vm.isTable2Visible = !vm.isTable2Visible;
            }, 1);
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