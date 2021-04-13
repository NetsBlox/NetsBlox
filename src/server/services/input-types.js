// handles the incoming input arguments for the RPCs. Parses and validates the inputs based on the code docs for the functions
const _ = require('lodash');
const blocks2js = require('./blocks2js');
const Projects = require('../storage/projects');

const GENERIC_ERROR = new Error('');  // don't add to the error msg generated by rpc-manager

const NB_TYPES = {
    Array: 'List',
    Object: 'Structured Data',
    BoundedNumber: 'Number',
};

class InputTypeError extends Error {
}

class ParameterError extends InputTypeError {
}

function getErrorMessage(arg, err) {
    const typeName = arg.type.name;
    const netsbloxType = getNBType(typeName);
    const omitTypeName = err instanceof ParameterError ||
        err.message.includes(netsbloxType);
    const msg = omitTypeName ? 
        `"${arg.name}" is not valid.` :
        `"${arg.name}" is not a valid ${netsbloxType}.`;

    if (err.message) {
        return msg + ' ' + err.message;
    } else {
        return msg;
    }
}

// converts a javascript type name into netsblox type name
function getNBType(jsType) {
    return NB_TYPES[jsType] || jsType;
}

const types = {};

types.Number = input => {
    input = parseFloat(input);
    if (isNaN(input)) {
        throw GENERIC_ERROR;
    }
    return input;
};

types.BoundedNumber = (input, params) => {
    const [min, max] = params.map(num => parseInt(num));
    const number = types.Number(input);
    if (isNaN(max)) {  // only minimum specified
        if (number < min) {
            throw new ParameterError(`Number must be greater than ${min}`);
        }
        return number;
    }

    if (isNaN(min)) {  // only maximum specified
        if (max < number) {
            throw new ParameterError(`Number must be less than ${max}`);
        }
        return number;
    }

    if (number < min || max < number) {  // both min and max bounds
        throw new ParameterError(`Number must be between ${min} and ${max}`);
    }
    return number;
};


types.BoundedString = (input, params) => {
    const [min, max] = params.map(num => parseInt(num));
    const inString = input.toString();

    if(max == min)
    {
        if (inString.length != min) {
            throw new ParameterError(`Length must be ${min}`);
        }
        return inString;
    }

    if (isNaN(max)) {  // only minimum specified
        if (inString.length < min) {
            throw new ParameterError(`Length must be greater than ${min}`);
        }
        return inString;
    }


    if (isNaN(min)) {  // only maximum specified
        if (max < inString.length) {
            throw new ParameterError(`Length must be less than ${max}`);
        }
        return inString;
    }

    if (inString.length < min || max < inString.length) {  // both min and max bounds
        throw new ParameterError(`Length must be between ${min} and ${max}`);
    }
    return inString;
};


types.Date = input => {
    input = new Date(input);
    if (isNaN(input.valueOf())) {
        throw GENERIC_ERROR;
    }
    return input;
};

types.Array = (input, params) => {
    const [innerType] = params;
    if (!Array.isArray(input)) throw GENERIC_ERROR;
    if (innerType) {
        input = input.map(value => types[innerType](value));
    }
    return input;
};

types.Latitude = input => {
    input = parseFloat(input);
    if (isNaN(input)) {
        throw GENERIC_ERROR;
    } else if (input < -90 || input > 90) {
        throw new InputTypeError('Latitude must be between -90 and 90.');
    }
    return input;
};

types.Longitude = input => {
    input = parseFloat(input);
    if (isNaN(input)) {
        throw GENERIC_ERROR;
    } else if (input < -180 || input > 180) {
        throw new InputTypeError('Longitude must be between -180 and 180.');
    }
    return input;
};

// all Object types are going to be structured data (simplified json for snap environment)
types.Object = (input, params, ctx) => {
    // check if it has the form of structured data
    let isArray = Array.isArray(input);
    if (!isArray || !input.every(pair => pair.length === 2 || pair.length === 1)) {
        throw new InputTypeError('It should be a list of (key, value) pairs.');
    }
    input = _.fromPairs(input);
    if (params) {
        const pairs = params
            .map(param => {
                const hasField = input.hasOwnProperty(param.name);
                if (hasField) {
                    const value = input[param.name];
                    delete input[param.name];
                    try {
                        const parsedValue = types[param.type.name](value, param.type.params, ctx);
                        return [
                            param.name,
                            parsedValue
                        ];
                    } catch(err) {
                        const message = `Field ${getErrorMessage(param, err)}`;
                        throw new ParameterError(message);
                    }
                } else if (!param.optional) {
                    throw new ParameterError(`It must contain a(n) ${param.name} field`);
                }
            })
            .filter(pair => pair);

        const extraFields = Object.keys(input);
        if (extraFields.length) {
            throw new ParameterError(`It contains extra fields: ${extraFields.join(', ')}`);
        }
        return _.fromPairs(pairs);
    } else {
        return input;
    }
};

types.Function = async (blockXml, _params, ctx) => {
    let roleName = '';
    let roleNames = [''];

    if (ctx) {
        const metadata = await Projects.getProjectMetadataById(ctx.caller.projectId);
        if (metadata) {
            roleNames = Object.values(metadata.roles)
                .map(role => role.ProjectName);
            roleName = metadata.roles[ctx.caller.roleId].ProjectName;
        }
    }

    let factory = blocks2js.compile(blockXml);
    let env = blocks2js.newContext();
    env.__start = function(project) {
        project.ctx = ctx;
        project.roleName = roleName;
        project.roleNames = roleNames;
    };
    const fn = await factory(env);
    const {doYield} = env;
    return function() {
        env.doYield = doYield.bind(null, Date.now());
        return fn.apply(this, arguments);
    };
};

types.String = input => input.toString();
types.Any = input => input;

module.exports = {
    parse: types,
    getNBType,
    getErrorMessage,
    Errors: {
        ParameterError,
        InputTypeError,
    }
};
