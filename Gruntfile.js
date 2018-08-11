/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
const async = require('async');

module.exports = function (grunt) {
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        cov: {
            html: {
                options: {
                    reporter: 'html-cov',
                    output: 'coverage.html'
                },
                src: 'test-js/**/*.js'
            },
            reportcoverage: {
                options: {
                    coveralls: {
                        serviceName: 'travis-ci'
                    }
                },
                src: 'test-js/**/*.js'
            }
        }
    });

    grunt.loadNpmTasks('grunt-mocha-cov');

    grunt.registerTask('gen-examples', 'Generate an example for each theme', function () {
        const done = this.async();

        const aglio = require('./src/main');

        const render = function (name, done) {
            console.log(`Generating examples/${name}.html`);
            return aglio.renderFile('example.apib', `examples/${name}.html`, { themeVariables: name }, function (err) {
                if (err) { return done(err); }
                console.log(`Generating examples/${name}-triple.html`);
                return aglio.renderFile('example.apib', `examples/${name}-triple.html`, { themeVariables: name, themeTemplate: 'triple' }, err => done(err));
            });
        };

        return async.each(['default', 'flatly', 'slate', 'cyborg', 'streak'], render, done);
    });

    grunt.registerTask('coverage', ['cov:html']);
    grunt.registerTask('coveralls', ['cov:reportcoverage']);
    grunt.registerTask('examples', ['gen-examples']);
};
