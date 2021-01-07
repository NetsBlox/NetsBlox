class RequestError extends Error {
}

class UserNotFound extends RequestError {
    constructor(username) {
        super(`Could not find user "${username}"`);
    }
}

class AddressNotFound extends RequestError {
    constructor(addressString, sender) {
        super(`Invalid address: ${addressString} from ${sender}`);
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

class LoginRequired extends RequestError {
    constructor() {
        super('Login Required.');
    }
}

class OAuthClientNotFound extends RequestError {
    constructor() {
        super('OAuth client not found.');
    }
}

class InvalidRedirectURL extends RequestError {
    constructor() {
        super('Invalid redirect URL. This is likely an issue with the client application.');
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
module.exports.AddressNotFound = AddressNotFound;
module.exports.LoginRequired = LoginRequired;
module.exports.OAuthClientNotFound = OAuthClientNotFound;
module.exports.InvalidRedirectURL = InvalidRedirectURL;
module.exports.RequestError = RequestError;
