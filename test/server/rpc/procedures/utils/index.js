const utils = require('../../../../../src/server/rpc/procedures/utils/index'),
    assert = require('assert');

describe('encodeQueryData', () => {
    it('should not ignore null values', ()=>{
        let encodedQuery = utils.encodeQueryData({query: 'test', secret: null, fieldB: undefined});
        assert.equal(encodedQuery, 'query=test&secret=null&fieldB=undefined');
    });
});
