const Q = require('q');
const execute = {};

/**
 * Execute a function on the NetsBlox server.
 *
 * @param {Function} fn function to execute
 */
execute.call = function(fn) {
    let deferred = Q.defer();
    let finished = false;

    fn()
        .then(result => {
            if (finished) return;
            finished = true;
            return deferred.resolve(result);
        })
        .catch(err => {
            if (finished) return;
            finished = true;

            this.response.send(err.message);
            return deferred.reject(err);
        });

    setTimeout(() => {
        if (finished) return;
        finished = true;
        const err = new Error('Timeout exceeded');
        this.response.send(err.message);
        return deferred.reject(err);
    }, 2000);

    return deferred.promise;
};

module.exports = execute;
