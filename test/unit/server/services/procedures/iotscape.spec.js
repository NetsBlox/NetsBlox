const utils = require('../../../../assets/utils');

describe(utils.suiteName(__filename), function() {

    utils.verifyRPCInterfaces('IoTScape', [
        ['getDevices', ['service']],
        ['getEvents', ['service']],
        ['getServices', []],
        ['send', ['service', 'id', 'command']],
    ]);
});