describe.only('services-api', function() {
    const ServicesAPI = require('../../../../src/server/services/api');
    const MockResponse = require('../../../assets/mock-response');
    const assert = require('assert');

    describe('handleRPCRequest', function() {
        it('should return 404 if RPC not found (valid service)', async function() {
            const {Dev} = ServicesAPI.services.rpcRegistry;
            const response = new MockResponse();
            const request = {query:{}, params:{}};
            request.query.uuid = 'abc123';
            request.query.projectId = 'projectabc123';

            ServicesAPI.handleRPCRequest(Dev, request, response);
            assert.equal(response.code, 404);
        });
    });
});
