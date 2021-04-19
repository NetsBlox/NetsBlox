'use strict';

const _ = require('lodash');
var Utils = _.extend(require('../utils'), require('../server-utils.js')),

    Logger = require('../logger'),
    logger = new Logger('netsblox:api:rooms'),
    utils = require('../server-utils'),
    NetworkTopology = require('../network-topology'),
    Groups = require('../storage/groups'),
    Projects = require('../storage/projects'),
    invites = {};

module.exports = [
    // Friends
    {
        Service: 'getFriendList',
        Parameters: '',
        Method: 'Get',
        Note: '',
        middleware: ['isLoggedIn', 'setUser'],
        Handler: function(req, res) {
            return getFriendSockets(req.session.user)
                .then(sockets => {
                    const usernames = _.uniq(sockets.map(socket => socket.username));
                    return res.send(usernames);
                });
        }
    },
    {
        Service: 'getCollaborators',
        Parameters: 'projectId',
        Method: 'post',
        middleware: ['isLoggedIn', 'setUser'],
        Handler: function(req, res) {
            const {projectId} = req.body;
            let collaborators = null;

            return Projects.getProjectMetadataById(projectId)
                .then(metadata => {
                    collaborators = metadata.collaborators;
                    return getFriendSockets(req.session.user);
                })
                .then(friends => {
                    const usernames = _.uniq(friends.map(client => client.username));

                    return usernames.map(username => {
                        return {
                            username,
                            collaborating: collaborators.includes(username)
                        };
                    });
                })
                .then(users => res.send(users));
        }
    },
    {
        Service: 'evictCollaborator',
        Parameters: 'userId,projectId',
        Method: 'post',
        middleware: ['isLoggedIn'],
        Handler: async function(req, res) {
            const {userId, projectId} = req.body;

            // Add better auth!
            // TODO
            const project = await Projects.getById(projectId);
            logger.log(`removing collaborator ${userId} from project ${project.uuid()}`);
            await project.removeCollaborator(userId);

            await NetworkTopology.onRoomUpdate(projectId);

            res.sendStatus(200);
        }
    },
    {
        Service: 'evictUser',
        Parameters: 'evictedClientId,projectId',
        Method: 'post',
        Note: '',
        Handler: function(req, res) {
            const {evictedClientId, projectId} = req.body;
            const client = NetworkTopology.getClient(evictedClientId);

            logger.log(`evicting ${evictedClientId} from ${projectId}`);
            if (!client) {  // user is not online
                const err = `${evictedClientId} is not connected.`;
                this._logger.warn(err);
                return res.send('could not find user to evict.');
            }

            // Get the client at the given room role
            if (client.projectId !== projectId) {
                const err = `${evictedClientId} is not at ${projectId}.`;
                this._logger.warn(err);
                return res.send('user has been evicted!');
            }

            // Remove the user from the room!
            logger.log(`evicted ${evictedClientId} from ${projectId}`);
            client.evict();
            return NetworkTopology.onRoomUpdate(projectId)
                .then(state => res.json(state));
        }
    },
    {
        Service: 'inviteGuest',
        Parameters: 'socketId,invitee,roleId,projectId',
        middleware: ['hasSocket', 'isLoggedIn'],
        Method: 'post',
        Note: '',
        Handler: function(req, res) {
            // Require:
            //  inviter
            //  invitee
            //  roomId
            //  role
            const {projectId, roleId, invitee} = req.body;
            const inviter = req.session.username;
            const inviteId = [
                'invite-guest',
                inviter,
                invitee,
                roleId,
                projectId
            ].join('-');

            logger.log(`${inviter} is inviting ${invitee} to ${roleId} at ${projectId}`);

            // Record the invitation
            const timer = setTimeout(
                () => {
                    const invite = invites[inviteId];
                    if (invite && invite.timer === timer) {
                        delete invites[inviteId];
                    }
                },
                60000
            );
            invites[inviteId] = {
                projectId,
                roleId,
                invitee,
                timer,
            };

            // If the user is online, send the invitation via ws to the browser
            return Projects.getProjectMetadataById(projectId)
                .then(metadata => {
                    if (!metadata) {
                        logger.log('guest invitation failed: project not found');
                        return res.status(400).send('Project not found');
                    }

                    if (!metadata.roles[roleId]) {
                        logger.log('guest invitation failed: role not found');
                        return res.status(400).send('Role not found');
                    }

                    const roleName = metadata.roles[roleId].ProjectName;
                    const projectName = metadata.name;

                    const inviteeClients = NetworkTopology.getClientsWithUsername(invitee);
                    inviteeClients
                        .filter(client => client.uuid !== req.body.socketId)
                        .forEach(client => {
                            var msg = {
                                type: 'room-invitation',
                                id: inviteId,
                                roomName: projectName,
                                inviter,
                                role: roleName
                            };
                            client.send(msg);
                        });

                    return res.send('ok');
                });
        }
    },
    {
        Service: 'invitationResponse',
        Parameters: 'inviteId,response,socketId',
        middleware: ['hasSocket', 'isLoggedIn'],
        Method: 'post',
        Note: '',
        Handler: function(req, res) {
            // Require:
            //  inviter
            //  invitee
            //  roomId
            //  role
            var username = req.session.username,
                id = req.body.inviteId,
                response = req.body.response === 'true',
                // TODO: store these in the database
                socketId = req.body.socketId,
                closeInvite = {
                    type: 'close-invite',
                    id: id
                };

            const invite = invites[id];
            delete invites[id];

            if (!invite) {
                if (response) {
                    return res.status(400).send('ERROR: invite no longer exists');
                }
                return res.sendStatus(200);
            }

            const {projectId, roleId, invitee} = invite;

            // Notify other clients of response
            NetworkTopology.getClientsWithUsername(invitee)
                .filter(client => client.uuid !== socketId)
                .forEach(client => client.send(closeInvite));

            // Ignore if the invite no longer exists

            if (invite) {
                logger.log(`${username} ${response ? 'accepted' : 'denied'} ` +
                    `invitation (${id}) for ${invite.role} at ${invite.room}`);
            }

            if (response) {
                return Projects.getById(projectId)
                    .then(project => {
                        if (!project) {
                            logger.warn(`room no longer exists "${invite.room} ${JSON.stringify(invites)}`);
                            throw new Error('project is no longer open');
                        }

                        // FIXME: setClientState should be triggered by the client in case
                        // the xml loading fails (could be bigger problems if collaborating).
                        return NetworkTopology.setClientState(socketId, projectId, roleId, username)
                            .then(() => project.getRoleById(invite.roleId))
                            .then(role => utils.serializeRole(role, project));
                    })
                    .then(xml => res.status(200).send(xml))
                    .catch(err => res.status(500).send(`ERROR: ${err}`));
            } else {
                res.sendStatus(200);
            }
        }
    },
    {
        Service: 'deleteRole',
        Parameters: 'roleId,projectId',
        Method: 'post',
        Note: '',
        middleware: ['isLoggedIn'],
        Handler: function(req, res) {
            const {roleId, projectId} = req.body;

            const clients = NetworkTopology.getClientsAt(projectId, roleId);
            if (clients.length) {
                return res.status(403).send('ERROR: Cannot delete occupied role. Remove the occupants first.');
            }

            // Add better auth
            // TODO
            return Projects.getById(projectId)
                .then(project => project.removeRoleById(roleId))
                .then(() => NetworkTopology.onRoomUpdate(projectId))
                .then(state => res.json(state));
        }
    },
    {  // Create a new role
        Service: 'renameRole',
        Parameters: 'roleId,name,projectId',
        middleware: ['isLoggedIn'],
        Method: 'post',
        Note: '',
        Handler: function(req, res) {
            const {roleId, name, projectId} = req.body;
            // Add better auth!
            // TODO

            return Projects.getById(projectId)
                .then(project => project.setRoleName(roleId, name))
                .then(() => NetworkTopology.onRoomUpdate(projectId))
                .then(state => res.json(state));
        }
    },
    {  // Create a new role
        Service: 'addRole',
        Parameters: 'name,socketId,projectId',
        middleware: ['isLoggedIn'],
        Method: 'post',
        Note: '',
        Handler: function(req, res) {
            const {name, projectId} = req.body;

            // TODO: Add better auth based on the username

            return Projects.getById(projectId)
                .then(project => {
                    // TODO: What if project is not found?
                    // This should be moved to a single location...
                    // Maybe add a findById which may return null...
                    return project.setRole(name, utils.getEmptyRole(name));
                })
                .then(() => NetworkTopology.onRoomUpdate(projectId))
                .then(state => res.json(state))
                .catch(err => {
                    this._logger.error(`Add role failed: ${err}`);
                    res.send(`ERROR: ${err.message}`);
                });
        }
    },
    {  // Create a new role and copy this project's blocks to it
        Service: 'cloneRole',
        Parameters: 'roleId,projectId',
        middleware: ['isLoggedIn'],
        Method: 'post',
        Note: '',
        Handler: async function(req, res) {
            // Better auth!
            // TODO

            const {roleId, projectId} = req.body;
            const project = await Projects.getById(projectId);
            const [client] = NetworkTopology.getClientsAt(projectId, roleId);
            const role = project.roles[roleId];
            if (!role) {
                res.status(500).send(`no role with ID ${roleId}`);
                this._logger.error(`user requested cloning a role with bad ID: ${roleId}`);
                return;
            }
            const roleName = role.ProjectName;

            if (client) {  // Try to request the latest
                try {
                    const content = await client.getProjectJson(2000);
                    const name = await project.getNewRoleName(roleName);
                    content.ProjectName = name;

                    await project.setRole(name, content);
                } catch (err) {
                    await project.cloneRole(roleName);
                }
            } else {
                await project.cloneRole(roleName);
            }

            const state = await NetworkTopology.onRoomUpdate(projectId);
            res.json(state);
        }
    },
    {  // Collaboration
        Service: 'inviteToCollaborate',
        Parameters: 'socketId,invitee,ownerId,roomName,projectId',
        middleware: ['hasSocket', 'isLoggedIn'],
        Method: 'post',
        Note: '',
        Handler: function(req, res) {
            const {invitee, projectId, role, roomName} = req.body;
            var inviter = req.session.username,
                inviteId = ['collab', inviter, invitee, projectId, Date.now()].join('-'),
                inviteeClients = NetworkTopology.getClientsWithUsername(invitee);

            logger.log(`${inviter} is inviting ${invitee} to ${projectId}`);

            // Record the invitation
            invites[inviteId] = {
                owner: req.body.ownerId,
                projectId: projectId,
                invitee
            };

            // If the user is online, send the invitation via ws to the browser
            inviteeClients
                .filter(client => client.uuid !== req.body.socketId)
                .forEach(client => {
                    // Send the invite to the sockets
                    var msg = {
                        type: 'collab-invitation',
                        id: inviteId,
                        roomName: roomName,
                        projectId: projectId,
                        inviter,
                        role: role
                    };
                    client.send(msg);
                }
                );
            res.send('ok');
        }
    },
    {
        Service: 'inviteCollaboratorResponse',
        Parameters: 'inviteId,response,socketId',
        middleware: ['hasSocket', 'isLoggedIn'],
        Method: 'post',
        Note: '',
        Handler: function(req, res) {
            var username = req.session.username,
                inviteId = req.body.inviteId,
                response = req.body.response === 'true',
                invitee = invites[inviteId].invitee,
                socketId = req.body.socketId,
                closeInvite = {
                    type: 'close-invite',
                    id: inviteId
                };

            // Notify other clients of response
            var allClients = NetworkTopology.getClientsWithUsername(invitee),
                invite = invites[inviteId];

            allClients.filter(socket => socket.uuid !== socketId)
                .forEach(socket => socket.send(closeInvite));

            // Ignore if the invite no longer exists
            if (!invite) {
                return res.status(500).send('ERROR: invite no longer exists');
            }

            logger.log(`${username} ${response ? 'accepted' : 'denied'} ` +
                `collab invitation for ${invite.role} at ${invite.room}`);

            delete invites[inviteId];

            if (response) {
                // TODO: update the inviter...
                // Add the given user as a collaborator
                const {projectId} = invite;
                logger.log(`project is not open "${projectId}`);
                return Projects.getById(projectId)
                    .then(project => {
                        if (project) {
                            return project.addCollaborator(username)
                                .then(() => res.status(200).send({projectId}));
                        } else {
                            return res.status(400).send('Project no longer exists');
                        }
                    });
            }
        }
    }
].map(function(api) {
    // Set the URL to be the service name
    api.URL = api.Service;
    return api;
});

async function getFriendSockets(user) {
    logger.log(`${user.username} requested friend list`);
    const inGroup = {};

    let userGroups = await Groups.findAllUserGroups(user.username);
    for (let index in userGroups) {
        let members = await userGroups[index].findMembers();
        members.forEach(m => inGroup[m.username] = true);
    }

    const peers = await user.getGroupMembers();
    // OPT if user not in a group list and goes through all users without a group
    peers.forEach(peer => inGroup[peer.username] = true);
    return NetworkTopology.clients()
        .filter(socket => !Utils.isSocketUuid(socket.username))
        .filter(socket => {
            return socket.username !== user.username && // is not the caller
                inGroup[socket.username]; // is inGroup
        });
}
