const ApiConsumer = require('../utils/api-consumer'),
    {SparqlClient, SPARQL} = require('sparql-client-2'),
    urlencode = require('urlencode');
let britishmuseum = new ApiConsumer('britishmuseum','http://collection.britishmuseum.org/sparql.xml?query=');

britishmuseum.search = function(label, type, material, limit) {
    if (!(label || type || material)) return 'Please pass in a query';
    label = label || '.*';
    type = type || '.*';
    material = material || '.*';
    limit = limit || 20;

    let prefix = `PREFIX skos: <http://www.w3.org/2004/02/skos/core#>
    PREFIX crm: <http://erlangen-crm.org/current/>
    PREFIX fts: <http://www.ontotext.com/owlim/fts#>
    PREFIX btm: <http://collection.britishmuseum.org/id/ontology/>
    PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>`;

    let simpleLabelQ = `
    SELECT DISTINCT ?object ?label ?img ?description
    { ?object rdfs:label ?label .
      ?object btm:PX_has_main_representation ?img.
      OPTIONAL { ?object btm:PX_physical_description ?description. }
      FILTER(REGEX(?label, "${label}", "i")).}
    LIMIT 1`;

    let materialQ = `
    SELECT DISTINCT ?object ?label ?img ?description ?type ?material
    {
      OPTIONAL { ?object rdfs:label ?label. }
      ?object btm:PX_has_main_representation ?img.
      OPTIONAL { ?object btm:PX_physical_description ?description. }
      ?object crm:P45_consists_of ?materialThesauri.
      ?materialThesauri skos:prefLabel ?material.
      ?object btm:PX_object_type ?typeThesauri.
      ?typeThesauri skos:prefLabel ?type.
      FILTER(REGEX(?material, "${material}", "i"))
    }
    LIMIT ${limit}`;

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
        queryString: urlencode(prefix + labelTypeMaterialQ, 'utf-8')
    };


    let objParser = resp => {
        let results = [];
        resp.results.bindings.forEach(res => {
            try {
                let searchResult = {
                    label: res.label.value,
                    type: res.type.value,
                    material: res.material.value,
                    image: res.img.value.match(/AN(\d{6,10})/)[1],
                    description: res.description.value,
                    id: res.object.value.substr(res.object.value.lastIndexOf('/') + 1)
                };
                // res.info = res.info.split('::').slice(0,2).map(str => str.trim());
                // res.info.forEach(infoTuple => {
                //   res[infoTuple[0]] = infoTuple[1];
                // })
                results.push(searchResult);
            } catch (e) {
                this._logger.error(e);
            }
        });
        return results;
    };



};

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
                name: sparqlJson['http://www.w3.org/2000/01/rdf-schema#label'][0].value,
                image: mainImages[0].value.match(/AN(\d{6,10})/)[1],
                otherImages: images.map(img => img.value.match(/AN(\d{6,10})/)[1]),
                physicalDescription: sparqlJson['http://collection.britishmuseum.org/id/ontology/PX_physical_description'][0].value
            };
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
