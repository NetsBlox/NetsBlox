const utils = require('../../../../../assets/utils');

describe(utils.suiteName(__filename), function() {
    const metadata = utils.reqSrc('services/procedures/project-gutenberg/metadata');
    const h = utils.reqSrc('services/procedures/project-gutenberg/helpers');
    const path = require('path');
    const assert = require('assert');
    const filename = path.join(__dirname, 'test-catalog.rdf');
    let docs;

    describe('getDocsFromRDF', function() {
        before(async () => docs = await h.collect(metadata.getDocsFromRDF(filename)));

        it('should discover documents', function() {
            assert.equal(docs.length, 3);
        });

        it('should detect title field', function() {
            const prefixes = [
                'Theory of Silk Weaving',
                'The Methods of Glass Blowing',
                'The Scholfield Wool-Carding Machines',
            ];
            docs.forEach(
                (doc, i) => assert(doc.title.startsWith(prefixes[i]), `Expected title "${prefixes[i]}". Found ${doc.title}`)
            );
        });

        it('should resolve value nodes', function() {
            assert.equal(docs[0].language, 'en');
        });

        it('should include ID', function() {
            assert(docs[0].id);
        });
    });

    describe('getMetadataDocs', function() {
        before(async () => docs = await metadata.getMetadataDocs());

        it('should parse titles for all docs', function() {
            docs.forEach(doc => {
                assert(doc.title, `Found doc w/o title: ${JSON.stringify(doc)}`);
            });
        });
    });
});
