const { createCanvas } = require('canvas');

const palettizeImage = (sourceCtx, palette) => {
	// get the dimensions of the image from the ctx
	const dim = {
		x: sourceCtx.canvas.width,
		y: sourceCtx.canvas.height,
	};
	console.time('Palettize image');

	// transform into indexed palette by finding the closest indexed color for each pixel
	// create a destination image that is transparent and indexed
	const indexedCanvas = createCanvas(dim.x, dim.y);
	const indexedCtx = indexedCanvas.getContext('2d', { pixelFormat: 'A8' });

	// get the source image data
	const sourceImageData = sourceCtx.getImageData(0, 0, dim.x, dim.y);
	// get the indexed image data (destination)
	const indexedImageData = indexedCtx.getImageData(0, 0, dim.x, dim.y);

	// loop through each pixel
	console.log(`Palettized cache size: ${Object.keys(palette.closest).length}`);
	indexedImageData.data.forEach((val, idx) => {
		indexedImageData.data[idx] = palette.closestIndex(sourceImageData.data.slice(idx * 4, idx * 4 + 3));
	});
	console.timeEnd('Palettize image');
	// write the new image data
	indexedCtx.putImageData(indexedImageData, 0, 0);

	return indexedCanvas;
};

module.exports = palettizeImage;
