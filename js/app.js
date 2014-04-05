'use strict';

angular.module('nflexam', ['ngRoute', 'nflexam_services'])
.config(function($routeProvider) {
	// $locationProvider.html5Mode(true);
	$routeProvider
		.when('/', {templateUrl: 'template/d3_template.html', controller: labels_ctrl})
		.otherwise({redirectTo: '/'});
});