/* eslint-disable no-console */
'use strict';

const isDevEnv = process.env.ENV !== 'production';
const fsp = require('fs').promises;
const fse = require('fs-extra');
const path = require('path');
const srcPath = path.join(__dirname, '..', 'src', 'browser');
const util = require('util');
const execFile = util.promisify(require('child_process').execFile);
const nop = () => {};
const {exec} = require('child_process');
const ServicesAPI = require('./../src/server/services/api');
const storage = require('./../src/server/storage/storage');

process.chdir(srcPath);
build().catch(err => console.error(err));

async function build() {
    // needed for docs and maybe other things in the future
    await storage.connect();
    await ServicesAPI.initialize();

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

    try {
        await compileDocs();
    } catch (e) {
        console.error(e);
        process.exit(0xd0c5);
    }

    process.exit(0);
}

async function hasDirectory(dir, subdir) {
    return (await fsp.readdir(dir)).includes(subdir) && (await fsp.lstat(path.join(dir, subdir))).isDirectory();
}

function isObject(type) {
    return type && type.name && type.name.toLowerCase() === 'object';
}
function getTypeString(type) {
    if (type.name === undefined || type.params === undefined) return type.toString();
    if (isObject(type)) return 'Object';
    return type.params.length ? `${type.name}<${type.params.map(getTypeString).join(', ')}>` : type.name;
}
function getParamString(param) {
    const str = param.type ? `${param.name}: ${getTypeString(param.type)}` : param.name;
    return param.optional ? `${str}?` : str;
}

const DESC_REGEX = />>>DESC<<</g;
const RPCS_REGEX = />>>RPCS<<</g;
const CATS_REGEX = />>>CATS<<</g;
const SERVICES_REGEX = />>>SERVICES<<</g;
async function compileDocs() {
    const docsPath = path.join(__dirname, '..', 'src', 'server', 'docs');
    const generatedPath = path.join(docsPath, '_generated');

    const docsFiles = new Set(await fsp.readdir(docsPath));
    if (docsFiles.has('_generated')) {
        await fsp.rmdir(generatedPath, { recursive: true });
        docsFiles.delete('_generated');
    }
    await fsp.mkdir(generatedPath);
    
    await Promise.all(Array.from(docsFiles).map(file => {
        return fse.copy(path.join(docsPath, file), path.join(generatedPath, file));
    }));

    let serviceString = '.. toctree::\n    :maxdepth: 2\n    :caption: Services:\n\n';
    for (const serviceName in ServicesAPI.services.metadata) {
        const service = ServicesAPI.services.metadata[serviceName];
        serviceString += `    ${serviceName}/index.rst\n`;

        const serviceDocs = path.join(generatedPath, serviceName);
        const index = path.join(serviceDocs, 'index.rst');

        if (!await hasDirectory(generatedPath, serviceName)) {
            await fsp.mkdir(serviceDocs);
            await fsp.writeFile(index, `${serviceName}\n${'='.repeat(serviceName.length)}\n\n>>>DESC<<<\n\n.. toctree::\n    :maxdepth: 2\n    :caption: Categories:\n\n    >>>CATS<<<\n\n>>>RPCS<<<\n`);
        }
        
        const categories = {};
        for (const rpcName in service.rpcs) {
            const rpc = service.rpcs[rpcName];
            if (rpc.deprecated) continue;

            const cats = rpc.categories !== undefined && rpc.categories.length ? rpc.categories : ['index'];
            for (const category of cats) {
                if (categories[category] === undefined) {
                    categories[category] = {};
                }
                categories[category][rpcName] = rpc;
            }
        }

        const categoryStrings = {};
        for (const category in categories) {
            const rpcs = categories[category];
            const rpcNamesSorted = Object.keys(rpcs).sort();

            let str = '';
            for (const rpcName of rpcNamesSorted) {
                const rpc = rpcs[rpcName];
                const args = rpc.args ? rpc.args : [];
                const paramStrings = args.map(getParamString);

                str += `.. function:: ${serviceName}.${rpcName}(${paramStrings.join(', ')})\n\n`;
                if (rpc.rawDescription) {
                    for (const line of rpc.rawDescription.split('\n')) {
                        const trim = line.trim();
                        if (trim === '') str += '\n\n';
                        else str += `    ${trim}\n`;
                    }
                    str += '\n';
                }
                if (args.length) {
                    str += '    **Arguments:**\n\n';
                    for (let i = 0; i < args.length; ++i) {
                        const desc = args[i].rawDescription ? ` - ${args[i].rawDescription}` : '';
                        str += `    - \`\`${paramStrings[i]}\`\`${desc}\n`;

                        if (isObject(args[i].type) && args[i].type.params.length) {
                            str += '\n';
                            const fields = args[i].type.params;
                            for (const field of fields) {
                                const desc = field.rawDescription ? ` - ${field.rawDescription}` : '';
                                const paramString = getParamString(field);
                                str += `        - \`\`${paramString}\`\`${desc}\n`;
                            }
                            str += '\n';
                        }
                    }
                    str += '\n';
                }
                if (rpc.returns) {
                    const ret = rpc.returns;
                    const type = getTypeString(ret.type);
                    const desc = ret.rawDescription ? ` - ${ret.rawDescription}` : '';
                    str += `    **Returns:** \`\`${type}\`\`${desc}\n`;
                }
                str += '\n\n';
            }
            categoryStrings[category] = str;
        }

        const files = new Set(await fsp.readdir(serviceDocs));
        for (const category in categoryStrings) {
            const rstPath = path.join(serviceDocs, `${category}.rst`);
            if (!files.has(`${category}.rst`)) {
                await fsp.writeFile(rstPath, `${category}\n${'='.repeat(category.length)}\n\n>>>RPCS<<<\n`);
            }

            let content = await fsp.readFile(rstPath, { encoding: 'utf8' });
            content = content.replace(RPCS_REGEX, categoryStrings[category]);
            await fsp.writeFile(rstPath, content);
        }

        const catsSorted = Object.keys(categoryStrings).filter(s => s !== 'index').sort();
        const catsString = catsSorted.join('\n    ');

        let indexContent = await fsp.readFile(index, { encoding: 'utf8' });
        indexContent = indexContent.replace(DESC_REGEX, service.rawDescription);
        indexContent = indexContent.replace(CATS_REGEX, catsString);
        await fsp.writeFile(index, indexContent);
    }

    const index = path.join(generatedPath, 'index.rst');
    let indexContent = await fsp.readFile(index, { encoding: 'utf8' });
    indexContent = indexContent.replace(SERVICES_REGEX, serviceString);
    await fsp.writeFile(index, indexContent);

    await new Promise((resolve, reject) => {
        exec('make clean && make html', { cwd: generatedPath }, async (error, stdout, stderr) => {
            if (error || stderr.length !== 0) {
                reject(Error(`failed to compile docs: error: ${error ? error : ''}, stderr: ${stderr}, stdout: ${stdout}`));
            }
            else if (!await hasDirectory(generatedPath, '_build')) {
                reject(Error(`failed to find docs build directory`));
            }
            else if (!await hasDirectory(path.join(generatedPath, '_build'), 'html')) {
                reject(Error(`failed to find html in docs build directory`));
            }
            else {
                console.log(`compiled docs:`, stdout);
                resolve();
            }
        });
    });
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
