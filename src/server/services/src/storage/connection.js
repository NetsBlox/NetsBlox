const Logger = require('../logger');
const {MongoClient} = require('mongodb');

var Storage = function() {
    this._logger = new Logger('netsblox:storage');
};

Storage.prototype.getDatabaseFromURI = function(mongoURI) {
    return mongoURI.replace(/^(mongodb:\/\/)?[a-zA-Z0-9-_:\.]+\/?/, '') || 'admin';
};

Storage.prototype.connect = async function(mongoURI) {
    mongoURI = mongoURI || process.env.MONGO_URI || process.env.MONGOLAB_URI || 'mongodb://localhost:27017';
    const dbName = this.getDatabaseFromURI(mongoURI);
    try {
        const client = await MongoClient.connect(mongoURI);
        const db = client.db(dbName);

        this._db = db;
        this._client = client;
        this._logger.info(`Connected to ${mongoURI}`);
        return db;
    } catch (err) {
        /* eslint-disable no-console */
        console.error(`Could not connect to mongodb at ${mongoURI}.`);
        console.error('To connect to a different mongo instance, set MONGO_URI to the mongo uri and try again:');
        console.error('');
        console.error('    MONGO_URI=mongodb://some.ip.address:27017/ netsblox start');
        console.error('');
        console.error('or, if running from the root of the netsblox project:');
        console.error('');
        console.error('    MONGO_URI=mongodb://some.ip.address:27017/ ./bin/netsblox start');
        console.error('');
        /* eslint-enable no-console */
        throw err;
    }
};

Storage.prototype.disconnect = function() {
    return this._client.close(true);
};

module.exports = new Storage();


