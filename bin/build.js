/* eslint-disable no-console */
'use strict';

const isDevEnv = process.env.ENV !== 'production';
const fsp = require('fs').promises;
const path = require('path');
const srcPath = path.join(__dirname, '..', 'src', 'browser');
const util = require('util');
const execFile = util.promisify(require('child_process').execFile);
const nop = () => {};

process.chdir(srcPath);
build().catch(err => console.error(err));

async function build() {
    // Get the given js files
    var devHtml = await fsp.readFile('index.dev.html', 'utf8'),
        re = /text\/javascript" src="(.*)">/,
        match = devHtml.match(re),
        srcFiles = [];

    while (match) {
        srcFiles.push(match[1]);
        devHtml = devHtml.substring(match.index + match[0].length);
        match = devHtml.match(re);
    }

    // don't duplicate the main.js file
    const RESERVED_FILE = 'main.js';
    srcFiles = srcFiles.filter(f => !f.endsWith(RESERVED_FILE));

    if (isDevEnv) {  // don't minify in dev
        console.log('Dev environment detected - skipping build optimizations. If you ' +
            'change to a production env, be sure to rebuild with:');
        console.log('');
        console.log('    npm run postinstall');
        console.log('');
    } else {
        const srcPath = path.join('dist', 'app.js');
        const minPath = srcPath.replace(/\.js$/, '.min.js');
        await fsp.mkdir(path.dirname(srcPath)).catch(nop);
        await srcFiles.reduce(async (prevTask, file) => {
            await prevTask;
            await fsp.appendFile(srcPath, await fsp.readFile(file));
        }, unlinkFile(srcPath));
        try {
            await execFile(
                'closure-compiler',
                ['--js', srcPath, '--js_output_file', minPath]
            );
        } catch (err) {
            throw new Error('Unable to compile JS. Is the closure-compiler installed?');
        }

        const srcLength = (await fsp.readFile(srcPath, 'utf8')).length;
        const minLength = (await fsp.readFile(minPath, 'utf8')).length;
        console.log('output length:', srcLength);
        console.log('compression ratio:', 1-(minLength/srcLength));
    }
}

async function unlinkFile(path) {
    try {
        await fsp.unlink(path).catch(nop);
    } catch (err) {
        if (err.code !== 'ENOENT') {
            throw err;
        }
    }
}
/* eslint-enable no-console */
