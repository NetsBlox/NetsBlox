class RequestError extends Error {
}

class UserNotFound extends RequestError {
    constructor(username) {
        super(`Could not find user "${username}"`);
    }
}

class ProjectNotFound extends RequestError {
    constructor(name) {
        const msg = name ? `Could not find project "${name}"` :
            'Project not found';
        super(msg);
    }
}

class GroupNotFound extends RequestError {
    constructor(name) {
        const msg = name ? `Could not find group "${name}"` :
            'Group not found';
        super(msg);
    }
}

class Unauthorized extends RequestError {
    constructor(username, action) {
        const msg = `Unauthorized: ${username} is not allowed to ${action}.`;
        super(msg);
    }
}

class InvalidArgument extends RequestError {
    constructor(name, type) {
        const msg = `Invalid argument "${name}". ${type} expected.`;
        super(msg);
    }
}

module.exports.UserNotFound = UserNotFound;
module.exports.Unauthorized = Unauthorized;
module.exports.InvalidArgument = InvalidArgument;
module.exports.GroupNotFound = GroupNotFound;
module.exports.ProjectNotFound = ProjectNotFound;
module.exports.RequestError = RequestError;
