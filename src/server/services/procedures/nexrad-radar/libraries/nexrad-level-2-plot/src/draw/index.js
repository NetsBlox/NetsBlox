const canvasObj = require('canvas');

const { createCanvas } = canvasObj;

const Palette = require('./palettes');
const palettizeImage = require('./palettize');

// data pre-processing
const filterProduct = require('./preprocess/filterproduct');
const downSample = require('./preprocess/downsample');
const indexProduct = require('./preprocess/indexproduct');
const rrle = require('./preprocess/rrle');

// names of data structures keyed to product name
const dataNames = {
	REF: 'reflect',
	VEL: 'velocity',
	'SW ': 'spectrum',	// intentional space to fill 3-character requirement
	ZDR: 'zdr',
	PHI: 'phi',
	RHO: 'rho',
};

// names of data retrieval routines keyed to product name
const dataFunctions = {
	REF: 'getHighresReflectivity',
	VEL: 'getHighresVelocity',
};

// generate all palettes
/* eslint-disable global-require */
const palettes = {
	REF: new Palette(require('./palettes/ref')),
	VEL: new Palette(require('./palettes/vel')),
};
/* eslint-enable global-require */

// default options
const DEFAULT_OPTIONS = {
	// must be a square image
	size: 3600,
	cropTo: 3600,
	background: 'black',
	lineWidth: 2,
};

const draw = (data, _options) => {
	// combine options with defaults
	const options = {
		...DEFAULT_OPTIONS,
		..._options,
	};

	// calculate scale
	if (options.size > DEFAULT_OPTIONS.size) throw new Error(`Upsampling is not supported. Provide a size <= ${DEFAULT_OPTIONS.size}`);
	if (options.size < 1) throw new Error('Provide options.size > 0');
	const scale = DEFAULT_OPTIONS.size / options.size;

	// calculate crop, adjust if necessary
	const cropTo = Math.min(options.size, options.cropTo);
	if (options.cropTo < 1) throw new Error('Provide options.cropTo > 0');

	// create the canvas and context
	const canvas = createCanvas(cropTo, cropTo);
	const ctx = canvas.getContext('2d');

	// fill background with black
	ctx.fillStyle = options.background;
	ctx.fillRect(0, 0, cropTo, cropTo);

	// canvas settings
	ctx.imageSmoothingEnabled = true;
	ctx.lineWidth = options.lineWidth;
	ctx.translate(cropTo / 2, cropTo / 2);
	ctx.rotate(-Math.PI / 2);

	// get the palette
	const palette = palettes[options.product];
	// test for valid palette
	if (!palette) throw new Error(`No product found for product type: ${options.product}`);

	// set the elevation
	data.setElevation(options.elevation);
	// get the header data
	const headers = data.getHeader();

	// calculate resolution in radians, default to 1°
	let resolution = Math.PI / 180;
	if (data?.vcp?.record?.elevations?.[options.elevation]?.super_res_control?.super_res?.halfDegreeAzimuth) resolution /= 2;
	// calculate half resolution step for additional calculations below
	const halfResolution = resolution / 2;

	// match product name to data
	const dataName = dataNames[options.product];
	const dataFunction = dataFunctions[options.product];

	// check for valid product
	if (dataName === undefined) throw new Error(`No data object name found for product: ${options.product}`);
	if (dataFunction === undefined) throw new Error(`No data function found for product: ${options.product}`);

	// check for data for this product
	if (headers[0][dataName] === undefined) {
		return false;
	}

	// pre-processing
	const filteredProduct = filterProduct(headers, dataName);
	const downSampledProduct = downSample(filteredProduct, scale, resolution, options, palette);
	const indexedProduct = indexProduct(downSampledProduct, palette);
	const rrlEncoded = rrle(indexedProduct, resolution);

	// loop through data
	rrlEncoded.forEach((radial) => {
		// calculate plotting parameters
		const deadZone = radial.first_gate / radial.gate_size / scale;

		// 10% is added to the arc to ensure that each arc bleeds into the next just slightly to avoid radial empty spaces at further distances
		const startAngle = radial.azimuth * (Math.PI / 180) - halfResolution * 1.1;
		const endAngle = radial.azimuth * (Math.PI / 180) + halfResolution * 1.1;

		// plot each bin
		radial.moment_data.forEach((bin, idx) => {
			if (bin !== null) {
				ctx.beginPath();
				// different methods for rrle encoded or not
				if (bin.count) {
					// rrle encoded
					ctx.strokeStyle = palette.lookupRgba[bin.value];
					ctx.arc(0, 0, (idx + deadZone), startAngle, endAngle + resolution * (bin.count - 1));
				} else {
					// plain data
					ctx.strokeStyle = palette.lookupRgba[bin];
					ctx.arc(0, 0, (idx + deadZone), startAngle, endAngle);
				}
				ctx.stroke();
			}
		});
	});

	if (!options.palettize) {
	// return the palette and canvas
		return {
			canvas,
		};
	}

	// palettize image
	const palettized = palettizeImage(canvas.getContext('2d'), palette);

	// return palettized image
	return {
		canvas: palettized,
		palette: palette.getPalette(),
	};
};

module.exports = {
	draw,
	DEFAULT_OPTIONS,
	canvas: canvasObj,
};
