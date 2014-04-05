'use strict';

function labels_ctrl($scope, nflexam) {

	$scope.nflexam_view = false;
	$scope.cats_view = false;
	$scope.titles = nflexam.get_titles();
	$scope.temp_cats = nflexam.get_cats().slice(0);
	$scope.temp_year = 2013;
	$scope.sections_cats = [];

	$scope.$on("cats_init", function() {

		var cats = nflexam.get_cats();
		// Can't prop in cat query success for some reason.
		for (var i = 0; i < cats.length; i++) {
			$('#' + cats[i]).prop('checked', true);
		}

		var year = nflexam.get_year();
		$('#' + year).prop('checked', true);

		var cur_title = nflexam.get_cur_title();
		$('#' + $scope.format_label(cur_title)).addClass('active');
	})

	$scope.$on("temp_init", function() {
		$scope.temp_cats = nflexam.get_cats().slice(0);
		$scope.temp_year = nflexam.get_year();
	})

	nflexam.cat.query({},
		function success(data) {
			
			$scope.sections_cats = data;
			$scope.$broadcast("pca_init");
			// $scope.pca_query(false);
		},
		function error() {
			$("#d3-content").html("<div class=\"error\">Something went wrong. [. .]?</div>");
	});

	$scope.tab_clicked = function(title) {

		var cur_title = nflexam.get_cur_title();
		if ($scope.nflexam_view) {
			$scope.nflexam_clicked(false);
		}
		if (cur_title === title) {
			return;
		}
		var titles = nflexam.get_titles();
		if (title === titles[2] || cur_title === titles[2]) {
			nflexam.set_cur_title(title);
			$scope.$broadcast("d3_display");
		} else {
			nflexam.set_cur_title(title);
			$scope.$broadcast("d3_switch");
		}
	}

	$scope.nflexam_clicked = function(nflexam_label) {
		
		if (nflexam_label && $scope.nflexam_view) {
			return;
		}
		if (!$scope.nflexam_view) {
			$('#content-container').animate({marginLeft: "2000px"}, 350, function() {
				$(this).hide();
				$('#nflexam-container').show().animate({marginLeft: "0px"}, 350);	
			});
			$scope.nflexam_view = !$scope.nflexam_view;		
		} else {
			$('#nflexam-container').animate({marginLeft: "-2000px"}, 350, function() {
				$(this).hide();
				$("#nflexam-label").removeClass('active');
				var cur_title = nflexam.get_cur_title();
				$('#' + $scope.format_label(cur_title)).addClass('active');
				$('#content-container').show().animate({marginLeft: "0px"}, 350, function() {
					if (nflexam_label) {
						$("#nflexam-label").removeClass('active');
					}
				});
			});
			$scope.nflexam_view = !$scope.nflexam_view;
		}
	}

	$scope.cats_clicked = function() {

		var cats = nflexam.get_cats();
		if ($scope.nflexam_view) {
			$scope.nflexam_clicked();
		}
		if (cats.length === 0) {
			alert("Need at least one stat!");
			return;
		}
		$scope.cats_view = !$scope.cats_view;
		if ($scope.cats_view) {
			$('#cats-content').slideDown(350);
			$('#d3-content').fadeTo(350, 0.05);
		} else {
			$('#cats-content').slideUp(350);
			$('#d3-content').fadeTo(350, 1);

			//Have to sort since checkboxes may screw up order. Seems messy, but oh well for now.
			if (cats.sort().toString() !== $scope.temp_cats.sort().toString()
				|| $scope.temp_year != nflexam.get_year()) {
				$scope.$broadcast("pca_reload");
				// $scope.pca_query(true);
			}
		}
	}

	$scope.go_clicked = function() {

		var cats = nflexam.get_cats();
		if (cats.length === 0) {
			alert("Need at least one stat!");
			return;
		}
		$scope.cats_clicked();
		$('#new-label').removeClass('active');
		$('#go-label').removeClass('active');
	}

	$scope.catbox_changed = function(cat, section) {

		var cats = nflexam.get_cats();
		var idx = $.inArray(cat, cats);
		if (idx > -1) {
			cats.splice(idx, 1);
			$('#' + section).prop('checked', false);
		} else {
			cats.push(cat);
			if ($('.' + section + ':checked').length == $('.' + section).length) {
				$('#' + section).prop('checked', true);
			}
		}
	}

	$scope.section_changed = function(section) {

		var cats = nflexam.get_cats();
		if ($('#' + section).prop('checked')) {
			$('.' + section).each(function() {
				if (cats.indexOf($(this).attr('id')) < 0) {
					cats.push($(this).attr('id'));
				}
			});
			$('.' + section).prop('checked', true);
		} else {
			$('.' + section).each(function() {
				var idx = $.inArray($(this).attr('id'), cats);
				if (idx > -1) {
					cats.splice(idx, 1);
				}
			});
			$('.' + section).prop('checked', false);
		}
	}

	$scope.year_changed = function(year) {

		nflexam.set_year(year);
	}


	$scope.format_label = function(id) {

		var formatted_id = id.replace(/ /g, '-').toLowerCase();
		return formatted_id;
	}

}