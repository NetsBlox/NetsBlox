// handles the incoming input arguments for the RPCs. Parses and validates the inputs based on the code docs for the functions
const _ = require('lodash');
const blocks2js = require('./blocks2js');
const Projects = require('../storage/projects');
const {cleanMarkup} = require('../services/jsdoc-extractor');

const GENERIC_ERROR = new Error('');  // don't add to the error msg generated by rpc-manager

const NB_TYPES = {
    Array: 'List',
    Object: 'Structured Data',
    BoundedNumber: 'Number',
};
// converts a javascript type name into netsblox type name
function getNBType(jsType) {
    return NB_TYPES[jsType] || jsType;
}

class InputTypeError extends Error { }
class ParameterError extends InputTypeError { }
class EnumError extends ParameterError {
    constructor(name, variants) {
        super(`${name || 'It'} must be one of ${variants.join(', ')}`);
    }
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

// Any is the only first-order type, and it has no base type
const types = { Any: input => input };
const typesMeta = { // must be the same format produced by defineType()
    Any: { // Any should be the only type not introduced by defineType()
        hidden:         false,
        displayName:    'Any',
        description:    'A value of any type.',
        rawDescription: 'A value of any type.',
        baseType:        null,
    },
};
const dispToType = { Any: 'Any' }; // maps display name to internal name

function getTypeParser(type) {
    if (!type) return undefined;
    return types[type] || (input => types[type.name](input, type.params));
}

const DEFINE_TYPE_FIELDS = [
    'hidden', 'name', 'displayName', 'description',
    'baseType', 'baseParams', 'parser',
];

// introduces a new type to the services type system. settings are specified by info fields, which are defined below:
// hidden: bool - denotes if the type should be hidden from users in documentation
// name: string - the (internal) name of the type to introduce. two types with the same name is forbidden.
// displayName: string?
//         - the user-level name of the type shown in documentation. if omitted, defaults to (internal) name.
//         - two non-hidden types with the same display name is forbidden.
// description: string - a description for the type, which is visible in the documentation.
// baseType: string - the (internal) name of the base type. if there is no appropriate base type, you can use 'Any', which is a no-op.
// baseParams: (any[] | dict<string,any> | params => params)?
//         - the parameters to pass to the base type parser. this can be an array of strings, an object with string keys, or a param mapping function (see below).
//         - if no value is specified, then nothing (undefined) is passed to the base type parser for the params input.
//         - if the value is any[] or dict<string,any>, this value is passed directly to the base type parser as-is.
//         - if the value is a param mapping function, the (single) input is the derived type params, and the output is the params to use for the base type.
//         - any[] values and dict<string,any> keys are exposed as the params in the metadata, while a mapping function shows as no params in the metadata.
// parser: (U => T)?
//         - a function that maps from the output type of base type parser to the desired final output type.
//         - if no parser is specified, the result of the base type parser is returned directly.
// returns: a derived parser function of form (input, params, ctx) => T
function defineType(info) {
    if (typeof(info) !== 'object') throw Error('Type info must be an object');

    const extra_fields = new Set(Object.keys(info));
    for (const expected of DEFINE_TYPE_FIELDS) extra_fields.delete(expected);
    if (extra_fields.size) throw Error(`Unrecognized defineType fields: [${Array.from(extra_fields).join(", ")}]`);

    if (!info.hidden) info.hidden = false;
    else if (typeof(info.hidden) !== 'boolean') throw Error('Type hidden flag must be a boolean');

    if (!info.name) throw Error('A type name is required');
    if (typeof(info.name) !== 'string') throw Error('Type name must be a string');
    if (types[info.name]) throw Error(`Attempt to redefine existing type: ${info.name}`);

    if (!info.displayName) info.displayName = info.name;
    else if (typeof(info.displayName) !== 'string') throw Error('Display name must be a string');
    else if (!info.hidden && dispToType[info.displayname]) throw Error(`A type (${dispToType[info.displayname]}) with display name ${info.displayName} already exists.`);

    if (!info.description) throw Error('To enforce good documentation, a type description is required');
    if (typeof(info.description) !== 'string') throw Error('Type description must be a string');

    if (!info.baseType) throw Error('For future proofing, a base type is required. If there is no appropriate base type, you may use "Any"');
    if (typeof(info.baseType) !== 'string') throw Error('Base type must be a string');

    if (!info.parser) info.parser = v => v;
    else if (typeof(info.parser) !== 'function') throw Error('Type parser must be a function');

    let getParams, baseParamsMeta = null;
    if (!info.baseParams) getParams = () => undefined;
    else if (typeof(info.baseParams) === 'object') {
        getParams = () => info.baseParams;
        baseParamsMeta = Array.isArray(info.baseParams) ? info.baseParams : Object.keys(info.baseParams);
    }
    else if (typeof(info.baseParams) === 'function') getParams = info.baseParams;
    else throw Error('Base params must be an array, object, or function');

    const base = types[info.baseType];
    if (!base) throw Error(`Base type ${info.baseType} does not exist. Avoid referencing types from external files (other than those defined in this file)`);

    const derivedParser = async (input, params, ctx) => info.parser(await base(input, await getParams(params), ctx), params, ctx);

    types[info.name] = derivedParser;
    typesMeta[info.name] = {
        hidden: info.hidden,
        displayName: info.displayName,
        description: cleanMarkup(info.description),
        rawDescription: info.description,
        baseType: {
            name: info.baseType,
            params: baseParamsMeta,
        },
    };
    if (!info.hidden) dispToType[info.displayName] = info.name;

    return derivedParser;
}

defineType({
    name: 'String',
    description: 'Any piece of text.',
    baseType: 'Any',
    parser: input => input.toString(),
});

defineType({
    name: 'Enum',
    description: 'A string with a restricted set of valid values.',
    baseType: 'String',
    parser: (str, variants) => {
        const lower = str.toLowerCase();
        const variantDict = !Array.isArray(variants) ? variants : _.fromPairs(variants.map(name => [name, name]));

        for (const variant in variantDict) {
            if (lower === variant.toLowerCase()) return variantDict[variant];
        }

        throw new EnumError(undefined, Object.keys(variantDict));
    },
});

defineType({
    name: 'Boolean',
    description: 'A true or false value.',
    baseType: 'Enum',
    baseParams: { 'true': true, 'false': false },
});

defineType({
    name: 'Number',
    description: 'Any numeric value.',
    baseType: 'Any',
    parser: input => {
        input = parseFloat(input);
        if (isNaN(input)) throw GENERIC_ERROR;
        return input;
    },
});

defineType({
    name: 'Array',
    displayName: 'List',
    description: 'A list of (zero or more) values.',
    baseType: 'Any',
    parser: async (input, params=[]) => {
        const [typeParam, min=0, max=Infinity] = params;
        const innerType = getTypeParser(typeParam);

        if (!Array.isArray(input)) throw new InputTypeError();
        if (innerType) {
            let i = 0;
            try {
                for (; i < input.length; ++i) input[i] = await innerType(input[i]);
            }
            catch (e) {
                throw new ParameterError(`Item ${i+1} ${e}`);
            }
        }
        if (min === max && input.length !== min) throw new ParameterError(`List must contain ${min} items`);
        if (input.length < min) throw new ParameterError(`List must contain at least ${min} items`);
        if (input.length > max) throw new ParameterError(`List must contain at most ${max} items`);
        return input;
    },
});

// all Object types are going to be structured data (simplified json for snap environment)
defineType({
    name: 'Object',
    description: 'A set named fields with values. This is constructed as a list of lists, where the inner lists have two values: the field name and value.',
    baseType: 'Any',
    parser: async (input, params=[], ctx) => {
        // check if it has the form of structured data
        let isArray = Array.isArray(input);
        if (!isArray || !input.every(pair => pair.length === 2 || pair.length === 1)) {
            throw new InputTypeError('It should be a list of (key, value) pairs.');
        }
        input = _.fromPairs(input);
        if (!params.length) return input; // no params means we accept anything, so return raw input as obj

        const res = {};
        for (const param of params) {
            const value = input[param.name];
            delete input[param.name];
            const isMissingField = value === undefined || value === null;

            if (isMissingField) {
                if (param.optional) continue;
                throw new ParameterError(`It must contain a(n) ${param.name} field`);
            }

            try {
                res[param.name] = await types[param.type.name](value, param.type.params, ctx);
            } catch(err) {
                throw new ParameterError(`Field ${getErrorMessage(param, err)}`);
            }
        }

        const extraFields = Object.keys(input);
        if (extraFields.length) {
            throw new ParameterError(`It contains extra fields: ${extraFields.join(', ')}`);
        }
        return res;
    }
});

const FUNC_DESC = 'A block of code that can be executed.';
defineType({
    name: 'Function',
    description: FUNC_DESC,
    baseType: 'Any',
    parser: async (blockXml, _params, ctx) => {
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
    },
});

defineType({
    name: 'SerializedFunction',
    displayName: 'Function',
    hidden: true, // required because display name 'Function' is already used
    description: FUNC_DESC,
    baseType: 'Any',
    parser: async (blockXml, _params, ctx) => {
        await types.Function(blockXml, _params, ctx); // check that it compiles
        return blockXml;
    },
});

defineType({
    name: 'BoundedNumber',
    description: 'A number with a minimum and/or maximum value.',
    baseType: 'Number',
    parser: (number, params) => {
        const [min, max] = params.map(num => parseFloat(num));
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
    }
});

defineType({
    name: 'Integer',
    description: 'A whole number.',
    baseType: 'Number',
    parser: input => {
        if (!Number.isInteger(input)) throw new InputTypeError('Number must be an integer (whole number)');
        return input;
    },
});

defineType({
    name: 'BoundedInteger',
    description: 'An Integer with a minimum and/or maximum value.',
    baseType: 'BoundedNumber',
    baseParams: p => p, // pass our params to the base type parser
    parser: input => {
        if (!Number.isInteger(input)) throw new InputTypeError('Number must be an integer (whole number)');
        return input;
    },
});

defineType({
    name: 'BoundedString',
    description: 'A string with a minimum and/or maximum length.',
    baseType: 'String',
    parser: (str, params) => {
        const [min, max] = params.map(num => parseInt(num));

        if (max === min) {
            if (str.length != min) throw new ParameterError(`Length must be ${min}`);
        }
        else if (isNaN(max)) {  // only minimum specified
            if (str.length < min) throw new ParameterError(`Length must be greater than ${min}`);
        }
        else if (isNaN(min)) {  // only maximum specified
            if (max < str.length) throw new ParameterError(`Length must be less than ${max}`);
        }
        else if (str.length < min || max < str.length) {  // both min and max bounds
            throw new ParameterError(`Length must be between ${min} and ${max}`);
        }

        return str;
    },
});

defineType({
    name: 'Date',
    description: 'A calendar date.',
    baseType: 'Any',
    parser: input => {
        input = new Date(input);
        if (isNaN(input.valueOf())) throw GENERIC_ERROR;
        return input;
    },
});

defineType({
    name: 'Latitude',
    description: 'A latitude position in degrees ``[-90, 90]``.',
    baseType: 'BoundedNumber',
    baseParams: ['-90', '90'],
});

defineType({
    name: 'Longitude',
    description: 'A longitude position in degrees ``[-180, 180]``.',
    baseType: 'BoundedNumber',
    baseParams: ['-180', '180'],
});

module.exports = {
    parse: types,
    getNBType,
    defineType,
    typesMeta,
    getErrorMessage,
    Errors: {
        ParameterError,
        InputTypeError,
    }
};
