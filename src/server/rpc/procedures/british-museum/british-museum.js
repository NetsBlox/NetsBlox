/**
 * The BritishMuseum Service provides access to data from the British Museum collection.
 * For more information, check out https://britishmuseum.org/
 *
 * Terms of use: https://collection.britishmuseum.org/resource/Termsofuse
 * @service
 */

const ApiConsumer = require('../utils/api-consumer');
let britishmuseum = new ApiConsumer('britishmuseum','https://collection.britishmuseum.org/',{cache: {ttl: 3600*24*30*6}});


const prefix = `PREFIX skos: <http://www.w3.org/2004/02/skos/core#>
PREFIX crm: <http://www.cidoc-crm.org/cidoc-crm/>
PREFIX fts: <http://www.ontotext.com/owlim/fts#>
PREFIX btm: <http://www.researchspace.org/ontology/>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>`;

const DEFAULT_LIMIT = 5;

// parser used for when calling the json endPoint
let searchParser = resp => {
    resp = JSON.parse(resp);
    let results = [];
    resp.results.bindings.forEach(res => {
        try {
            let searchResult = {
                image: res.img.value.match(/AN(\d{6,10})/)[1],
                id: res.object.value.substr(res.object.value.lastIndexOf('/') + 1)
            };
            results.push(searchResult);
        } catch (e) {
            this._logger.error(e);
        }
    });
    return results;
};


// injects / adds query into a base query
let queryInjector = (baseQ, statements) => {

    // add the statement in the middle of baseQ
    baseQ.splice.apply(baseQ, [1, 0].concat(statements));
    return baseQ.join('\n');
};


const queryOptions = {
    // queryString: 'sparql?query=' + urlencode( prefix + combinedQuery, 'utf-8'),
    headers: {
        'content-type': 'application/sparql-query; charset=UTF-8',
        accept: 'application/sparql-results+json',
        'accept-encoding': 'deflate, br',
        'accept-language': 'en,fa;q=0.8'
    },
    method: 'POST',
    queryString: 'sparql?',
    body: undefined,
    json: false
};

britishmuseum._search = function(label, type, material, limit) {
    if (!(label || type || material)) return 'Please pass in a query';
    limit = limit || DEFAULT_LIMIT;
    let baseQ = [
        `SELECT DISTINCT (SAMPLE(?object) AS ?object) ?img
        {
        ?object btm:PX_has_main_representation ?img.`,

        `}
        GROUP BY ?img
        LIMIT ${limit}`
    ];

    let labelQ = `?object rdfs:label ?label .
    FILTER(REGEX(?label, "${label}", "i")).`;

    let typeQ = `?object btm:PX_object_type ?typeThesauri.
          ?typeThesauri skos:prefLabel ?type.
          FILTER(REGEX(?type, "${type}", "i")).`;

    let materialQ = `?object crm:P45_consists_of ?materialThesauri.
          ?materialThesauri skos:prefLabel ?material.
          FILTER(REGEX(?material, "${material}", "i")).`;

    let queries = [];
    if (label) queries.push(labelQ);
    if (type) queries.push(typeQ);
    if (material) queries.push(materialQ);

    let combinedQuery =  queryInjector(baseQ, queries);

    queryOptions.body = prefix + combinedQuery;
    return this._sendStruct(queryOptions, searchParser);
};

/**
 * Search for artifacts using a label
 * @param {String} label Label to search for
 * @param {Number=} limit Maximum number of artifacts to return
 * @returns {Object} Table of artifacts found
 */
britishmuseum.searchByLabel = function(label, limit){
    limit = limit || DEFAULT_LIMIT;

    let simpleLabelQ = `
    SELECT DISTINCT (SAMPLE(?object) AS ?object) ?img
    { ?object rdfs:label ?label .
      ?object btm:PX_has_main_representation ?img.
      FILTER(REGEX(?label, "${label}", "i")).}
      GROUP BY ?img
    LIMIT ${limit}`;

    queryOptions.body = prefix + simpleLabelQ;
    return this._sendStruct(queryOptions, searchParser);

};


/**
 * Search for artifacts by type
 * @param {String} type Type to search for
 * @param {Number=} limit Maximum number of artifacts to return
 * @returns {Object} Table of artifacts found
 */
britishmuseum.searchByType = function(type, limit){
    limit = limit || DEFAULT_LIMIT;

    let simpleTypeQ = `
    SELECT DISTINCT (SAMPLE(?object) AS ?object) ?img
    WHERE {
      ?object btm:PX_has_main_representation ?img.
      ?object btm:PX_object_type ?typeThesauri.
      ?typeThesauri skos:prefLabel ?type.
      FILTER(REGEX(?type, "${type}", "i"))
    }
    GROUP BY ?img
    LIMIT ${limit}`;

    queryOptions.body = prefix + simpleTypeQ;
    return this._sendStruct(queryOptions, searchParser);
};


/**
 * Search for artifacts by material
 * @param {String} material Material to search for
 * @param {Number=} limit Maximum number of artifacts to return
 * @returns {Object} Table of artifacts found
 */
britishmuseum.searchByMaterial = function(material, limit){
    limit = limit || DEFAULT_LIMIT;

    let simpleMaterialQ = `
    SELECT DISTINCT (SAMPLE(?object) AS ?object) ?img
    WHERE {
      ?object btm:PX_has_main_representation ?img.
      ?object crm:P45_consists_of ?materialThesauri.
      ?materialThesauri skos:prefLabel ?material.
      FILTER(REGEX(?material, "${material}", "i"))
    }
    GROUP BY ?img
    LIMIT ${limit}`;

    queryOptions.body = prefix + simpleMaterialQ;
    return this._sendStruct(queryOptions, searchParser);
};


/**
 * Get details about an artifact
 * @param {String} itemId ID of item to find details for
 * @returns {Object} Table of details for item
 */
britishmuseum.itemDetails = function(itemId){

    let resourceUri = 'http://collection.britishmuseum.org/id/object/' + itemId;

    let detailsQuery = `SELECT DISTINCT ?obj ?pred ?sub WHERE { <${resourceUri}> ?pred ?sub. }`;

    queryOptions.body = detailsQuery;

    let resourceParser = sparqlJson => {
        sparqlJson = JSON.parse(sparqlJson);
        function setOrAppend(varPt, val){
            if (varPt === undefined) {
                return [val];
            }else if (Array.isArray(varPt)){
                return varPt.concat(val);
            }else {
                throw 'unexpected value';
            }
        }
        let sparqlObj = {};
        sparqlJson.results.bindings.forEach(it => { 
            sparqlObj[it.pred.value] = setOrAppend(sparqlObj[it.pred.value], it.sub.value);
        });

        try {
            let mainImages = sparqlObj['http://www.researchspace.org/ontology/PX_has_main_representation'] || [];
            let otherImages = sparqlObj['http://erlangen-crm.org/current/P138i_has_representation'] || [];
            let images = mainImages.concat(otherImages);
            let info = sparqlObj['http://www.researchspace.org/ontology/PX_display_wrap'].map(info => {
                return info.split('::').slice(0,2).map(str => str.trim());
            });

            let idealObj = {
                image: mainImages[0].match(/AN(\d{6,10})/)[1],
                otherImages: images.map(img => img.match(/AN(\d{6,10})/)[1]),
            };
            let promisedLabel = sparqlObj['http://www.w3.org/2000/01/rdf-schema#label'];
            idealObj.label =  promisedLabel ? promisedLabel[0] : '';

            let promisedDesc =sparqlObj['http://www.researchspace.org/ontology/PX_physical_description'];
            idealObj.physicalDescription =  promisedDesc ? promisedDesc[0] : '';

            info.forEach(keyVal => {
                idealObj[keyVal[0].toLowerCase()] = keyVal[1];
            });
            this._logger.trace(idealObj);
            return idealObj;
        } catch (e) {
            this._logger.error('exception occured when creating resource structure', e);
            return null;
        }
    }; // end of parser

    return this._sendStruct(queryOptions, resourceParser);
};

/**
 * Get image of an artifact
 * @param {String} imageId ID of image to retrieve
 * @param {BoundedNumber<1,2000>} maxWidth Width of image
 * @param {BoundedNumber<1,2000>} maxHeight Height of image
 * @returns {Image} Image of artifact found
 */
britishmuseum.getImage = function getImage(imageId, maxWidth, maxHeight) {
    // can set maxwidth and height
    maxWidth = maxWidth || 300;
    maxHeight = maxHeight || 300;
    this._sendImage({
        baseUrl: 'http://www.britishmuseum.org/collectionimages/',
        queryString: `AN${imageId.substr(0,5)}/AN${imageId}_001_l.jpg?maxwidth=${maxWidth}&maxheight=${maxHeight}`,
        cache: true
    });

    return null;
};

module.exports = britishmuseum;

