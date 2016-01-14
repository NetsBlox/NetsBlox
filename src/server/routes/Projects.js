'use strict';

var LIST_FIELDS = ['Notes', 'ProjectName', 'Public', 'Thumbnail', 'URL', 'Updated', 'TableUuid'],
    R = require('ramda'),
    parseXml = require('xml2js').parseString,
    _ = require('lodash'),
    Utils = _.extend(require('../Utils'), require('../ServerUtils.js')),

    debug = require('debug'),
    log = debug('NetsBlox:API:Projects:log'),
    warn = debug('NetsBlox:API:Projects:warn'),
    info = debug('NetsBlox:API:Projects:info');

var getProjectIndexFrom = function(name, user) {
    for (var i = user.projects.length; i--;) {
        if (user.projects[i].ProjectName === name) {
            return i;
        }
    }
    return -1;
};

/**
 * Find and set the given project's public value.
 *
 * @param {String} name
 * @param {User} user
 * @param {Boolean} value
 * @return {Boolean} success
 */
var setProjectPublic = function(name, user, value) {
    var index = getProjectIndexFrom(name, user);
    if (index === -1) {
        return false;
    }
    user.projects[index].Public = value;
    // TODO: Do something meaningful to either make it publicly accessible or private
    return true;
};

module.exports = [
    {
        Service: 'saveProject',
        Parameters: 'socketId',
        Method: 'Post',
        Note: '',
        Handler: function(req, res) {
            var username = req.session.username,
                socketId = req.body.socketId;

            info('Initiating table save for ' + username);
            this.storage.users.get(username, (e, user) => {
                var table,
                    activeTable;

                if (e) {
                    return res.serverError(e);
                }

                if (!user) {
                    return res.status(400).send('ERROR: user not found');
                }

                // Look up the user's table
                activeTable = this.sockets[socketId]._table;
                if (!activeTable) {
                    return res.status(500).send('ERROR: active table not found');
                }

                // Save the table
                table = this.storage.tables.new(user, activeTable);
                table.save(function(err) {
                    if (err) {
                        return res.status(500).send('ERROR: ' + err);
                    }
                    return res.send('table saved!');
                });
            });
        }
    },
    {
        Service: 'getProjectList',
        Parameters: '',
        Method: 'Get',
        Note: '',
        Handler: function(req, res) {
            var username = req.session.username;
            log(username +' requested project list');
            this.storage.users.get(username, function(e, user) {
                var projects,
                    tables = user.tables || [];
                if (e) {
                    return res.serverError(e);
                }
                if (user) {
                    // If it is the ghost user, provide a list of all project/tables
                    // TODO

                    // Get the projects
                    projects = tables.map(table => {
                            var seats;

                            seats = Object.keys(table.seatOwners)
                                .map(seat => table.seats[seat]);

                            return seats;
                        })
                        .reduce((l1, l2) => l1.concat(l2), []);  // flatten

                    // Update this to parse the projects from the table list
                    projects = R.map(R.partial(R.pick, LIST_FIELDS), projects);
                    info('Projects for '+username +' are '+JSON.stringify(
                        R.map(R.partialRight(Utils.getAttribute, 'ProjectName'),
                            projects)
                        )
                    );
                    return res.send(Utils.serializeArray(projects));
                }
                return res.status(404);
            });
        }
    },
    {
        Service: 'getProject',
        Parameters: 'ProjectName,TableUuid',
        Method: 'Post',
        Note: '',
        Handler: function(req, res) {
            var username = req.session.username;
            log(username + ' requested project ' + req.body.ProjectName);
            this.storage.users.get(username, function(e, user) {
                if (e) {
                    return res.serverError(e);
                }

                // For now, just return the project
                var table = user.tables.find(table => table.uuid === req.body.TableUuid),
                    project;

                project = Object.keys(table.seatOwners)
                    .filter(seat => table.seatOwners[seat] === username)
                    .map(seat => table.seats[seat])
                    .find(project => project.ProjectName === req.body.ProjectName);

                if (!project) {
                    return res.send('ERROR: project not found!');
                }
                // Send the project to the user
                project = Utils.serialize(R.omit(['SourceCode', 'Media'], project)) + 
                // Add the SourceCode portion
                    '&SourceCode=<snapdata>+' + encodeURIComponent(project.SourceCode +
                    project.Media)+'</snapdata>';
                return res.send(project);
            });
        }
    },
    {
        Service: 'deleteProject',
        Parameters: 'ProjectName,TableUuid',
        Method: 'Post',
        Note: '',
        Handler: function(req, res) {
            var username = req.session.username;
            log(username +' requested project '+req.body.ProjectName);
            this.storage.users.get(username, (e, user) => {
                var tableUuid = req.body.TableUuid,
                    table = user.tables.find(table => table.uuid === tableUuid),
                    projectName = req.body.ProjectName,
                    remainingSeats,
                    seatId;

                if (!table) {
                    return res.status(404).send('ERROR: table not found');
                }

                // Get the seatId
                seatId = Object.keys(table.seats)
                    .map(seat => [seat, table.seats[seat].ProjectName])
                    .find(pair => pair[1] === projectName)[0];

                // I am using the project name and seat name as the same... should they be?
                if (!seatId || !table.seats[seatId]) {
                    return res.status(404).send('ERROR: project not found');
                }
                // Does the user own the given seat?
                if (table.seatOwners[seatId] !== username) {
                    return res.status(403)
                        .send(`ERROR: you don\'t have permission to delete ${projectName}`);
                }
                this.storage.tables.get(table.uuid, (err, globalTable) => {
                    if (err || !globalTable) {
                        err = err || 'Global table does not exist!';
                        this._logger.error('Could not find global table:', err);
                        return res.status(500).send('ERROR:', err);
                    }
                    this._logger.trace('Removing ownership of the seat');

                    // Remove ownership of the seat
                    table.seatOwners[seatId] = null;

                    if (globalTable.seatOwners[seatId] === username) {
                        globalTable.seatOwners[seatId] = null;
                        globalTable.save(e => e && 
                            this._logger.error(`could not save global table "${globalTable.uuid}": ${e}`));
                    } else {
                        this._logger.warn('global and local tables\' seat ownership out of sync!');
                    }

                    remainingSeats = Object.keys(table.seats)
                        .map(seat => [seat, table.seatOwners[seat]])
                        .filter(pair => pair[1] === username)
                        .map(pair => pair[0]);  // Get the seat names

                    // if no more projects for this user, remove the table
                    if (remainingSeats.length === 0) {
                        this._logger.trace(`Removing table for ${user.username}`);
                        var index = user.tables.indexOf(table);
                        user.tables.splice(index, 1);
                    }
                    user.save();
                    this._logger.trace(`project ${projectName} deleted for ${username}`);
                    res.send('project deleted!');
                });
            });
        }
    },
    {
        Service: 'publishProject',
        Parameters: 'ProjectName',
        Method: 'Post',
        Note: '',
        Handler: function(req, res) {
            var username = req.session.username,
                name = req.body.ProjectName;

            log(username +' is publishing project '+name);
            this.storage.users.get(username, function(e, user) {
                if (e) {
                    res.serverError(e);
                }
                var success = setProjectPublic(name, user, true);
                user.save();
                if (success) {
                    return res.send('"'+name+'" is now shared!');
                }
                return res.send('ERROR: could not find the project');
            });
        }
    },
    {
        Service: 'unpublishProject',
        Parameters: 'ProjectName',
        Method: 'Post',
        Note: '',
        Handler: function(req, res) {
            var username = req.session.username,
                name = req.body.ProjectName;

            log(username +' is unpublishing project '+name);
            this.storage.users.get(username, function(e, user) {
                if (e) {
                    return res.serverError(e);
                }
                var success = setProjectPublic(name, user, false);
                user.save();
                if (success) {
                    return res.send('"'+name+'" is no longer shared');
                }
                return res.send('ERROR: could not find the project');
            });
        }
    }
].map(function(api) {
    // Set the URL to be the service name
    api.URL = api.Service;
    return api;
});
