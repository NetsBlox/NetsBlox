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

class InvalidOAuthToken extends RequestError {
    constructor() {
        super('Invalid OAuth token.');
    }
}

// OAuthErrors are errors reported to the client when
// performing the OAuth2 flow
class OAuthFlowError extends RequestError {
    constructor(name, desc, status=400) {
        super(desc || name);
        this.desc = desc;
        this.errorName = name;
        this.status = status;
    }
}

class InvalidRedirectURL extends OAuthFlowError {
    constructor() {
        super(
            'invalid_grant',
            'Invalid redirect URI',
        );
    }
}

class NoAuthorizationCode extends OAuthFlowError {
    constructor() {
        super(
            'invalid_request',
            'No authorization code',
        );
    }
}

class InvalidGrantType extends OAuthFlowError {
    constructor() {
        super(
            'invalid_grant',
        );
    }
}

class InvalidAuthorizationCode extends OAuthFlowError {
    constructor() {
        super(
            'invalid_client',
            'Invalid authorization code',
        );
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
module.exports.InvalidOAuthToken = InvalidOAuthToken;
module.exports.RequestError = RequestError;

module.exports.OAuthFlowError = OAuthFlowError;
module.exports.InvalidRedirectURL = InvalidRedirectURL;
module.exports.InvalidAuthorizationCode = InvalidAuthorizationCode;
module.exports.NoAuthorizationCode = NoAuthorizationCode;
module.exports.InvalidGrantType = InvalidGrantType;
