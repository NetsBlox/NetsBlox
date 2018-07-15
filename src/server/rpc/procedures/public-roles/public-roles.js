// This is a key value store that can be used across tables
'use strict';

const logger = require('../utils/logger')('public-roles');
const PublicRoles = {};

/**
 * Get the public role ID for the current role.
 */
PublicRoles.getPublicRoleId = function() {
    return this.socket.getPublicId()
        .catch(err => {
            logger.error(`Could not get public role ID for ${this.socket.uuid}: ${err}`);
            throw err;
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
