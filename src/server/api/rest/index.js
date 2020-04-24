const fs = require('fs');
const {promisify} = require('util');
const readdir = promisify(fs.readdir);

module.exports = async function(app) {
    const routeFiles = (await readdir(__dirname))
        .filter(filename => filename.endsWith('.js') && filename !== 'utils.js')
        .map(filename => filename.replace(/\.js$/, ''));

    routeFiles.forEach(file => {
        console.log('>>> adding route:', `/api/v2/${file}`);
        app.use(`/api/v2/${file}`, require(`./${file}`));
    });
};
