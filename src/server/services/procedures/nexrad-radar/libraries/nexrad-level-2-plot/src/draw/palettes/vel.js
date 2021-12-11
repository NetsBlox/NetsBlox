const palette = [
	// 0: green/outbound
	0, 255, 0, 255,
	0, 240, 0, 255,
	0, 223, 0, 255,
	0, 206, 0, 255,
	0, 189, 0, 255,
	0, 172, 0, 255,
	0, 155, 0, 255,
	0, 138, 0, 255,
	16, 121, 16, 255,
	32, 113, 32, 255,
	48, 104, 48, 255,

	// 11: nearly zero
	64, 95, 64, 255,
	95, 64, 64, 255,

	// 13: red/inbound
	104, 32, 32, 255,
	113, 16, 16, 255,
	121, 0, 0, 255,
	138, 0, 0, 255,
	155, 0, 0, 255,
	172, 0, 0, 255,
	189, 0, 0, 255,
	206, 0, 0, 255,
	223, 0, 0, 255,
	240, 0, 0, 255,
	255, 0, 0, 255,

	// 24: transparent
	255, 255, 255, 0,
];

const downSample = (cur, prev) => {
	// no data, use previous value
	if (cur === null) return prev;
	// test for magnitude change, prev may be null but Math.abs(null) === 0 so this is valid
	if (Math.abs(cur) >= Math.abs(prev)) return cur;
	return prev;
};

const limits = 	[-99, -90, -80, -70, -60, -50, -40, -30, -20, -15, -10, -5, 0, 5, 10, 15, 20, 30, 40, 50, 60, 70, 80, 90, 99,
];

const downSampleReset = null;

const maxDbzIndex = 12; // index of maximum dbz

const transparentIndex = 24;

module.exports = {
	palette,
	downSample,
	limits,
	downSampleReset,
	maxDbzIndex,
	transparentIndex,
};
