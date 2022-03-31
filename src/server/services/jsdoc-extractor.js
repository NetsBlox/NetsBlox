const fse = require('fs-extra'),
    Logger = require('../logger.js'),
    logger = new Logger('netsblox:jsdoc'),
    doctrine = require('doctrine');


const assert = require('assert');
const MARKER_START = '/**',
    MARKER_START_SKIP = '/***',
    MARKER_END = '*/';

let parseSync = (filePath, searchScope = 5) => {
    let source = fse.readFileSync(filePath, 'UTF8');
    return parseSource(source, searchScope);
};

const RTD_ROLE_REGEX = /:(\w+:)?\w+:`([^`]+)`/g;
const RTD_BOLD_REGEX = /\*\*([^*]+)\*\*/g;
const RTD_CODE_REGEX = /``([^`]+)``/g;
const RTD_LINK_REGEX = /`([^`]+)`_/g;
const RTD_EMPH_REGEX = /`([^`]+)`/g;
function cleanMarkup(str) {
    if (!str) return str;
    str = str.replace(RTD_ROLE_REGEX, '$2');
    str = str.replace(RTD_BOLD_REGEX, '$1');
    str = str.replace(RTD_CODE_REGEX, '$1');
    str = str.replace(RTD_LINK_REGEX, '$1');
    str = str.replace(RTD_EMPH_REGEX, '$1');
    return str;
}

function parseInlineTags(desc) {
    if (!desc) return { tags: [], desc };
    const tags = [];

    for (;;) {
        const parsed = doctrine.parse(desc, {unwrap: true});
        assert(!parsed.description.length || !parsed.tags.length, 'An inline tag may not have a description');
        if (parsed.description.length) {
            return { tags, description: parsed.description };
        }
        assert(parsed.tags.length === 1); // rest is desc on the tag
        tags.push(parsed.tags[0].title);
        desc = parsed.tags[0].description;
    }
}

//simplifies a single metadata returned by doctrine to be used within netsblox
function simplify(metadata) {
    let {description, tags} = metadata;
    const rawDescription = description;
    description = cleanMarkup(description);
    
    let fnName = tags.find(tag => tag.title === 'name').name;

    let simplifyParam = param => {
        let {name, type, description} = param;
        const rawDescription = description;

        let simpleParam = {name, rawDescription};

        // if type is defined
        if (type) {
            simpleParam.optional = type.type === 'OptionalType';
            if (simpleParam.optional) {
                type = type.expression;  // unwrap any OptionalTypes
            }
            simpleParam.type = new InputType(type);
        } else {
            simpleParam.type = null;
            logger.warn(`rpc ${fnName}, parameter ${name} is missing the type attribute`);
        }
        return simpleParam;
    };
    let cleanDesc = arg => {
        assert(arg.tags === undefined);
        const parsedDesc = parseInlineTags(arg.rawDescription);
        arg.rawDescription = parsedDesc.description;
        arg.tags = parsedDesc.tags;
        arg.description = cleanMarkup(arg.rawDescription);
    };

    let args = tags
        .filter(tag => tag.title === 'param')
        .map(simplifyParam)
        .reduce((args, arg) => {
            const {name} = arg;
            const isFieldInObject = name.includes('.');
            if (isFieldInObject) {
                const [objectName, fieldName] = name.split('.');
                const objectArg = args.find(arg => arg.name === objectName);
                assert(objectArg, `Could not find ${objectName} argument expected for ${name}`);
                assert.equal(
                    objectArg.type.name, 'Object',
                    `Cannot add field ${fieldName} to ${objectName}. Argument is not an object.`
                );
                arg.name = fieldName;
                cleanDesc(arg);
                objectArg.type.params.push(arg);
            } else {
                cleanDesc(arg);
                args.push(arg);
            }
            return args;
        }, []);

    // find and simplify the return doc
    let returns = tags.find(tag => tag.title === 'returns');
    if (returns) returns = {
        type: new InputType(returns.type),
        description: cleanMarkup(returns.description),
        rawDescription: returns.description,
    };

    const isDeprecated = !!tags.find(tag => tag.title === 'deprecated');
    const categories = tags.filter(tag => tag.title === 'category')
        .map(tag => tag.description.split(';').map(c => c.trim()));
    let simplified = {
        name: fnName,
        deprecated: isDeprecated,
        categories,
        description,
        rawDescription,
        args,
        returns
    };
    return simplified;
}

function InputType(parsed) {
    this.name = parsed.expression ? parsed.expression.name : parsed.name;
    this.params = [];
    if (parsed.type === 'TypeApplication') {
        this.params = parsed.applications.map(param => {
            if (param.type === 'NameExpression') {
                return param.name;
            } else if (param.type === 'TypeApplication') {
                return new InputType(param);
            }
            return param.value;
        });
    }
}

function parseSource(source, searchScope) {
    let lines = source.split(/\n/);
    let blocks = extractDocBlocks(source);


    blocks = blocks.map(block => {
        let src = block.lines.join('\n');
        block.parsed = doctrine.parse(src, {unwrap: true});
        return block;
    });

    // Find the description and categories
    const serviceAnnotation = blocks
        .find(block => block.parsed.tags.find(tag => tag.title === 'service'));

    const rawDescription = serviceAnnotation && serviceAnnotation.parsed.description;
    const description = rawDescription ? cleanMarkup(rawDescription) : rawDescription;
    let categories = [];
    let tags = [];
    if (serviceAnnotation) {
        categories = serviceAnnotation.parsed.tags
            .filter(tag => tag.title === 'category')
            .map(tag => tag.description.split(';').map(c => c.trim()));

        tags = serviceAnnotation.parsed.tags
            .map(tag => tag.title)
            .filter(tag => !['category', 'service'].includes(tag));
    }

    const rpcDocs = blocks
        .filter(block => !block.parsed.tags.find(tag => tag.title === 'service'))
        .filter(block => {
            let linesToSearch = lines.slice(block.endLine, block.endLine + searchScope);
            let fnName;
            // if @name is set just use that and save a few cycles
            let nameTag = block.parsed.tags.find(tag => tag.title === 'name');
            if (nameTag) {
                fnName  = nameTag.name;
                logger.info('fn name set through @name', fnName);
            } else {
                fnName = findFn(linesToSearch);
                if (!fnName){
                    logger.warn(`can't associate ${block.lines} with any function. # Fix it at line ${block.beginLine}, column ${block.column}`);
                    return false;
                }
                block.parsed.tags.push({title: 'name', name: fnName, description: null});
            }
            block.fnName = fnName;
            return true;
        });

    return {
        description,
        rawDescription,
        categories,
        tags,
        rpcs: rpcDocs
    };
}

// returns the first function found the a line or an array of lines
function findFn(line){
    let fnName;
    if (Array.isArray(line)) {
        line.some(ln => {
            let fn = findFn(ln);
            if (fn) {
                fnName = fn;
                return true;
            }
        });
        return fnName;
    }
    // regexlist to find the fn name in format of [regex string, matchgroup]
    const regexList = [
        [/function (\w+)\(/, 1],
        [/\w+\.(\w+)[\w\s]*= *(.*function|.*=>|\w+(\.\w+)*;)/, 1],
        [/\w+\[['"`]([^'"`]+)['"`]\] *= *(.*function|.*=>|\w+(\.\w+)*;)/, 1],
        [/(let|var|const) (\w+) *= *(\w|\().*=>/, 2],
        [/ *(\w+) *: *(async)? +function *\(.*\)/, 1],
    ];

    // use array.some to break the loop early
    regexList.some( regGrp => {
        let [regex, group] = regGrp;
        let match = line.match(regex);
        if (match){
            fnName = match[group];
            return true;
        }
    });

    return fnName;
}

function extractDocBlocks(source){
    var block;
    var blocks = [];
    var extract = mkextract();
    var lines = source.split(/\n/);

    for (var i = 0, l = lines.length; i < l; i++) {
        block = extract(lines.shift());
        if (block) {
            blocks.push(block);
        }
    }

    return blocks;
}

// credit: https://github.com/yavorskiy/comment-parser
function mkextract () {
    var chunk = null;
    var indent = 0;
    var number = 1;

    /**
     * Read lines until they make a block
     * Return parsed block once fulfilled or null otherwise
     */
    return function extract (line) {
        var result = null;
        var startPos = line.indexOf(MARKER_START);
        var endPos = line.indexOf(MARKER_END);

        // if open marker detected and it's not skip one
        if (startPos !== -1 && line.indexOf(MARKER_START_SKIP) !== startPos) {
            indent = startPos + MARKER_START.length;
            chunk = {
                beginLine: number,
                column: indent +1,
                lines: []
            };
        }

        // if we are on middle of comment block
        if (chunk) {
            var lineStart = indent;

            // figure out if we slice from opening marker pos
            // or line start is shifted to the left
            var nonSpaceChar = line.match(/\S/);

            // skip for the first line starting with /** (fresh chunk)
            // it always has the right indentation
            if (chunk.length > 0 && nonSpaceChar) {
                if (nonSpaceChar[0] === '*') {
                    lineStart = nonSpaceChar.index + 2;
                } else if (nonSpaceChar.index < indent) {
                    lineStart = nonSpaceChar.index;
                }
            }

            // slice the line until end or until closing marker start
            chunk.lines.push(
                line.slice(lineStart -3, line.length)
            );

            // finalize block if end marker detected
            if (endPos !== -1) {
                chunk.endLine = number;
                result = chunk;
                chunk = null;
                indent = 0;
            }
        }

        number += 1;
        return result;
    };
}

function parseService(path, scope) {
    const serviceDocs = parseSync(path, scope);
    serviceDocs.rpcs = serviceDocs.rpcs.map(md => {
        md.parsed = simplify(md.parsed);
        return md;
    });
    return serviceDocs;
}

// netsblox docs container
let Docs = function(servicePath) {
    const serviceDocs = parseService(servicePath);
    this.description = serviceDocs.description;
    this.rawDescription = serviceDocs.rawDescription;
    this.rpcs = serviceDocs.rpcs.map(doc => doc.parsed);
    this.categories = serviceDocs.categories;
    this.tags = serviceDocs.tags;
    this.servicePath = servicePath;
};

// get a doc for an action
Docs.prototype.getDocFor = function(actionName) {
    // can preprocess and separate docs for different actions here;
    let doc = this.rpcs.find(doc => doc.name === actionName);
    if (doc) return Object.assign({}, doc);
    return undefined;
};

Docs.prototype.isEnabledInProduction = function() {
    return !this.tags.includes('alpha');
};

// public interface
module.exports = {
    extractDocBlocks,
    _findFn:  findFn,
    _parseSource: parseSource,
    _simplify: simplify,
    parse: parseService,
    Docs,
    cleanMarkup,
};
