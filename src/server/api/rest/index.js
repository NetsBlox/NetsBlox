const fs = require('fs');
const {promisify} = require('util');
const readdir = promisify(fs.readdir);
const SKIP_FILES = ['utils.js', 'index.js'];

module.exports = async function(app) {
    const routeFiles = (await readdir(__dirname))
        .filter(filename => filename.endsWith('.js') && !SKIP_FILES.includes(filename))
        .map(filename => filename.replace(/\.js$/, ''));

    routeFiles.forEach(file => {
        console.log('>>> adding route:', `/api/v2/${file}`);
        app.use(`/api/v2/${file}`, require(`./${file}`));
    });
};
