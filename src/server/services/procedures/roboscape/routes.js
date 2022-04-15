// User endpoints adapted from the Snap! server api. These are used by the server
// to create the endpoints and by the client to discover the endpoint urls
'use strict';

const logger = require('../utils/logger')('roboscape:routes');
const NetsBloxCloud = require('../../cloud-client');
const RoboscapeCol = require('./database'); // roboscape model

const BASE_ENDPOINT = 'roboscape';
const ROBOTS_ENDPOINT = BASE_ENDPOINT + '/robots';

/**
 * routes for:
 * 1. getting/proving ownership of n robots
 * 2. modify robots' users => modify a robot record
 * 3. fetch my robots details
 */

// requires user
const isRobotOwner = async function(req) {
    let username = req.session.user.username;
    logger.trace(`checking if ${username} is the robot owner`);
    let robotDoc = await RoboscapeCol.findOne({_id: req.params._id});
    if (!robotDoc) throw new Error('non-existing robot');
    if (robotDoc.owner !== username)
        throw new Error('unauthorized');
};

const findOne = query => RoboscapeCol.findOne(query);

const sanitizeBody = (body, schema) => {
    // make sure the request body has the same keys as schema
    let newBody = {};
    for (let attr of schema) {
        if (body[attr] === undefined) throw new Error('bad body structure, expected ' + schema.join(', '));
        newBody[attr] = body[attr];
    }
    return newBody;
};


const setUserAccess = async (mongoId, username, hasAccess) => {
    // prevent update to questionable fields
    if (typeof hasAccess !== 'boolean' || !username) throw new Error('bad username or accesslevel.');

    let robotRec = await findOne({_id: mongoId});

    if (!robotRec) throw new Error('non-existing robot id');

    if (await NetsBloxCloud.userExists(username)) throw new Error('user not found');

    const curTime = new Date();

    robotRec = robotRec._doc;
    let user = robotRec.users.find(user => user.username === username);
    if (user) {
        user.hasAccess = hasAccess; // check is it editing the same object?
        user.updatedAt = curTime;
    } else {
        robotRec.users.push({
            username,
            hasAccess,
            updatedAt: curTime,
        });
    }

    await RoboscapeCol.updateOne({ _id: mongoId }, {$set: {users: robotRec.users}});
    return robotRec;
};


const routes = [
    { // own, create the record if needed
        URL: '',
        Parameters: '',
        Method: 'post',
        middleware: ['isLoggedIn', 'setUser'],
        Handler: async function(req) {
            const newEntry = req.body;
            newEntry.users = [];
            newEntry.owner = req.session.user.username;
            newEntry.ownedAt = new Date();
            if (!newEntry.robotId) throw new Error('missing robot ID');
            newEntry.robotId = newEntry.robotId.toLowerCase(); // lowercase ids

            logger.info(`${newEntry.owner} attempting to own ${newEntry.robotId}`);

            // makes sure robotIds are unique (duplicate robots)
            let rec = await RoboscapeCol.findOne({robotId: newEntry.robotId});
            if (rec) {
                logger.trace('updating existing rec', rec, 'to', newEntry);
                if (rec._doc.owner === newEntry.owner) {
                    // user already owns the robot
                    return 'robot already owned';
                } else { // refresh the doc, throw users out. del & recreate?
                    await RoboscapeCol.updateOne({ _id: rec._id }, {owner: newEntry.owner, isPublic: true, ownedAt: newEntry.ownedAt, users: []});
                }
            } else {
                logger.trace('creating new robot rec', newEntry);
                await RoboscapeCol.create(newEntry);
            }
            return `owned robot ${req.body.robotId}`;
        }
    },

    { // read my robots
        URL: '',
        Method: 'get',
        middleware: ['isLoggedIn', 'setUser'],
        Handler: function(req) {
            const query = {
                owner: req.session.user.username, // ensure it's limited to the owner's robots
            };
            return RoboscapeCol.find(query);
        }
    },

    { // read one
        URL: '/:_id',
        Method: 'get',
        middleware: ['isLoggedIn', 'setUser'],
        customMiddleware: [isRobotOwner],
        Handler: function(req) {
            const { _id } = req.params;
            // NOTE if using robotId => lowecase
            return RoboscapeCol.findById(_id);
        }
    },

    { // update robot record
        URL: '/:_id',
        Method: 'patch',
        middleware: ['isLoggedIn', 'setUser'],
        customMiddleware: [isRobotOwner],
        Handler: async function(req) {
            // prevent update to questionable fields
            const whiteList = ['isPublic', 'users'];
            const changedEntry = req.body;
            Object.keys(changedEntry).forEach(attr => {
                if (!whiteList.includes(attr)) throw new Error(`Cant change attribute ${attr}`);
            });

            await RoboscapeCol.updateOne({ _id: req.params._id }, { $set: changedEntry }, {upsert: false});
            return 'ok';
        }
    },

    { // change user access
        URL: '/:_id/users',
        Method: 'put',
        middleware: ['isLoggedIn', 'setUser'],
        customMiddleware: [isRobotOwner],
        Handler: async function(req) {
            // prevent update to questionable fields
            const schema = ['username', 'hasAccess'];
            const body = sanitizeBody(req.body, schema);
            return setUserAccess(req.params._id, body.username, body.hasAccess);
        }
    },
]
    .map(route => { // handle the actual sending of the results
        route.URL = ROBOTS_ENDPOINT + route.URL;
        let handler = route.Handler;
        route.Handler = async (req, res, next) => {

            if (route.customMiddleware) {
                for (let mw of route.customMiddleware) {
                    await mw(req, res, next);
                }
            }

            let rv = handler(req, res, next);
            if (!rv.then) {
                res.status(200).send(rv);
            } else {
                rv.then(val => {
                    if (typeof val === 'object') {
                        res.status(200).json(val);
                    } else {
                        res.status(200).send(val);
                    }
                }).catch(e => {
                    logger.error(e);
                    // WARN could potentially leak information
                    res.status(500).send(e.message);
                });
            }
        };
        return route;
    });

routes.push(
    { // Get RoboScape port
        URL: BASE_ENDPOINT + '/port',
        Method: 'get',
        middleware: [],
        Handler: async (_, res) => {
            res.status(200).send(process.env.ROBOSCAPE_PORT || 'RoboScape is not enabled.');
        }
    }
);

module.exports = routes;
