// downsample the moment data preserving the maximum dbz using palette.downSample
// this includes "cropping" the data to the specified size

// calculation constants
const RAD45 = (45 * Math.PI / 180);
const RAD90 = RAD45 * 2;

const downSample = (radials, scale, resolution, options, palette) => {
	// no scaling, just pass through data
	if (scale === 1) return radials;

	const halfResolution = resolution / 2;

	// perform downsampling of each radial/moment combination
	return radials.map((radial) => {
		const newMomentData = [];
		// track max value for downsampling(d)
		let downsampled = null;
		let lastRemainder = 0;

		const azimuth = radial.azimuth * (Math.PI / 180) - halfResolution;

		// calculate maximum bin to plot based on azimuth
		// wrap azimuth to 90° offset by -45° (% in js is remainder, the formula below makes it in to modulus)
		const azWrap = (((azimuth - RAD45) % RAD90) + RAD90) % RAD90;
		// calculate a magnitude multiplier as 1/sin with 45° shift removed
		const azMagnitudeMult = 1 / Math.abs(Math.sin(azWrap + RAD45));
		const cropMaxBin = Math.ceil(Math.abs(options.cropTo / 2 * scale * azMagnitudeMult));

		// compare max calculated value with length of radial
		const maxBin = Math.min(cropMaxBin, radial.moment_data.length);

		for (let idx = 0; idx < maxBin; idx += 1) {
			// get the value
			const bin = radial.moment_data[idx];
			const remainder = idx % scale;
			// test for rollover in scaling
			if (remainder < lastRemainder) {
				// plot this point and reset values
				newMomentData.push(downsampled);
				downsampled = null;
			}
			// store this sample if it meets downsample requirements
			downsampled = palette.downSample(bin, downsampled);
			// store for rollover tracking
			lastRemainder = remainder;
		}

		return {
			...radial,
			moment_data: newMomentData,
		};
	});
};

module.exports = downSample;
