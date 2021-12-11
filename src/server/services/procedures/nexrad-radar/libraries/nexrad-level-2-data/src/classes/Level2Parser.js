const { MESSAGE_HEADER_SIZE } = require('nexrad-level-2-data/src/constants');

class Level2Parser {
	constructor(raf, dbp, offset) {
		this._raf = raf;
		this._dbp = dbp;
		this._record_offset = offset ?? null;

		this.offset = this._dbp + this._record_offset + MESSAGE_HEADER_SIZE;
		// reset raf to the begining of this record
		this.seek(0);
	}

	// all byte indexing operations are handled by the random access file
	seek(offset) {
		this._raf.seek(this.offset + offset);
	}

	getDataBlockByte() {
		return this._raf.read();
	}

	getDataBlockInt() {
		return this._raf.readInt();
	}

	getDataBlockBytes(size) {
		return this._raf.read(size);
	}

	getDataBlockShort() {
		return this._raf.readShort();
	}

	getDataBlockFloat() {
		return this._raf.readFloat();
	}

	getDataBlockString(size) {
		return this._raf.readString(size);
	}

	getPos() {
		return this._raf.getPos();
	}
}

module.exports.Level2Parser = Level2Parser;
