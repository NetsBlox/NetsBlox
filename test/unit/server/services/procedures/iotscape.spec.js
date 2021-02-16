const utils = require('../../../../assets/utils');

describe(utils.suiteName(__filename), function() {

    utils.verifyRPCInterfaces('IoTScape', [
        ['getDevices', ['service']],
        ['getMessageTypes', ['service']],
        ['getServices', []],
        ['send', ['service', 'id', 'command']],
    ]);
});