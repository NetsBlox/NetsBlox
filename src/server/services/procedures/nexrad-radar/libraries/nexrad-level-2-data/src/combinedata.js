// combine data returned by multiple calls to the Level2Radar constructor

// individual data structures or arrays can be passed
// the last (rightmost) data structure "wins" if there are duplicates
// Scan data is always appended to the arrays. Chunks should not repeat the data, and processing the data one chunk at a time to be fed to this
// tool is a fairly straight-forward process given the pre-established NOAA file naming/splitting standards

const combine = (...args) => {
	// create a single flat array
	const rawData = args.flat(50);

	// empty object with structure
	const output = {
		options: {},
		vcp: {},
		header: {},
		data: [],
	};
	rawData.forEach((raw) => {
		// combine non-data elements
		output.elevation = raw.elevation ?? output.elevation;
		output.hasGaps = output.hasGaps || raw.hasGaps;
		output.isTruncated = output.isTruncated || raw.isTruncated;
		if (raw.options) output.options = { ...output.options, ...raw.options };
		if (raw.vcp) output.vcp = { ...output.vcp, ...raw.vcp };
		if (raw.header) output.header = { ...output.header, ...raw.header };

		// combine data elements
		raw.listElevations().forEach((elev) => {
			// set up initial array
			if (output.data[elev] === undefined) output.data[elev] = [];
			output.data[elev].push(...raw.data[elev]);
		});
	});

	return output;
};

module.exports = combine;
