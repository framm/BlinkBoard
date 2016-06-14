"use strict";

bbUnit.controller('IframeviewerController', ['$scope', '$timeout', '$http', '$interval', '$sce',
	function ($scope, $timeout, $http, $interval, $sce) {

		// Check if all configuration values are defined
		if ($scope.data.configuration.updatefrequency === undefined) {
			return;
		}
		if ($scope.data.configuration.url === undefined) {
			return;
		}

		// Update url
		function updateURL() {
			// Hack to refresh iframe
			$scope.url = $sce.trustAsResourceUrl("/blank");

			setTimeout(function () {
				$scope.url = $sce.trustAsResourceUrl($scope.data.configuration.url);
			}, 100);
		}

		// Watch for url changes and refresh url
		$scope.$watch('data.configuration.url', function () {
			updateURL();
		});

		// $interval to refresh data
		var interval = $interval(updateURL, ($scope.data.configuration.updatefrequency * 1000));

		// Watch for updatefrequency changes ($interval has to be canceled and then recreated each time)
		$scope.$watch("data.configuration.updatefrequency", function () {
			// Cancel existing interval
			$interval.cancel(interval);

			// Refresh iframe
			$scope.url = $sce.trustAsResourceUrl("");
			updateURL();

			// Set new $interval with new updateFrequency
			interval = $interval(updateURL, ($scope.data.configuration.updatefrequency * 1000));
		});
	}
]);

// Stockviewer directive
bbUnit.directive('iframeviewer', function () {
	return {
		controller: 'IframeviewerController',
		templateUrl: '/viewers/iframeviewer/iframeviewer.html',
		scope: {
			data: '='
		}
	};
});
