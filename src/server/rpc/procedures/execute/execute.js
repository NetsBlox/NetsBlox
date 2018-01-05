const Q = require('q');
const execute = {};

/**
 * Execute a function on the NetsBlox server.
 *
 * @param {Function} fn function to execute
 */
execute.call = function(fn) {
    let deferred = Q.defer();

    console.log(fn.toString());
    fn(result => {
        console.log('execute completed');
        return deferred.resolve(result);
    });

    return deferred.promise;
};

module.exports = execute;
