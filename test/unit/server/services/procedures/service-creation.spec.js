describe('service-creation', function() {
    const utils = require('../../../../assets/utils');
    const ServiceCreation = utils.reqSrc('services/procedures/service-creation/service-creation');
    const RPCMock = require('../../../../assets/mock-rpc');
    const service = new RPCMock(ServiceCreation);
    const assert = require('assert');
    // All entries from NetsBlox are sent as strings
    const toStringEntries = data => data.map(row => row.map(item => item.toString()));

    utils.verifyRPCInterfaces('ServiceCreation', [
        ['getCreateFromTableOptions', ['data']],
        ['createServiceFromTable', ['name', 'data', 'options']],
        ['deleteService', ['name']],
    ]);

    describe('getConstantFields ', function() {
        it('should detect constant fields', function() {
            const data = toStringEntries([
                ['id', 'name', 'value'],
                [1, 'brian', 1],
                [2, 'steve', 2],
                [2, 'steve', 3],
                [1, 'brian', 4],
                [1, 'brian', 5],
            ]);
            const constantFields = ServiceCreation._getConstantFields(data);
            assert.equal(constantFields.length, 1);
            assert.equal(constantFields[0], 'name');
        });

        it('should detect all constant fields when ids are unique', function() {
            const data = toStringEntries([
                ['id', 'name', 'value'],
                [1, 'brian', 1],
                [2, 'steve', 2],
                [3, 'steve', 3],
                [4, 'brian', 4],
                [5, 'brian', 5],
            ]);
            const constantFields = ServiceCreation._getConstantFields(data);
            assert.equal(constantFields.length, 2);
        });

        it('should detect constant fields differing by whitespace', function() {
            const rawData = toStringEntries([
                ['id', 'name', 'value'],
                [1, 'brian  ', 1],
                [2, ' steve', 2],
                [2, 'steve', 3],
                [1, 'brian\r', 4],
                [1, 'brian', 5],
            ]);
            const cleanData = ServiceCreation._cleanDataset(rawData);
            const constantFields = ServiceCreation._getConstantFields(cleanData);
            assert.equal(constantFields.length, 1);
            assert.equal(constantFields[0], 'name');
        });
    });

    describe('getCreateFromTableOptions', function() {
        before(() => service.setRequester('client_1', 'brian'));

        it('should support # symbol', function() {
            const data = toStringEntries([
                ['id', '# counted'],
                [1, 20]
            ]);
            const options = service.getCreateFromTableOptions(data);
            const rpcNames = options.RPCs.map(rpc => rpc.name);
            assert(rpcNames.includes('get#CountedColumn'));
        });

        it('should support $ symbol', function() {
            const data = toStringEntries([
                ['id', '$ spent'],
                [1, 20]
            ]);
            const options = service.getCreateFromTableOptions(data);
            const rpcNames = options.RPCs.map(rpc => rpc.name);
            assert(rpcNames.includes('get$SpentColumn'), `Could not find get$Spent: ${rpcNames.join(', ')}`);
        });

        it('should support % symbol', function() {
            const data = toStringEntries([
                ['id', '% of total'],
                [1, 20]
            ]);
            const options = service.getCreateFromTableOptions(data);
            const rpcNames = options.RPCs.map(rpc => rpc.name);
            assert(rpcNames.includes('get%OfTotalColumn'), `Could not find get%OfTotal: ${rpcNames.join(', ')}`);
        });

        it('should support accented characters', function() {
            const data = toStringEntries([
                ['id', 'érdös number'],
                [1, 20]
            ]);
            const options = service.getCreateFromTableOptions(data);
            const rpcNames = options.RPCs.map(rpc => rpc.name);
            assert(rpcNames.includes('getÉrdösNumberColumn'), `Could not find getÉrdösNumber: ${rpcNames.join(', ')}`);
        });
    });
});
