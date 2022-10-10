/**
 * The Execute Service provides capabilities for executing blocks on the NetsBlox
 * server. This is particularly useful for batching RPC requests.
 *
 * @service
 * @category Utilities
 */
const Execute = {};

/**
 * Execute a function on the NetsBlox server.
 *
 * @param {Function} fn function (ringified blocks) to execute
 * @returns {Any} return value of ``fn``
 */
Execute.call = async function(fn) {
    return await fn();
};

module.exports = Execute;
