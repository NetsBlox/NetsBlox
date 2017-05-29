const ApiConsumer = require('../utils/api-consumer');
let britishmuseum = new ApiConsumer('britishmuseum','http://collection.britishmuseum.org/');

britishmuseum.search = function(label, type, material, limit) {
    if (!(label || type || material)) return 'Please pass in a query';
    label = label || '.*';
    type = type || '.*';
    material = material || '.*';
    limit = limit || 20;

    let queryOptions = {
        queryString:   `sparql.json?query=%0D%0APREFIX+skos%3A+%3Chttp%3A%2F%2Fwww.w3.org%2F2004%2F02%2Fskos%2Fcore%23%3E%0D%0APREFIX+crm%3A+%3Chttp%3A%2F%2Ferlangen-crm.org%2Fcurrent%2F%3E%0D%0APREFIX+fts%3A+%3Chttp%3A%2F%2Fwww.ontotext.com%2Fowlim%2Ffts%23%3E%0D%0APREFIX+btm%3A+%3Chttp%3A%2F%2Fcollection.britishmuseum.org%2Fid%2Fontology%2F%3E%0D%0APREFIX+rdfs%3A+%3Chttp%3A%2F%2Fwww.w3.org%2F2000%2F01%2Frdf-schema%23%3E%0D%0A%0D%0ASELECT+DISTINCT+%3Fobject+%3Flabel+%3Fimg+%3Fdescription+%3Ftype+%3Fmaterial%0D%0A%7B+%3Fobject+rdfs%3Alabel+%3Flabel+.%0D%0A++%3Fobject+btm%3APX_has_main_representation+%3Fimg.%0D%0A++OPTIONAL+%7B+%3Fobject+btm%3APX_physical_description+%3Fdescription.+%7D%0D%0A++%3Fobject+crm%3AP45_consists_of+%3FmaterialThesauri.%0D%0A++%3FmaterialThesauri+skos%3AprefLabel+%3Fmaterial.%0D%0A++%3Fobject+btm%3APX_object_type+%3FtypeThesauri.%0D%0A++%3FtypeThesauri+skos%3AprefLabel+%3Ftype.%0D%0A++FILTER%28REGEX%28%3Flabel%2C+%22${label}%22%2C+%22i%22%29%29.%0D%0A++FILTER%28REGEX%28%3Fmaterial%2C+%22${material}%22%2C+%22i%22%29%29%0D%0A++FILTER%28REGEX%28%3Ftype%2C+%22${type}%22%2C+%22i%22%29%29%0D%0A%7D%0D%0ALIMIT+${limit}%0D%0A&_implicit=false&_equivalent=false&_form=%2Fsparql`
    };



    let objParser = resp => {
        let results = [];
        resp.results.bindings.forEach(res => {
            try {
                let searchResult = {
                    label: res.label.value,
                    type: res.type.value,
                    material: res.material.value,
                    image: res.img.value,
                    description: res.description.value,
                    id: res.object.value.substr(res.object.value.lastIndexOf('/') + 1)
                }
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

    return this._sendStruct(queryOptions,objParser);
    // this._inspectResponse(queryOptions, '.results');

}

britishmuseum.itemDetails = function(objId){

    let resourceUri = 'http://collection.britishmuseum.org/id/object/' + objId;
    let resourceQueryOpts = {
        queryString: 'resource?uri=' + resourceUri + '&format=json'
    }

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


// let objParser = sparqlJsons => {
//     // make the sparqlJson structure less weird
//     let structure = sparqlJsons.map(sparqlJson => {
//         sparqlJson = sparqlJson[Object.keys(sparqlJson)[0]];
//         let mainImages = sparqlJson['http://collection.britishmuseum.org/id/ontology/PX_has_main_representation'] || [];
//         let otherImages = sparqlJson['http://erlangen-crm.org/current/P138i_has_representation'] || [];
//         let images = mainImages.concat(otherImages);
//         let info = sparqlJson['http://collection.britishmuseum.org/id/ontology/PX_display_wrap'].map(item => item.value).map(info => {
//             return info.split('::').slice(0,2).map(str => str.trim());
//         });
//         try {
//             let idealObj = {
//                 name: sparqlJson['http://www.w3.org/2000/01/rdf-schema#label'][0].value,
//                 images: images.map(img => img.value.match(/AN(\d{6,10})/)[1]),
//                 physicalDescription: sparqlJson['http://collection.britishmuseum.org/id/ontology/PX_physical_description'][0].value
//             };
//             info.forEach(keyVal => {
//                 idealObj[keyVal[0].toLowerCase()] = keyVal[1];
//             });
//             console.log(idealObj);
//             return idealObj;
//         } catch (e) {
//             console.log('exception occured when creating structure');
//             return null;
//         }
//     })
//     // TODO use reduce or filter to combine next step with last
//     structure = structure.filter(item => item !== null);
//     console.log('generated structure size', structure.length); // doesn't reach this line sometimes..
//     return structure;
// };

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
