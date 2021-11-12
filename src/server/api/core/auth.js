const Users = require('../../storage/users');
const Groups = require('../../storage/groups');
const Errors = require('./errors');
const assert = require('assert');

class Permissions {
    addPermissionSet(name, perms) {
        this[name] = new PermissionSet(name, perms);
    }
}

class PermissionSet {
    constructor(name, perms) {
        const VALID_PERMISSIONS = ['LIST', 'READ', 'WRITE', 'CREATE', 'DELETE'];
        const actions = Object.keys(perms);
        this.validateActions(actions, VALID_PERMISSIONS);
        VALID_PERMISSIONS.forEach(action => {
            this[action] = perms[action] || PermissionSet.unsupported(name, action);
        });
    }

    static unsupported(name, action) {
        return function() {
            throw new Error(`Permission unsupported for ${name}: ${action}`);
        };
    }

    validateActions(actions, VALID_PERMISSIONS) {
        actions.forEach(action => {
            assert(
                VALID_PERMISSIONS.includes(action),
                `Action not valid permission: ${action}`
            );
        });
    }
}

const Perms = new Permissions();
Perms.addPermissionSet('Group', {
    READ: function(groupId) {
        return async requestor => assert(
            await isGroupOwnerOrMember(requestor, groupId),
            new Errors.Unauthorized(requestor, 'view the requested group')
        );
    },
    WRITE: function(groupId) {
        return async requestor => assert(
            await isGroupOwner(requestor, groupId),
            new Errors.Unauthorized(requestor, 'edit the requested group')
        );
    }
});
Perms.addPermissionSet('User', {
    READ: function(username) {
        return async requestor => {
            if (username === requestor) return;
            const user = await Users.get(username);
            const groupId = user?.groupId;
            if (groupId && await isGroupOwner(requestor, groupId)) return;
            throw new Errors.Unauthorized(requestor, `view user "${username}"`);
        };
    },
    WRITE: function(username) {
        return async requestor => {
            if (username === requestor) return;
            const user = await Users.get(username);
            const groupId = user?.groupId;
            if (groupId && await isGroupOwner(requestor, groupId)) return;
            throw new Errors.Unauthorized(requestor, `edit user "${username}"`);
        };
    },
    DELETE: function(username) {
        return async requestor => {
            if (username === requestor) return;
            const user = await Users.get(username);
            const groupId = user?.groupId;
            if (groupId && await isGroupOwner(requestor, groupId)) return;
            throw new Errors.Unauthorized(requestor, `delete user "${username}"`);
        };
    },
});
Perms.addPermissionSet('Library', {
    LIST: function(username) {
        return requestor => assert(
            username === requestor,
            new Errors.Unauthorized(requestor, `view libraries belonging to "${username}"`)
        );
    },
    READ: function(username, library) {
        return requestor => assert(
            username === requestor || library.public,
            new Errors.Unauthorized(requestor, `view private library belonging to "${username}"`)
        );
    },
    WRITE: function(username) {
        return requestor => assert(
            username === requestor,
            new Errors.Unauthorized(requestor, `save library to "${username}"`)
        );
    },
    DELETE: function(owner) {
        return requestor => assert(
            owner === requestor,
            new Errors.Unauthorized(requestor, 'delete library')
        );
    },
});
Perms.addPermissionSet('Project', {
    READ: function(project) {
        return requestor => assert(
            project &&
                (project.Public || project.collaborators.concat(project.owner).includes(requestor)),
            new Errors.Unauthorized(requestor, 'read project'),
        );
    }
});

class Authorization {
    constructor(permissions) {
        this.enabled = true;
        this.Permission = permissions;
    }

    async ensureAuthorized(requestor, requiredPermission) {
        if (this.enabled) {
            await requiredPermission(requestor);
        }
    }

    enable() {
        this.enabled = true;
    }

    disable() {
        this.enabled = false;
    }
}

async function isGroupOwnerOrMember(username, groupId) {
    return await isGroupOwner(username, groupId) ||
        await isGroupMember(username, groupId);
}

async function isGroupOwner(username, groupId) {
    const group = await Groups.get(groupId)
        .catch(err => {
            if (err.message.includes('not found')) {
                err = new Errors.GroupNotFound();
            }
            throw err;
        });
    return group.owner === username;
}

async function isGroupMember(username, groupId) {
    const user = await Users.get(username);
    if (!user) {
        throw new Errors.UserNotFound(username);
    }
    return user.groupId === groupId;
}

module.exports = new Authorization(Perms);
