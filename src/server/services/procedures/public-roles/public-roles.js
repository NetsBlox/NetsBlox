/**
 * The PublicRoles Service provides access to the user's public role
 * ID programmatically. This enables communication between projects.
 *
 * @service
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
    const state = await NetsBloxCloud.getClientState(clientId);

    // TODO: create the address (including for external addresses)
};

/**
 * Get the public role ID for the current role.
 * @deprecated
 */
PublicRoles.requestPublicRoleId = function() {
    return PublicRoles.getPublicRoleId.call(this);
};

module.exports = PublicRoles;
