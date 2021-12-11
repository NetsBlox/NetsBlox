const fs = require('fs');
// write a canvas to a Png file
/**
 * Write a Canvas to the specified file
 * @param {string} fileName Path to write output to, passed to fs.createWriteStream
 * @param {string} data Canvas provided by the plot() function
 * @returns Promise
 */
const writePngToFile = (fileName, data) => new Promise((resolve, reject) => {
	// the draw function will return false if no data was found, short circuit the output here
	if (!data.canvas) {
		resolve();
		return;
	}

	// get a write stream
	const writeStream = fs.createWriteStream(fileName);

	// options
	const options = {};
	if (data.palette) options.palette = data.palette;

	// write to the stream
	data.canvas.createPNGStream(options).pipe(writeStream);
	writeStream.on('finish', () => resolve(fileName));
	writeStream.on('error', (e) => reject(e));
});

module.exports = {
	writePngToFile,
};
