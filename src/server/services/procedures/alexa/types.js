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
            type: {name: 'String'}  // TODO: make this a string?
        },
    ];
    types.defineType('Intent', async (input, _params, ctx) => {
        // TODO: validate the function
        const intent = await types.parse.Object(input, intentParams);
        await types.parse.Function(intent.handler, _params, ctx);
        const isCustomIntent = !intent.name.startsWith('AMAZON.');
        console.log('intent:', intent);
        if (isCustomIntent && !intent.utterances) {
            throw new Error('Custom intents must contain utterances.');
        }
        return intent;
    });
};
