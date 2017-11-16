const Messages = {};

let logger = null;
let collection = null;

Messages.init = (_logger, db) {
    logger = _logger.fork('messages');
    collection = db.collection('messages');
};

Messages.save = message => {
    // TODO: store the given message in the database
    return collection.save(message);
};

module.exports = Messages;
