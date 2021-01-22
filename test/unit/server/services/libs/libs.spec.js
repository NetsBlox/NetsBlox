const utils = require('../../../../assets/utils');

describe(utils.suiteName(__filename), function() {
    var fs = require('fs'),
        path = require('path'),
        PROJECT_ROOT = path.join(__dirname, '..', '..', '..', '..', '..'),
        libPath = path.join(PROJECT_ROOT, 'src', 'server', 'services', 'libs');

    // Read in the xml files and test each of them
    fs.readdirSync(libPath)
        .filter(file => path.extname(file) === '.xml')
        .map(file => [file, fs.readFileSync(path.join(libPath, file), 'utf8')])
        .forEach(pair => it(`should parse ${pair[0]}`, utils.canLoadXml.bind(null, pair[1])));
});
