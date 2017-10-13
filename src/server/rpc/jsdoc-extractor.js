const fse = require('fs-extra'),
    Logger = require('../logger.js'),
    logger = new Logger('netsblox:jsdoc'),
    doctrine = require('doctrine');


const MARKER_START = '/**',
    MARKER_START_SKIP = '/***',
    MARKER_END = '*/';

let parse = (filePath, SEARCH_SIZE = 5) => {
    return fse.readFile(FILE, 'UTF8')
        .then(source => {
            let lines = source.split(/\n/);
            let blocks = extractDocBlocks(source);
            blocks = blocks.map(block => {
                let src = block.lines.join('\n');
                block.parsed = doctrine.parse(src, {unwrap: true});
                delete block.lines;
                return block;
            });
            blocks.forEach(block => {
                let linesToSearch = lines.slice(block.endLine, block.endLine + SEARCH_SIZE);
                // if @name is set jsut use that and save a few cycles
                if (block.parsed.tags.some(tag => tag.title === 'name')) {
                    block.fnName  = block.parsed.tags.find(tag => tag.title === 'name').name;
                    logger.info('fn name set through @name', block.fnName);
                } else {
                    let fnName = findFn(linesToSearch);
                    if (!fnName){
                        throw `can't associate ${block} with any function`;
                        // TODO filter / ignore this one and keep going
                    }
                    block.fnName = fnName;
                }
            });
            logger.log(blocks.map(b => b.parsed.tags));
        })
        .catch(err => {
            logger.error(err);
        });
};

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
    // regexlist to find the fn name in format of [regex string, mathgroup]
    const regexList = [
        [/function (\w+)\(/, 1],
        [/\w+\.(\w+).*=.*(function|=>)/, 1],
        [/(let|var) (\w+) *= *(\w|\().*=>/, 2]
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
     * Return parsed block once fullfilled or null otherwise
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
            // TODO check for tabs?
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

const FILE= process.argv[2];
if (FILE) parse();

// public interface
module.exports = {
    extractDocBlocks,
    _findFn:  findFn,
    parse: parse
};
