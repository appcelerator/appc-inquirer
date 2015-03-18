module.exports = function(grunt) {

	var tests = ['test/**/*_test.js'];

	// Project configuration.
	grunt.initConfig({
		mochaTest: {
			options: {
				timeout: 3000,
				reporter: 'spec',
				ignoreLeaks: false
			},
			src: tests
		},
		appcJs: {
			options: {
				force: true
			},
			src: ['interrogate.js', 'test/**/*.js']
		},
		kahvesi: { src: tests },
		appcCoverage: {
			default_options: {
				src: 'coverage/lcov.info',
				force: true
			}
		}
	});

	// Load grunt plugins for modules
	grunt.loadNpmTasks('grunt-mocha-test');
	grunt.loadNpmTasks('grunt-appc-js');
	grunt.loadNpmTasks('grunt-kahvesi');
	grunt.loadNpmTasks('grunt-appc-coverage');

	// register tasks
	grunt.registerTask('cover', ['kahvesi', 'appcCoverage']);
	grunt.registerTask('default', ['appcJs', 'mochaTest']);

};
