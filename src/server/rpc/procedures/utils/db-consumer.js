const NBService = require('./service.js');

// converts a phrase into camel case format
function toCamelCase(text) {
    // create uppercc
    let cc = text.toLowerCase()
        .split(' ')
        .map((s) => s.charAt(0).toUpperCase() + s.substring(1))
        .join('');
    return cc;
}

class DBConsumer extends NBService {
    /**
    * @param {string} serviceName a valid service name
    * @param {object} model mongoose model
    */
    constructor(serviceName, model) {
        super(serviceName);
        this._model = model;
    }


    _cleanDbRec(rec) {
        delete rec._doc._id;
        delete rec._doc.__v;
        return rec._doc;
    }

    _fields() {
        let fields = Object.keys(this._model.schema.paths);
        return fields.slice(0,fields.length-2); // exclude id and v
    }

    async _advancedSearch(field, query, skip = '', limit = '') {
        // prepare and check the input
        if (skip === '') skip = 0;
        if (limit === '') limit = 10;

        limit = Math.min(limit, 50); // limit the max requested documents

        if(!Array.isArray(field)){
            field = [field];
            query = [query];
        }

        let dbQuery = {};
        for(let i in field){
            if (!this._fields().find(attr => attr === field[i])) throw new Error('bad field name');
        
            // build the database query
            if(typeof(query[i]) === 'string'){
                dbQuery[field[i]] = new RegExp(`.*${query[i]}.*`, 'i');
            } else {
                dbQuery[field[i]] = query[i];
            }
        }

        let res;

        if(limit === -1){
            res = await this._model.find(dbQuery).skip(skip);          
        } else {
            res = await this._model.find(dbQuery).skip(skip).limit(limit);
        }
        return res.map(this._cleanDbRec);
    }


    // create rpcs from a list of interesting fields
    _genRPCs(featuredFields) {
        featuredFields.forEach(field => {
            // make sure the field exists
            if (!this._fields().includes(field)) throw new Error('non existing featured field');

            this['searchBy' + toCamelCase(field)] = async function(query) {
                // build the database query
                let dbQuery = {};
                dbQuery[field] = new RegExp(`.*${query}.*`, 'i');

                let res = await this._model.find(dbQuery).limit(20);
                return res.map(this._cleanDbRec);
            };
        });
    }

}

module.exports = DBConsumer;
