const rpcUtils = require('../utils/index');

module.exports = {
    isStateless: true,
    isSupported: () => process.env.ENV !== 'production',
    echoArgs: function (argument){
        return rpcUtils.jsonToSnapList(argument);
    },
};
