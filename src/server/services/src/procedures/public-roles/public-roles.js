/**
 * The PublicRoles Service provides access to the user's public role
 * ID programmatically. This enables communication between projects.
 *
 * @service
 * @category GLOBAL
 * @category Utilities
 */
'use strict';

const logger = require('../utils/logger')('public-roles');
const NetsBloxCloud = require('../../cloud-client');
const PublicRoles = {};

/**
 * Get the public role ID for the current role.
 * 
 * @returns {String} the public role ID
 */
PublicRoles.getPublicRoleId = async function() {
    const {projectId, roleId, clientId} = this.caller;
    if (!projectId) {  // TODO: extend the API to record if it is browser or external
        throw new Error('Only supported from the NetsBlox browser.');
    }
    const state = await NetsBloxCloud.getRoomState(projectId);  // TODO: update this API?
    const roleName = state.roles[roleId]?.name;
    if (!roleName) {
        throw new Error('Could not find role');
    }
    return `${roleName}@${state.name}@${state.owner}`;
};

/**
 * Get the public role ID for the current role.
 * @deprecated
 */
PublicRoles.requestPublicRoleId = function() {
    return PublicRoles.getPublicRoleId.call(this);
};

module.exports = PublicRoles;
