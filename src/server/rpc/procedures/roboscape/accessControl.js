const RoboCol = require('./database');
const logger = require('../utils/logger')('roboscape').fork('acl');

// RoboCol.create({
//     robotId: '00409d8f66f7',
//     owner: 'hamid',
//     ownedAt: new Date(),
//     users: [
//         {
//             username: 'hamid',
//             hasAccess: true,
//             updatedAt: new Date(),
//         }
//     ]
// });

// TODO indexing and use robotId as _id

// given a robot db doc checks if user has access or not
// OPT if the doc structure used usernames as keys..
const _hasAccessDoc = function(username, doc) {
    if (!doc) throw new Error('missing robot information');
    if (doc.isPublic === true) return true;
    if (doc.owner === username) return true; // give access to the owner
    let user = doc.users.find(u => u.username === username);
    return user && user.hasAccess;
};

const findRobotDoc = async function(robotId) {
    let queryRes = await RoboCol.findOne({robotId});
    if (queryRes) {
        let doc = queryRes._doc;
        if (doc) logger.trace('fetched robot doc', doc);
        return doc;
    } else {
        return null;
    }
};

// robotids: array of robotIds
const findRobotDocs = async function(robotIds) {
    // TODO find robots in batch
    let recs;
    logger.trace('finding robot docs for', robotIds);
    if (!robotIds) {
        recs = await RoboCol.find({}); // OPT streaming would be more efficient. memory issues..
        recs = recs.map(r => r._doc);
    } else {
        let promises = robotIds.map(async id => await findRobotDoc(id)); // OPT batch in one query?
        recs = await Promise.all(promises);
    }
    return recs.filter(rec => !!rec); // return only valid docs
};

// checks if username has access to robotId
const hasAccess = async function(username, robotId) {
    if (!robotId) throw new Error('missing robot id');
    let rDoc = await _findRobotDoc(robotId);
    return _hasAccessDoc(username, rDoc);
};

const ensureAuthorized = async function(username, robotId) {
    if (!await hasAccess(username, robotId))
        throw new Error('Unauthorized access.');
};

// returns accessible robot ids to this username
// availableRobots: optional to help the search in database
const accessibleRobots = async function(username, availableRobots) {
    let docs = await findRobotDocs(availableRobots);
    return docs
        .filter(d => hasAccessDoc(username, d))
        .map(rDoc => rDoc.robotId);
};

module.exports = {
    hasAccess,
    accessibleRobots,
};
