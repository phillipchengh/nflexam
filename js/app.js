'use strict';

angular.module('nflexam_module', ['ngRoute', 'nflexam_services'])
.config(function($routeProvider) {
	// $locationProvider.html5Mode(true);
	$routeProvider
		.when('/', {templateUrl: 'template/d3_template.html', controller: nflexam_ctrl})
		.otherwise({redirectTo: '\\/'});
});