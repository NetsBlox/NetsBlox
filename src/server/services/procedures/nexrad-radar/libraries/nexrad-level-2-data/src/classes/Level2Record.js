const {
	FILE_HEADER_SIZE, RADAR_DATA_SIZE, CTM_HEADER_SIZE,
} = require('nexrad-level-2-data/src/constants');

// message parsers
const parseMessage1 = require('nexrad-level-2-data/src/classes/Level2Record-1');
const parseMessage31 = require('nexrad-level-2-data/src/classes/Level2Record-31');
const parseMessage5 = require('nexrad-level-2-data/src/classes/Level2Record-5-7');
const { level2RecordSearch } = require('nexrad-level-2-data/src/classes/Level2RecordSearch');
/**
 * Returns a record from the loaded radar data
 */
class Level2Record {
	constructor(raf, record, message31Offset, header, options) {
		// calculate header size if not provided (typically in chunks mode)
		let headerSize = 0;
		if (header?.ICAO) headerSize = FILE_HEADER_SIZE;

		this._record_offset = record * RADAR_DATA_SIZE + headerSize + message31Offset;
		this.options = options;

		// passed the buffer, finished reading the file
		if (this._record_offset >= raf.getLength()) return { finished: true };

		// return the current record data
		const message = this.getRecord(raf);

		// test for early termination flag
		if (!message.endedEarly) return message;

		// start a search for the next message
		const nextRecordPos = level2RecordSearch(raf, message.endedEarly, header?.modified_julian_date);
		if (nextRecordPos === false) {
			throw new Error(`Unable to recover message at ${this._record_offset}`);
		}
		message.actual_size = (nextRecordPos - this._record_offset) / 2 - CTM_HEADER_SIZE;
		return message;
	}

	getRecord(raf) {
		raf.seek(this._record_offset);
		raf.skip(CTM_HEADER_SIZE);

		const message = {
			message_size: raf.readShort(),
			channel: raf.readByte(),
			message_type: raf.readByte(),
			id_sequence: raf.readShort(),
			message_julian_date: raf.readShort(),
			message_mseconds: raf.readInt(),
			segment_count: raf.readShort(),
			segment_number: raf.readShort(),
		};

		switch (message.message_type) {
		case 31: return parseMessage31(raf, message, this._record_offset, this.options);
		case 1: return parseMessage1(raf, message);
		case 5:
		case 7: return parseMessage5(raf, message);
		default: return false;
		}
	}
}

module.exports.Level2Record = Level2Record;
