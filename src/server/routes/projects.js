'use strict';

var _ = require('lodash'),
    Q = require('q'),
    Utils = _.extend(require('../utils'), require('../server-utils.js')),
    middleware = require('./middleware'),
    NetworkTopology = require('../network-topology'),
    EXAMPLES = require('../examples'),
    Logger = require('../logger'),
    logger = new Logger('netsblox:api:projects'),
    Jimp = require('jimp');

const ProjectsData = require('../storage/projects');
const Projects = require('../api/core/projects');
const Users = require('../storage/users');

////////////////////// Project Helpers //////////////////////
var padImage = function (buffer, ratio) {  // Pad the image to match the given aspect ratio
    return Jimp.read(buffer)
        .then(image => {
            var width = image.bitmap.width,
                height = image.bitmap.height,
                pad = Utils.computeAspectRatioPadding(width, height, ratio);
            // round paddings to behave like lwip
            let wDiff = parseInt((2*pad.left));
            let hDiff = parseInt((2*pad.top));
            image = image.contain(width + wDiff, height + hDiff);
            return Q.ninvoke(image, 'getBuffer', Jimp.AUTO);
        });
};

var applyAspectRatio = function (thumbnail, aspectRatio) {
    var image = thumbnail
        .replace(/^data:image\/png;base64,|^data:image\/jpeg;base64,|^data:image\/jpg;base64,|^data:image\/bmp;base64,/, '');
    var buffer = new Buffer(image, 'base64');

    if (aspectRatio) {
        logger.trace(`padding image with aspect ratio ${aspectRatio}`);
        aspectRatio = Math.max(aspectRatio, 0.2);
        aspectRatio = Math.min(aspectRatio, 5);
        return padImage(buffer, aspectRatio);
    } else {
        return Q(buffer);
    }
};

module.exports = [
    {
        Service: 'setProjectName',
        Parameters: 'projectId,name',
        Method: 'Post',
        Note: '',
        Handler: async function(req, res) {
            const {projectId} = req.body;
            let {name} = req.body;
            const state = await Projects.setProjectName(projectId, name);
            res.json(state);
        }
    },
    {
        Service: 'newProject',
        Parameters: 'clientId,roleName',
        Method: 'Post',
        Note: '',
        Handler: async function(req, res) {
            const {clientId} = req.body;
            const {roleName} = req.body;

            await Q.nfcall(middleware.tryLogIn, req, res);
            const userId = req.session.username || clientId;
            const state = await Projects.newProject(userId, roleName, clientId);
            res.send(state);
        }
    },
    {
        Service: 'importProject',
        Parameters: 'clientId,projectId,name,role,roles',
        Method: 'Post',
        Note: '',
        Handler: async function(req, res) {
            const {clientId, name, roles} = req.body;
            let {role} = req.body;
            const userId = req.session ? req.session.username : clientId;

            const state = await Projects.importProject(userId, roles, name, role, clientId);
            return res.json(state);
        }
    },
    {
        Service: 'saveProject',
        Parameters: 'roleId,roleName,projectName,projectId,ownerId,overwrite,srcXml,mediaXml',
        Method: 'Post',
        Note: '',
        middleware: ['isLoggedIn'],
        Handler: async function(req, res) {
            // TODO: Check permissions?
            const {username} = req.session;  // TODO: Check permissions
            const {roleId, ownerId, projectId, overwrite, roleName} = req.body;
            const {projectName, srcXml, mediaXml} = req.body;
            const roleData = {
                ProjectName: roleName,
                SourceCode: srcXml,
                Media: mediaXml
            };

            const project = await Projects.getProjectSafe(projectId);
            const saved = await Projects.saveProject(
                project,
                roleId,
                roleData,
                projectName,
                overwrite
            );
            return res.status(200).send({
                name: projectName,
                projectId: saved.getId(),
                roleId
            });
        }
    },
    {
        Service: 'saveProjectCopy',
        Parameters: 'clientId,projectId',
        Method: 'Post',
        Note: '',
        middleware: ['isLoggedIn'],
        Handler: async function(req, res) {
            // TODO: auth
            // Save the latest role content (include xml in the req)
            // TODO
            const {username} = req.session;
            const {projectId, clientId} = req.body;

            const project = await ProjectsData.getById(projectId);
            const result = await Projects.saveProjectCopy(username, project, clientId);
            return res.status(200).send(result);
        }
    },
    {
        Service: 'getSharedProjectList',
        Parameters: '',
        Method: 'Get',
        Note: '',
        middleware: ['isLoggedIn', 'noCache'],
        Handler: async function(req, res) {
            const origin = `${process.env.SERVER_PROTOCOL || req.protocol}://${req.get('host')}`;
            const {username} = req.session;
            logger.log(`${username} requested shared project list from ${origin}`);

            const previews = await Projects.getSharedProjectList(username, origin);
            if (req.query.format === 'json') {
                return res.json(previews);
            } else {
                return res.send(Utils.serializeArray(previews));
            }
        }
    },
    {
        Service: 'getProjectList',
        Method: 'Get',
        middleware: ['isLoggedIn', 'noCache'],
        Handler: async function(req, res) {
            const origin = `${process.env.SERVER_PROTOCOL || req.protocol}://${req.get('host')}`;
            const {username} = req.session;

            const previews = await Projects.getProjectList(username, origin);
            if (req.query.format === 'json') {
                return res.json(previews);
            } else {
                return res.send(Utils.serializeArray(previews));
            }
        }
    },
    {
        Service: 'hasConflictingStoredProject',
        Parameters: 'projectId,name',
        Method: 'post',
        Note: '',
        middleware: ['isLoggedIn', 'noCache'],
        Handler: async function(req, res) {
            const {projectId, name} = req.body;
            const {username} = req.session;
            const hasConflict = await Projects.hasConflictingStoredProject(username, name, projectId);
            return res.send(`hasConflicting=${hasConflict}`);
        }
    },
    {
        Service: 'isProjectActive',
        Parameters: 'clientId,projectId',
        Method: 'post',
        Note: '',
        middleware: ['isLoggedIn', 'noCache'],
        Handler: function(req, res) {
            const {clientId, projectId} = req.body;
            const active = NetworkTopology.isProjectActive(projectId, clientId);

            return res.json({active});
        }
    },
    {
        Service: 'joinActiveProject',
        Parameters: 'projectId',
        Method: 'post',
        Note: '',
        middleware: ['isLoggedIn', 'noCache'],
        Handler: async function(req, res) {
            const {projectId} = req.body;
            const {username} = req.session;

            logger.log(`${username} joining project ${projectId}`);
            const {role, project} = await Projects.getRoleToJoin(projectId);
            const serialized = Utils.serializeRole(role, project);
            return res.send(serialized);

        }
    },
    {
        Service: 'getProjectByName',
        Parameters: 'owner,projectName',
        Method: 'post',
        Note: '',
        middleware: ['isLoggedIn', 'noCache'],
        Handler: async function(req, res) {
            const {owner, projectName} = req.body;
            const {username} = req.session;

            // Check permissions
            // TODO
            
            logger.trace(`${username} opening project ${owner}/${projectName}`);
            const {project, role} = await Projects.getProjectByName(owner, projectName, username);
            const serialized = Utils.serializeRole(role, project);
            return res.send(serialized);
        }
    },
    {
        Service: 'getEntireProject',
        Parameters: 'projectId',
        Method: 'post',
        Note: '',
        middleware: ['isLoggedIn', 'noCache'],
        Handler: async function(req, res) {
            const {projectId} = req.body;
            const {username} = req.session;

            // TODO: add auth!

            // Get the projectName
            logger.trace(`${username} opening project ${projectId}`);
            const project = await Projects.getProjectSafe(projectId);
            const xml = await project.toXML();
            res.set('Content-Type', 'text/xml');
            return res.send(xml);
        }
    },
    {
        Service: 'getProject',
        Parameters: 'projectId,roleId',
        Method: 'post',
        Note: '',
        middleware: ['isLoggedIn', 'noCache'],
        Handler: async function(req, res) {
            const {projectId} = req.body;
            let {roleId} = req.body;
            const {username} = req.session;

            // Get the projectName
            logger.trace(`${username} opening project ${projectId}`);
            // TODO: Add auth
            const {project, role} = await Projects.getProject(projectId, roleId);
            const serialized = Utils.serializeRole(role, project);
            return res.send(serialized);
        }
    },
    {
        Service: 'deleteProject',
        Parameters: 'ProjectName',
        Method: 'Post',
        Note: '',
        middleware: ['isLoggedIn'],
        Handler: async function(req, res) {
            const {username} = req.session;
            const name = req.body.ProjectName;
            const project = await Projects.getProjectSafe(username, name);
            await Projects.deleteProject(project);
            return res.send('project deleted!');
        }
    },
    {
        Service: 'publishProject',
        Parameters: 'ProjectName',
        Method: 'Post',
        Note: '',
        middleware: ['isLoggedIn'],
        Handler: async function(req, res) {
            const name = req.body.ProjectName;
            const {username} = req.session;

            await Projects.publishProject(username, name);
            res.send(`"${name}" is shared!`);
        }
    },
    {
        Service: 'unpublishProject',
        Parameters: 'ProjectName',
        Method: 'Post',
        Note: '',
        middleware: ['isLoggedIn'],
        Handler: async function(req, res) {
            const name = req.body.ProjectName;
            const {username} = req.session;

            await Projects.unpublishProject(username, name);
            res.send(`"${name}" is no longer shared!`);
        }
    },

    // Methods for forum client
    {
        Method: 'get',
        URL: 'projects/:owner',
        middleware: ['setUsername'],
        Handler: function(req, res) {
            // If requesting for another user, only return the public projects
            const publicOnly = req.params.owner !== req.session.username;
            const username = req.params.owner;

            // return the names of all projects owned by :owner
            logger.log(`getting project names for ${username}`);
            return Users.get(username)
                .then(user => {
                    if (!user) {
                        return res.status(400).send('Invalid username');
                    }

                    return user.getProjectMetadatas()
                        .then(projects => {
                            const names = projects
                                .filter(project => !publicOnly || !!project.Public)
                                .map(project => project.name);

                            return res.json(names);
                        });
                });

        }
    },
    {
        Method: 'get',
        URL: 'projects/:owner/:project/thumbnail',
        middleware: ['setUsername'],
        Handler: async function(req, res) {
            const name = req.params.project;
            const aspectRatio = +req.query.aspectRatio || 0;

            const project = await Projects.getProjectSafe(req.params.owner, name);
            const thumbnail = Projects.getProjectInfo(project).Thumbnail;
            if (!thumbnail) {
                const err = `could not find thumbnail for ${name}`;
                this._logger.error(err);
                return res.status(400).send(err);
            }
            res.set({
                'Cache-Control': 'private, max-age=60',
            });
            this._logger.trace(`Applying aspect ratio for ${req.params.owner}'s ${name}`);
            const buffer = await applyAspectRatio(thumbnail, aspectRatio);
            this._logger.trace(`Sending thumbnail for ${req.params.owner}'s ${name}`);
            res.contentType('image/png');
            res.end(buffer, 'binary');
        }
    },
    {
        Method: 'get',
        URL: 'examples/:name/thumbnail',
        Handler: async function(req, res) {
            const {name} = req.params;
            const aspectRatio = +req.query.aspectRatio || 0;
            const example = EXAMPLES[name];

            if (!example) {
                this._logger.warn(`ERROR: Could not find example "${name}`);
                return res.status(404).send('ERROR: Could not find example.');
            }

            res.set({
                'Cache-Control': 'public, max-age=3600',
            });

            const names = await example.getRoleNames();
            const content = await example.getRole(names.shift());
            const thumbnail = Utils.xml.thumbnail(content.SourceCode);
            const buffer = await applyAspectRatio(thumbnail, aspectRatio);
            res.contentType('image/png');
            res.end(buffer, 'binary');
        }
    },
    {
        Method: 'get',
        URL: 'RawPublic',
        Handler: async function(req, res) {
            var username = req.query.Username,
                projectName = req.query.ProjectName;

            this._logger.trace(`Retrieving the public project: ${projectName} from ${username}`);
            const project = await Projects.getPublicProject(username, projectName);
            const xml = await project.toXML();
            res.send(xml);
        }
    }

].map(function(api) {
    // Set the URL to be the service name
    api.URL = api.URL || api.Service;
    return api;
});
