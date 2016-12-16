/*globals Client*/
describe('rpc libs', function() {
    var fs = require('fs'),
        path = require('path'),
        assert = require('assert'),
        PROJECT_ROOT = path.join(__dirname, '..', '..', '..', '..'),
        libPath = path.join(PROJECT_ROOT, 'src', 'server', 'rpc', 'libs'),
        parser,
        idBlocks = block => {
            block.attributes.collabId = 'testId';
            block.children.forEach(child => idBlocks(child));
            return block;
        },
        isValidXml = string => {
            // Stupid thing is failing in the browser but passing here...
            var res = parser.parse(string),
                xml;

            // Add a collabId and reserialize
            assert(res);
            idBlocks(res);
            xml = res.toString();
            assert(parser.parse(xml));
        };

    before(function() {
        // load the XML_Serializer from Snap!... a little hacky...
        var clientDir = path.join(PROJECT_ROOT, 'src', 'client', 'Snap--Build-Your-Own-Blocks'),
            srcFiles = ['morphic.js', 'xml.js', 'store.js'],
            src;

        src = srcFiles
            .map(file => path.join(clientDir, file))
            .map(file => {
                var code = fs.readFileSync(file, 'utf8');
                if (file.includes('morphic.js')) {
                    code = code
                        .split('// Morph')[0]
                        .split('// Nodes')[1];
                }
                return code;
            })
            .join('\n');

        // remove the SnapSerializer stuff
        src = src.split('var SnapSerializer')[0];

        // expose the XML_Serializer
        src = [
            'modules = {};',
            src,
            'global.Client = global.Client || {};',
            'global.Client.XML_Serializer = XML_Serializer;'
        ].join('\n');
        eval(src);
        parser = new Client.XML_Serializer();
    });

    // Read in the xml files and test each of them
    fs.readdirSync(libPath)
       .filter(file => path.extname(file) === '.xml')
       .map(file => [file, fs.readFileSync(path.join(libPath, file), 'utf8')])
       .forEach(pair => it(`should parse ${pair[0]}`, isValidXml.bind(null, pair[1])));
});
