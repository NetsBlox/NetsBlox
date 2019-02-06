// User endpoints adapted from the Snap! server api. These are used by the server
// to create the endpoints and by the client to discover the endpoint urls
'use strict';

const logger = require('../utils/logger')('roboscape:routes');
const RoboscapeCol = require('./database'); // roboscape model

const genCrudRoutes = (model, baseEndpoint) => {
    const routes = [
        { // create
            URL: '',
            Parameters: '',
            Method: 'post',
            note: 'create',
            // middleware: ['isLoggedIn'],
            Handler: function(req, res) {
                const newEntry = req.body;
                return model.create(newEntry);
            }
        },

        { // read many
            URL: '',
            Method: 'get',
            // middleware: ['isLoggedIn'],
            Handler: function(req, res) {
                let query = res.locals.query || {};
                logger.log('getting all robots', query);
                return model.find(query);
            }
        },

        { // read one
            URL: '/:_id',
            Method: 'get',
            Handler: function(req, res) {
                const { _id } = req.params;
                return model.findById(_id);
            }
        },

        { // update
            URL: '/:_id',
            Method: 'put', // FIXME patch?
            Handler: function(req, res) {
                const changedEntry = req.body;
                return model.update({ _id: req.params._id }, { $set: changedEntry });
            }
        },

        { // read one
            URL: '/:_id',
            Method: 'delete',
            Handler: function(req, res) {
                return model.remove({ _id: req.params._id });
            }
        }

    ]
        .map(r => {
            r.URL = baseEndpoint + r.URL;
            return r;
        });
    return routes;
};

const roboRoutes = genCrudRoutes(RoboscapeCol, 'roboscape/robots');

module.exports = roboRoutes;
