'use strict';

function nflexam_ctrl($scope, nflexam_module) {

	// D3 height, width, margins and offset.
	$scope.margin = {top: 40, bottom: 40, left: 45, right: 45};
	$scope.h_ratio = .2;
	$scope.w_ratio = .1;
	$scope.l_ratio = 2;
	$scope.h_off = $(window).height() * $scope.h_ratio;
	$scope.w_off = $(window).width() * $scope.w_ratio;
	$scope.h = $(window).height() - $scope.margin.top - $scope.margin.bottom - $scope.h_off;
	$scope.w = $(window).width() - $scope.margin.left - $scope.margin.right - $scope.w_off;
	$scope.font_size = 18;

	// Default stats.
	$scope.num_teams = 32;
	$scope.max_score = $scope.h;
	$scope.min_score = 0;
	$scope.max_explained = $scope.h;
	$scope.scores_dataset = [];
	$scope.linreg_dataset = [];
	$scope.explained_dataset = [];
	$scope.cur_dataset = [];
	$scope.cats = ['passing_tds', 'rushing_tds'];
	$scope.temp_cats = $scope.cats.slice(0);
	$scope.year = 2013;
	$scope.temp_year = 2013;
	$scope.sections_cats = [];
	$scope.cats_view = false;
	$scope.nflexam_view = false;
	$scope.titles = ['Total Scores', 'Regression', 'Explained'];
	$scope.x_titles = ['NFL Teams [Hover over team points for details!]', 'Calculated Rankings', 'Principal Component'];
	$scope.y_titles = ['Total Scores', 'Draft Order', 'Percentage Variance'];
	$scope.cur_title = $scope.titles[0];

	$scope.k = 0;
	$scope.r_squared = 0;
	$scope.total_explained = 0;
	$scope.pc_cats = $scope.cats;

	// D3 scales, axes, elements, and misc.
	$scope.x_scale;
	$scope.y_scale;
	$scope.x_axis;
	$scope.y_axis;
	$scope.svg;
	$scope.circles;
	$scope.line;
	$scope.legend;
	$scope.rect;
	$scope.text_e;
	$scope.text_r;
	$scope.text_k;
	$scope.text_ee;
	$scope.clock = 700;
	$scope.count = 0;

	nflexam_module.cat.query({},
		function success(data) {
			$scope.sections_cats = data;
			$scope.pca_query(false);
		},
		function error() {
			$("#d3-content").html("<div class=\"error\">Something went wrong. [. .]?</div>");
	});

	$scope.pca_query = function(reload) {

		nflexam_module.pca.query({cat: $scope.cats, year: $scope.year},
			function success(json) {
				var dataset = json.scores;
				$scope.num_teams = dataset.length;
				$scope.min_score = dataset[0].total_score;
				$scope.max_score = dataset[$scope.num_teams-1].total_score;

				$scope.k = json.k;
				$scope.r_squared = json.r_squared;
				$scope.max_explained = json.explained[0];
				$scope.pc_cats = json.pc_cats;
				
				$scope.scores_dataset = dataset;
				$scope.linreg_dataset = json.linreg;
				$scope.explained_dataset = json.explained;

				$scope.total_explained = 0;
				for (var i = 0; i < $scope.k; i++) {
					$scope.total_explained += $scope.explained_dataset[i];
				}

				$scope.load_tips();

				if (!reload) {
					$scope.cur_dataset = dataset;
					$scope.d3_display();
					$(window).resize(function() {
						$scope.d3_resize();
						$scope.assign_tips();
					});
				} else {
					if ($scope.cur_title == $scope.titles[2]) {
						$scope.d3_display();
					} else {
			    		$scope.d3_reload();
					}
				}

				$scope.assign_tips();
				$scope.temp_cats = $scope.cats.slice(0);
				$scope.temp_year = $scope.year;
				// Can't prop in cat query success for some reason.
				if (!reload) {
					for (var i = 0; i < $scope.cats.length; i++) {
						$('#' + $scope.cats[i]).prop('checked', true);
					}
					$('#' + $scope.year).prop('checked', true);
					$('#' + $scope.format_label($scope.cur_title)).addClass('active');
				}
			},
			function error() {
				$("#d3-content").html("<div class=\"error\">Something went wrong. [. . ]?</div>");
			});
	}

	$scope.d3_class = function(d) {

		switch ($scope.cur_title) {
			case $scope.titles[2]:
				return "explained";
			default:
				return d.team_id + ' circle';
		}
	}

	$scope.d3_y = function(d) {

		switch ($scope.cur_title) {
			case $scope.titles[1]:
				return $scope.y_scale(d.y);
			case $scope.titles[2]:
				return $scope.y_scale(d);
			default:
				return $scope.y_scale(d.total_score);
		}
	}

	$scope.d3_update_container = function() {

		var container_css = {
			"height": $scope.h + $scope.margin.top + $scope.margin.bottom + "px",
			"width": $scope.w + $scope.margin.left + $scope.margin.right + "px",
			"margin": "0px auto"
		}

		//Empty old d3 graph, update height/width, and add dummy span to insert line before circles.
		// $("#content-container").css({"width": $scope.w});
		$("#d3-content").empty().css(container_css).append("<span id=\"first\"></span>");
		$("#cats-content").css({"width": $scope.w});
		$("#nflexam-content").css({"width": $scope.w});
	}

	$scope.d3_update_scales = function() {

		switch ($scope.cur_title) {
			case $scope.titles[1]:
				$scope.x_scale = d3.scale.linear()
			    	.domain([0, $scope.num_teams-1])
			    	.range([0, $scope.w]);

				$scope.y_scale = d3.scale.linear()
			    	.domain([0, $scope.num_teams-1])
			    	.range([$scope.h, 0]);
		    	break;
	    	case $scope.titles[2]:;
	    		$scope.x_scale = d3.scale.linear()
			    	.domain([0, $scope.k-1])
			    	.range([0, $scope.w]);

				$scope.y_scale = d3.scale.linear()
			    	.domain([0, $scope.max_explained])
			    	.range([$scope.h, 0]);
		    	break;
	    	default:
		    	$scope.x_scale = d3.scale.linear()
			    	.domain([0, $scope.num_teams-1])
			    	.range([0, $scope.w]);

				$scope.y_scale = d3.scale.linear()
			    	.domain([$scope.min_score, $scope.max_score])
			    	.range([$scope.h, 0]);	
		}
	}

	$scope.d3_update_axes = function() {

		switch ($scope.cur_title) {
			case $scope.titles[1]:
		    	$scope.x_axis = d3.svg.axis()
					.scale($scope.x_scale)
					.orient("bottom")
					.ticks($scope.num_teams)
					.tickFormat(function(i) { return $scope.linreg_dataset[i].team_id; });

				$scope.y_axis = d3.svg.axis()
					.scale($scope.y_scale)
					.orient("left")
					.ticks($scope.num_teams)
					.tickFormat(function(i) { return $scope.linreg_dataset[i].draft_team; });
		    	break;
	    	case $scope.titles[2]:
		    	$scope.x_axis = d3.svg.axis()
					.scale($scope.x_scale)
					.orient("bottom")
					.ticks($scope.k)
					.tickFormat(function(i) { return 'PC ' + ++i; });

				$scope.y_axis = d3.svg.axis()
					.scale($scope.y_scale)
					.orient("left")
					.ticks($scope.k)
					.tickFormat(function(i) { return i + '%'; });
		    	break;
	    	default:
				$scope.x_axis = d3.svg.axis()
					.scale($scope.x_scale)
					.orient("bottom")
					.ticks($scope.num_teams)
					.tickFormat(function(i) { return $scope.scores_dataset[i].team_id; });

				$scope.y_axis = d3.svg.axis()
					.scale($scope.y_scale)
					.orient("left");
		}
	}

	$scope.d3_update_dataset = function() {

		switch ($scope.cur_title) {
			case $scope.titles[1]:
				$scope.cur_dataset = $scope.linreg_dataset;
		    	break;
	    	case $scope.titles[2]:
				$scope.cur_dataset = $scope.explained_dataset;
		    	break;
	    	default:
	    		$scope.cur_dataset = $scope.scores_dataset;
		}
	}

	$scope.d3_update_svg = function() {
		$('#cats-container').css({"height": $scope.h, "width": $scope.w})
		$scope.svg = d3.select("#d3-content")
			.append("svg")
			.attr("height", $scope.h + $scope.margin.top + $scope.margin.bottom)
			.attr("width", $scope.w + $scope.margin.left + $scope.margin.right)
			.append("g")
	    	.attr("transform", "translate(" + $scope.margin.left + "," + $scope.margin.top + ")");
	}

	$scope.d3_update_gs = function(append) {

		if (append) {
		    $scope.gx = $scope.svg.append("g")
		    	.attr("transform", "translate(0," + ($scope.h) + ")")
				.attr("class", "axis")
			
			$scope.gy = $scope.svg.append("g")
				.attr("class", "axis")
		}
	    
	    $scope.gx
	    	.call($scope.x_axis);
	    $scope.gy
	    	.call($scope.y_axis);
	}

	$scope.d3_update_line = function(append, resize) {

		if (append) {
			$scope.line = $scope.svg.insert("svg:line", "#first")
	    		.attr("stroke", "#BBBBBB")
				.attr("stroke-width", 0);
		}
		if ($scope.cur_title == $scope.titles[1]) {
			$scope.line
	    		.attr("x1", $scope.x_scale(0))
	    		.attr("x2", $scope.x_scale($scope.num_teams-1))
	    		.attr("y1", $scope.y_scale(0))
	    		.attr("y2", $scope.y_scale($scope.num_teams-1))
			if (resize) {
				$scope.line
		    		.attr("stroke-width", 4);
			} else {
				$scope.line
		    		.transition()
					.duration($scope.clock*2)
					.ease('quad-out')
		    		.attr("stroke-width", 4);
			}
		} else {
			$scope.line
				.transition()
				.duration($scope.clock)
				.ease('quad-out')
	    		.attr("stroke-width", 0)
		}
	}

	$scope.ie_ver = function() {  
	    var iev=0;
	    var ieold = (/MSIE (\d+\.\d+);/.test(navigator.userAgent));
	    var trident = !!navigator.userAgent.match(/Trident\/7.0/);
	    var rv=navigator.userAgent.indexOf("rv:11.0");

	    if (ieold) iev=new Number(RegExp.$1);
	    if (navigator.appVersion.indexOf("MSIE 10") != -1) iev=10;
	    if (trident&&rv!=-1) iev=11;

	    return iev;         
	}

	$scope.d3_update_legend = function() {

		$scope.legend = $scope.svg.selectAll(".legend")
			.data([{
				"text_e": "Expected",
				"text_r": "R&sup2 = " + $scope.r_squared.toFixed(4),
				"text_k": "k &nbsp&nbsp= " + $scope.k,
				"text_ee": "% &nbsp= " + $scope.total_explained.toFixed(2)
			}])
			.enter()
			.append("g")
			.attr("class", "legend")
			.attr("transform", "translate(" + $scope.margin.left + "," + $scope.margin.top + ")");		

		$scope.rect = $scope.legend.append("rect")
			.attr("width", 40)
			.attr("height", 4)
			.style("fill", "#BBBBBB");
			
		$scope.text_e = $scope.legend.append("text")
			.style("fill", "#777777");

		$scope.text_r = $scope.legend.append("text")
			.style("fill", "#B20032");		
			
		$scope.text_k = $scope.legend.append("text")
			.style("fill", "#B20032");

		$scope.text_ee = $scope.legend.append("text")
			.style("fill", "#B20032");        	

		var ie = $scope.ie_ver();

        if (ie > 0) {
        	//Can't get .html to work on IE.
			$scope.text_e
				.text(function(d) { return "Expected"; })
			$scope.text_r
				.text(function(d) { return "R^2 = " + $scope.r_squared.toFixed(4); })
			$scope.text_k
				.text(function(d) { return "k = " + $scope.k; })
			$scope.text_ee
				.text(function(d) { return "% = " + $scope.total_explained.toFixed(2); })
        } else {
			$scope.text_e
				.html(function(d) { return d.text_e; });
			$scope.text_r
				.html(function(d) { return d.text_r; });
			$scope.text_k
				.html(function(d) { return d.text_k; });
			$scope.text_ee
				.html(function(d) { return d.text_ee; });
        }

		$scope.rect
			.attr("x", $scope.w_off/2)
			.attr("y", 0 );
		$scope.text_e
			.attr("x", $scope.w_off/2 + 44)
			.attr("y", 0 + 6);
		$scope.text_r
			.attr("x", $scope.w_off/2)
			.attr("y", 0 + 6 + $scope.font_size);
		$scope.text_k
			.attr("x", $scope.w_off/2)
			.attr("y", 0 + 6 + 2*$scope.font_size);
		$scope.text_ee
			.attr("x", $scope.w_off/2)
			.attr("y", 0 + 6 + 3*$scope.font_size);
	}

	$scope.d3_update_titles = function(append) {
		// $scope.svg.selectAll("#top-title").data([]).exit().remove()
		// $scope.top_title = $scope.svg.append("text")
		// 	.attr("x", $scope.w / 2)
		// 	.attr("y", 0 - ($scope.margin.top / 2))
		// 	.attr("id", "top-title")
		// 	.attr("text-anchor", "middle")
		// 	.style("font-size", "16px")

		// $scope.top_title
		// 	.text($scope.cur_title);

		$scope.svg.selectAll("#x-title").data([]).exit().remove()
		$scope.x_title = $scope.svg.append("text")
			.attr("x", $scope.w / 2)
			.attr("y", $scope.h + $scope.margin.top*0.90)
			.attr("id", "x-title")
			.attr("class", "axis-title")
			.attr("text-anchor", "middle");

		$scope.svg.selectAll("#y-title").data([]).exit().remove()
		$scope.y_title = $scope.svg.append("text")
			.attr("x", 0 - $scope.h / 2)
			.attr("y", 0 - $scope.margin.left*0.78)
			.attr("id", "y-title")
			.attr("class", "axis-title")
			.attr("text-anchor", "start")
			.attr("transform", "rotate(-90)");

		switch ($scope.cur_title) {
			case $scope.titles[1]:
				$scope.x_title
					.text($scope.x_titles[1]);
				$scope.y_title
					.text($scope.y_titles[1]);
				break;
			case $scope.titles[2]:
				$scope.x_title
					.text($scope.x_titles[2]);
				$scope.y_title
					.text($scope.y_titles[2]);
				break;
			default:
				$scope.x_title
					.text($scope.x_titles[0]);
				$scope.y_title
					.text($scope.y_titles[0]);
		}
	}

	$scope.d3_display = function() {

		$scope.d3_update_dataset();
		$scope.d3_update_container();
		$scope.d3_update_scales();
		$scope.d3_update_axes();
		$scope.d3_update_svg();
		$scope.d3_update_gs(true);
		$scope.d3_update_line(true, false);
		$scope.d3_update_legend();
		$scope.d3_update_titles(true);

		$scope.circles = $scope.svg.selectAll("circle")
			.data($scope.cur_dataset)
			.enter()
			.append("circle")
			.attr("class", function(d) {
				return $scope.d3_class(d);
			})
			.style('opacity', 0)
			.attr("cx", function(d, i) {
				return $scope.x_scale(0);
			})
			.attr("cy", function(d) {
				return $scope.y_scale(0);
			})
			.attr("r", function(d) {
				return 0;
			});

		$scope.circles
			.transition()
			.duration($scope.clock)
			.style('opacity', 1)
			.ease('quad-out')
			.attr("cx", function(d, i) {
				return $scope.x_scale(i);
			})
			.attr("r", function(d) {
				return 10;
			});

		$scope.circles
			.transition()
			.duration($scope.clock)
			.delay($scope.clock)
			.ease('quad-out')
			.attr("cy", function(d) {
				return $scope.d3_y(d);
			});
	}

	$scope.d3_reload = function() {

		$scope.d3_update_dataset();
	    $scope.d3_update_scales();
	    $scope.d3_update_axes();
		$scope.d3_update_gs(false);

		$scope.circles
			.transition()
			.duration($scope.clock)
			.style('opacity', 0)
			.attr("r", function(d) {
				return 0;
			})
			.each('end', function() {

				// Only execute transitions until after each circle is done.
				if ($scope.count < $scope.num_teams-1) {
					$scope.count++;
					return;
				}
				$scope.count = 0;

				$scope.circles	
					.data($scope.cur_dataset)
					.attr("class", function(d) {
						return $scope.d3_class(d);
					});

				$scope.circles
					.transition()
					.duration($scope.clock)
					.ease('quad-out')
					.style('opacity', 1)
					.attr("cx", function(d, i) {
						return $scope.x_scale(i);
					})
					.attr("r", function(d) {
						return 10;
					}).each('end', function() {
						// Only execute transitions until after each circle is done.
						if ($scope.count < $scope.num_teams-1) {
							$scope.count++;
							return;
						}
						$scope.count = 0;						
						$scope.circles
							.transition()
							.duration($scope.clock)
							.delay($scope.clock)
							.ease('quad-out')
							.attr("cy", function(d, i) {
								return $scope.d3_y(d);
							}).each('end', function() {
								if ($scope.count < $scope.num_teams-1) {
									$scope.count++;
									return;
								}
								$scope.count = 0;						
								$scope.d3_update_line(false, false);
								$scope.d3_update_legend();
								// Band aid to force legend to refresh.
								$scope.d3_resize();

								$scope.assign_tips();
							});
					});

			});
	}

	$scope.d3_switch = function() {

		$scope.d3_update_dataset();
	    $scope.d3_update_scales();
	    $scope.d3_update_axes();
		$scope.d3_update_gs(false);
		$scope.d3_update_titles(true);

		$scope.circles	
			.data($scope.cur_dataset)

		$scope.circles
			.transition()
			.duration($scope.clock)
			.ease('quad-out')
			.attr("cy", function(d, i) {
				return $scope.d3_y(d);
			});

		$scope.d3_update_line(false, false);
	}

	$scope.d3_resize = function() {

		$scope.h_off = $(window).height() * $scope.h_ratio;
		$scope.w_off = $(window).width() * $scope.w_ratio;
		$scope.h = $(window).height() - $scope.margin.top - $scope.margin.bottom - $scope.h_off;
		$scope.w = $(window).width() - $scope.margin.left - $scope.margin.right - $scope.w_off;

		$scope.d3_update_container();
		$scope.d3_update_scales();
		$scope.d3_update_axes();
		$scope.d3_update_svg();
		$scope.d3_update_gs(true);	    
		$scope.d3_update_line(true, true);
		$scope.d3_update_legend();
		$scope.d3_update_titles(false);

		$scope.circles = $scope.svg.selectAll("circle")
			.data($scope.cur_dataset)
			.enter()
			.append("circle")
			.attr("class", function(d) {
				return $scope.d3_class(d);
			})
			.attr("cx", function(d, i) {
				return $scope.x_scale(i);
			})
			.attr("cy", function(d) {
				return $scope.d3_y(d);
			})
			.attr("r", function(d) {
				return 10;
			});
	}

	$scope.load_tips = function() {

		var tips = $('#tips').empty();
		for (var i = 0; i < $scope.num_teams; i++) {
			var t = $scope.scores_dataset[i];
			var html = "";
			html += "<div class=\"tips-content\" id=\"" + t.team_id + "\">";
			html += "<table class=\"tips-content\">";
			html += "<tr><th>PC#</th><th>Most Influential Stat</th><th>Score</th></tr>"
			for (var j = 1; j <= $scope.scores_dataset[i].scores.length; j++) {
				html += "<tr><td>PC" + j + "</td><td>" + $scope.format_cat($scope.pc_cats[j-1]) + "</td><td>" + $scope.scores_dataset[i].scores[j-1].toFixed(4) + "</td></tr>";
			}
			html += "<tr><td>Total Score</td><td>~</td><td>"  + $scope.scores_dataset[i].total_score.toFixed(4) + "</td></tr>";
			html += "</table>";
			html += "</div>";
			tips.append(html);
		}
	}

	$scope.assign_tips = function() {

		$('.circle').each(function(i) {
			var id = $scope.scores_dataset[i].team_id;
			// Temp fix to keep qtips in screen (can't figure out adjust: screen: true). Face down if high draft order.
			if ($scope.linreg_dataset[i].y <= ($scope.num_teams / 2)) {
				$(this).qtip({
					content: {
						text: $('#' + id).html(),
						title: id + ': ' + $scope.team_name(id)
					},
					position: {
						my: 'bottom center',
						at: 'top center',
						target: $(this),
						adjust: {
							screen: true
						}
					}	
				});
			} else {
				$(this).qtip({
					content: {
						text: $('#' + id).html(),
						title: id + ': ' + $scope.team_name(id)
					},
					position: {
						my: 'top center',
						at: 'bottom center',
						target: $(this),
						adjust: {
							screen: true
						}
					}	
				});
			}
		});
	}

	$scope.tab_clicked = function(title) {

		if ($scope.nflexam_view) {
			$scope.nflexam_clicked(false);
		}
		if ($scope.cur_title == title) {
			return;
		}
		if ($scope.titles[2] == title || $scope.cur_title == $scope.titles[2]) {
			$scope.cur_title = title;
			$scope.d3_display();
			$scope.assign_tips();
		} else {
			$scope.cur_title = title;
    		$scope.d3_switch();
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
				$('#' + $scope.format_label($scope.cur_title)).addClass('active');
				$('#content-container').show().animate({marginLeft: "0px"}, 350, function() {
					if (nflexam_label) {
						$("#nflexam-label").removeClass('active');
					}
				});
			});
			$scope.nflexam_view = !$scope.nflexam_view;
			//Container disappears if not stopped it for some reason. Examine later!
		}
	}

	$scope.cats_clicked = function() {

		if ($scope.nflexam_view) {
			$scope.nflexam_clicked();
		}
		if ($scope.cats.length == 0) {
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
			if ($scope.cats.sort().toString() !== $scope.temp_cats.sort().toString()
				|| $scope.temp_year != $scope.year) {
				$scope.pca_query(true);
			}
		}
	}

	$scope.go_clicked = function() {

		if ($scope.cats.length == 0) {
			alert("Need at least one stat!");
			return;
		}
		$scope.cats_clicked();
		$('#new-label').removeClass('active');
		$('#go-label').removeClass('active');
	}

	$scope.catbox_changed = function(cat, section) {

		var idx = $.inArray(cat, $scope.cats);
		if (idx > -1) {
			$scope.cats.splice(idx, 1);
			$('#' + section).prop('checked', false);
		} else {
			$scope.cats.push(cat);
			if ($('.' + section + ':checked').length == $('.' + section).length) {
				$('#' + section).prop('checked', true);
			}
		}
	}

	$scope.section_changed = function(section) {

		if ($('#' + section).prop('checked')) {
			$('.' + section).each(function() {
				if ($scope.cats.indexOf($(this).attr('id')) < 0) {
					$scope.cats.push($(this).attr('id'));
				}
			});
			$('.' + section).prop('checked', true);
		} else {
			$('.' + section).each(function() {
				var idx = $.inArray($(this).attr('id'), $scope.cats);
				if (idx > -1) {
					$scope.cats.splice(idx, 1);
				}
			});
			$('.' + section).prop('checked', false);
		}
	}

	$scope.year_changed = function(year) {

		$scope.year = year;
	}

	$scope.team_name = function(team_id) {

		if (typeof($scope.team_map[team_id]) == "undefined") {
			return "Unknown";
		}
		return $scope.team_map[team_id];
	}

	$scope.format_cat = function(cat) {

		var cat_space = cat.replace(/_/g, ' ');
		var formatted_cat = cat_space.replace(/\w\S*/g, function(txt) { return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase(); });
		return formatted_cat;
	}

	$scope.format_label = function(id) {

		var formatted_id = id.replace(/ /g, '-').toLowerCase();
		return formatted_id;
	}

	$scope.team_map = {
		"ARI":	"Arizona Cardinals",
		"ATL":	"Atlanta Falcons",
		"BAL":	"Baltimore Ravens",
		"BUF":	"Buffalo Bills",
		"CAR":	"Carolina Panthers",
		"CHI":	"Chicago Bears",
		"CIN":	"Cincinnati Bengals",
		"CLE":	"Cleveland Browns",
		"DAL":	"Dallas Cowboys",
		"DEN":	"Denver Broncos",
		"DET":	"Detroit Lions",
		"GB":	"Green Bay Packers",
		"HOU":	"Houston Texans",
		"IND":	"Indianapolis Colts",
		"JAC":	"Jacksonville Jaguars",
		"KC":	"Kansas City Chiefs",
		"MIA":	"Miami Dolphins",
		"MIN":	"Minnesota Vikings",
		"NE":	"New England Patriots",
		"NO":	"New Orleans Saints",
		"NYG":	"New York Giants",
		"NYJ":	"New York Jets",
		"OAK":	"Oakland Raiders",
		"PHI":	"Philadelphia Eagles ",
		"PIT":	"Pittsburgh Steelers",
		"SD":	"San Diego Chargers",
		"SEA":	"Seattle Seahawks",
		"SF":	"San Francisco 49ers",
		"STL":	"St. Louis Rams",
		"TB":	"Tampa Bay Buccaneers",
		"TEN":	"Tennessee Titans",
		"WAS":	"Washington Redskins"
	};
}