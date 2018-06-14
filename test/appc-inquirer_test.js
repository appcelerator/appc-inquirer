/* eslint-env mocha */
/* eslint no-unused-expressions: "off", no-unused-vars: "off" */
'use strict';

var _ = require('lodash'),
	net = require('net'),
	inquirer = require('..'),
	should = require('should');

var DEFAULT_PORT = 22212;
var BASIC = {
	type: 'input',
	name: 'basic',
	message: 'gimme test'
};
var COMPLEX = {
	type: 'input',
	name: 'complex',
	message: 'gimme test',
	default: function (answers) {
		return 'defaultcomplex';
	},
	validate: function (answer) {
		return answer === 'test' || answer === 'defaultcomplex';
	},
	filter: function (answer) {
		return answer.toUpperCase();
	},
	when: function (answers) {
		return true;
	}
};
var LIST = {
	type: 'list',
	name: 'list',
	message: function (answers) {
		return 'list';
	},
	default: 'answer2_value',
	choices: function (answers) {
		return [
			{ name: 'answer1_name', value: 'answer1_value' },
			{ name: 'answer2_name', value: 'answer2_value' },
			{ name: 'answer3_name', value: 'answer3_value' }
		];
	}
};
var OMIT_PROPS = [ 'validate', 'filter', 'when', 'choices' ];

describe('appc-inquirer', function () {

	it('exposes prompt()', function () {
		should.exist(inquirer.prompt);
		inquirer.prompt.should.be.a.Function;
	});

	(process.env.JENKINS_URL ? it.skip : it)('gets user input via command line', function (done) {
		var val = 'workit';
		inquirer.prompt([ BASIC ], function (err, answers) {
			should.not.exist(err);
			answers.should.be.an.Object;
			answers.basic.should.equal(val);
			return done();
		});

		setTimeout(function () {
			process.stdin.emit('data', val + '\n');
		}, 200);
	});

	it('gets user input via socket', function (done) {
		var val = 'workit';

		var server = net.createServer(function (c) {
			c.once('data', function (data) {
				server.close();
				(function () {
					data = JSON.parse(data.toString());
				}).should.not.throw();
				data.should.be.an.Object;
				data.type.should.equal('question');
				data.question.should.be.an.Object;
				data.question.should.have.properties(BASIC);
				c.write(JSON.stringify(val));
			});
		});
		server.listen(DEFAULT_PORT, function () {
			inquirer.prompt([ BASIC ], { socket: true }, function (err, answers) {
				should.not.exist(err);
				answers.should.be.an.Object;
				answers.basic.should.equal(val);
				return done();
			});
		});
	});

	it('gets user input via socket-bundle', function (done) {
		var val = 'workit';

		var server = net.createServer(function (c) {
			c.once('data', function (data) {
				server.close();
				(function () {
					data = JSON.parse(data.toString());
				}).should.not.throw();
				data.should.be.an.Object;
				data.type.should.equal('question');
				data.question.should.be.an.Array;
				data.question.should.have.length(1);
				data.question[0].should.have.properties(BASIC);

				var result = {};
				result[data.question[0].name] = val;
				c.write(JSON.stringify(result));
			});
		});
		server.listen(DEFAULT_PORT, function () {
			inquirer.prompt([ BASIC ], { socket: true, bundle: true }, function (err, answers) {
				should.not.exist(err);
				answers.should.be.an.Object;
				answers.basic.should.equal(val);
				return done();
			});
		});
	});

	it('gets user input via socket with single question', function (done) {
		var val = 'workit';

		var server = net.createServer(function (c) {
			c.once('data', function (data) {
				server.close();
				(function () {
					data = JSON.parse(data.toString());
				}).should.not.throw();
				data.should.be.an.Object;
				data.type.should.equal('question');
				data.question.should.be.an.Object;
				data.question.should.have.properties(BASIC);
				c.write(JSON.stringify(val));
			});
		});
		server.listen(DEFAULT_PORT, function () {
			inquirer.prompt(BASIC, { socket: true }, function (err, answers) {
				should.not.exist(err);
				answers.should.be.an.Object;
				answers.basic.should.equal(val);
				return done();
			});
		});
	});

	it('gets user input via socket with complex question', function (done) {
		var server = net.createServer(function (c) {
			c.once('data', function (data) {
				server.close();
				(function () {
					data = JSON.parse(data.toString());
				}).should.not.throw();
				data.should.be.an.Object;
				data.type.should.equal('question');
				data.question.should.be.an.Object;
				data.question.should.have.properties(_.omit(COMPLEX, OMIT_PROPS));
				c.write(JSON.stringify('defaultcomplex'));
			});
		});
		server.listen(DEFAULT_PORT, function () {
			inquirer.prompt([ COMPLEX ], { socket: true }, function (err, answers) {
				should.not.exist(err);
				answers.should.be.an.Object;
				answers.complex.should.equal('DEFAULTCOMPLEX');
				return done();
			});
		});
	});

	it('gets user input via socket-bundle with complex question', function (done) {
		var server = net.createServer(function (c) {
			c.once('data', function (data) {
				server.close();
				(function () {
					data = JSON.parse(data.toString());
				}).should.not.throw();
				data.should.be.an.Object;
				data.type.should.equal('question');
				data.question.should.be.an.Array;
				data.question[0].should.have.properties(_.omit(COMPLEX, OMIT_PROPS));

				var result = {};
				result[data.question[0].name] = 'defaultcomplex';
				c.write(JSON.stringify(result));
			});
		});
		server.listen(DEFAULT_PORT, function () {
			inquirer.prompt([ COMPLEX ], { socket: true, bundle: true }, function (err, answers) {
				should.not.exist(err);
				answers.should.be.an.Object;
				answers.complex.should.equal('DEFAULTCOMPLEX');
				return done();
			});
		});
	});

	it('skips questions that fail when() checks', function (done) {
		var question = _.clone(BASIC);
		question.when = function (answers) {
			return false;
		};

		var server = net.createServer(function (c) {
			server.close();
		});
		server.listen(DEFAULT_PORT, function () {
			inquirer.prompt(question, { socket: true }, function (err, answers) {
				should.not.exist(err);
				answers.should.be.an.Object;
				answers.should.be.empty;
				return done();
			});
		});
	});

	it('skips questions that fail when() checks (socket-bundle)', function (done) {
		var question = _.clone(BASIC);
		question.when = function (answers) {
			return false;
		};

		var server = net.createServer(function (c) {
			server.close();
		});
		server.listen(DEFAULT_PORT, function () {
			inquirer.prompt(question, { socket: true, bundle: true }, function (err, answers) {
				should.not.exist(err);
				answers.should.be.an.Object;
				answers.should.be.empty;
				return done();
			});
		});
	});

	it('gets user input via socket with complex lists', function (done) {
		var server = net.createServer(function (c) {
			c.once('data', function (data) {
				server.close();
				(function () {
					data = JSON.parse(data.toString());
				}).should.not.throw();
				data.should.be.an.Object;
				data.type.should.equal('question');
				data.question.should.be.an.Object;
				data.question.should.have.properties(_.omit(LIST, OMIT_PROPS));

				for (var i = 0; i < data.question.choices.length; i++) {
					var choice = data.question.choices[i];
					choice.should.be.an.Object;
					choice.name.should.equal('answer' + (i + 1) + '_name');
					choice.value.should.equal('answer' + (i + 1) + '_value');
				}

				c.write(JSON.stringify('answer2_value'));
			});
		});
		server.listen(DEFAULT_PORT, function () {
			inquirer.prompt([ LIST ], { socket: true }, function (err, answers) {
				should.not.exist(err);
				answers.should.be.an.Object;
				answers.list.should.equal('answer2_value');
				return done();
			});
		});
	});

	it('gets user input via socket-bundle with complex lists', function (done) {
		var server = net.createServer(function (c) {
			c.once('data', function (data) {
				server.close();
				(function () {
					data = JSON.parse(data.toString());
				}).should.not.throw();
				data.should.be.an.Object;
				data.type.should.equal('question');
				data.question.should.be.an.Array;
				data.question[0].should.have.properties(_.omit(LIST, OMIT_PROPS));

				for (var i = 0; i < data.question[0].choices.length; i++) {
					var choice = data.question[0].choices[i];
					choice.should.be.an.Object;
					choice.name.should.equal('answer' + (i + 1) + '_name');
					choice.value.should.equal('answer' + (i + 1) + '_value');
				}

				var result = {};
				result[data.question[0].name] = 'answer2_value';
				c.write(JSON.stringify(result));
			});
		});
		server.listen(DEFAULT_PORT, function () {
			inquirer.prompt([ LIST ], { socket: true, bundle: true }, function (err, answers) {
				should.not.exist(err);
				answers.should.be.an.Object;
				answers.list.should.equal('answer2_value');
				return done();
			});
		});
	});

	it('resends question when it receives bad response JSON', function (done) {
		var val = 'workit';

		var server = net.createServer(function (c) {

			// handle initial question
			c.once('data', function (data) {
				(function () {
					data = JSON.parse(data.toString());
				}).should.not.throw();
				data.should.be.an.Object;
				data.type.should.equal('question');
				data.question.should.be.an.Object;
				data.question.should.have.properties(BASIC);

				// send bad JSON as response
				c.write(JSON.stringify(val) + '}}');

				// handle error response, try again
				c.once('data', function (data) {
					server.close();
					(function () {
						data = JSON.parse(data.toString());
					}).should.not.throw();
					data.should.be.an.Object;
					data.type.should.equal('error');
					data.message.should.match(/parse error/);
					data.question.should.be.an.Object;
					data.question.should.have.properties(BASIC);

					// send good JSON this time
					c.write(JSON.stringify(val));
				});
			});
		});
		server.listen(DEFAULT_PORT, function () {
			inquirer.prompt(BASIC, { socket: true }, function (err, answers) {
				should.not.exist(err);
				answers.should.be.an.Object;
				answers.basic.should.equal(val);
				return done();
			});
		});
	});

	it('resends question when it receives bad response JSON (socket-bundle)', function (done) {
		var val = 'workit';

		var server = net.createServer(function (c) {

			// handle initial question
			c.once('data', function (data) {
				(function () {
					data = JSON.parse(data.toString());
				}).should.not.throw();
				data.should.be.an.Object;
				data.type.should.equal('question');
				data.question.should.be.an.Array;
				data.question[0].should.have.properties(BASIC);

				// send bad JSON as response
				c.write(JSON.stringify(val) + '}}');

				// handle error response, try again
				c.once('data', function (data) {
					server.close();
					(function () {
						data = JSON.parse(data.toString());
					}).should.not.throw();
					data.should.be.an.Object;
					data.type.should.equal('error');
					data.message.should.match(/parse error/);
					data.question.should.be.an.Array;
					data.question[0].should.have.properties(BASIC);

					// send good JSON this time
					var result = {};
					result[data.question[0].name] = val;
					c.write(JSON.stringify(result));
				});
			});
		});
		server.listen(DEFAULT_PORT, function () {
			inquirer.prompt(BASIC, { socket: true, bundle: true }, function (err, answers) {
				should.not.exist(err);
				answers.should.be.an.Object;
				answers.basic.should.equal(val);
				return done();
			});
		});
	});

	it('resends question when answer fails validation (default message)', function (done) {
		var val = 'workit',
			question = _.clone(BASIC);
		question.validate = function (answer) {
			return answer === val;
		};

		var server = net.createServer(function (c) {

			// handle initial question
			c.once('data', function (data) {
				(function () {
					data = JSON.parse(data.toString());
				}).should.not.throw();
				data.should.be.an.Object;
				data.type.should.equal('question');
				data.question.should.be.an.Object;
				data.question.should.have.properties(_.omit(question, OMIT_PROPS));

				// send bad JSON as response
				c.write(JSON.stringify(val + '}}'));

				// handle error response, try again
				c.once('data', function (data) {
					server.close();
					(function () {
						data = JSON.parse(data.toString());
					}).should.not.throw();
					data.should.be.an.Object;
					data.type.should.equal('error');
					data.message.should.match(/validate error/);
					data.question.should.be.an.Object;
					data.question.should.have.properties(_.omit(question, OMIT_PROPS));

					// send good JSON this time
					c.write(JSON.stringify(val));
				});
			});
		});
		server.listen(DEFAULT_PORT, function () {
			inquirer.prompt(question, { socket: true }, function (err, answers) {
				should.not.exist(err);
				answers.should.be.an.Object;
				answers.basic.should.equal(val);
				return done();
			});
		});
	});

	it('resends question when answer fails validation socket-bundle (default message)', function (done) {
		var val = 'workit',
			question = _.clone(BASIC);
		question.validate = function (answer) {
			return answer === val;
		};

		var server = net.createServer(function (c) {

			// handle initial question
			c.once('data', function (data) {
				(function () {
					data = JSON.parse(data.toString());
				}).should.not.throw();
				data.should.be.an.Object;
				data.type.should.equal('question');
				data.question.should.be.an.Array;
				data.question[0].should.have.properties(_.omit(question, OMIT_PROPS));

				// send bad JSON as response
				var result = {};
				result[data.question[0].name] = val + '}}';
				c.write(JSON.stringify(result));

				// handle error response, try again
				c.once('data', function (data) {
					server.close();
					(function () {
						data = JSON.parse(data.toString());
					}).should.not.throw();
					data.should.be.an.Object;
					data.type.should.equal('error');
					data.message.should.match(/validate error/);
					data.question.should.be.an.Array;
					data.question[0].should.have.properties(_.omit(question, OMIT_PROPS));

					// send good JSON this time
					result = {};
					result[data.question[0].name] = val;
					c.write(JSON.stringify(result));
				});
			});
		});
		server.listen(DEFAULT_PORT, function () {
			inquirer.prompt(question, { socket: true, bundle: true }, function (err, answers) {
				should.not.exist(err);
				answers.should.be.an.Object;
				answers.basic.should.equal(val);
				return done();
			});
		});
	});

	it('handles many questions, with validation failures', function (done) {
		var val = 'workit';
		var questions = [
			{
				type: 'input',
				name: 'q1'
			},
			{
				type: 'list',
				name: 'q2',
				message: function (answers) {
					return 'q2 for ' + answers.q1;
				},
				default: '3',
				choices: [ '1', '2', '3', '4' ],
				filter: function (answer) {
					return 'answer' + answer;
				}
			},
			{
				type: 'checkbox',
				name: 'q3',
				choices: [
					{ name: 'a1', value: 'v1', checked: true },
					{ name: 'a2', value: 'v2', checked: false },
					{ name: 'a3', value: 'v3', checked: true },
					{ name: 'a4', value: 'v4', checked: false }
				]
			},
			{
				type: 'input',
				name: 'q4',
				validate: function (answer) {
					return answer === val ? true : 'failed!!!';
				}
			},
			{
				type: 'confirm',
				name: 'q5',
				default: true
			}
		];

		var server = net.createServer(function (c) {
			c.on('data', function (data) {
				(function () {
					data = JSON.parse(data.toString());
				}).should.not.throw();
				data.should.be.an.Object;
				if (data.type === 'error') {
					return;
				}

				switch (data.question.name) {
					case 'q1':
						data.type.should.equal('question');
						data.question.should.have.properties(_.omit(questions[0], OMIT_PROPS));
						c.write(JSON.stringify('answer#1'));
						break;
					case 'q2':
						data.type.should.equal('question');
						data.question.should.have.properties(_.omit(questions[1], OMIT_PROPS));
						c.write(JSON.stringify('2'));
						break;
					case 'q3':
						data.type.should.equal('question');
						data.question.should.have.properties(_.omit(questions[2], OMIT_PROPS));
						c.write(JSON.stringify([ 'v1', 'v3' ]));
						break;
					case 'q4':
						data.type.should.equal('question');
						data.question.should.have.properties(_.omit(questions[3], OMIT_PROPS));
						c.write(JSON.stringify(val + '!!!!'));

						c.once('data', function (data) {
							(function () {
								data = JSON.parse(data.toString());
							}).should.not.throw();
							data.type.should.equal('error');
							data.message.should.match(/failed!!!/);
							data.question.should.have.properties(_.omit(questions[3], OMIT_PROPS));
							c.write(JSON.stringify(val));
						});
						break;
					case 'q5':
						data.type.should.equal('question');
						data.question.should.have.properties(_.omit(questions[4], OMIT_PROPS));
						c.write(JSON.stringify(true));
						break;
				}
			});
		});

		server.listen(9374, function () {
			inquirer.prompt(questions, { socket: true, port: 9374 }, function (err, answers) {
				should.not.exist(err);
				answers.should.be.an.Object;
				answers.q1.should.equal('answer#1');
				answers.q2.should.equal('answer2');
				answers.q3.should.eql([ 'v1', 'v3' ]);
				answers.q4.should.equal(val);
				answers.q5.should.be.true;
				server.close();
				return done();
			});
		});
	});

	it('handles many questions, with validation failures (socket-bundle)', function (done) {
		var val = 'workit';
		var questions = [
			{
				type: 'input',
				name: 'q1'
			},
			{
				type: 'list',
				name: 'q2',
				message: function (answers) {
					return 'q2 for ' + answers.q1;
				},
				default: '3',
				choices: [ '1', '2', '3', '4' ],
				filter: function (answer) {
					return 'answer' + answer;
				}
			},
			{
				type: 'checkbox',
				name: 'q3',
				choices: [
					{ name: 'a1', value: 'v1', checked: true },
					{ name: 'a2', value: 'v2', checked: false },
					{ name: 'a3', value: 'v3', checked: true },
					{ name: 'a4', value: 'v4', checked: false }
				],
				when: function (answers) {
					return !!answers.q2;
				}
			},
			{
				type: 'input',
				name: 'q4',
				validate: function (answer) {
					return answer === val ? true : 'failed!!!';
				}
			},
			{
				type: 'confirm',
				name: 'q5',
				default: true
			}
		];

		var server = net.createServer(function (c) {
			c.on('data', function (data) {
				(function () {
					data = JSON.parse(data.toString());
				}).should.not.throw();
				data.should.be.an.Object;
				if (data.type === 'error') {
					return;
				}

				switch (data.question[0].name) {
					case 'q1':
						data.type.should.equal('question');
						data.question[0].should.have.properties(_.omit(questions[0], OMIT_PROPS));
						c.write(JSON.stringify({ q1: 'answer#1' }));
						break;
					case 'q2':
						data.type.should.equal('question');
						data.question[0].should.have.properties(_.omit(questions[1], OMIT_PROPS));
						c.write(JSON.stringify({ q2: '2' }));
						break;
					case 'q3':
						data.type.should.equal('question');
						data.question[0].should.have.properties(_.omit(questions[2], OMIT_PROPS));
						data.question[1].should.have.properties(_.omit(questions[3], OMIT_PROPS));
						data.question[2].should.have.properties(_.omit(questions[4], OMIT_PROPS));
						c.write(JSON.stringify({
							q3: [ 'v1', 'v3' ],
							q4: val + '!!!!',
							q5: true
						}));

						c.once('data', function (data) {
							(function () {
								data = JSON.parse(data.toString());
							}).should.not.throw();
							data.type.should.equal('error');
							data.message.should.match(/failed!!!/);
							data.question[0].should.have.properties(_.omit(questions[2], OMIT_PROPS));
							data.question[1].should.have.properties(_.omit(questions[3], OMIT_PROPS));
							data.question[2].should.have.properties(_.omit(questions[4], OMIT_PROPS));
							c.write(JSON.stringify({
								q3: [ 'v1', 'v3' ],
								q4: val,
								q5: true
							}));
						});
						break;
					default:
						throw new Error('should not get here');
				}
			});
		});

		server.listen(9374, function () {
			inquirer.prompt(questions, { socket: true, port: 9374, bundle: true }, function (err, answers) {
				should.not.exist(err);
				answers.should.be.an.Object;
				answers.q1.should.equal('answer#1');
				answers.q2.should.equal('answer2');
				answers.q3.should.eql([ 'v1', 'v3' ]);
				answers.q4.should.equal(val);
				answers.q5.should.be.true;
				server.close();
				return done();
			});
		});
	});

});
