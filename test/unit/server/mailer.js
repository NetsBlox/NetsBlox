describe('mailer', function() {
    const utils = require('../../assets/utils');
    const mailer = utils.reqSrc('mailer');
    const assert = require('assert');

    it('should remove leading dot from HOST input', function() {
        const domain = mailer.getSenderDomain('.netsblox.org');
        assert.equal(domain, 'netsblox.org');
    });

    it('should return input if no leading dot', function() {
        const domain = mailer.getSenderDomain('netsblox.org');
        assert.equal(domain, 'netsblox.org');
    });
});
