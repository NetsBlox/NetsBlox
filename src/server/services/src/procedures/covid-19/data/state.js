const fs = require('fs');
const path = require('path');
const stateCodesPath = path.join(__dirname, 'state-codes.csv');
const statesAndCodes = fs.readFileSync(stateCodesPath, 'utf8').trim()
    .split('\n').map(line => line.trim().split(','));
const State = {};
State.fromCode = function(code) {
    const match = statesAndCodes.find(stateAndCode => {
        const [, stateCode] = stateAndCode;
        return code === stateCode;
    });
    return match && match[0];
};

State.fromCodeSafe = function(code) {
    const match = State.fromCode(code);
    if (!match) {
        throw new Error(`No state found for code "${code}"`);
    }
    return match;
};

module.exports = State;
