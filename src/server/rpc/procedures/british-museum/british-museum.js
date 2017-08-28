const ApiConsumer = require('../utils/api-consumer'),
    osmosis = require('osmosis'),
    urlencode = require('urlencode');

let britishmuseum = new ApiConsumer('britishmuseum','https://collection.britishmuseum.org/',{cache: {ttl: 3600*24*30*6}});


const prefix = `PREFIX skos: <http://www.w3.org/2004/02/skos/core#>
PREFIX crm: <http://erlangen-crm.org/current/>
PREFIX fts: <http://www.ontotext.com/owlim/fts#>
PREFIX btm: <http://collection.britishmuseum.org/id/ontology/>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>`;

const DEFAULT_LIMIT = 5;

// parser used for when calling the json endPoint
let searchParser = resp => {
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

// parses and sends a respond back to the user. used when using the basic endpoint
britishmuseum._htmlSearchHandler = function(html, response) {
    let self = this;
    let results = [];
    osmosis
    .parse(html)
    .find('tbody tr')
    .set({
        obj: 'td[1] a@title',
        image: 'td[2] a@title'
    })
    .data(function(data) {
        // data for one result
        results.push(data);
    })
    .done(()=>{
        results = results.map(res => {
            britishmuseum._logger.trace(res);
            if(!(res.obj && res.image)) return null;
            return {
                id: res.obj.substr(res.obj.lastIndexOf('/') + 1),
                image: res.image.match(/AN(\d{6,10})/)[1]
            };
        });
        let structure = self._createSnapStructure(results);
        response.send(structure);
    })
    // .log(britishmuseum._logger.trace)
    // .debug(britishmuseum._logger.debug)
    .error(britishmuseum._logger.error);
};



britishmuseum.search = function(label, type, material, limit) {
    if (!(label || type || material)) return 'Please pass in a query';
    limit = limit || DEFAULT_LIMIT;
    let response = this.response;
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

    let queryOptions = {
        // queryString: 'sparql?query=' + urlencode( prefix + combinedQuery, 'utf-8'),
        headers: {
            'content-type': 'application/sparql-results+json;charset=UTF-8',
            origin: 'https://collection.britishmuseum.org',
            referer: 'https://collection.britishmuseum.org/sparql',
            authority: 'collection.britishmuseum.org',
            accept: 'application/sparql-results+json',
            'accept-encoding': 'gzip, deflate, br',
            'accept-language': 'en,fa;q=0.8'
        },
        method: 'POST',
        queryString: 'sparql?',
        // body: prefix + combinedQuery,
        body: `SELECT * WHERE { ?sub ?pred ?obj. }
LIMIT 10`,
        json: false
    };


    this._requestData(queryOptions)
        .then(console.log);
    return null;
    // or send use sendStruct if hitting the json endpoint.
    // return this._sendStruct(queryOptions,searchParser);

};

britishmuseum.searchByLabel = function(label, limit){
    limit = limit || DEFAULT_LIMIT;
    let response = this.response;

    let simpleLabelQ = `
    SELECT DISTINCT (SAMPLE(?object) AS ?object) ?img
    { ?object rdfs:label ?label .
      ?object btm:PX_has_main_representation ?img.
      FILTER(REGEX(?label, "${label}", "i")).}
      GROUP BY ?img
    LIMIT ${limit}`;

    let queryOptions = {
        queryString: 'sparql?query=' + urlencode( prefix + simpleLabelQ, 'utf-8'),
        json: false
    };

    this._requestData(queryOptions)
        .then(html => {
            this._htmlSearchHandler(html, response);
        });
    return null;
};


britishmuseum.searchByType = function(type, limit){
    limit = limit || DEFAULT_LIMIT;
    let response = this.response;

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

    let queryOptions = {
        queryString: 'sparql?query=' + urlencode( prefix + simpleTypeQ, 'utf-8'),
        json: false
    };

    this._requestData(queryOptions)
        .then(html => {
            this._htmlSearchHandler(html,response);
        });
    return null;

};


britishmuseum.searchByMaterial = function(material, limit){
    limit = limit || DEFAULT_LIMIT;
    let response = this.response;

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

    let queryOptions = {
        queryString: 'sparql?query=' + urlencode( prefix + simpleMaterialQ, 'utf-8'),
        json: false
    };

    this._requestData(queryOptions)
        .then(html => {
            this._htmlSearchHandler(html,response);
        });
    return null;

};


britishmuseum.itemDetails = function(itemId){

    let resourceUri = 'http://collection.britishmuseum.org/id/object/' + itemId;
    let resourceQueryOpts = {
        queryString: 'resource?uri=' + resourceUri + '&format=json'
    };

    let resourceParser = sparqlJson => {
        try {
            sparqlJson = sparqlJson[Object.keys(sparqlJson)[0]];
            let mainImages = sparqlJson['http://collection.britishmuseum.org/id/ontology/PX_has_main_representation'] || [];
            let otherImages = sparqlJson['http://erlangen-crm.org/current/P138i_has_representation'] || [];
            let images = mainImages.concat(otherImages);
            let info = sparqlJson['http://collection.britishmuseum.org/id/ontology/PX_display_wrap'].map(item => item.value).map(info => {
                return info.split('::').slice(0,2).map(str => str.trim());
            });

            let idealObj = {
                image: mainImages[0].value.match(/AN(\d{6,10})/)[1],
                otherImages: images.map(img => img.value.match(/AN(\d{6,10})/)[1]),
            };
            let promisedLabel = sparqlJson['http://www.w3.org/2000/01/rdf-schema#label'];
            idealObj.label =  promisedLabel ? promisedLabel[0].value : '';

            let promisedDesc =sparqlJson['http://collection.britishmuseum.org/id/ontology/PX_physical_description'];
            idealObj.physicalDescription =  promisedDesc ? promisedDesc[0].value : '';

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

    return this._sendStruct(resourceQueryOpts, resourceParser);
};

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
