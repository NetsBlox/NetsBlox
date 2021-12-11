const { draw, canvas } = require('./draw');
const { writePngToFile } = require('./utils/file');
/**
 * Plot level 2 data
 * @param {Level2Data} data output from the nexrad-level-2-data library
 * @param {(string|string[])} _products Options are REF, VEL, SW , ZDR, PHI and RHO
 * @param {object} options Plotting options
 * @param {number} [options.size=3600] 1 to 3600. Size of the x and y axis in pixels. The image must be square so only a single integer is needed.
 * @param {number} [options.cropTo=3600] 1 to 3600. After scaling and downsampling as described above crop the resulting plot to the size specified. Internally, the image is actually drawn at the cropped size to save on processing time.
 * @param {string} [options.background=#000000] Background color of the image. This can be transparent by using #RGBA notation.
 * @param {number} [options.lineWidth=2] The raster image is created by drawing several arcs at the locations and colors specified in the data file. When scaling down you may get a better looking image by adjusting this value to something large than the default.
 * @param {(boolean|object)} [options.palettize] After drawing the image convert the image from RGBA to a palettized image. When true the same palette as the product is used.
 * @returns Canvas
 */
const plot = (data, _products, options) => {
	// store result
	const result = {};

	let products;
	// make product list into an array
	if (_products && Array.isArray(_products)) {
		products = _products;
	} else if (typeof _products === 'string') {
		products = [_products];
	} else {
		// default to all products
		products = ['REF', 'VEL', 'SW ', 'ZDR', 'PHI', 'RHO'];
	}

	products = ['REF', 'VEL', 'SW ', 'ZDR', 'PHI', 'RHO'];

	// get the available elevations
	const elevations = data.listElevations();
	if (elevations.length === 0) throw new Error('No elevations availabe');

	products.forEach((product) => {
		// parse and store result
		try {
			result[product] = draw(data, {
				...options,
				product,
			});
		}
		catch(e) {
			//console.error(e);
		}

	});
	return result;
};

module.exports = {
	plot,
	writePngToFile,
	canvas,
};
