// decompress a nexrad level 2 archive, or return the provided file if it is not compressed

// bzip
const bzip = require('seek-bzip');

// structured byte access
const { RandomAccessFile, BIG_ENDIAN } = require('nexrad-level-2-data/src/classes/RandomAccessFile');

// constants
const { FILE_HEADER_SIZE } = require('nexrad-level-2-data/src/constants');

const decompress = (raf) => {
	// if file length is less than or equal to the file header size then it is not compressed
	if (raf.getLength() <= FILE_HEADER_SIZE) return raf;
	let headerSize = 0;
	// get the compression record
	const compressionRecord = readCompressionHeader(raf);

	// test for the magic number 'BZh' for a bzip compressed file
	if (compressionRecord.header !== 'BZh') {
		// not compressed, try again with after skipping the file header (first chunk or complete archive)
		raf.seek(0);
		raf.skip(FILE_HEADER_SIZE);
		headerSize = FILE_HEADER_SIZE;
		const fullCompressionRecord = readCompressionHeader(raf);
		if (fullCompressionRecord.header !== 'BZh') {
			// not compressed in either form, return the original file at the begining
			raf.seek(0);
			return raf;
		}
	}
	// compressed file, start decompressing
	// the format is (int) size of block + 'BZh9' + compressed data block, repeat
	// start by locating the begining of each compressed block by jumping to each offset noted by the size header
	const positions = [];
	// jump back before the first detected compression header
	raf.seek(raf.getPos() - 8);

	// loop until the end of the file is reached
	while (raf.getPos() < raf.getLength()) {
		// block size may be negative
		const size = Math.abs(raf.readInt());
		// store the position
		positions.push({
			pos: raf.getPos(),
			size,
		});
		// jump forward
		raf.seek(raf.getPos() + size);
	}

	// reuse the original header if present
	const outBuffers = [raf.buffer.slice(0, headerSize)];

	// loop through each block and decompress it
	positions.forEach((block) => {
		// extract the block from the buffer
		const compressed = raf.buffer.slice(block.pos, block.pos + block.size);
		const output = bzip.decodeBlock(compressed, 32); // skip 32 bits 'BZh9' header
		outBuffers.push(output);
	});

	// combine the buffers
	const outBuffer = Buffer.concat(outBuffers);

	// pass the buffer to RandomAccessFile and return the result
	return new RandomAccessFile(outBuffer, BIG_ENDIAN);
};

// compression header is (int) size of block + 'BZh' + one character block size
const readCompressionHeader = (raf) => ({
	size: raf.readInt(),
	header: raf.readString(3),
	block_size: raf.readString(1),
});

module.exports = decompress;
