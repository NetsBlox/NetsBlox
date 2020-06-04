const _ = require('lodash');
const Libraries = {};
const defaults = {
    description: 'some desc',
    blocks: '',
    public: false,
    pendingApproval: false,
};

Libraries.addDefaults = function (library) {
    library = _.extend({}, defaults, library);
    const defaultName = `${library.owner}'s ${library.public ? 'public' : 'private'} lib`;
    library.name = library.name || defaultName;
    return library;
};

let db;
Libraries.init = function (storage, _db) {
    db = _db;
};

Libraries.seed = async function (...libraries) {
    const docs = libraries.map(library => Libraries.addDefaults(library));
    return await db.collection('libraries').insertMany(docs);
};

Libraries.defaults = [
    {
        owner: 'brian',
        name: 'myPrivateLibrary'
    },
].map(Libraries.addDefaults);

module.exports = Libraries;
