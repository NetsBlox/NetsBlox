describe('service-creation', function() {
    const utils = require('../../../../assets/utils');

    utils.verifyRPCInterfaces('ServiceCreation', [
        ['getCreateFromTableOptions', ['data']],
        ['createServiceFromTable', ['name', 'data', 'options']],
    ]);
});
