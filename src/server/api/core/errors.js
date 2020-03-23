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
            'Project not found.';
        super(msg);
    }
}

module.exports.UserNotFound = UserNotFound;
module.exports.ProjectNotFound = ProjectNotFound;
module.exports.RequestError = RequestError;
