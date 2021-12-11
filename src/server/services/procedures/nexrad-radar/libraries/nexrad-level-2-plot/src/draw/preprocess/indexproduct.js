// take the raw data values and turn them into indexed values in the palette
// this is the first step in palettizing and in the Radial run-length encoding process

const indexProduct = (radials, palette) => radials.map((radial) => {
	const indexedMoment = radial.moment_data.map((bin) => {
		if (bin === null) return null;
		if (palette.inDeadband(bin)) return null;
		return palette.findColorIndex(bin);
	});
	return {
		...radial,
		moment_data: indexedMoment,
	};
});

module.exports = indexProduct;
