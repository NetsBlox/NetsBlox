/**
 * TimeSync is a tool for measuring the latency and clock offset between your NetsBlox client and the NetsBlox server.
 * This can be used to have more precise timings for message passing and other time-based synchronization tasks.
 * 
 * To use this service, you first call :func:`TimeSync.prepare`, followed by performing several (e.g., 100) calls
 * to :func:`TimeSync.step`, and then finishing with :func:`TimeSync.complete` to get the computed timing metrics.
 * 
 * Note that the calls to :func:`TimeSync.step` are indended to be back-to-back.
 * You should perform this in a loop that does nothing else.
 * In particular, you should not sleep/wait inside the loop; if you need this,
 * you may provide a ``sleepTime`` to :func:`TimeSync.prepare` and it will do the sleeping/waiting for you (do not also sleep yourself).
 * 
 * @alpha
 * @service
 * @category Utilities
 */
'use strict';

const TimeSync = {};

const CONTEXTS = {};

const MIN_STEPS = 10;
const MAX_STEPS = 1000;

async function sleep(ms) {
    if (ms !== 0) await new Promise(resolve => setTimeout(resolve, ms));
}

function stableAverage(vals) {
    vals.sort((a, b) => a - b);

    let sum = 0;
    const [low, high] = [Math.floor(0.2 * vals.length), Math.ceil(0.8 * vals.length)];
    for (let i = low; i < high; ++i) {
        sum += vals[i];
    }
    return sum /= high - low;
}

/**
 * Prepares to receive a new sequence of time steps.
 * The return value of this RPC includes the minimum and maximum number of times
 * :func:`TimeSync.step` must be called before calling :func:`TimeSync.complete`.
 *
 * @param {BoundedNumber<0,1>=} sleepTime Amount of time (in seconds) to automatically wait between steps (default ``0.1``).
 * @returns {Object} Information about the min and max number of steps that can be performed.
 */
TimeSync.prepare = function (sleepTime = 0.1) {
    const client = this.caller.clientId;
    CONTEXTS[client] = { data: [], sleepTime: Math.round(sleepTime * 1000) };
    return { minSteps: MIN_STEPS, maxSteps: MAX_STEPS };
};

/**
 * Adds a time step to the data pool.
 * You must call :func:`TimeSync.prepare` before calling this RPC.
 */
TimeSync.step = async function () {
    const client = this.caller.clientId;
    const { data, sleepTime } = CONTEXTS[client] || {};
    if (!data) throw Error('Must call TimeSync.prepare before TimeSync.step');
    if (data.length >= MAX_STEPS) throw Error(`Exceeded maximum TimeSync.step count (${MAX_STEPS})`);

    data.push([+this.request.query.t, +new Date()]);

    await sleep(sleepTime);
};

/**
 * Completes a timing operation started by :func:`TimeSync.prepare` and returns the summarized timing metrics.
 * 
 * @returns {Object} Information about the computed timing metrics.
 */
TimeSync.complete = function () {
    const client = this.caller.clientId;
    const { data, sleepTime } = CONTEXTS[client] || {};
    delete CONTEXTS[client];
    if (!data) throw Error('Must call TimeSync.prepare before TimeSync.step');
    if (data.length <= MIN_STEPS) throw Error(`Must call TimeSync.step at least ${MIN_STEPS} times before TimeSync.complete`);

    const roundTrips = [];
    for (let i = 1; i < data.length; ++i) {
        roundTrips.push(data[i][0] - data[i - 1][0] - sleepTime);
        roundTrips.push(data[i][1] - data[i - 1][1] - sleepTime);
    }
    const roundTrip = stableAverage(roundTrips);
    const oneWay = roundTrip / 2;

    const offsets = [];
    for (let i = 0; i < data.length; ++i) {
        offsets.push(data[i][0] - (data[i][1] - oneWay));
        if (i > 0) offsets.push(data[i][0] - (data[i - 1][1] + sleepTime + oneWay));
    }
    const offset = stableAverage(offsets);

    return {
        roundTrip: roundTrip / 1000,
        myOffset: offset / 1000,
    };
};

module.exports = TimeSync;
