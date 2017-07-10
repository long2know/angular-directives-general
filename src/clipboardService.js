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
        angular.module('long2know.constants', []);
        angular.module('long2know',
            [
                'long2know.services',
                'long2know.controllers',
                'long2know.directives',
                'long2know.constants'
            ]);
    }
    
    var clipboardService = function ($q, $sce, $window, dialogService, toastService) {
        var
            body = angular.element($window.document.body),
            textarea = angular.element('<textarea/>');
        textarea.css({ position: 'fixed', opacity: '0' });
        var
            copy = function (value) {
                textarea.val(value);
                body.append(textarea);
                textarea[0].select();

                try {
                    var successful = document.execCommand('copy');
                    if (!successful) throw successful;
					toastService.success("Copied to clipboard!");
                } catch (err) {
                    var
                        errorTitle = "Error copying to clipboard",
                        errorBody = "There was an error copying to the clipboard.  Select the text to copy and use Ctrl+C.";

                    dialogService.openDialog("modalError.html", ['$scope', '$uibModalInstance', function ($scope, $uibModalInstance) {
                        $scope.modalHeader = $sce.trustAsHtml(errorTitle);
                        $scope.modalBody = $sce.trustAsHtml(dialogService.stringFormat("<p><strong>{0}</strong></p>", errorBody));
                        $scope.ok = function () {
                            $uibModalInstance.close();
                        };
                        $scope.hasCancel = false;
                    }]);
                }

                textarea.remove();
            };

        return {
            copy: copy
        };
    };

    clipboardService.$inject = ['$q', '$sce', '$window', 'dialogService', 'toastService'];
    angular.module('long2know.services')
        .factory('clipboardService', clipboardService);
})();