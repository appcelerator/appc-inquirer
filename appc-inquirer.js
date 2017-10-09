'use strict';

var async = require('async'),
	inquirer = require('inquirer'),
	net = require('net');

module.exports = new AppcInquirer();

/**
 *
 * @constructor
 */
function AppcInquirer() {}

/**
 *
 * @param  {Array}   questions [description]
 * @param  {Object}   opts      [description]
 * @param  {Function} callback  [description]
 * @returns {void}
 */
AppcInquirer.prototype.prompt = function prompt(questions, opts, callback) {
	callback = arguments[arguments.length - 1];
	if (!opts || isFunction(opts)) {
		opts = {};
	}

	// ask our questions over a socket
	if (opts.socket) {
		return new SocketPrompt(opts).prompt(questions, callback);
	} else { // have inquirer handle questions via stdio
		var promise = inquirer.prompt(questions);
		promise.then(function (answers) {
			// inquirer filters answers from the parameter for questions that where
			// not actually asked due to their when function returning false. But we
			// can still get the unfiltered answers directly from the ui reference
			// set on the promise.
			return callback(null, promise.ui.answers);
		}).catch(function (error) {
			return callback(error);
		});
		return promise.ui;
	}
};

/**
 * Send message from CLI to Studio.
 * @param  {Object}   opts      [description]
 * @param  {Function} callback  [description]
 */
AppcInquirer.prototype.socketMessage = function (opts, callback) {
	return new SocketPrompt(opts).sendMessage(opts, callback);
};

/**
 *
 * @param       {Object} opts [description]
 * @constructor
 */
function SocketPrompt(opts) {
	this.host = opts.host || '127.0.0.1';
	this.port = opts.port || 22212;
	this.bundle = opts.bundle || false;
	this.message = opts.message || '';
	this.code = opts.code || '';
}

/**
 * [description]
 * @param  {Array}   questions [description]
 * @param  {Function} callback  [description]
 */
SocketPrompt.prototype.prompt = function (questions, callback) {
	questions = !Array.isArray(questions) ? [ questions ] : questions;

	var self = this;
	var client = new net.Socket();

	async.waterfall([

		// set up handlers for socket
		function (cb) {
			client.on('connect', cb);
			client.on('error', callback);

			client.connect({
				host: self.host,
				port: self.port
			});
		},

		// send question, receive answer
		function (cb) {
			if (self.bundle) {
				return bundleQuestions(client, questions, cb);
			} else {
				return singleQuestions(client, questions, cb);
			}
		}
	], function (err, answers) {
		client.end();
		return callback(err, answers);
	});
};

/**
 * Send message through socket, mainly used by Studio.
 * @param  {Object}   opts [description]
 * @param  {Function} callback  [description]
 */
SocketPrompt.prototype.sendMessage = function (opts, callback) {
	var self = this;
	var client = new net.Socket();

	async.waterfall([
		function (cb) {
			client.on('connect', cb);
			client.on('error', callback);

			client.connect({
				host: self.host,
				port: self.port
			});
		},

		function (cb) {
			client.write(JSON.stringify({
				type: opts.type,
				code: opts.code,
				message: opts.msg
			}), cb);
		}
	], function (err, result) {
		client.end();
		return callback(err, result);
	});
};

/**
 * [singleQuestions description]
 * @param  {net.Socket}   client    [description]
 * @param  {Array}   questions [description]
 * @param  {Object}   context [description]
 * @param  {Function} callback  [description]
 */
function singleQuestions(client, questions, callback) {
	var answers = {};

	async.eachSeries(questions, function (q, done) {
		// when
		if (isFunction(q.when) && !q.when(answers)) {
			return done();
		}

		// message, default, and choices can be a function
		if (isFunction(q.message)) {
			q.message = q.message(answers);
		}
		if (isFunction(q.default)) {
			q.default = q.default(answers);
		}
		if (isFunction(q.choices)) {
			q.choices = q.choices(answers);
		}

		// send question over socket
		client.write(JSON.stringify({
			type: 'question',
			question: q
		}));

		client.once('data', function (answer) {
			// make sure we got JSON back
			try {
				answer = JSON.parse(answer);
			} catch (e) {
				client.write(JSON.stringify({
					type: 'error',
					code: 'ERROR_PARSE',
					message: 'parse error: ' + e.message
				}));
				return done(new Error('Parse error.'));
			}

			// validate the answer
			if (isFunction(q.validate)) {
				var valid = q.validate(answer);
				if (valid !== true) {
					client.write(JSON.stringify({
						type: 'error',
						code: 'ERROR_VALIDATE',
						message: 'validate error: ' + (valid || 'invalid value for ' + q.name)
					}));
					return done(new Error('Validate error.'));
				}
			}

			// filter
			if (isFunction(q.filter)) {
				answer = q.filter(answer);
			}

			// save answer
			answers[q.name] = answer;
			return done();
		});
	}, function (err) {
		return callback(err, answers);
	});
}

/**
 * [bundleQuestions description]
 * @param  {net.Socket}   client    [description]
 * @param  {Array}   questions [description]
 * @param  {Object}   context [description]
 * @param  {Function} callback  [description]
 */
function bundleQuestions(client, questions, callback) {
	var answers = {},
		bundles = [];

	// create question bundles
	questions.forEach(function (q, index) {
		if (isFunction(q.when) || isFunction(q.message) || isFunction(q.default) || isFunction(q.choices) || index === 0) {
			bundles[bundles.length] = [ q ];
		} else {
			bundles[bundles.length - 1].push(q);
		}
	});

	// process each question bundle over socket
	async.eachSeries(bundles, function (bundle, done) {
		var reqBundle = [];
		bundle.forEach(function (q) {
			// when
			if (isFunction(q.when) && !q.when(answers)) {
				return;
			}

			// message, default, and choices can be a function
			if (isFunction(q.message)) {
				q.message = q.message(answers);
			}
			if (isFunction(q.default)) {
				q.default = q.default(answers);
			}
			if (isFunction(q.choices)) {
				q.choices = q.choices(answers);
			}

			reqBundle.push(q);
		});

		// nothing to ask
		if (reqBundle.length === 0) {
			return done();
		}

		// send question over socket
		client.write(JSON.stringify({
			type: 'question',
			question: reqBundle
		}));

		client.once('data', function (respAnswers) {
			// make sure we got JSON back
			try {
				respAnswers = JSON.parse(respAnswers);
			} catch (e) {
				client.write(JSON.stringify({
					type: 'error',
					code: 'ERROR_PARSE',
					message: 'parse error: ' + e.message
				}));
				return done(new Error('Parse error.'));
			}

			// validate the answer
			var keys = Object.keys(respAnswers);
			for (var i = 0; i < keys.length; i++) {
				var key = keys[i];
				var q = find(reqBundle, 'name', key);
				var answer = respAnswers[key];

				// validate the current answer
				if (isFunction(q.validate)) {
					var valid = q.validate(answer);
					if (valid !== true) {
						client.write(JSON.stringify({
							type: 'error',
							code: 'ERROR_VALIDATE',
							message: 'validate error: ' + (valid || 'invalid value for ' + q.name)
						}));
						return done(new Error('Validate error.'));
					}
				}

				// filter the answer
				if (isFunction(q.filter)) {
					answer = q.filter(answer);
				}

				// save the answer
				answers[key] = answer;
			}

			return done();
		});
	}, function (err) {
		return callback(err, answers);
	});
}

/**
 * Searches an array for a matching key/value pair. Returns the array item that matches.
 * @param  {Array} array array of items to search
 * @param  {Object} key   property of each array item to check
 * @param  {Object} value expected value
 * @return {Object}       the array item whose property(`key`) has the value (`value`)
 */
function find(array, key, value) {
	for (var i = 0; i < array.length; i++) {
		var item = array[i];
		if (item[key] === value) {
			return item;
		}
	}
	return null;
}

/**
 * [isFunction description]
 * @param  {Object}  o [description]
 * @return {boolean}   [description]
 */
function isFunction(o) {
	return o && Object.prototype.toString.call(o) === '[object Function]';
}
