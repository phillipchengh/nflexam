'use strict';

angular.module('nflexam_services', ['ngResource'])
.factory('nflexam', function($resource) {

	var titles = ['Total Scores', 'Regression', 'Explained'];
	var cur_title = titles[0];
	var cats = ['passing_tds', 'rushing_tds'];
	var year = 2013;

	var nflexam_services = {};

	nflexam_services.get_cur_title = function() {
		return cur_title;
	}

	nflexam_services.set_cur_title = function(new_title) {
		cur_title = new_title;
	}

	nflexam_services.get_titles = function() {
		return titles;
	}

	nflexam_services.get_cats = function() {
		return cats;
	}

	nflexam_services.get_year = function() {
		return year;
	}

	nflexam_services.set_year = function(new_year) {
		year = new_year;
	}

	nflexam_services.pca = $resource('pca', {}, {
		query: {method: 'GET', params: {cat: '@cat', year: '@year'}}
	});

	nflexam_services.cat = $resource('cat', {}, {
		query: {method: 'GET', params: {}}
	});

	return nflexam_services;
});