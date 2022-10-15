const utils = require('../../../../assets/utils');

describe(utils.suiteName(__filename), function() {

    utils.verifyRPCInterfaces('IoTScape', [
        ['getDevices', ['service']],
        ['getMessageTypes', ['service']],
        ['getMethods', ['service']],
        ['getServices', []],
        ['send', ['service', 'id', 'command']],
    ]);
});