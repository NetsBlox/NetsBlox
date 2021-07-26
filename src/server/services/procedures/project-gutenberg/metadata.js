const {RdfXmlParser} = require('rdfxml-streaming-parser');
const fs = require('fs');
const assert = require('assert');
const h = require('./helpers');
const _ = require('lodash');
const path = require('path');
const readline = require('readline');
const DEFAULT_CATALOG = path.join(__dirname, 'catalog.rdf');

function getDocID(rdfObj) {
    if (rdfObj.subject.termType === 'NamedNode') {
        const subject = rdfObj.subject.value;
        const subjectID = subject.split('#etext')[1];
        return subjectID;
    }
}

function getPredicateField(rdfObj) {
    const predicateToField = {
        title: 'title',
        friendlytitle: 'short title',
        creator: 'author',
        contributor: 'contributor',
        description: null,
        language: 'language',

        // The following fields will be ignored
        subject: null,
        publisher: null,
        created: null,
        downloads: null,
        tableOfContents: null,
        extent: null,
        modified: null,
        format: null,
        isFormatOf: null,
        rights: null,
        type: null,
        alternative: null,
        _1: null,
        _2: null,
    };
    const predicate = getPredicateType(rdfObj);
    const field = predicateToField[predicate];

    if (predicateToField[predicate] === undefined) {
        throw new Error(`Unrecognized predicate: ${predicate}`);
    }
    return field;
}

function getDocEntry(rdfObj) {
    const field = getPredicateField(rdfObj);
    const expectedObjectTypes = ['NamedNode', 'Literal', 'BlankNode'];
    assert(
        expectedObjectTypes.includes(rdfObj.object.termType),
        `Expected one of ${expectedObjectTypes.join(', ')}. Found ${rdfObj.object.termType}. ${JSON.stringify(rdfObj, null, 2)}`
    );
    const value = getObjectValue(rdfObj);
    return [field, value];
}

function getReferenceEntry(rdfObj) {
    assert.equal(rdfObj.subject.termType, 'BlankNode', JSON.stringify(rdfObj, null, 2));
    const field = rdfObj.subject.value;
    const value = rdfObj.object.value;
    return [field, value];
}

function getObjectValue(rdfObj) {
    return rdfObj.object.value;
}

function getPredicateType(rdfObj) {
    const type = rdfObj.predicate.value.split('22-rdf-syntax-ns#')[1] ||
        rdfObj.predicate.value.split('dc/elements/1.1/')[1] ||
        rdfObj.predicate.value.split('dc/terms/')[1] ||
        rdfObj.predicate.value.split('rdfterms/')[1];
    assert(type, `Failed to parse type from ${rdfObj.predicate.value}`);
    return type;
}

function isDocQuad(rdfObj) {
    //return /#etext[0-9]+$/.test(rdfObj.subject.value);
    if (rdfObj.subject.value.endsWith('catalog.rdf')) {
        return false;
    }

    if (rdfObj.subject.value.endsWith('GPL/2.0/')) {
        return false;
    }

    return !!getDocID(rdfObj);
}

function isReferenceQuad(rdfObj) {
    return rdfObj.subject.termType === 'BlankNode';
}

async function* getDocsFromRDF(file=DEFAULT_CATALOG) {
    const rdfs = h.dropUntil(
        getRDFStream(file),
        rdf => isDocQuad(rdf)
    );

    let lastID;
    const groupedDocParts = h.chunkWith(rdfs, rdf => lastID = getDocID(rdf) || lastID);

    for await (const docParts of groupedDocParts) {
        const [refRDFs, fieldRDFs] = _.partition(
            docParts,
            isReferenceQuad
        );

        const refDict = Object.fromEntries(refRDFs.map(getReferenceEntry));
        const fieldDict = Object.fromEntries(
            fieldRDFs.map(getDocEntry).filter(entry => entry[0])
        );
        const fields = Object.keys(fieldDict);
        const doc = Object.fromEntries(
            fields.map(field => {
                const valueOrRef = fieldDict[field];
                const value = refDict[valueOrRef] || valueOrRef;
                return [field, value];
            })
        );
        doc.id = getDocID(fieldRDFs[0]);
        yield doc;
    }
}

async function* getRDFStream(file) {
    const rdfParser = new RdfXmlParser();
    const stream = fs.createReadStream(file).pipe(rdfParser);
    for await (const rdfObj of stream) {
        yield rdfObj;
    }
}

async function getMetadataDocs() {
    const catalogFile = path.join(__dirname, 'catalog.jsonl');
    if (!fs.existsSync(catalogFile)) {
        throw new Error(`Missing catalog. Expected to find catalog at ${catalogFile}`);
    }

    return (await fs.promises.readFile(catalogFile, 'utf8')).split('\n')
        .filter(line => line)
        .map(line => JSON.parse(line));
}

const schema = {
    publisher: String,
    title: String,
    author: String,
    'short title': String,
    language: String,
    subject: String,
    id: String,
    url: String,
};

async function* getDocURLsFromRDF(file) {
    let rdfs = h.filter(
        getRDFStream(file),
        rdf => rdf.predicate.value.endsWith('isFormatOf')
    );
    rdfs = h.filter(
        rdfs,
        rdf => rdf.subject.value.endsWith('.txt')
    );
    for await (const doc of rdfs) {
        const docID = doc.object.value.split('etext')[1];
        const url = doc.subject.value;
        yield [docID, url];
    }
}

function encodeURLSpaces(url) {
    return url.split(' ').join('%20');
}

async function prepareRDF(filename) {
    const outputFilename = `clean-${filename}`;
    const lines = readline.createInterface({
        input: fs.createReadStream(filename),
    });
    const outputFile = fs.createWriteStream(outputFilename);

    const prefix = '<pgterms:file rdf:about=';
    for await (const line of lines) {
        const cleanLine = line.startsWith(prefix) ?
            line.split('"').map((text, i) => i === 1 ? encodeURLSpaces(text) : text).join('"') :
            line;
        outputFile.write(cleanLine);
    }
    return outputFilename;
}

function hasRequiredFields(doc) {
    const requiredKeys = ['id', 'title', 'url'];
    return requiredKeys.reduce(
        (passing, key) => passing && doc.hasOwnProperty(key),
        true
    );
}

module.exports = {getDocsFromRDF, schema, getMetadataDocs};

if (require.main === module) {
    /* eslint-disable no-console*/
    if (!global.gc) {
        console.error('Running with default GC behavior. If you run out of memory run again with the --expose-gc flag.');
        console.error('You also may want to consider using --max-old-space-size=4096');
    }
    process.argv.slice(2).forEach(async filename => {
        filename = await prepareRDF(filename);
        const docURLs = {};
        for await (const [docID, url] of getDocURLsFromRDF(filename)) {
            docURLs[docID] = url;
        }

        let count = 0;
        const total = Object.keys(docURLs).length;
        for await (const doc of getDocsFromRDF(filename)) {
            doc.url = docURLs[doc.id];
            delete docURLs[doc.id];

            if (hasRequiredFields(doc)) {
                console.log(JSON.stringify(doc));
            } else {
                console.error(`Skipping incomplete doc: ${JSON.stringify(doc)}`);
            }
            if (global.gc) global.gc();
            console.error(`${++count}/~${total}`);
        }
    });
    /* eslint-enable no-console*/
}
