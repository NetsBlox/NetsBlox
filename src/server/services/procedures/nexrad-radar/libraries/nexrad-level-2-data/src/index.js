const parseData = require('./parsedata');
const combineData = require('./combinedata');

class Level2Radar {
	constructor(file, options) {
		this.elevation = 1;	// 1 based per NOAA documentation
		// default mode, parse file from buffer
		if (file instanceof Buffer) {
		// options and defaults
			this.options = {
				...options,
			};
			const {
				data, header, vcp, hasGaps, isTruncated,
			} = parseData(file, options);
			this.data = data;
			this.header = header;
			this.vcp = vcp;
			this.hasGaps = hasGaps;
			this.isTruncated = isTruncated;
		} else if (typeof file === 'object' && (file.data && file.header && file.vcp)) {
		// alternative mode data is fed in as a pre-formatted object as the result of the combine static function
			this.data = file.data;
			this.elevation = file.elevation;
			this.header = file.header;
			this.options = file.options;
			this.vcp = file.vcp;
			this.hasGaps = file.hasGaps;
			this.isTruncated = file.isTruncated;
		} else {
			throw new Error('Unknown data provided');
		}
	}

	setElevation(elevation) {
		this.elevation = elevation;
	}

	getAzimuth(scan) {
		// error checking
		if (this?.data?.[this.elevation] === undefined) throw new Error(`getAzimuth invalid elevation selected: ${this.elevation}`);

		if (scan !== undefined) {
			this._checkData();
			if (this?.data?.[this.elevation] === undefined) throw new Error(`getAzimuth invalid elevation selected: ${this.elevation}`);
			if (this?.data?.[this.elevation]?.[scan] === undefined) throw new Error(`getAzimuth invalid scan selected: ${scan}`);
			if (this?.data?.[this.elevation]?.[scan]?.record?.azimuth === undefined) throw new Error(`getAzimuth no data for elevation: ${this.elevation}, scan: ${scan}`);

			// return data
			return this.data[this.elevation][scan].record.azimuth;
		}
		return this.data[this.elevation].map((i) => i.record.azimuth);
	}

	getScans() {
		// error checking
		this._checkData();
		if (this?.data?.[this.elevation] === undefined) throw new Error(`getScans no data for elevation: ${this.elevation}`);
		return this.data[this.elevation].length;
	}

	// return reflectivity data for the current elevation and scan
	getHighresReflectivity(scan) {
		// error checking
		this._checkData();
		if (this?.data?.[this.elevation] === undefined) throw new Error(`getHighresReflectivity invalid elevation selected: ${this.elevation}`);

		if (scan !== undefined) {
			// error checking
			if (this?.data?.[this.elevation]?.[scan] === undefined) throw new Error(`getHighresReflectivity invalid scan selected: ${scan}`);
			if (this?.data?.[this.elevation]?.[scan]?.record?.reflect === undefined) throw new Error(`getHighresReflectivity no data for elevation: ${this.elevation}, scan: ${scan}`);
			// return data
			return this.data[this.elevation][scan].record.reflect;
		}
		return this.data[this.elevation].map((i) => i.record.reflect);
	}

	// return message_header information
	getHeader(scan) {
		// error checking
		this._checkData();
		this.elevation = 1
		//if (this.data[this.elevation] === undefined) throw new Error(`getHeader invalid elevation selected: ${this.elevation}`);

		if (scan !== undefined) {
			if (this?.data?.[this.elevation]?.[scan] === undefined) throw new Error(`getHeader invalid scan selected: ${scan}`);
			if (this?.data?.[this.elevation]?.[scan]?.record === undefined) throw new Error(`getHeader no data for elevation: ${this.elevation}, scan: ${scan}`);

			// return data
			return this.data[this.elevation][scan].record;
		}
		return this.data[this.elevation].map(((i) => i.record));
	}

	// return velocity data for the current elevation and scan
	getHighresVelocity(scan) {
		// error checking
		this._checkData();
		if (this?.data?.[this.elevation] === undefined) throw new Error(`getHighresVelocity invalid elevation selected: ${this.elevation}`);

		if (scan !== undefined) {
			// error checking
			if (this?.data?.[this.elevation]?.[scan] === undefined) throw new Error(`getHighresVelocity invalid scan selected: ${scan}`);
			if (this?.data?.[this.elevation]?.[scan]?.record?.reflect === undefined) throw new Error(`getHighresVelocity no data for elevation: ${this.elevation}, scan: ${scan}`);

			// return data
			return this.data[this.elevation][scan].record.velocity;
		}
		return this.data[this.elevation].map((i) => i.record.velocity);
	}

	// return spectrum data for the current elevation and scan
	getHighresSpectrum(scan) {
		// error checking
		this._checkData();
		if (this?.data?.[this.elevation] === undefined) throw new Error(`getHighresSpectrum invalid elevation selected: ${this.elevation}`);

		if (scan !== undefined) {
			if (this?.data?.[this.elevation]?.[scan] === undefined) throw new Error(`getHighresSpectrum invalid scan selected: ${scan}`);
			if (this?.data?.[this.elevation]?.[scan]?.record?.spectrum === undefined) throw new Error(`getHighresSpectrum no data for elevation: ${this.elevation}, scan: ${scan}`);

			// return data
			return this.data[this.elevation][scan].record.spectrum;
		}
		return this.data[this.elevation].map((i) => i.record.spectrum);
	}

	// return diff reflectivity data for the current elevation and scan
	getHighresDiffReflectivity(scan) {
		// error checking
		this._checkData();
		if (this?.data?.[this.elevation] === undefined) throw new Error(`getHighresDiffReflectivity invalid elevation selected: ${this.elevation}`);

		if (scan !== undefined) {
			if (this?.data?.[this.elevation]?.[this.scan] === undefined) throw new Error(`getHighresDiffReflectivity invalid scan selected: ${this.scan}`);
			if (this?.data?.[this.elevation]?.[this.scan]?.record?.zdr === undefined) throw new Error(`getHighresDiffReflectivity no data for elevation: ${this.elevation}, scan: ${this.scan}`);

			// return data
			return this.data[this.elevation][this.scan].record.zdr;
		}
		return this.data[this.elevation].map((i) => i.record.zdr);
	}

	// return diff phase data for the current elevation and scan
	getHighresDiffPhase(scan) {
		// error checking
		this._checkData();
		if (this?.data?.[this.elevation] === undefined) throw new Error(`getHighresDiffPhase invalid elevation selected: ${this.elevation}`);

		if (scan !== undefined) {
			if (this?.data?.[this.elevation]?.[this.scan] === undefined) throw new Error(`getHighresDiffPhase invalid scan selected: ${this.scan}`);
			if (this?.data?.[this.elevation]?.[this.scan]?.record?.phi === undefined) throw new Error(`getHighresDiffPhase no data for elevation: ${this.elevation}, scan: ${this.scan}`);

			// return data
			return this.data[this.elevation][this.scan].record.phi;
		}
		return this.data[this.elevation].map((i) => i.record.phi);
	}

	// return correlation coefficient data for the current elevation and scan
	getHighresCorrelationCoefficient(scan) {
		// error checking
		this._checkData();
		if (this?.data?.[this.elevation] === undefined) throw new Error(`getHighresCorrelationCoefficient invalid elevation selected: ${this.elevation}`);

		if (scan !== undefined) {
			if (this?.data?.[this.elevation]?.[this.scan] === undefined) throw new Error(`getHighresCorrelationCoefficient invalid scan selected: ${this.scan}`);
			if (this?.data?.[this.elevation]?.[this.scan]?.record?.rho === undefined) throw new Error(`getHighresCorrelationCoefficient no data for elevation: ${this.elevation}, scan: ${this.scan}`);

			// return data
			return this.data[this.elevation][this.scan].record.rho;
		}
		return this.data[this.elevation].map((i) => i.record.rho);
	}

	listElevations() {
		return Object.keys(this.data).map((key) => +key);
	}

	_checkData() {
		if (this.data.length === 0) throw new Error('No data found in file');
	}

	static combineData(...args) {
		const data = combineData(args);

		// pass through constructor alternative signature to get a Level2Object
		return new Level2Radar(data);
	}
}

module.exports.Level2Radar = Level2Radar;
