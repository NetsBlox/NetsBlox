/**
 * The Execute Service provides capabilities for executing blocks on the NetsBlox
 * server. This is particularly useful for batching RPC requests.
 *
 * @service
 */
const Q = require('q');
const execute = {};

/**
 * Execute a function on the NetsBlox server.
 *
 * @param {Function} fn function (ringified blocks) to execute
 */
execute.call = function(fn) {
    let deferred = Q.defer();

    fn()
        .then(result => {
            return deferred.resolve(result);
        })
        .catch(err => {
            this.response.send(err.message);
            return deferred.reject(err);
        });

    return deferred.promise;
};

module.exports = execute;
