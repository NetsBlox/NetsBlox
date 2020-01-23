describe('services-api', function() {
    const utils = require('../../../assets/utils');
    const ServicesAPI = require('../../../../src/server/services/api');
    const MockResponse = require('../../../assets/mock-response');
    const assert = require('assert');

    before(async () => {
        await utils.reset();
        await ServicesAPI.initialize();
    });

    describe('validateRPCRequest', function() {
        it('should return 404 if service not found', function() {
            const response = new MockResponse();
            const request = new MockRequest('Dev??', 'echo');
            const isValid = ServicesAPI.validateRPCRequest(request, response);
            assert(!isValid, 'RPC request falsey reported as valid');
            assert.equal(response.code, 404);
        });

        it('should return 404 if RPC not found (valid service)', function() {
            const response = new MockResponse();
            const request = new MockRequest('Dev', 'unknown');
            const isValid = ServicesAPI.validateRPCRequest(request, response);
            assert(!isValid, 'RPC request falsely reported as valid');
            assert.equal(response.code, 404);
        });

        it('should return 400 if missing uuid', function() {
            const response = new MockResponse();
            const request = new MockRequest('PublicRoles', 'getPublicRoleId');
            delete request.query.uuid;
            const isValid = ServicesAPI.validateRPCRequest(request, response);
            assert(!isValid, 'RPC request falsely reported as valid');
            assert.equal(response.code, 400);
        });

        it('should return 400 if missing uuid', function() {
            const response = new MockResponse();
            const request = new MockRequest('PublicRoles', 'getPublicRoleId');
            delete request.query.projectId;
            const isValid = ServicesAPI.validateRPCRequest(request, response);
            assert(!isValid, 'RPC request falsely reported as valid');
            assert.equal(response.code, 400);
        });

        it('should return true if valid RPC', function() {
            const response = new MockResponse();
            const request = new MockRequest('PublicRoles', 'getPublicRoleId');
            const isValid = ServicesAPI.validateRPCRequest(request, response);
            assert(isValid, response.response);
            assert.equal(response.code, undefined);
        });
    });

    function MockRequest(service, rpc) {
        this.query = {
            uuid: 'abc123',
            projectId: 'project1'
        };
        this.params = {
            serviceName: service,
            rpcName: rpc
        };
    }
});
