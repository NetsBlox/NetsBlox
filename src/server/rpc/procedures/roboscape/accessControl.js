const RoboCol = require('./database');
const logger = require('../utils/logger')('roboscape').fork('acl');


const MISSING_DOC_ALLOWED = true;

// given a robot db doc checks if user has access or not
// OPT if the doc structure used usernames as keys..
const _hasAccessDoc = function(username, doc) {
    if (!doc) throw new Error('missing robot information');
    if (doc.isPublic === true) return true; // if it is explicitly public/open
    if (doc.owner === username) return true; // give access to the owner
    let user = doc.users.find(u => u.username === username);
    return user && user.hasAccess;
};

const _findRobotDoc = async function(robotId) {
    let queryRes = await RoboCol.findOne({robotId});
    if (queryRes) {
        let doc = queryRes._doc;
        return doc;
    } else {
        return null;
    }
};

// robotids: array of robotIds
const _findRobotDocs = async function(robotIds) {
    // OPT find robots in batch
    let recs;
    if (!robotIds) {
        recs = await RoboCol.find({}); // OPT streaming would be more efficient. memory issues..
        recs = recs.map(r => r._doc);
    } else {
        logger.trace('finding robot docs for', robotIds);
        let promises = robotIds.map(async id => await _findRobotDoc(id)); // OPT batch in one query?
        recs = await Promise.all(promises);
    }
    return recs;
};

// checks if username has access to robotId
// note: a guest user can access a public robot!
const hasAccess = async function(username, robotId) {
    if (!robotId) throw new Error('missing robot id');
    let rDoc = await _findRobotDoc(robotId);
    if (!rDoc) return MISSING_DOC_ALLOWED;
    return _hasAccessDoc(username, rDoc);
};

const ensureAuthorized = async function(username, robotId) {
    if (!await hasAccess(username, robotId))
        throw new Error('Unauthorized access.');
};

// returns accessible robot ids to this username
// interesetedRobots: optional to help the search in database
const authorizedRobots = async function(username, interesetedRobots) {
    if (interesetedRobots && interesetedRobots.length === 0) return [];
    let docs = await _findRobotDocs(interesetedRobots);
    return docs
        .map((doc, idx) => [doc, interesetedRobots[idx]])
        .filter(([doc]) => {
            if (!doc) return MISSING_DOC_ALLOWED;
            return _hasAccessDoc(username, doc);
        })
        .map(pair => pair[1]);
};

module.exports = {
    hasAccess,
    authorizedRobots,
    ensureAuthorized,
};
