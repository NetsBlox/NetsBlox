const types = require('../../input-types');

module.exports = function registerTypes() {
    const intentParams = [
        {
            name: 'name',
            type: {name: 'String'}
        },
        {
            name: 'utterances',
            optional: true,
            type: {name: 'Array', params: ['String']}
        },
        {
            name: 'slots',
            optional: true,
            type: {name: 'Array', params: ['Object']}
        },
        {
            name: 'handler',
            type: {name: 'Function'}
        },
    ];
    types.defineType('Intent', input => types.parse.Object(input, intentParams));
};
