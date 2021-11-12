const utils = require('../../../../assets/utils');

describe(utils.suiteName(__filename), function() {
    const NLP = utils.reqSrc('services/procedures/core-nlp/core-nlp');
    const ServiceMock = require('../../../../assets/mock-service');
    const assert = require('assert');
    let nlp;

    before(() => nlp = new ServiceMock(NLP));
    after(() => nlp.destroy());

    utils.verifyRPCInterfaces('CoreNLP', [
        ['getAnnotators'],
        ['annotate', ['text', 'annotators']],
    ]);

    describe('annotate', function() {
        it('should detect cities', async function() {
            this.retries(3);
            const text = 'I went to Paris last year.';
            const {sentences} = await nlp.annotate(text, ['tokenize', 'ssplit', 'pos', 'ner']);
            assert(sentences[0].entitymentions[0].ner, 'CITY');
        });
    });

});
