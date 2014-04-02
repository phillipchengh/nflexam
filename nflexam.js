var express = require('express');
var app = express();
var pg = require('pg');
var async = require('async');

console.log(process.env);

app.configure('development', function() {
	app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
	app.use(express.compress());
	app.set('path', '/dev/nflexam')
	app.set('port', 2014);
	app.use('/dev/nflexam' + '/template', express.static(__dirname + '/template'));
	app.use('/dev/nflexam' + '/css', express.static(__dirname + '/css'));
	app.use('/dev/nflexam' + '/js', express.static(__dirname + '/js'));
});

app.configure('production', function() {
	app.use(express.compress());
	app.set('path', '/nflexam')
	app.set('port', 2013);
	app.use('/nflexam/template', express.static(__dirname + '/template'));
	app.use('/nflexam/css', express.static(__dirname + '/css'));
	app.use('/nflexam/js', express.static(__dirname + '/js'));
});

var path = app.get('path');

app.get(path + '/', function(req, res) {
	res.sendfile('index.html');
});

var valid_year = function(year) {
	int_year = parseInt(year);
	if (isNaN(int_year) || int_year % 1 != 0) {
		return false;
	}
	return true;
}

var valid_cats = function(cats) {
	if (typeof cats == 'undefined' || cats.length < 1) {
		console.log(cats)
		return false;
	}
	return true;
}

app.get(path + '/pca', function(req, res) {
	var year = req.query.year;
	var cats = req.query.cat;
	if (!valid_year(year) || !valid_cats(cats)) {
		res.send('Check your cats!');
		return;
	}

	var spawn = require('child_process').spawn;
	var args = ['script/nflmath.py'].concat([year].concat(cats));

	var python = spawn('python', args);
	data = '';

	python.stdout.on('data', function(chunk) {
		console.log('stdout: ' + chunk);
		data += chunk;
	});

	python.stderr.on('data', function(error) {
		console.log('stderr: ' + error);
	});

	python.on('close', function(code) {
		console.log('process exited with: ' + code)
		if (code == 0) {
			res.header('Content-Type', 'application/json');
			res.send(JSON.parse(data));
		} else {
			res.send('Error!');
		}
	});

});

var pg_select = function(query_text) {
	var client = new pg.Client({
		user: process.env.NFLEXAM_USER,
		password: process.env.NFLEXAM_PASS,
		database: 'nflexam',
		host: 'localhost',
		port: 5432
	});

	client.connect();
	var query = client.query(query_text);

	query.on('row', function(row, result) {
		result.addRow(row);
	});
	query.on('error', function() {
		console.error('Cat get error!');
	});
	query.on('end', function(result) {
		console.log('query results: ' + result.rows);
		return result.rows;
	});
}

var get_cat_queries = function() {

	return {
		"sections": ["Defense", "Fumbles", "Kicking", "Passing", "Punting", "Receiving", "Rushing"],
		"queries": [
			"SELECT column_name FROM information_schema.columns \
			WHERE table_name = \'season_stat\' \
			AND column_name ~ \'^defense.*\' \
			ORDER BY column_name;",

			"SELECT column_name FROM information_schema.columns \
			WHERE table_name = \'season_stat\' \
			AND column_name ~ \'^fumbles.*\' \
			ORDER BY column_name;",

			"SELECT column_name FROM information_schema.columns \
			WHERE table_name = \'season_stat\' \
			AND column_name ~ \'^kick.*\' \
			ORDER BY column_name;",

			"SELECT column_name FROM information_schema.columns \
			WHERE table_name = \'season_stat\' \
			AND column_name ~ \'^pass.*\' \
			ORDER BY column_name;",

			"SELECT column_name FROM information_schema.columns \
			WHERE table_name = \'season_stat\' \
			AND column_name ~ \'^punt.*\' \
			ORDER BY column_name;",

			"SELECT column_name FROM information_schema.columns \
			WHERE table_name = \'season_stat\' \
			AND column_name ~ \'^receiving.*\' \
			ORDER BY column_name;",

			"SELECT column_name FROM information_schema.columns \
			WHERE table_name = \'season_stat\' \
			AND column_name ~ \'^rushing.*\' \
			ORDER BY column_name;"
		]
	}
}

var async_select = function(query_text, callback) {

	var client = new pg.Client({
		user: process.env.NFLEXAM_USER,
		password: process.env.NFLEXAM_PASS,
		database: 'nflexam',
		host: 'localhost',
		port: 5432
	});

	client.connect();
	var query = client.query(query_text);

	query.on('row', function(row, result) {
		result.addRow(row);
	});
	query.on('error', function() {
		console.error('Cat get error!');
		callback(1, null);
	});
	query.on('end', function(result) {
		callback(null, result.rows);
	});
}

app.get(path + '/cat', function(req, res) {

	var cat_queries = get_cat_queries();

	async.map(cat_queries.queries, async_select, function(err, results) {
		if (err) {
			console.error('async err:' + err);
			res.send([]);
		} else {
			var json = {};
			var sections = [];
			var cat_queries = get_cat_queries();
			for (var i = 0; i < results.length; i++) {
				r = results[i];
				cats = [];
				for (var j = 0; j < r.length; j++) {
					cats.push(r[j].column_name);
				}
				sections.push({
					"section": cat_queries.sections[i],
					"cats": cats
				});
			}

			json["sections"] = sections;

			var client = new pg.Client({
				user: process.env.NFLEXAM_USER,
				password: process.env.NFLEXAM_PASS,
				database: 'nflexam',
				host: 'localhost',
				port: 5432
			});

			client.connect();
			var query = client.query("SELECT DISTINCT year FROM season_stat ORDER BY year DESC;");

			query.on('row', function(row, result) {
				result.addRow(row);
			});

			query.on('error', function() {
				console.error('Year get error!');
				res.send([]);
			});

			query.on('end', function(result) {
				var years = [];
				for (var k = 0; k < result.rows.length; k++) {
					years.push(result.rows[k].year);
				}
				json["years"] = years;
				res.send(json);
			});

		}
	});
});

app.listen(app.get('port'));