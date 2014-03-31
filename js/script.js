// D3 height, weight, margins and offset.
var margin = {top: 40, bottom: 40, left: 40, right: 40};
var h_ratio = .2;
var w_ratio = .2;
var h_off = $(window).height() * h_ratio;
var w_off = $(window).width() * w_ratio;
var h = $(window).height() - margin.top - margin.bottom - h_off;
var w = $(window).width() - margin.left - margin.right - w_off;

// Default values.
var num_teams = 32;
var min_score = 0;
var max_score = h;
var scores_dataset = [];

$(document).ready(function() {

	var req = $.ajax({
		url: "pca?cat=passing_tds&year=2013",
		type: "GET",
		dataType: "json"
	});

	req.done(function(data) {
		num_teams = data.length;
		min_score = data[0].total_score;
		max_score = data[num_teams-1].total_score;
		scores_dataset = data;
		d3_display(data);
		$(window).resize(function() {
			console.log("resize!");
			d3_on_resize(data);
		});
	});
	
	req.fail(function(jqXHR, textStatus) {
		$("d3-content").html("Failure!");
	});

});

var d3_display = function(dataset) {

	var d3_css = {
			"height": h + margin.top + margin.bottom + "px",
			"width": w + margin.left + margin.right + "px",
			"margin": "0px auto"
		}

	$("#d3-content").empty().css(d3_css);

    var x_scale = d3.scale.linear()
    	.domain([0, num_teams-1])
    	.range([0, w]);

	var y_scale = d3.scale.linear()
    	.domain([min_score, max_score])
    	.range([h, 0]);

	var x_axis = d3.svg.axis()
		.scale(x_scale)
		.orient("bottom")
		.ticks(num_teams)
		.tickFormat(function(i) { return scores_dataset[i].team_id; });

	var y_axis = d3.svg.axis()
		.scale(y_scale)
		.orient("left");

	var svg = d3.select("#d3-content")
		.append("svg")
		.attr("height", h + margin.top + margin.bottom)
		.attr("width", w + margin.left + margin.right)
		.append("g")
    	.attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    svg.append("g")
    	.attr("transform", "translate(0," + (h) + ")")
		.attr("class", "axis")
    	.call(x_axis);

	svg.append("g")
		.attr("class", "axis")
    	.call(y_axis);

	var circles = svg.selectAll("circle")
		.data(dataset)
		.enter()
		.append("circle")
		.attr("class", function(d) {
			return d.team_id;
		})
		.attr("cx", function(d, i) {
			return x_scale(i);
		})
		.attr("cy", function(d) {
			return y_scale(d.total_score);
		})
		.attr("r", function(d) {
			return 10;
		});
}

var d3_on_resize = function(dataset) {

	h_off = $(window).height() * h_ratio;
	w_off = $(window).width() * w_ratio;
	h = $(window).height() - margin.top - margin.bottom - h_off;
	w = $(window).width() - margin.left - margin.right - w_off;
	$("#d3-content").empty();
	d3_display(dataset);

}