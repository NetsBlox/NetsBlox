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

    async _advancedSearch(field, query, page, limit) {
        // prepare and check the input
        if (!this._fields.find(attr => attr === field)) throw new Error('bad field name');
        if (page === '') page = 0;
        if (limit === '') limit = 10;
        limit = Math.min(limit, 50); // limit the max requested documents


        // build the database query
        let dbQuery = {};
        dbQuery[field] = new RegExp(`.*${query}.*`, 'i');

        let res = await this._model.find(dbQuery).skip(page).limit(limit);

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
