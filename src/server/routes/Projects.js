'use strict';

var PROJECT_FIELDS = ['ProjectName', 'SourceCode', 'Media', 'SourceSize', 'MediaSize'],
    LIST_FIELDS = ['Notes', 'ProjectName', 'Public', 'Thumbnail', 'URL', 'Updated'],
    R = require('ramda'),
    parseXml = require('xml2js').parseString,
    _ = require('lodash'),
    Utils = _.extend(require('../Utils'), require('../ServerUtils.js')),

    debug = require('debug'),
    log = debug('NetsBlox:API:Projects:log'),
    info = debug('NetsBlox:API:Projects:info');

var createProject = function(info) {
    var project = R.pick(PROJECT_FIELDS, info);
    // Set defaults
    project.Public = false;
    project.Updated = new Date();

    // Add the thumbnail,notes from the project content
    var inProjectSource = ['Thumbnail', 'Notes'];
    inProjectSource.forEach(function(field) {
        project[field] = parseXml(project.SourceCode)[field.toLowerCase()];
    });

    return project;
};

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
        Parameters: PROJECT_FIELDS.join(','),
        Method: 'Post',
        Note: '',
        Handler: function(req, res) {
            var username = req.session.username;
            info('Saving project "'+req.body.ProjectName+'" for '+username);
            this._users.findOne({username: username}, function(e, user) {
                if (e) {
                    return res.serverError(e);
                }

                if (!user) {
                    return res.status(400).send('ERROR: user not found');
                }

                // Add the project to the user's projects
                var index = getProjectIndexFrom(req.body.ProjectName, user),
                    project = createProject(req.body);

                // Overwrite existing project, if appropriate
                if (index !== -1) {
                    info('Overwriting existing project ('+req.body.ProjectName+')');
                    user.projects[index] = project;
                } else {
                    info('Creating new project ('+req.body.ProjectName+')');
                    user.projects.push(project);
                }

                // Save the new project list
                this._users.update({username: username}, 
                    {$set: {projects: user.projects}}, function(e, data) {
                    var result = data.result;

                    if (e || result.nModified === 0) {
                        return res.status(500).send('ERROR: could not save project');
                    }
                    log('Saved project "'+req.body.ProjectName+'" for '+username);
                    return res.send('Project saved!');
                });
            }.bind(this));
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
            this._users.findOne({username: username}, function(e, user) {
                if (e) {
                    return res.serverError(e);
                }
                if (user) {
                    // Get the projects
                    user.projects = user.projects || [];
                    var projects = R.map(R.partial(R.pick,LIST_FIELDS), user.projects);
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
        Parameters: 'ProjectName',
        Method: 'Post',
        Note: '',
        Handler: function(req, res) {
            var username = req.session.username;
            log(username +' requested project '+req.body.ProjectName);
            this._users.findOne({username: username}, function(e, user) {
                if (e) {
                    return res.serverError(e);
                }
                // Look up the project
                var projectIndex = getProjectIndexFrom(req.body.ProjectName, user);
                info('Found the project at index '+projectIndex);

                if (projectIndex === -1) {
                    return res.send('ERROR: project not found!');
                }
                // Send the project to the user
                var project = Utils.serialize(
                    R.omit(['SourceCode'], user.projects[projectIndex])
                // Add the SourceCode portion
                )+'&SourceCode='+encodeURIComponent(user.projects[projectIndex].SourceCode);
                return res.send(project);
            });
        }
    },
    {
        Service: 'deleteProject',
        Parameters: 'ProjectName',
        Method: 'Post',
        Note: '',
        Handler: function(req, res) {
            var username = req.session.username;
            log(username +' requested project '+req.body.ProjectName);
            this._users.findOne({username: username}, function(e, user) {
                var index = getProjectIndexFrom(req.body.ProjectName, user);
                if (index === -1) {
                    return res.send('ERROR: project not found');
                }
                user.projects.splice(index,1);
                this._users.update({username: username}, 
                    {$set: {projects: user.projects}}, function(e, data) {

                    if (e || data.result.nModified === 0) {
                        return res.status(500).send('ERROR: could not remove project');
                    }
                    log('Deleted project "'+req.body.ProjectName+'" for '+username);
                    return res.send('project removed!');
                });
            }.bind(this));
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
            this._users.findOne({username: username}, function(e, user) {
                if (e) {
                    res.serverError(e);
                }
                var success = setProjectPublic(name, user, true);
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
            this._users.findOne({username: username}, function(e, user) {
                if (e) {
                    return res.serverError(e);
                }
                var success = setProjectPublic(name, user, false);
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
