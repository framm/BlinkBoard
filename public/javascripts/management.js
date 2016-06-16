"use strict";

var bbManagement = angular.module('bbManagement', ['ui.router', 'ngMaterial', 'ngMessages', 'firebase', 'ngAnimate'])


/*=============================================>>>>>
= Theme setup =
===============================================>>>>>*/

bbManagement.config(function ($mdThemingProvider) {
	$mdThemingProvider.theme('default')
		.primaryPalette('grey', {
			'default': '900'
		})
		.accentPalette('indigo', {
			'default': '500'
		})
		.warnPalette('deep-orange', {
			'default': '900'
		});
});


/*=============================================>>>>>
= Authentication service =
===============================================>>>>>*/

bbManagement.factory('authService', function ($firebaseObject, $q) {
	var authService = {};

	// Firebase URL
	authService.firebaseUserRef = new Firebase(env.FIREBASE_URL);

	authService.authenticate = function (email, password) {
		return $q(function (resolve, reject) {
			authService.firebaseUserRef.authWithPassword({
				email: email,
				password: password
			}, function (error, authData) {
				if (error) {
					reject(error);
				} else {
					authService.firebaseUserRef = new Firebase(env.FIREBASE_URL + 'users/' + authData.auth.uid + '/');
					// Return authenticated firebase object
					resolve(authService.firebaseUserRef);
				}
			});
		});
	}

	authService.unauthenticate = function () {
		authService.firebaseUserRef.unauth();
	}

	return authService;
});


/*=============================================>>>>>
= UI-Router =
===============================================>>>>>*/

bbManagement.config(function ($stateProvider, $urlRouterProvider) {
	$urlRouterProvider.otherwise('/dashboard');
	$stateProvider
		.state('login', {
			url: '/',
			data: {
				title: "BlinkBoard"
			},
			templateUrl: 'ui-router/login.html',
			authenticationRequired: false
		})
		.state('dashboard', {
			url: '/dashboard',
			data: {
				title: "Dashboard"
			},
			templateUrl: 'ui-router/dashboard.html',
			authenticationRequired: true
		})
		.state('dashboard.unit', {
			url: '/:unitID',
			data: {
				title: "Unit"
			},
			views: {
				"@": {
					templateUrl: 'ui-router/dashboard.unit.html'
				}
			},
			authenticationRequired: true
		});
});


/*=============================================>>>>>
= Main Controller =
===============================================>>>>>*/

bbManagement.controller('ManagementController', ['$scope', '$location', '$state', '$timeout', '$http', '$firebaseObject', '$mdDialog', '$mdMedia', '$mdToast', 'authService', '$q',
	function ($scope, $location, $state, $timeout, $http, $firebaseObject, $mdDialog, $mdMedia, $mdToast, authService, $q) {

		/*----------- Data -----------*/

		// Get all data
		function getData(firebaseUserRef) {
			// Show spinner
			$scope.loading = true;

			// Get user/unit data
			firebaseUserRef.once("value", function (user) {
				// Check if user has any data
				if (user.val() === null) {
					console.log('no units');

					$scope.units = {};

					// Hide spinner
					$scope.loading = false;
				} else {
					// Data-related promises
					var promises = [];

					// Get unit data for each owned unit
					angular.forEach(user.val()
						.units,
						function (key, unitID) {
							// 1 promise per unit
							var unitPromise = $q.defer();

							// Connection to specific unit
							var firebaseUnitRef = new Firebase(env.FIREBASE_URL + 'units/' + unitID + '/');

							firebaseUnitRef.once("value", function (unit) {
								// Construct corrctly formattet unit object
								var unitObject = {};
								unitObject[unitID] = unit.val();

								// Resolve unit promise
								unitPromise.resolve(unitObject);
							});

							// Push promise ahead
							promises.push(unitPromise.promise);
						});

					// When all unit data is ready
					$q.all(promises)
						.then(function (units) {
							// Populate units object
							$scope.units = {};

							// Convert returned array into object of objects
							for (var i = units.length - 1; i >= 0; i--) {
								var currentKey = Object.keys(units[i])[0];

								$scope.units[currentKey] = units[i][currentKey];
							}

							// Hide spinner
							$scope.loading = false;
						});
				}
			});

			// Get the viewerModels data
			var firebaseViewerModelsRef = new Firebase(env.FIREBASE_URL + 'viewerModels/');

			firebaseViewerModelsRef.once("value", function (viewerModels) {
				$scope.viewerModels = viewerModels.val();

				// Parse pattern strings to regex (ng-pattern requires regex)
				angular.forEach($scope.viewerModels, function (configuration, type) {
					angular.forEach(configuration.parameters, function (value, parameter) {
						$scope.viewerModels[type].parameters[parameter] = new RegExp($scope.viewerModels[type].parameters[parameter]);
					});
				});
			});
		}

		// Get data if authorized and $scope is empty
		if ((authService.firebaseUserRef.getAuth() !== null) && ($scope.user === undefined)) { // If logged in
			console.log('already authorized');

			// Get data with the authorized uid
			authService.firebaseUserRef = new Firebase(env.FIREBASE_URL + 'users/' + authService.firebaseUserRef.getAuth()
				.auth.uid + "/");

			getData(authService.firebaseUserRef);
		}


		/*----------- Log in/out functions -----------*/

		// Temporary user
		$scope.tempUser = {
			email: env.DEV_USER,
			password: env.DEV_PASSWORD
		}

		// Log in
		$scope.login = function (email, password) {
			// Show spinner
			$scope.loading = true;

			// Authenticate and get data
			authService.authenticate(email, password)
				.then(function (firebaseUserRef) {
					getData(firebaseUserRef);

					// Go to dashboard state
					$state.go('dashboard');
				})['catch'](function (error) {
					$scope.loading = false;

					alert(error);
				});
		}

		// Log out
		$scope.logout = function () {
			// Unauthenticate
			authService.unauthenticate();

			// Clean $scope
			$scope.user = null;
			$scope.viewerModels = null;

			// Go to login state
			$state.go('login');
		}


		/*----------- State-change stuff -----------*/

		// Access $state from DOM
		$scope.$state = $state;

		$scope.$on('$stateChangeStart', function (event, toState, toParams, fromState, fromParams) {
			// Close any dialogues
			$mdDialog.cancel();

			// Check if requested state requires authentication and if user is not authenticated
			if ((toState.authenticationRequired === true) && (authService.firebaseUserRef.getAuth() === null)) {
				// User isn’t authenticated; go to login state
				$state.go('login');
				event.preventDefault();
			}
		});

		$scope.$on('$stateChangeSuccess', function (event, toState, toParams, fromState, fromParams) {
			// Set title on page based on state
			$scope.title = toState.data.title;
		});


		/*----------- Unit functions -----------*/

		// Configure unit dialogue
		$scope.unitSettings = function () {
			$mdDialog.show({
				templateUrl: 'templates/dialogues/unitSettings.html',
				hasBackdrop: true,
				clickOutsideToClose: true,
				controller: function (scope, $mdDialog) {
					// Make the unitID and a copy of the unit-object available to the service
					scope.unitID = $state.params.unitID;
					scope.unit = angular.copy($scope.units[$state.params.unitID]);

					scope.save = function (updatedUnit) {
						// Make connection to /units
						var firebaseUnitRef = new Firebase(env.FIREBASE_URL + 'units/' + $state.params.unitID + '/');

						// Save new unit to /units
						firebaseUnitRef.set(updatedUnit)
							.then(function () {
								// Refresh data
								getData(authService.firebaseUserRef);

								// Close dialogue
								$mdDialog.cancel();
							});
					}

					scope.close = function () {
						$mdDialog.cancel();
					}

					scope.delete = function () {
						// Remove unit from /users
						authService.firebaseUserRef.child('units')
							.child($state.params.unitID)
							.remove()
							.then(function () {
								// Refresh data
								getData(authService.firebaseUserRef);

								// Close dialogue
								$mdDialog.cancel();

								$state.go('dashboard');
							});
					}
				}
			});
		}

		// Add unit dialogue
		$scope.addUnit = function () {
			$mdDialog.show({
				templateUrl: 'templates/dialogues/addUnit.html',
				hasBackdrop: true,
				clickOutsideToClose: true,
				controller: function (scope, $mdDialog) {
					scope.save = function (id, name) {
						// Construct unit object
						var newUnit = {
							"name": name,
							"size": {
								height: 1080,
								width: 1920
							},
							"fontsize": 20,
							"viewers": {}
						};

						// Save unit to /users
						authService.firebaseUserRef.child('units')
							.child(id)
							.set('undefined')
							.then(function () {
								// Make connection to /units
								var firebaseUnitRef = new Firebase(env.FIREBASE_URL + 'units/' + id + '/');

								// Check if unitID already exists (has been previously created)
								firebaseUnitRef.once("value", function (unit) {
									// Didn't exist
									if (unit.exists() === false) {
										// Save new unit to /units
										firebaseUnitRef.set(newUnit)
											.then(function () {
												// Refresh data
												getData(authService.firebaseUserRef);

												// Close dialogue
												$mdDialog.cancel();
											});
									} else {
										// Did exists
										// Refresh data
										getData(authService.firebaseUserRef);

										// Close dialogue
										$mdDialog.cancel();

										// Show toast
										$timeout(function () {
											var toast = $mdToast.simple()
												.textContent("Unit already existed (" + unit.child('name')
													.val() + ").");
											$mdToast.show(toast);
										}, 500);
									}
								});
							});
					}

					scope.close = function () {
						$mdDialog.cancel();
					}
				}
			});
		}


		/*----------- Viewer functions -----------*/

		// Configure viewer
		$scope.viewerSettings = function (name) {
			$mdDialog.show({
				templateUrl: 'templates/dialogues/viewerSettings.html',
				hasBackdrop: true,
				clickOutsideToClose: true,
				controller: function (scope, $mdDialog) {
					// Make name, a copy of the viewer-object, and the viewerModels available to the service
					scope.name = name;
					scope.viewer = angular.copy($scope.units[$state.params.unitID].viewers[name]);
					scope.viewerModels = $scope.viewerModels;

					scope.save = function (updatedViewer) {
						// Make connection to /units
						var firebaseUnitRef = new Firebase(env.FIREBASE_URL + 'units/' + $state.params.unitID + '/');

						// Save viewer to /units
						firebaseUnitRef.child('viewers')
							.child(name)
							.set(updatedViewer)
							.then(function () {
								// Refresh data
								getData(authService.firebaseUserRef);

								// Close dialogue
								$mdDialog.cancel();
							});
					}

					scope.close = function () {
						$mdDialog.cancel();
					}

					scope.delete = function () {
						// Make connection to /units
						var firebaseUnitRef = new Firebase(env.FIREBASE_URL + 'units/' + $state.params.unitID + '/');

						// Remove viewer from /units
						firebaseUnitRef.child('viewers')
							.child(name)
							.remove()
							.then(function () {
								// Refresh data
								getData(authService.firebaseUserRef);

								// Close dialogue
								$mdDialog.cancel();
							});
					}
				}
			});
		}

		$scope.addViewer = function () {
			$mdDialog.show({
				templateUrl: 'templates/dialogues/addViewer.html',
				hasBackdrop: true,
				clickOutsideToClose: true,
				controller: function (scope, $mdDialog) {
					// Make name, a copy of the viewer-object, and the viewerModels available to the service
					scope.viewerModels = $scope.viewerModels;

					scope.save = function (viewerData) {
						// Construct correctly formed viewer object
						var newViewer = {
							type: viewerData.type,
							configuration: viewerData.configuration,
							placement: {
								x: 10,
								y: 10
							},
							size: {
								height: $scope.viewerModels[viewerData.type].size.height,
								width: $scope.viewerModels[viewerData.type].size.width
							}
						};

						// Make connection to /units
						var firebaseUnitRef = new Firebase(env.FIREBASE_URL + 'units/' + $state.params.unitID + '/');

						// Save new viewer to /units
						firebaseUnitRef.child('viewers')
							.child(viewerData.name)
							.set(newViewer)
							.then(function () {
								// Refresh data
								getData(authService.firebaseUserRef);

								// Close dialogue
								$mdDialog.cancel();
							});
					}

					scope.close = function () {
						$mdDialog.cancel();
					}
				}
			});
		}

		$scope.listViewers = function () {
			$mdDialog.show({
				templateUrl: 'templates/dialogues/listViewers.html',
				hasBackdrop: true,
				clickOutsideToClose: true,
				controller: function (scope, $mdDialog) {
					// Make a copy of the current unit-object available to the service
					scope.unit = angular.copy($scope.units[$state.params.unitID]);

					scope.goToViewer = function (name) {
						$mdDialog.cancel();

						$scope.viewerSettings(name);
					}

					scope.close = function () {
						$mdDialog.cancel();
					}
				}
			});
		}
	}
]);
