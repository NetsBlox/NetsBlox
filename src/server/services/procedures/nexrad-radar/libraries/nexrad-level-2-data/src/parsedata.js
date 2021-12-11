const { RandomAccessFile, BIG_ENDIAN } = require('nexrad-level-2-data/src/classes/RandomAccessFile');
const { Level2Record } = require('nexrad-level-2-data/src/classes/Level2Record');
const { RADAR_DATA_SIZE } = require('nexrad-level-2-data/src/constants');
const decompress = require('nexrad-level-2-data/src/decompress');
const parseHeader = require('nexrad-level-2-data/src/parseheader');

/**
* Loads the file and parses the data.
* Returns a promise when completed
*/
const parseData = (file, options) => {
	/**
					 * Load and access the radar archive file.
					 * The constructor for RandomAccessFile returns
					 * a promise. This allows for parsing the data
					 * after the file has been fully loaded into the
					 * buffer.
					 */
	const rafCompressed = new RandomAccessFile(file, BIG_ENDIAN);
	const data = [];

	// decompress file if necessary, returns original file if no compression exists
	const raf = decompress(rafCompressed);

	// read the file header
	const header = parseHeader(raf);

	let messageOffset31 = 0; // the current message 31 offset
	let recordNumber = 0; // the record number

	/**
				 * Loop through all of the messages
				 * contained within the radar archive file.
				 * Save all the data we find to it's respective array
				 */
	let r;
	let vcp = {};
	let hasGaps = false;
	let isTruncated = false;

	// make sure there's more data, it's possible we're only decoding the header
	if (raf.getPos() < raf.getLength()) {
		do {
			try {
				r = new Level2Record(raf, recordNumber, messageOffset31, header, options);
				recordNumber += 1;
			} catch (e) {
			// parsing error, report error then set this chunk as finished
				console.error(e);
				isTruncated = true;
				r = { finished: true };
			}

			if (!r.finished) {
				if (r.message_type === 31) {
				// found a message 31 type, update the offset using an actual (from search) size if provided
					const messageSize = r.actual_size ?? r.message_size;
					// if actual_size is present set gaps flag
					hasGaps = true;
					messageOffset31 += (messageSize * 2 + 12 - RADAR_DATA_SIZE);
				}

				// only process specific message types
				if ([1, 5, 7, 31].includes(r.message_type)) {
				// If data is found, push the record to the data array
					if (r?.record?.reflect
					|| r?.record?.velocity
					|| r?.record?.spectrum
					|| r?.record?.zdr
					|| r?.record?.phi
					|| r?.record?.rho) data.push(r);

					if ([5, 7].includes(r.message_type)) vcp = r;
				}
			}
		} while (!r.finished);
	}

	// sort and group the scans by elevation asc
	return {
		data: groupAndSortScans(data),
		header,
		vcp,
		isTruncated,
		hasGaps,
	};
};

/**
     * This takes the scans (aka sweeps) and groups them
     * by their elevation numbers.
     */
const groupAndSortScans = (scans) => {
	const groups = [];

	// map the scans
	scans.forEach((scan) => {
		const { elevation_number: elevationNumber } = scan.record;

		/**
					 * If the group has already been created
					 * just push the current scan into the array
					 * or create a new group for the elevation
					 */
		if (groups[elevationNumber]) {
			groups[elevationNumber].push(scan);
		} else {
			groups[elevationNumber] = [scan];
		}
	});

	return groups;
};

module.exports = parseData;
