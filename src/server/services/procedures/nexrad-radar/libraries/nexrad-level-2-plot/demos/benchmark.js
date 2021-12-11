const { Level2Radar } = require('nexrad-level-2-data');
// eslint-disable-next-line import/no-extraneous-dependencies
const glob = require('glob');
const fs = require('fs');

const { plot, writePngToFile } = require('../src');

// list files
const files = glob.sync('./data/KLOT/KLOT20210812_171451_V*');	// ref palette tuning

// const store each file's data
const chunks = [];

// parse each file
files.forEach((file) => {
	const fileBuffer = fs.readFileSync(file);
	chunks.push(new Level2Radar(fileBuffer));
});

// combine data
const radarData = Level2Radar.combineData(chunks);

// result array by elevations
const plots = [];

const size = 1800;
const elevation = 1;

// plot for each elevation and size
(async () => {
	const start = new Date();
	for (let i = 0; i < 100; i += 1) {
		plots[elevation] = plot(radarData, ['REF', 'VEL'], {
			elevation,
			size,
			palettize: true,
			cropTo: size / 2,
		});

		// write files to disk
		await Promise.allSettled([
			writePngToFile(`./output/REF-${elevation}-${size}--${i}.png`, plots[elevation].REF),
			writePngToFile(`./output/VEL-${elevation}-${size}--${i}.png`, plots[elevation].VEL),
		]);
	}
	const end = new Date();
	console.log(`Total Time: ${(end - start) / 1000}`);
})();
