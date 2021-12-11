// attempt to search for the next message by looking for some known values

const level2RecordSearch = (raf, startPos, julianDate) => {
	// if julian date if provided (typically when processing chunks) a search cannot be performed
	if (julianDate === undefined) return false;

	// set up the raf at the start position
	raf.seek(startPos);
	// try searching with the provided julian date
	const result = search(raf, julianDate);
	// return the result if found
	if (result) return result;

	// try again with julian date + 1 in case this happened right at midnight
	raf.seek(startPos);
	return search(raf, julianDate + 1);
};

const search = (raf, date) => {
	// calculate end of file after subtracting our search bytes
	const endOfFile = raf.buffer.length - 10;
	const found = false;
	// search until the end of the file or the data we're looking for is found
	while (!found && raf.getPos() < endOfFile) {
		let skipBack = 2;
		// read two bytes
		if (raf.readShort() === date) {
			// skip the next 4 bytes (millisecond timestamp)
			raf.skip(4);
			skipBack += 8;
			// test the next 4 bytes for 0x0001 0x0001

			if (raf.readShort() === 0x0001 && raf.readShort() === 0x0001) {
				// found a block!
				// calculate the begining of the next block after the checks above including 6*2 bytes at the start of the header that we don't use for searching
				const foundAt = raf.getPos() - skipBack - 6;

				console.log(`Found next block at ${foundAt}`);
				// return the actual block length
				return foundAt;
			}

			raf.skip(-skipBack);
		}
	}
	// not found, return false
	return false;
};

module.exports = {
	level2RecordSearch,
};
