class RequestError extends Error {
}

class UserNotFound extends RequestError {
    constructor(username) {
        super(`Could not find user "${username}"`);
    }
}

class IncorrectUserOrPassword extends RequestError {
    constructor() {
        super('Incorrect username or password');
    }
}

class ProjectNotFound extends RequestError {
    constructor(name) {
        const msg = name ? `Could not find project "${name}"` :
            'Project not found';
        super(msg);
    }
}

class ProjectRoleNotFound extends RequestError {
    constructor(name) {
        const msg = name ? `Could not find the given role in "${name}"` :
            'Role not found';
        super(msg);
    }
}

class LibraryNotFound extends RequestError {
    constructor(owner, name) {
        const msg = `Could not find library "${name}" for "${owner}"`;
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

class StrategyNotFound extends RequestError {
    constructor(name) {
        const msg = name ? `Could not find strategy "${name}"` :
            'Strategy not found';
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
    constructor(name, suffix='') {
        if (suffix) suffix = ' ' + suffix;
        const msg = `Invalid argument "${name}". ${suffix}`;
        super(msg);
    }
}

class InvalidArgumentType extends InvalidArgument {
    constructor(name, type) {
        const msg = `${type} expected.`;
        super(name, msg);
    }
}

class MissingArguments extends RequestError {
    constructor(/*arguments*/) {
        const missingArgs = [...arguments];
        const msg = `Missing required argument(s): ${missingArgs.join(', ')}`;
        super(msg);
    }
}

module.exports.StrategyNotFound = StrategyNotFound;
module.exports.MissingArguments = MissingArguments;
module.exports.UserNotFound = UserNotFound;
module.exports.IncorrectUserOrPassword = IncorrectUserOrPassword;
module.exports.Unauthorized = Unauthorized;
module.exports.InvalidArgument = InvalidArgument;
module.exports.InvalidArgumentType = InvalidArgumentType;
module.exports.GroupNotFound = GroupNotFound;
module.exports.ProjectNotFound = ProjectNotFound;
module.exports.ProjectRoleNotFound = ProjectRoleNotFound;
module.exports.LibraryNotFound = LibraryNotFound;
module.exports.RequestError = RequestError;
