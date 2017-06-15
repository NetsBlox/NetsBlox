/*global Client*/
const  _ = require('lodash');
const assert = require('assert');

// load the *exact* XML_Serializer from Snap!... pretty hacky...
const path = require('path');
const fs = require('fs');
const PROJECT_ROOT = path.join(__dirname, '..', '..');

var clientDir = path.join(PROJECT_ROOT, 'src', 'client', 'Snap--Build-Your-Own-Blocks'),
    srcFiles = ['morphic.js', 'xml.js', 'store.js', 'actions.js'],
    src;

src = srcFiles
    .map(file => path.join(clientDir, file))
    .map(file => {
        var code = fs.readFileSync(file, 'utf8');
        if (file.includes('morphic.js')) {
            code = code
                .split('// Morph')[0]
                .split('// Global Functions')[1];
        }
    
        if (file.includes('store.js')) {  // remove the SnapSerializer stuff
            code = code.split('StageMorph.prototype.toXML')[0];
        }
        return code;
    })
    .join('\n');


// expose the XML_Serializer
src = [
    'modules = {};',
    'window = {location:{}};',
    'var SnapActions;',
    src,
    'global.Client = global.Client || {};',
    'global.Client.XML_Serializer = XML_Serializer;',
    'global.Client.SnapActions = SnapActions;'
].join('\n');
eval(src);

// Test loading of xml
const idBlocks = block => {
    block.attributes.collabId = 'testId';
    block.children.forEach(child => idBlocks(child));
    return block;
};

const parser = new Client.XML_Serializer();
const canLoadXml = string => {
    var xml;

    // Add a collabId and reserialize
    var res = Client.SnapActions.uniqueIdForImport(string);
    xml = res.toString();
    assert(parser.parse(xml));
};

module.exports = {
    verifyRPCInterfaces: function(rpc, interfaces) {
        describe(`${rpc.getPath()} interfaces`, function() {
            interfaces.forEach(interface => {
                var name = interface[0],
                    expected = interface[1] || [];

                it(`${name} args should be ${expected.join(', ')}`, function() {
                    var args = rpc.getArgumentsFor(name);
                    assert(_.isEqual(args, expected));
                });
            });
        });
    },
    XML_Serializer: Client.XML_Serializer,
    canLoadXml: canLoadXml
};
