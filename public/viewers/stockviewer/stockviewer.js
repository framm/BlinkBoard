"use strict";

bbUnit.controller('StockviewerController', ['$scope', '$timeout', '$http', '$interval',
	function($scope, $timeout, $http, $interval) {

		// Check if all configuration values are defined
		if ($scope.data.configuration.updatefrequency === undefined) {
			return;
		}
		if ($scope.data.configuration.symbol === undefined) {
			return;
		}

		// Check and set changed values
		function setChanged(prevData, newData) {
			// Construct object for change info
			var newDataChanged = newData;

			// Iterate new data's properties
			return angular.forEach(newData, function(value, property) {
				// Compare to previous data
				if (newData[property].value === prevData[property].value) {
					// Check if values have changed
					newDataChanged[property].changed = false;
				} else { // Change detected
					newDataChanged[property].changed = true;
				}
			});
		}

		// Url
		$scope.url = '/stockviewer.getData';

		// Get initial data
		$http.post($scope.url, { 'symbol': $scope.data.configuration.symbol }).then(function(data, status, headers, config) {
			//console.log('First stock data', data.data);

			$scope.stockData = data.data;
		});

		// Function to get data
		function getData() {
			$http.post($scope.url, { 'symbol': $scope.data.configuration.symbol }).then(function(data, status, headers, config) {
				//console.log('New stock data', data.data);

				// Only check for changes if existing data exists
				if ($scope.stockData !== undefined) {
					// Check and set changed values
					$scope.stockDataChanged = setChanged($scope.stockData, data.data);

					$timeout(function() {
						// Set actual values second
						$scope.stockData = data.data;

						$timeout(function() {
							// Reset changed info
							$scope.stockDataChanged = null;
						}, 2500);
					}, 2500);
				}
			});
		}

		// $interval to refresh data
		var interval = $interval(getData, ($scope.data.configuration.updatefrequency * 1000));

		// Watch for updatefrequency changes ($interval has to be canceled and then recreated each time)
		$scope.$watch("data.configuration.updatefrequency", function() {
			// Cancel existing interval
			$interval.cancel(interval);

			// Get new data
			getData();

			// Set new $interval with new updateFrequency
			interval = $interval(getData, ($scope.data.configuration.updatefrequency * 1000));
		});
	}
]);

// Stockviewer directive
bbUnit.directive('stockviewer', function() {
	return {
		controller: 'StockviewerController',
		templateUrl: '/viewers/stockviewer/stockviewer.html',
		scope: {
			data: '='
		}
	};
});
