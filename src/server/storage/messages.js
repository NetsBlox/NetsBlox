const Messages = {};

let logger = null;
let collection = null;

Messages.MAX_MESSAGE_COUNT = 150;
Messages.init = (_logger, db) => {
    logger = _logger.fork('messages');
    collection = db.collection('messages');
};

Messages.get = (projectId, start, end) => {
    start = start || 0;
    end = end || Date.now();

    let query = {
        srcProjectId: projectId,
        $and: [
            {time: {$gte: start}},
            {time: {$lte: end}}
        ]
    };

    logger.trace(`Getting messages for ${projectId} btwn ${new Date(start)} and ${new Date(end)}`);
    return collection.find(query)
        .limit(Messages.MAX_MESSAGE_COUNT)
        .toArray();
};

Messages.save = message => {
    // It may be better to batch the writes...
    message.time = Date.now();

    logger.trace(`saving message: ${JSON.stringify(message, null, 2)}`);
    return collection.save(message);
};

module.exports = Messages;
