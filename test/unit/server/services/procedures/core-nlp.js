describe.only('CoreNLP', function() {
    const utils = require('../../../../assets/utils');
    const NLP = utils.reqSrc('services/procedures/core-nlp/core-nlp');
    const ServiceMock = require('../../../../assets/mock-service');
    const nlp = new ServiceMock(NLP);
    const assert = require('assert');

    utils.verifyRPCInterfaces('CoreNLP', [
        ['getAnnotators'],
        ['annotate', ['text', 'annotators']],
    ]);

    describe('annotate', function() {
        it('should detect cities', async function() {
            const text = 'I went to Paris last year.';
            const {sentences} = await nlp.annotate(text, ['tokenize', 'ssplit', 'pos', 'ner']);
            assert(sentences[0].entitymentions[0].ner, 'CITY');
        });
    });

});
