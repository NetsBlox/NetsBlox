'use strict';

var LIST_FIELDS = [
        'Notes',
        'ProjectName',
        'Public',
        'Thumbnail',
        'URL',
        'Updated',
        'TableLeader',
        'TableName'
    ],
    R = require('ramda'),
    parseXml = require('xml2js').parseString,
    _ = require('lodash'),
    Utils = _.extend(require('../Utils'), require('../ServerUtils.js')),

    debug = require('debug'),
    log = debug('NetsBlox:API:Projects:log'),
    warn = debug('NetsBlox:API:Projects:warn'),
    info = debug('NetsBlox:API:Projects:info'),
    error = debug('NetsBlox:API:Projects:error'),
    PREVIEW_FIELDS = [
        'ProjectName',
        'Notes',
        'Thumbnail',
        'Public',
        'Updated'
    ];

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
                    socket = this.sockets[socketId],
                    activeTable;

                if (e) {
                    return res.serverError(e);
                }

                if (!user) {
                    return res.status(400).send('ERROR: user not found');
                }

                // Look up the user's table
                activeTable = socket._table;
                if (!activeTable) {
                    return res.status(500).send('ERROR: active table not found');
                }

                // Save the entire table
                if (socket.isOwner()) {
                    log(`saving entire table for ${socket.username}`);
                    table = this.storage.tables.new(user, activeTable);
                    table.save(function(err) {
                        if (err) {
                            return res.status(500).send('ERROR: ' + err);
                        }
                        return res.send('table saved!');
                    });
                } else {  // just update the project cache for the given user
                    log(`caching ${socket._seatId} for ${socket.username}`);
                    activeTable.cache(socket._seatId, err => {
                        if (err) {
                            return res.status(500).send('ERROR: ' + err);
                        }
                        return res.send('code saved!');
                    });
                }
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
            this.storage.users.get(username, (e, user) => {
                var previews,
                    tables = user.tables || [];

                if (e) {
                    return res.serverError(e);
                }
                if (user) {
                    // Return the following for each table:
                    //
                    //  + ProjectName
                    //  + Updated
                    //  + Notes
                    //  + Thumbnail
                    //  + Public?
                    //
                    // These values are retrieved from whatever seat has notes
                    // or chosen arbitrarily (for now)

                    // Update this to parse the projects from the table list
                    previews = tables.map(table => {
                        var preview,
                            seats = Object.keys(table.seats),
                            seat;

                        preview = {
                            ProjectName: table.name,
                            Public: !!table.public
                        };

                        for (var i = seats.length; i--;) {
                            seat = table.seats[seats[i]];
                            if (seat) {
                                // Get the most recent time
                                preview.Updated = Math.max(
                                    preview.Updated || 0,
                                    new Date(seat.Updated).getTime()
                                );

                                // Notes
                                preview.Notes = preview.Notes || seat.Notes;
                                preview.Thumbnail = preview.Thumbnail ||
                                    seat.Thumbnail;
                            }
                        }
                        preview.Updated = new Date(preview.Updated);  // to string
                        return preview;
                    });

                    info('Projects for '+username +' are '+JSON.stringify(
                        R.map(R.partialRight(Utils.getAttribute, 'ProjectName'),
                            previews)
                        )
                    );
                        
                    info(`Tables are ${previews.map(project => project.TableUuid)}`);
                    return res.send(Utils.serializeArray(previews));
                }
                return res.status(404);
            });
        }
    },
    {
        Service: 'getProject',
        Parameters: 'ProjectName',
        Method: 'Post',
        Note: '',
        Handler: function(req, res) {
            var username = req.session.username,
                tableName = req.body.ProjectName;

            log(username + ' requested project ' + req.body.ProjectName);
            this.storage.users.get(username, (e, user) => {
                if (e) {
                    return res.serverError(e);
                }
                this._logger.trace(`looking up table "${tableName}"`);

                // For now, just return the project
                var table = user.tables.find(table => table.name === tableName),
                    project,
                    activeTable,
                    seat;

                if (!table) {
                    this._logger.error(`could not find table ${tableName}`);
                    return res.status(404).send('ERROR: could not find table');
                }

                activeTable = this.tables[Utils.uuid(table.owner, table.name)];
                if (activeTable) {
                    let openSeat = Object.keys(activeTable.seats)
                        .filter(seat => !activeTable.seats[seat])  // not occupied
                        .shift();

                    if (openSeat) {  // Send an open seat and add the user
                        info(`adding ${username} to open seat "${openSeat}" at ` +
                            `"${tableName}"`);

                        seat = activeTable.cachedProjects[openSeat];
                    } else {  // If no seats are open, make a new seat
                        let i = 2,
                            base;
                        openSeat = base = 'new seat';
                        while (activeTable.hasOwnProperty(openSeat)) {
                            openSeat = `${base} (${i++})`;
                        }

                        info(`adding ${username} to new seat "${openSeat}" at ` +
                            `"${tableName}"`);

                        activeTable.createSeat(openSeat);
                        seat = {
                            ProjectName: openSeat,
                            SourceCode: null,
                            SourceSize: 0
                        };
                        activeTable.cachedProjects[openSeat] = seat;
                    }
                } else {
                    // If table is not active, pick a seat arbitrarily
                    seat = Object.keys(table.seats)
                        .map(seat => table.seats[seat])[0];  // values

                    if (!seat) {
                        this._logger.warn('Found table with no seats!');
                        return res.status(500).send('ERROR: project has no seats');
                    }
                }

                // Send the project to the user
                project = Utils.serializeProject(seat);
                return res.send(project);
            });
        }
    },
    {
        Service: 'deleteProject',
        Parameters: 'ProjectName,TableName',
        Method: 'Post',
        Note: '',
        Handler: function(req, res) {
            var username = req.session.username,
                project = req.body.ProjectName;

            log(username +' trying to delete "' + project + '"');
            this.storage.users.get(username, (e, user) => {
                var table;

                for (var i = user.tables.length; i--;) {
                    table = user.tables[i];
                    if (table.name === project) {
                        user.tables.splice(i, 1);
                        this._logger.trace(`project ${project} deleted`);
                        user.save();
                        return res.send('project deleted!');
                    }

                }
                error(`project ${project} not found`);
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
