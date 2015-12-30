// This contains helper functions to be used

'use strict';

var useClosure = function(fn, dict) {
    var result = fn.toString(),
        vars = Object.keys(dict),
        value;

    // Hacking a (read-only) closure...
    // FIXME: We should probably make sure the variable is not
    // being assigned to...
    for (var i = vars.length; i--;) {
        value = dict[vars[i]];
        if (typeof value === 'string') {
            value = '\'' + value + '\'';
        }
        result.replace(new RegExp('\\b' + vars[i] + '\\b', 'g'), value);
    }

    return result;
};

var login = useClosure(function() {
    //jshint ignore:start
    helpers.signInAs(username, password);
    //jshint ignore:end
}, {username, password});

module.exports = {
    useClosure
};
