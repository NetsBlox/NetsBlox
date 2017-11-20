const Messages = {};

let logger = null;
let collection = null;

Messages.MAX_MESSAGE_COUNT = 150;
Messages.init = (_logger, db) => {
    logger = _logger.fork('messages');
    collection = db.collection('messages');
};

Messages.get = projectId => {
    return collection.find({srcProjectId: projectId})
        .limit(Messages.MAX_MESSAGE_COUNT)
        .toArray();
};

Messages.save = message => {
    // TODO: store the given message in the database
    // It may be better to batch the writes...
    message.time = Date.now();

    logger.trace(`saving message: ${JSON.stringify(message, null, 2)}`);
    return collection.save(message);
};

module.exports = Messages;
