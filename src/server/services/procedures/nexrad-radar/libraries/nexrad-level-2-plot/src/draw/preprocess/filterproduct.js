// accomplish some pre-processing in one loop

// filter data for a specific product
// add the necessary azimuth data

const filterProduct = (data, product) => data.map((header) => {
	// get correct data
	const thisRadial = header[product];
	// skip if this radial isn't found
	if (thisRadial === undefined) return false;
	thisRadial.azimuth = header.azimuth;
	return thisRadial;
	// remove any missing radials
}).filter((d) => d);

module.exports = filterProduct;
