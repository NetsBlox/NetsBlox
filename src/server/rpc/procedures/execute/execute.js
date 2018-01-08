const Q = require('q');
const execute = {};

/**
 * Execute a function on the NetsBlox server.
 *
 * @param {Function} fn function to execute
 */
execute.call = function(fn) {
    let deferred = Q.defer();

    fn(result => {
        return Q(result)
            .then(finalResult => {
                return deferred.resolve(finalResult);
            })
            .catch(err => {
                deferred.reject(err);
            });
    });

    return deferred.promise;
};

module.exports = execute;
