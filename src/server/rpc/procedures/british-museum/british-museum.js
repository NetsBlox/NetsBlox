const ApiConsumer = require('../utils/api-consumer');
let britishmuseum = new ApiConsumer('britishmuseum','http://collection.britishmuseum.org/');


britishmuseum._makeHelpers

britishmuseum.searchByLabel = function search(query) {
    if (!query) return null;
    // 'sparql.json?query=PREFIX+crm%3A+%3Chttp%3A%2F%2Ferlangen-crm.org%2Fcurrent%2F%3E%0D%0APREFIX+skos%3A+%3Chttp%3A%2F%2Fwww.w3.org%2F2004%2F02%2Fskos%2Fcore%23%3E%0D%0A%0D%0ASELECT+DISTINCT+%3F' +query+ '%0D%0A%7B%3F' +query+ '_term+skos%3AprefLabel+%22' +query+ '%22+.++++++++++++++++++++++%23Find+the+thesaurus+term+for+' +query+ 's%0D%0A++++++++++++%0D%0A+%7B%3F' +query+ '+crm%3AP2_has_type+%3F' +query+ '_term%7D++++++++++++++++++++++%23Find+those+objects+directly+categorised+under+this%0D%0A+UNION++++++++++++++++++++++++++++++++++++++++++++++++++++%23and%2For%0D%0A+%7B%3F' +query+ '+crm%3AP2_has_type+%3F' +query+ '_like_term+.%0D%0A++%3F' +query+ '_like_term+skos%3AbroaderTransitive+%3F' +query+ '_term%7D+.++++%23objects+that+are+categorised+below+this+in+the+hierarchy%0D%0A%7D&_implicit=false&implicit=true&_equivalent=false&_form=%2Fsparql'
    // 'sparql.json?query=PREFIX+crm%3A+<http%3A%2F%2Ferlangen-crm.org%2Fcurrent%2F>%0D%0APREFIX+fts%3A+<http%3A%2F%2Fwww.ontotext.com%2Fowlim%2Ffts%23>%0D%0A%0D%0ASELECT+DISTINCT+%3Fobject+%0D%0A%7B+%3Fobject+crm%3AP102_has_title+%3Ftitle+.++++++++++++++++++++%23Find+the+title+resource+for+an+object%0D%0A++%3Ftitle+rdfs%3Alabel+%3Flabel+.++++++++++++++++++++++++++++++%23find+the+label+attached+to+that+title%0D%0A++FILTER%28REGEX%28%3Flabel%2C+"' +query+ '"%29%29++++++++++++++++++%23match+the+%27Rosetta+Stone%27+token+by+regular+expression%0D%0A%7D&_implicit=false&implicit=false&_equivalent=false&_form=%2Fsparql'




    let byLabelQuery = {
        queryString: 'sparql.json?query=PREFIX+crm%3A+%3Chttp%3A%2F%2Ferlangen-crm.org%2Fcurrent%2F%3E%0D%0APREFIX+fts%3A+%3Chttp%3A%2F%2Fwww.ontotext.com%2Fowlim%2Ffts%23%3E%0D%0A%0D%0APREFIX+rdfs%3A+%3Chttp%3A%2F%2Fwww.w3.org%2F2000%2F01%2Frdf-schema%23%3E%0D%0ASELECT+DISTINCT+%3Fobject+%0D%0A%7B+%3Fobject+crm%3AP102_has_title+%3Ftitle+.+++++++++++++++++++%0D%0A++%3Ftitle+rdfs%3Alabel+%3Flabel+.++++++++++++++++++++++++++++%0D%0A++FILTER%28REGEX%28%3Flabel%2C+%22'+query+'%22%2C%22i%22%29%29%0D%0A%7D&_implicit=false&_equivalent=false&equivalent=true&_form=%2Fsparql'
    };


    let objParser = sparqlJsons => {
        // make the sparqlJson structure less weird
        let structure = sparqlJsons.map(sparqlJson => {
            sparqlJson = sparqlJson[Object.keys(sparqlJson)[0]];
            let mainImages = sparqlJson['http://collection.britishmuseum.org/id/ontology/PX_has_main_representation'] || [];
            let otherImages = sparqlJson['http://erlangen-crm.org/current/P138i_has_representation'] || [];
            let images = mainImages.concat(otherImages);
            let info = sparqlJson['http://collection.britishmuseum.org/id/ontology/PX_display_wrap'].map(item => item.value).map(info => {
                return info.split('::').slice(0,2).map(str => str.trim());
            });
            try {
                let idealObj = {
                    name: sparqlJson['http://www.w3.org/2000/01/rdf-schema#label'][0].value,
                    images: images.map(img => img.value.match(/AN(\d{6,10})/)[1]),
                    physicalDescription: sparqlJson['http://collection.britishmuseum.org/id/ontology/PX_physical_description'][0].value
                };
                info.forEach(keyVal => {
                    idealObj[keyVal[0].toLowerCase()] = keyVal[1];
                });
                console.log(idealObj);
                return idealObj;
            } catch (e) {
                console.log('exception occured when creating structure');
                return null;
            }
        })
        // TODO use reduce or filter to combine next step with last
        structure = structure.filter(item => item !== null);
        console.log('generated structure size', structure.length); // doesn't reach this line sometimes..
        return structure;
    };

    this._requestData(byLabelQuery)
        .then(res => {
            console.log('got', res.results.bindings.length, 'search restults back');
            let queryOptionsArr = res.results.bindings.slice(0,50).map( binding => {
                    return {
                        queryString: 'resource?uri=' + binding.object.value + '&format=json'
                    }
                }
            );
            this._sendStruct(queryOptionsArr,objParser);
            // return this._requestData(queryOptionsArr);
        })
        // .then(responses => {
        //     objParser(responses);
        // });
    // this._sendAnswer(queryOptions, '.results.bindings[0]');
    return null;
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
