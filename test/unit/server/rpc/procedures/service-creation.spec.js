describe('service-creation', function() {
    const utils = require('../../../../assets/utils');
    const ServiceCreation = utils.reqSrc('rpc/procedures/service-creation/service-creation');
    const assert = require('assert');
    // All entries from NetsBlox are sent as strings
    const toStringEntries = data => data.map(row => row.map(item => item.toString()));

    utils.verifyRPCInterfaces('ServiceCreation', [
        ['getCreateFromTableOptions', ['data']],
        ['createServiceFromTable', ['name', 'data', 'options']],
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
});
