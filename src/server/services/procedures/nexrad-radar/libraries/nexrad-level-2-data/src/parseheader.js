const { FILE_HEADER_SIZE } = require('nexrad-level-2-data/src/constants');

const parse = (raf) => {
	// check for fixed 'AR2V00' value
	const identifier = raf.readString(6);

	if (identifier === 'AR2V00') {
		const header = {};
		header.version = raf.readString(2);
		raf.skip('.001'.length);
		header.modified_julian_date = raf.readInt();
		header.milliseconds = raf.readInt();
		header.ICAO = raf.readString(4);
		// start over to grab the raw header
		raf.seek(0);
		header.raw = raf.read(FILE_HEADER_SIZE);
		return header;
	}
	// no header, skip to begining of file
	raf.seek(0);
	return {};
};

module.exports = parse;
