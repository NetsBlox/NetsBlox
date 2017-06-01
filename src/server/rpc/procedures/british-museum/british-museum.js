const ApiConsumer = require('../utils/api-consumer'),
    urlencode = require('urlencode');

let britishmuseum = new ApiConsumer('britishmuseum','http://collection.britishmuseum.org/');


const prefix = `PREFIX skos: <http://www.w3.org/2004/02/skos/core#>
PREFIX crm: <http://erlangen-crm.org/current/>
PREFIX fts: <http://www.ontotext.com/owlim/fts#>
PREFIX btm: <http://collection.britishmuseum.org/id/ontology/>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>`;


let searchParser = resp => {
    let results = [];
    resp.results.bindings.forEach(res => {
        try {
            let searchResult = {
                // label: res.label.value,
                // type: res.type.value,
                // material: res.material.value,
                image: res.img.value.match(/AN(\d{6,10})/)[1],
                // description: res.description.value,
                id: res.object.value.substr(res.object.value.lastIndexOf('/') + 1)
            };
            results.push(searchResult);
        } catch (e) {
            this._logger.error(e);
        }
    });
    return results;
};



britishmuseum.search = function(label, type, material, limit) {
    if (!(label || type || material)) return 'Please pass in a query';
    limit = limit || 10;
    label = label || '.*';
    type = type || '.*';
    material = material || '.*';

    let labelTypeMaterialQ = `
    SELECT DISTINCT ?object ?label ?img ?description ?type ?material
    {
      OPTIONAL { ?object rdfs:label ?label. }
      ?object btm:PX_has_main_representation ?img.
      OPTIONAL { ?object btm:PX_physical_description ?description. }
      ?object crm:P45_consists_of ?materialThesauri.
      ?materialThesauri skos:prefLabel ?material.
      ?object btm:PX_object_type ?typeThesauri.
      ?typeThesauri skos:prefLabel ?type.
      FILTER(REGEX(?label, "${label}", "i")).
      FILTER(REGEX(?material, "${material}", "i"))
      FILTER(REGEX(?type, "${type}", "i"))
    }
    LIMIT ${limit}`;

    let queryOptions = {
        queryString: 'sparql.json?query=' + urlencode( prefix + labelTypeMaterialQ, 'utf-8')
    };


    return this._sendStruct(queryOptions,searchParser);

};


britishmuseum.searchByLabel = function(label, limit){
    limit = limit || 10;

    let simpleLabelQ = `
    SELECT DISTINCT ?object ?img
    { ?object rdfs:label ?label .
      ?object btm:PX_has_main_representation ?img.
      OPTIONAL { ?object btm:PX_physical_description ?description. }
      FILTER(REGEX(?label, "${label}", "i")).}
    LIMIT ${limit}`;

    let queryOptions = {
        queryString: 'sparql.json?query=' + urlencode( prefix + simpleLabelQ, 'utf-8')
    };

    return this._sendStruct(queryOptions,searchParser);

};


britishmuseum.searchByType = function(type, limit){
    limit = limit || 10;

    let simpleTypeQ = `
    SELECT DISTINCT ?object ?img
    WHERE {
      ?object btm:PX_has_main_representation ?img.
      ?object btm:PX_object_type ?typeThesauri.
      ?typeThesauri skos:prefLabel ?type.
      FILTER(REGEX(?type, "${type}", "i"))
    }
    LIMIT ${limit}`;

    let queryOptions = {
        queryString: 'sparql.json?query=' + urlencode( prefix + simpleTypeQ, 'utf-8')
    };

    return this._sendStruct(queryOptions,searchParser);

};


britishmuseum.searchByMaterial = function(material, limit){
    limit = limit || 10;

    let simpleMaterialQ = `
    SELECT DISTINCT ?object ?img
    WHERE {
      ?object btm:PX_has_main_representation ?img.
      ?object crm:P45_consists_of ?materialThesauri.
      ?materialThesauri skos:prefLabel ?material.
      FILTER(REGEX(?material, "${material}", "i"))
    }
    LIMIT ${limit}`;

    let queryOptions = {
        queryString: 'sparql.json?query=' + urlencode( prefix + simpleMaterialQ, 'utf-8')
    };

    return this._sendStruct(queryOptions,searchParser);

}


britishmuseum.itemDetails = function(objId){

    let resourceUri = 'http://collection.britishmuseum.org/id/object/' + objId;
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
            // TODO better check for attribute existence. oneliner?
            if (sparqlJson['http://www.w3.org/2000/01/rdf-schema#label']) {
                idealObj.label = sparqlJson['http://www.w3.org/2000/01/rdf-schema#label'][0].value;
            }else {
                idealObj.label = ''
            }
            if (sparqlJson['http://collection.britishmuseum.org/id/ontology/PX_physical_description']) {
                idealObj.physicalDescription =  sparqlJson['http://collection.britishmuseum.org/id/ontology/PX_physical_description'][0].value
            }else {
                idealObj.physicalDescription = ''
            }

            info.forEach(keyVal => {
                idealObj[keyVal[0].toLowerCase()] = keyVal[1];
            });
            console.log(idealObj);
            return idealObj;
        } catch (e) {
            console.log('exception occured when creating resource structure', e);
            return null;
        }
    }; // end of parser

    return this._sendStruct(resourceQueryOpts, resourceParser);
}

britishmuseum.getImage = function getImage(id, maxWidth, maxHeight) {
    let parentId = id.substr(0,5);
    // can set maxwidth and height
    maxWidth = maxWidth || 300;
    maxHeight = maxHeight || 300;
    this._sendImage({
        baseUrl: 'http://www.britishmuseum.org/collectionimages/',
        queryString: `AN${id.substr(0,5)}/AN${id}_001_l.jpg?maxwidth=${maxWidth}&maxheight=${maxHeight}`,
        cache: false
    })

    return null;
}

module.exports = britishmuseum;
