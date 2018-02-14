module.exports = {
    isSupported: () => process.env.ENV !== 'production',
    echo: function (argument){
        return argument;
    },
};
