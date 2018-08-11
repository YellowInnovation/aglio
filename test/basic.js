/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
const aglio = require('../src/main');
const assert = require('assert');
const bin = require('../src/bin');
const fs = require('fs');
const http = require('http');
const path = require('path');
const drafter = require('drafter.js');
const sinon = require('sinon');

const root = path.dirname(__dirname);

const blueprint = fs.readFileSync(path.join(root, 'example.apib'), 'utf-8');

describe('API Blueprint Renderer', function () {
    it('Should load the default theme', function () {
        const theme = aglio.getTheme('default');

        return assert.ok(theme);
    });

    it('Should get a list of included files', function () {
        sinon.stub(fs, 'readFileSync', () => 'I am a test file');

        const input = `\
# Title
<!-- include(test1.apib) -->
Some content...
<!-- include(test2.apib) -->
More content...\
`;

        const paths = aglio.collectPathsSync(input, '.');

        fs.readFileSync.restore();

        assert.equal(paths.length, 2);
        assert(Array.from(paths).includes('test1.apib'));
        return assert(Array.from(paths).includes('test2.apib'));
    });

    it('Should render blank string', done =>
        aglio.render('', { template: 'default', locals: { foo: 1 } }, function (err, html) {
            if (err) { return done(err); }

            assert(html);

            return done();
        })
    );

    it('Should render a complex document', done =>
        aglio.render(blueprint, 'default', function (err, html) {
            if (err) { return done(err); }

            assert(html);

            // Ensure include works
            assert(html.indexOf('This is content that was included'));

            return done();
        })
    );

    it('Should render mixed line endings and tabs properly', function (done) {
        const temp = '# GET /message\r\n+ Response 200 (text/plain)\r\r\t\tHello!\n';
        return aglio.render(temp, 'default', done);
    });

    it('Should render a custom template by filename', function (done) {
        const template = path.join(root, 'test', 'test.jade');
        return aglio.render('# Blueprint', template, function (err, html) {
            if (err) { return done(err); }

            assert(html);

            return done();
        });
    });

    it('Should return warnings with filtered input', function (done) {
        const temp = '# GET /message\r\n+ Response 200 (text/plain)\r\r\t\tHello!\n';
        const filteredTemp = temp.replace(/\r\n?/g, '\n').replace(/\t/g, '    ');

        return aglio.render(temp, 'default', function (err, html, warnings) {
            if (err) { return done(err); }

            assert.equal(filteredTemp, warnings.input);

            return done();
        });
    });

    it('Should render from/to files', function (done) {
        const src = path.join(root, 'example.apib');
        const dest = path.join(root, 'example.html');
        return aglio.renderFile(src, dest, {}, done);
    });

    it('Should render from stdin', function (done) {
        sinon.stub(process.stdin, 'read', () => '# Hello\n');

        setTimeout(() => process.stdin.emit('readable', 1));

        return aglio.renderFile('-', 'example.html', 'default', function (err) {
            if (err) { return done(err); }

            assert(process.stdin.read.called);
            process.stdin.read.restore();
            process.stdin.removeAllListeners();

            return done();
        });
    });

    it('Should render to stdout', function (done) {
        sinon.stub(console, 'log');

        return aglio.renderFile(path.join(root, 'example.apib'), '-', 'default', function (err) {
            if (err) {
                console.log.restore();
                return done(err);
            }

            assert(console.log.called);
            console.log.restore();

            return done();
        });
    });

    it('Should compile from/to files', function (done) {
        const src = path.join(root, 'example.apib');
        const dest = path.join(root, 'example-compiled.apib');
        return aglio.compileFile(src, dest, done);
    });

    it('Should compile from stdin', function (done) {
        sinon.stub(process.stdin, 'read', () => '# Hello\n');

        setTimeout(() => process.stdin.emit('readable', 1));

        return aglio.compileFile('-', 'example-compiled.apib', function (err) {
            if (err) { return done(err); }

            assert(process.stdin.read.called);
            process.stdin.read.restore();
            process.stdin.removeAllListeners();

            return done();
        });
    });

    it('Should compile to stdout', function (done) {
        sinon.stub(console, 'log');

        return aglio.compileFile(path.join(root, 'example.apib'), '-', function (err) {
            if (err) { return done(err); }

            assert(console.log.called);
            console.log.restore();

            return done();
        });
    });

    it('Should support legacy theme names', done =>
        aglio.render('', { template: 'flatly' }, function (err, html) {
            if (err) { return done(err); }

            assert(html);

            return done();
        })
    );

    it('Should error on missing input file', done =>
        aglio.renderFile('missing', 'output.html', 'default', function (err, html) {
            assert(err);

            return aglio.compileFile('missing', 'output.apib', function (err) {
                assert(err);
                return done();
            });
        })
    );

    it('Should error on bad template', done =>
        aglio.render(blueprint, 'bad', function (err, html) {
            assert(err);

            return done();
        })
    );

    it('Should error on drafter failure', function (done) {
        sinon.stub(drafter, 'parse', (content, options, callback) => callback('error'));

        return aglio.render(blueprint, 'default', function (err, html) {
            assert(err);

            drafter.parse.restore();

            return done();
        });
    });

    it('Should error on file read failure', function (done) {
        sinon.stub(fs, 'readFile', (filename, options, callback) => callback('error'));

        return aglio.renderFile('foo', 'bar', 'default', function (err, html) {
            assert(err);

            fs.readFile.restore();

            return done();
        });
    });

    it('Should error on file write failure', function (done) {
        sinon.stub(fs, 'writeFile', (filename, data, callback) => callback('error'));

        return aglio.renderFile('foo', 'bar', 'default', function (err, html) {
            assert(err);

            fs.writeFile.restore();

            return done();
        });
    });

    return it('Should error on non-file failure', function (done) {
        sinon.stub(aglio, 'render', (content, template, callback) => callback('error'));

        return aglio.renderFile(path.join(root, 'example.apib'), 'bar', 'default', function (err, html) {
            assert(err);

            aglio.render.restore();

            return done();
        });
    });
});

describe('Executable', function () {
    it('Should print a version', function (done) {
        sinon.stub(console, 'log');

        return bin.run({ version: true }, function (err) {
            assert(console.log.args[0][0].match(/aglio \d+/));
            assert(console.log.args[1][0].match(/olio \d+/));
            console.log.restore();
            return done(err);
        });
    });

    it('Should render a file', function (done) {
        sinon.stub(console, 'error');

        sinon.stub(aglio, 'renderFile', function (i, o, t, callback) {
            const warnings = [
                {
                    code: 1,
                    message: 'Test message',
                    location: [
                        {
                            index: 0,
                            length: 1
                        }
                    ]
                }
            ];
            warnings.input = 'test';
            return callback(null, warnings);
        });

        bin.run({}, err => assert(err));

        return bin.run({ i: path.join(root, 'example.apib'), o: '-' }, function () {
            console.error.restore();
            aglio.renderFile.restore();
            return done();
        });
    });

    it('Should compile a file', function (done) {
        sinon.stub(aglio, 'compileFile', (i, o, callback) => callback(null));

        return bin.run({ c: 1, i: path.join(root, 'example.apib'), o: '-' }, function () {
            aglio.compileFile.restore();
            return done();
        });
    });

    it('Should start a live preview server', function (done) {
        this.timeout(5000);

        sinon.stub(aglio, 'render', (i, t, callback) => callback(null, 'foo'));

        sinon.stub(http, 'createServer', handler =>
            ({
                listen(port, host, cb) {
                    console.log('calling listen');
                    // Simulate requests
                    let req =
                        { url: '/favicon.ico' };
                    let res = {
                        end(data) {
                            return assert(!data);
                        }
                    };
                    handler(req, res);

                    req =
                        { url: '/' };
                    res = {
                        writeHead(status, headers) { return false; },
                        end(data) {
                            aglio.render.restore();
                            cb();
                            const file = fs.readFileSync('example.apib', 'utf8');
                            return setTimeout(function () {
                                fs.writeFileSync('example.apib', file, 'utf8');
                                return setTimeout(function () {
                                    console.log.restore();
                                    return done();
                                }
                                    , 500);
                            }
                                , 500);
                        }
                    };
                    return handler(req, res);
                }
            })
        );

        sinon.stub(console, 'log');
        sinon.stub(console, 'error');

        return bin.run({ s: true }, function (err) {
            console.error.restore();
            assert(err);

            return bin.run({ i: path.join(root, 'example.apib'), s: true, p: 3000, h: 'localhost' }, function (err) {
                assert.equal(err, null);
                return http.createServer.restore();
            });
        });
    });

    it('Should support custom Jade template shortcut', function (done) {
        sinon.stub(console, 'log');

        return bin.run({ i: path.join(root, 'example.apib'), t: 'test.jade', o: '-' }, function (err) {
            console.log.restore();
            return done(err);
        });
    });

    it('Should handle theme load errors', function (done) {
        sinon.stub(console, 'error');
        sinon.stub(aglio, 'getTheme', function () {
            throw new Error('Could not load theme');
        });

        return bin.run({ template: 'invalid' }, function (err) {
            console.error.restore();
            aglio.getTheme.restore();
            assert(err);
            return done();
        });
    });

    return it('Should handle rendering errors', function (done) {
        sinon.stub(aglio, 'renderFile', (i, o, t, callback) =>
            callback({
                code: 1,
                message: 'foo',
                input: 'foo bar baz',
                location: [
                    { index: 1, length: 1 }
                ]
            })
        );

        sinon.stub(console, 'error');

        return bin.run({ i: path.join(root, 'example.apib'), o: '-' }, function () {
            assert(console.error.called);

            console.error.restore();
            aglio.renderFile.restore();

            return done();
        });
    });
});
