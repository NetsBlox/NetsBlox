/**
 * @alpha
 * @service
 */

const TimeSync = {};

DATA = {};

const MIN_STEPS = 10;
const MAX_STEPS = 1000;
const SLEEP_TIME_MS = 0;

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
 * @returns {Object} Information about the min and max number of steps that can be performed.
 */
TimeSync.prepare = function () {
    const client = this.caller.clientId;
    DATA[client] = [];
    return { minSteps: MIN_STEPS, maxSteps: MAX_STEPS };
};

/**
 * Adds a time step to the data pool.
 * You must call :func:`TimeSync.prepare` before calling this RPC.
 */
TimeSync.step = async function () {
    const client = this.caller.clientId;
    const data = DATA[client];
    if (!data) throw Error('Must call TimeSync.prepare before TimeSync.step');
    if (data.length >= MAX_STEPS) throw Error(`Exceeded maximum TimeSync.step count (${MAX_STEPS})`);

    data.push([+this.request.query.t, +new Date()]);

    await sleep(SLEEP_TIME_MS);
};

/**
 * Completes
 */
TimeSync.complete = function () {
    const client = this.caller.clientId;
    const data = DATA[client];
    delete DATA[client];
    if (!data) throw Error('Must call TimeSync.prepare before TimeSync.step');
    if (data.length <= MIN_STEPS) throw Error(`Must call TimeSync.step at least ${MIN_STEPS} times before TimeSync.complete`);

    const roundTrips = [];
    for (let i = 1; i < data.length; ++i) {
        roundTrips.push(data[i][0] - data[i - 1][0] - SLEEP_TIME_MS);
        roundTrips.push(data[i][1] - data[i - 1][1] - SLEEP_TIME_MS);
    }
    const roundTrip = stableAverage(roundTrips);
    const oneWay = roundTrip / 2;

    const offsets = [];
    for (let i = 0; i < data.length; ++i) {
        offsets.push(data[i][0] - (data[i][1] - oneWay));
    }
    const offset = stableAverage(offsets);

    return {
        roundTrip: roundTrip / 1000,
        myOffset: offset / 1000,
    };
};

module.exports = TimeSync;
