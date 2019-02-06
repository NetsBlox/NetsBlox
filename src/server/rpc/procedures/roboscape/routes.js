// User endpoints adapted from the Snap! server api. These are used by the server
// to create the endpoints and by the client to discover the endpoint urls
'use strict';

const logger = require('../utils/logger')('roboscape:routes');
const RoboscapeCol = require('./database'); // roboscape model

const BASE_ENDPOINT = 'roboscape/robots';

/** TODO
 * routes for:
 * 1. getting/proving ownership of n robots
 * 2. modify robots' users => modify a robot record
 * 3. fetch my robots details
 */

// TODO byId to by robotId

// TODO separate routes for granting and revoking access?


// requires user
const isRobotOwner = async function(req, res, next) {
    let username = req.session.user.username;
    logger.trace(`checking if ${username} is the robot owner`);
    let robotDoc = await RoboscapeCol.findOne({_id: req.params._id});
    if (robotDoc.owner !== username)
        throw new Error('unauthorized.');
    next();
};

const routes = [
    { // own, create the record if needed
        URL: '',
        Parameters: '',
        Method: 'post',
        middleware: ['isLoggedIn', 'setUser'],
        Handler: function(req, res) {
            // TODO make sure robotIds are unique (duplicate robots)
            const newEntry = req.body;
            return RoboscapeCol.create(newEntry);
        }
    },

    { // read my robots
        URL: '',
        Method: 'get',
        middleware: ['isLoggedIn', 'setUser'],
        Handler: function(req, res) {
            let query = res.locals.query || {};
            query = {
                ...query,
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
        Handler: function(req, res) {
            const { _id } = req.params;
            return RoboscapeCol.findById(_id);
        }
    },

    { // update robot record
        URL: '/:_id',
        Method: 'put', // FIXME patch?
        middleware: ['isLoggedIn', 'setUser'],
        customMiddleware: [isRobotOwner],
        Handler: function(req, res) {
            // prevent update to questionable fields
            const whiteList = ['isPublic', 'users'];
            const changedEntry = req.body;
            Object.keys(changedEntry).forEach(attr => {
                if (!whiteList.includes(attr)) throw new Error(`Cant change attribute ${attr}`);
            });

            // TODO duplicate users

            return RoboscapeCol.update({ _id: req.params._id }, { $set: changedEntry });
        }
    },

]
    .map(route => { // handle the actual sending of the results
        route.URL = BASE_ENDPOINT + route.URL;
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

module.exports = routes;
