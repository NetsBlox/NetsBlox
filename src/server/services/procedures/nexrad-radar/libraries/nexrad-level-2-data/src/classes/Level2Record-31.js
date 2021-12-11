const { Level2Parser } = require('nexrad-level-2-data/src/classes/Level2Parser');
const { MESSAGE_HEADER_SIZE } = require('nexrad-level-2-data/src/constants');

// parse message type 31
module.exports = (raf, message, offset) => {
	const record = {
		id: raf.readString(4),
		mseconds: raf.readInt(),
		julian_date: raf.readShort(),
		radial_number: raf.readShort(),
		azimuth: raf.readFloat(),
		compress_idx: raf.readByte(),
		sp: raf.readByte(),
		radial_length: raf.readShort(),
		ars: raf.readByte(),
		rs: raf.readByte(),
		elevation_number: raf.readByte(),
		cut: raf.readByte(),
		elevation_angle: raf.readFloat(),
		rsbs: raf.readByte(),
		aim: raf.readByte(),
		dcount: raf.readShort(),
	};

	// basic data integrity check
	try {
		if (!record.id.match(/[A-Z]{4}/)) throw new Error(`Invalid record id: ${record.id}`);
		if (record.mseconds > 86401000) throw new Error(`Invalid timestamp (ms): ${record.mseconds}`); // account for leap second
	} catch (e) {
		// return the un-altered message
		console.error(e.message);
		return message;
	}
	message.record = record;

	/**
	 * Read and save the data pointers from the file
	 * so we know where to start reading within the file
	 * to grab the data from the data blocks
	 * See page 114 of https://www.roc.noaa.gov/wsr88d/PublicDocs/ICDs/RDA_RPG_2620002P.pdf
	 */
	const dbp = [];
	for (let i = 0; i < 9; i += 1) {
		const pointer = raf.readInt();
		if (i < message.record.dcount) dbp.push(pointer);
	}

	/**
	 * Parse all of our data inside the datablocks
	 * and save it to the message.record Object
	 */

	// block type to friendly name conversion
	const blockTypesFriendly = {
		VOL: 'volume',
		ELE: 'elevation',
		RAD: 'radial',
		REF: 'reflect',
		VEL: 'velocity',
		'SW ': 'spectrum',	// intentional space to fill 3-character requirement
		ZDR: 'zdr',
		PHI: 'phi',
		RHO: 'rho',
	};

	// convert halfwords to bytes for message size
	const messageSizeBytes = message.message_size * 2;

	// hold a previous data block until the next data block is verified as valid
	let prevRecord = false;
	let prevBlockStart = 0;
	// process blocks, the order of the blocks is not guaranteed so the name must be used to select proper parser
	for (let i = 0; i < dbp.length; i += 1) {
		// set up the parser
		const parser = new Level2Parser(raf, dbp[i], offset);
		const parserStartPos = parser.getPos();

		// console.log(`raf position: ${parser.getPos()}`);
		try {
			const { name } = blockName(parser);
			// no error was thrown, store the previous record
			if (prevRecord && blockTypesFriendly[prevRecord.name]) {
				// store the record under a friendly name
				message.record[blockTypesFriendly[prevRecord.name]] = prevRecord;
			}
			// reset the previous record
			prevRecord = false;

			// length check
			if (dbp[i] < messageSizeBytes) {
			// get the record based on known block names
				let thisRecord = false;
				switch (name) {
				case 'VOL':
					thisRecord = parseVolumeData(parser);
					break;
				case 'ELV':
					thisRecord = parseElevationData(parser);
					break;
				case 'RAD':
					thisRecord = parseRadialData(parser);
					break;
				default:
					thisRecord = parseMomentData(parser);
				}
				// store returned value for validation checking on next block
				prevRecord = thisRecord;
			} else {
				throw new Error(`Block overruns file at ${raf.getPos()}`);
			}
			// store the previous block position since this block was ok
			prevBlockStart = parserStartPos;
		} catch (e) {
			console.log(e.message);
			// clear out the previous record
			prevRecord = false;

			// set flag to search for next block
			message.endedEarly = prevBlockStart;
			break;
		}
	}

	// we can't yet check the integrity of the last block so we'll just accept that it's correct for now
	if (prevRecord && blockTypesFriendly[prevRecord.name]) {
		// store the record under a friendly name
		message.record[blockTypesFriendly[prevRecord.name]] = prevRecord;
	}

	return message;
};

/**
 * Creates a new parser and grabs the data
 * from the data blocks. Then save that data
 * to the record.volume Object
 * See page 114; Section "Data Block #1" https://www.roc.noaa.gov/wsr88d/PublicDocs/ICDs/RDA_RPG_2620002P.pdf
 */
const parseVolumeData = (parser) => ({
	block_type: parser.getDataBlockString(1),
	name: parser.getDataBlockString(3),
	size: parser.getDataBlockShort(),
	version_major: parser.getDataBlockByte(),
	version_minor: parser.getDataBlockByte(),
	latitude: parser.getDataBlockFloat(),
	longitude: parser.getDataBlockFloat(),
	elevation: parser.getDataBlockShort(),
	feedhorn_height: parser.getDataBlockShort(),
	calibration: parser.getDataBlockFloat(),
	tx_horizontal: parser.getDataBlockFloat(),
	tx_vertical: parser.getDataBlockFloat(),
	differential_reflectivity: parser.getDataBlockFloat(),
	differential_phase: parser.getDataBlockFloat(),
	volume_coverage_pattern: parser.getDataBlockShort(),
	spare: parser.getDataBlockShort(),
});

/**
	 * Creates a new parser and grabs the data
	 * from the data blocks. Then save that data
	 * to the record.elevation Object
	 * See page 114; Section "Data Block #2" https://www.roc.noaa.gov/wsr88d/PublicDocs/ICDs/RDA_RPG_2620002P.pdf
	 */
const parseElevationData = (parser) => ({
	block_type: parser.getDataBlockString(1),
	name: parser.getDataBlockString(3),
	size: parser.getDataBlockShort(),
	atmos: parser.getDataBlockShort(),
	calibration: parser.getDataBlockFloat(),
});

/**
	 * Creates a new parser and grabs the data
	 * from the data blocks. Then save that data
	 * to the record.radial Object
	 * See page 115; Section "Data Block #3" https://www.roc.noaa.gov/wsr88d/PublicDocs/ICDs/RDA_RPG_2620002P.pdf
	 */
const parseRadialData = (parser) => ({
	block_type: parser.getDataBlockString(1),
	name: parser.getDataBlockString(3),
	size: parser.getDataBlockShort(),
	unambiguous_range: parser.getDataBlockShort() / 10,
	horizontal_noise_level: parser.getDataBlockFloat(),
	vertical_noise_level: parser.getDataBlockFloat(),
	nyquist_velocity: parser.getDataBlockShort(),
	radial_flags: parser.getDataBlockShort(),
	horizontal_calibration: parser.getDataBlockFloat(),
	vertical_calibration: parser.getDataBlockFloat(),
});

/**
	 * Creates a new parser and grabs the data
	 * from the data blocks. Then save that data
	 * to the record.(reflect|velocity|spectrum|zdr|phi|rho)
	 * Object base on what type being parsed
	 * See page 115-117; Section "Data Block #4-9" https://www.roc.noaa.gov/wsr88d/PublicDocs/ICDs/RDA_RPG_2620002P.pdf
	 */
const parseMomentData = (parser) => {
	// initial offset for moment data
	const data = {
		block_type: parser.getDataBlockString(1),
		name: parser.getDataBlockString(3),
		spare: parser.getDataBlockBytes(4),
		gate_count: parser.getDataBlockShort(),
		first_gate: parser.getDataBlockShort() / 1000, // scale int to float 0.001 precision
		gate_size: parser.getDataBlockShort() / 1000, // scale int to float 0.001 precision
		rf_threshold: parser.getDataBlockShort() / 10, // scale int to float 0.1 precision
		snr_threshold: parser.getDataBlockShort() / 1000, // scale int to float 0.001 precision
		control_flags: parser.getDataBlockByte(),
		data_size: parser.getDataBlockByte(),
		scale: parser.getDataBlockFloat(),
		offset: parser.getDataBlockFloat(),
		moment_data: [],
	};

	// allow for different sized data blocks
	let getDataBlock = parser.getDataBlockByte.bind(parser);
	let inc = 1;
	if (data.data_size === 16) {
		getDataBlock = parser.getDataBlockShort.bind(parser);
		inc = 2;
	}

	const endI = data.gate_count * inc + MESSAGE_HEADER_SIZE;

	parser.seek(MESSAGE_HEADER_SIZE);
	for (let i = MESSAGE_HEADER_SIZE; i < endI; i += inc) {
		const val = getDataBlock();
		// per documentation 0 = below threshold, 1 = range folding
		if (val >= 2) {
			data.moment_data.push((val - data.offset) / data.scale);
		} else {
			data.moment_data.push(null);
		}
	}
	return data;
};

// return the block name and return the pointer to the begining of the block
// return false if "D" is not present at byte 0
const blockName = (parser) => {
	// get data
	const type = parser.getDataBlockString(1);
	const name = parser.getDataBlockString(3);

	// skip back
	parser.seek(0);

	// basic data integrity check
	if (!(type === 'D' || type === 'R')) {
		throw new Error(`Invalid data block type: 0x${(type.charCodeAt(0) || 0).toString(16).padStart(2, '0')} at ${parser.getPos()}`);
	}
	return { name, type };
};
