'use strict';

angular.module('nflexam_services', ['ngResource'])
.factory('nflexam_module', function($resource) {
	return {
		pca: $resource('pca', {}, {
			query: {method: 'GET', params: {cat: '@cat', year: '@year'}}
		}),
		cat: $resource('cat', {}, {
			query: {method: 'GET', params: {}}
		})
	};
});