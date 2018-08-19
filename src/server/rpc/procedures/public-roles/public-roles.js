// This is a key value store that can be used across tables
'use strict';

const logger = require('../utils/logger')('public-roles');
const Projects = require('../../../storage/projects');
const PublicRoles = {};

/**
 * Get the public role ID for the current role.
 */
PublicRoles.getPublicRoleId = function() {
    const {projectId, roleId, clientId} = this.caller;
    return Projects.getRawProjectById(projectId)
        .then(metadata => {
            if (!metadata) {
                logger.warn(`cannot get public id for ${clientId} project ${projectId} not found.`);
                throw new Error('Project not found. Has it been deleted?');
            }

            if (!metadata.roles[roleId]) {
                logger.warn(`cannot get public id for ${clientId} role ${roleId} at ${projectId} not found.`);
                throw new Error('Role not found. Has it been deleted?');
            }

            const roleName = metadata.roles[roleId].ProjectName;
            const {name, owner} = metadata;
            return `${roleName}@${name}@${owner}`;
        });
};

/**
 * Get the public role ID for the current role.
 * @deprecated
 */
PublicRoles.requestPublicRoleId = function() {
    return PublicRoles.getPublicRoleId.call(this);
};

module.exports = PublicRoles;
