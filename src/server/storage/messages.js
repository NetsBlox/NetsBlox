const Messages = {};

let logger = null;
let collection = null;

Messages.init = (_logger, db) => {
    logger = _logger.fork('messages');
    collection = db.collection('messages');
};

Messages.save = message => {
    logger.trace(`saving message: ${JSON.stringify(message, null, 2)}`);
    // TODO: store the given message in the database
    // It may be better to batch the writes...
    return collection.save(message);
};

module.exports = Messages;
