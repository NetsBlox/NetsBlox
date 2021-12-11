// radial run-length encoding
// encode run length data to the adjacent radials, instead of along the length of the radial

const findTotalMatches = (radials, startI, binIdx, resolutionThreshold) => {
	// get the target value
	const target = radials[startI].moment_data[binIdx];
	// check for null
	if (target === null) return false;

	// start a counter for matches
	let count = 1;

	// start a counter for the remaining radials
	let nextI = startI + 1;

	// track the current azimuth
	let currentAzimuth = radials[startI].azimuth;

	// loop ending variable
	let checkNext = true;

	// loop through all available radials and count up matches
	// end condition is the number of radials available
	// a radial not within the resolution threshold
	// or the binIdx under test not present in one of the next radials
	while (nextI < radials.length && checkNext) {
		// reset flag
		checkNext = false;
		const nextAzimuth = radials[nextI].azimuth;
		if (nextAzimuth - currentAzimuth < resolutionThreshold) {
			// get the next bin
			const nextBin = radials[nextI].moment_data[binIdx];
			// check for match, and out of bounds condition above will return undefined which will fail the match
			if (nextBin === target) {
				// we matched, let the next loop iteration run
				checkNext = true;
				// update values for next round
				currentAzimuth = nextAzimuth;
				nextI += 1;
				count += 1;
			}
		}
	}
	// don't return a count of 1 if no matches were found
	if (count === 1) return false;
	return count;
};

const rrle = (radials, resolutionRad) => {
	// calculate the nominal angle to the next radial plus 20% to easily account for floating point inaccuracies
	const resolutionThreshold = resolutionRad * 180 / Math.PI * 1.2;
	// sort the radials by azimuth, 0 > 360
	const sorted = radials.sort((a, b) => a.azimuth - b.azimuth);

	// scan each radial
	const maxRadial = sorted.length;
	for (let i = 0; i < maxRadial; i += 1) {
		// get this radial
		const radial = sorted[i];

		// look at each bin on the radial
		radial.moment_data.forEach((bin, binIdx) => {
			const totalMatches = findTotalMatches(radials, i, binIdx, resolutionThreshold);
			// if a total match was found update the bin data and null out the remaining bins in the run
			if (totalMatches) {
				radial.moment_data[binIdx] = { value: bin, count: totalMatches };
				for (let clearI = i + 1; clearI <= i + totalMatches - 1; clearI += 1) {
					sorted[clearI].moment_data[binIdx] = null;
				}
			}
		});
	}

	return radials;
};

module.exports = rrle;
