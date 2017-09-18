const rpcUtils = require('../utils/index');

module.exports = {
    isSupported: () => process.env.ENV !== 'production',
    echo: function (argument){
        return rpcUtils.jsonToSnapList(argument);
    },
};
