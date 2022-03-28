/**
 * This service provides access to the `RainViewer <https://www.rainviewer.com/api.html>`__ aggregated database.
 * RainViewer provides access to recent and forecasted weather radar maps all around the world.
 *
 * @alpha
 * @service
 * @category Science
 * @category Climate
 */

const ApiConsumer = require('../utils/api-consumer');
const RainViewer = new ApiConsumer('RainViewer', '', { cache: { ttl: 5 * 60 } });
const types = require('../../input-types');
const _ = require('lodash');

const TIME_OFFSET_MAP = {
    '-120min': ['past', 0],
    '-110min': ['past', 1],
    '-100min': ['past', 2],
    '-90min': ['past', 3],
    '-80min': ['past', 4],
    '-70min': ['past', 5],
    '-60min': ['past', 6],
    '-50min': ['past', 7],
    '-40min': ['past', 8],
    '-30min': ['past', 9],
    '-20min': ['past', 10],
    '-10min': ['past', 11],
    'now':    ['past', 12],
    '+10min': ['nowcast', 0],
    '+20min': ['nowcast', 1],
    '+30min': ['nowcast', 2],
};
types.defineType({
    name: 'TimeOffset',
    description: 'A time offset for a weather forecast from the :doc:`/services/RainViewer/index` service.',
    baseType: 'Enum',
    baseParams: TIME_OFFSET_MAP,
});

RainViewer._getIndex = async function () {
    return await this._requestData({
        baseUrl: `https://api.rainviewer.com/public/weather-maps.json`,
    });
};

RainViewer.getTimeOffsets = function () {
    return Object.keys(TIME_OFFSET_MAP);
};

function decimalize(val) {
    const str = val.toString();
    return str.includes('.') ? str : `${str}.0`;
}

/**
 * Gets an radar image for the specified location.
 * You can use the ``timeOffset`` input to get (recent) past or forecasted radar images.
 *
 * @param {Latitude} latitude Latitude of the returned map (centered).
 * @param {Longitude} longitude Longitude of the returned map (centered).
 * @param {BoundedInteger<1,25>} zoom The zoom level of the returned image (see the :doc:`/service/GoogleMaps/index` service).
 * @param {TimeOffset=} timeOffset The time offset of the desired forecast (defaults to ``now``, which represents current weather).
 * @param {Object=} options Additional drawing options.
 * @param {Enum<256,512>=} options.size Size of the returned (square) image in pixels (default 512).
 * @param {Boolean=} options.smooth If set to true, smooths the returned image to be more aesthetically pleasing (default true).
 * @param {Boolean=} options.showSnow If set to true, renders snow as a separate color from normal precipitation (default false).
 * @param {BoundedInteger<0,21>=} options.colorScheme An integer denoting the color scheme to use in the returned image (default 4).
 * @returns {Image} The rendered radar data.
 */
RainViewer.getImage = async function (latitude, longitude, zoom, time = TIME_OFFSET_MAP['now'], options={}) {
    DEFAULT_OPTS = {
        size: 512,
        smooth: true,
        showSnow: false,
        colorScheme: 4,
    };
    options = _.merge({}, DEFAULT_OPTS, options);

    const index = await this._getIndex();
    const sample = index.radar[time[0]][time[1]];
    return this._sendImage({
        baseUrl: index.host,
        path: `${sample.path}/${options.size}/${zoom}/${decimalize(latitude)}/${decimalize(longitude)}/${options.colorScheme}/${(options.smooth ? 1 : 0)}_${(options.showSnow ? 1 : 0)}.png`,
    });
};

module.exports = RainViewer;
