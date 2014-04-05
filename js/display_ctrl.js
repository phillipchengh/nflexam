'use strict';

function display_ctrl($scope, nflexam) {

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
	$scope.clock = 700;
	$scope.display_count = 0;
	$scope.reload_count = 0;

	// Default stats.
	$scope.num_teams = 32;
	$scope.max_score = $scope.h;
	$scope.min_score = 0;
	$scope.max_explained = $scope.h;
	$scope.scores_dataset = [];
	$scope.linreg_dataset = [];
	$scope.explained_dataset = [];
	$scope.cur_dataset = [];
	
	$scope.x_titles = ['NFL Teams [Hover over team points for details!]', 'Calculated Rankings', 'Principal Component'];
	$scope.y_titles = ['Total Scores', 'Draft Order', 'Percentage Variance'];
	
	$scope.k = 0;
	$scope.r_squared = 0;
	$scope.total_explained = 0;
	$scope.pc_cats = [];

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

	//Broadcasted events from labels_ctrl.
	$scope.$on("pca_init", function() { $scope.pca_init(); });
	$scope.$on("pca_reload", function() { $scope.pca_reload(); });
	$scope.$on("d3_display", function() { $scope.d3_display(); });
	$scope.$on("d3_switch", function() { $scope.d3_switch(); });

	$scope.load_data = function(json) {

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
	}

	$scope.pca_init = function() {

		nflexam.pca.query({cat: nflexam.get_cats(), year: nflexam.get_year()},
			function success(json) {

				$scope.load_data(json);
				$scope.$emit("cats_init");
				$scope.$emit("temp_init");
				$scope.d3_update_dataset();
				$scope.d3_display();
				$(window).resize(function() {
					$scope.d3_resize();
				});
			},
			function error() {
				$("#d3-content").html("<div class=\"error\">Something went wrong. [. . ]?</div>");
			});
	}

	$scope.pca_reload = function() {

		nflexam.pca.query({cat: nflexam.get_cats(), year: nflexam.get_year()},
			function success(json) {

				$scope.load_data(json);
				$scope.$emit("temp_init");
				var cur_title = nflexam.get_cur_title();
				var titles = nflexam.get_titles();
				if (cur_title == titles[2]) {
					$scope.d3_display();
				} else {
		    		$scope.d3_reload();
				}
			},
			function error() {
				$("#d3-content").html("<div class=\"error\">Something went wrong. [. . ]?</div>");
			});
	}

	$scope.d3_class = function(d) {

		var cur_title = nflexam.get_cur_title();
		var titles = nflexam.get_titles();
		switch (cur_title) {
			case titles[2]:
				return "explained";
			default:
				return d.team_id + ' circle';
		}
	}

	$scope.d3_y = function(d) {

		var cur_title = nflexam.get_cur_title();
		var titles = nflexam.get_titles();
		switch (cur_title) {
			case titles[1]:
				return $scope.y_scale(d.y);
			case titles[2]:
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
		$("#d3-content").empty().css(container_css).append("<span id=\"first\"></span>");
		$("#cats-content").css({"width": $scope.w});
		$("#nflexam-content").css({"width": $scope.w});
	}

	$scope.d3_update_scales = function() {

		var cur_title = nflexam.get_cur_title();
		var titles = nflexam.get_titles();
		switch (cur_title) {
			case titles[1]:
				$scope.x_scale = d3.scale.linear()
			    	.domain([0, $scope.num_teams-1])
			    	.range([0, $scope.w]);

				$scope.y_scale = d3.scale.linear()
			    	.domain([0, $scope.num_teams-1])
			    	.range([$scope.h, 0]);
		    	break;
	    	case titles[2]:;
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

		var cur_title = nflexam.get_cur_title();
		var titles = nflexam.get_titles();
		switch (cur_title) {
			case titles[1]:
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
	    	case titles[2]:
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

		var cur_title = nflexam.get_cur_title();
		var titles = nflexam.get_titles();

		switch (cur_title) {
			case titles[1]:
				$scope.cur_dataset = $scope.linreg_dataset;
		    	break;
	    	case titles[2]:
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

		var cur_title = nflexam.get_cur_title();
		var titles = nflexam.get_titles();
		if (append) {
			$scope.line = $scope.svg.insert("svg:line", "#first")
	    		.attr("stroke", "#BBBBBB")
				.attr("stroke-width", 0);
		}

		if (cur_title == titles[1]) {
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

		var cur_title = nflexam.get_cur_title();
		var titles = nflexam.get_titles();
		switch (cur_title) {
			case titles[1]:
				$scope.x_title
					.text($scope.x_titles[1]);
				$scope.y_title
					.text($scope.y_titles[1]);
				break;
			case titles[2]:
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
			})
			.each('end', function() {
				if ($scope.display_count < $scope.num_teams-1) {
					$scope.display_count++;
					return;
				}
				$scope.display_count = 0;
				console.log($('#tips').html());
				$scope.assign_tips();		
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
				if ($scope.reload_count < $scope.num_teams-1) {
					$scope.reload_count++;
					return;
				}
				$scope.reload_count = 0;

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
						if ($scope.reload_count < $scope.num_teams-1) {
							$scope.reload_count++;
							return;
						}
						$scope.reload_count = 0;						
						$scope.circles
							.transition()
							.duration($scope.clock)
							.delay($scope.clock)
							.ease('quad-out')
							.attr("cy", function(d, i) {
								return $scope.d3_y(d);
							}).each('end', function() {
								if ($scope.reload_count < $scope.num_teams-1) {
									$scope.reload_count++;
									return;
								}
								$scope.reload_count = 0;						
								$scope.d3_update_line(false, false);
								$scope.d3_update_legend();
								// Force legend to refresh, check out later.
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
		$scope.assign_tips();
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

		$scope.assign_tips();
	}

	$scope.assign_tips = function() {

		$('.circle').each(function(i) {
			var id = $scope.scores_dataset[i].team_id;
			var cur_title = nflexam.get_cur_title();
			var titles = nflexam.get_titles();
			var test;
			switch (cur_title) {
				case titles[1]: 
					test = $scope.linreg_dataset[i].y <= ($scope.num_teams / 2);
					break;
				default:
					test = $scope.scores_dataset[i].total_score <= 0;
			}
			// Temp fix to keep qtips in screen (can't figure out adjust: screen: true). Face down if high draft order.
			if (test) {
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