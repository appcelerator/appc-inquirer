module.exports = function(grunt) {

	// Project configuration.
	grunt.initConfig({
		mocha_istanbul: {
			coverage: {
				src: 'test',
				options: {
					ignoreLeaks: false,
					check: {
						statements: 80,
						branches: 80,
						functions: 80,
						lines: 80
					},
					reporter: 'mocha-jenkins-reporter',
					reportFormats: ['lcov', 'cobertura']
				}
			}
		},
		appcJs: {
			options: {
				force: false
			},
			src: ['appc-inquirer.js', 'test/**/*.js']
		}
	});

	// Load grunt plugins for modules
	grunt.loadNpmTasks('grunt-appc-js');
	grunt.loadNpmTasks('grunt-mocha-istanbul');

	// register tasks
	grunt.registerTask('default', ['appcJs', 'mocha_istanbul:coverage']);

};
