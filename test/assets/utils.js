var _ = require('lodash'),
    assert = require('assert');

module.exports = {
    verifyRPCInterfaces: function(rpc, interfaces) {
        describe(`${rpc.getPath()} interfaces`, function() {
            interfaces.forEach(interface => {
                var name = interface[0],
                    expected = interface[1] || [];

                it(`${name} args should be ${expected.join(', ')}`, function() {
                    var args = rpc.getArgumentsFor(name);
                    assert(_.isEqual(args, expected));
                });
            });
        });
    }
};
