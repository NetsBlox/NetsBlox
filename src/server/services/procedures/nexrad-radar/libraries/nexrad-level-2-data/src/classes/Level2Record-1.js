// parse message type 1
module.exports = (raf, message) => {
	message.record = {
		mseconds: raf.readInt(),
		julian_date: raf.readShort(),
		range: raf.readShort(),
		azmith_angle: raf.readShort(),
		radial_number: raf.readShort(),
		radial_status: raf.readShort(),
		elevation_angle: raf.readShort(),
		elevation_number: raf.readShort(),
		reflect_first_gate: raf.readShort(),
		doppler_first_gate: raf.readShort(),
		reflect_gate_size: raf.readShort(),
		doppler_gate_size: raf.readShort(),
		reflect_gate_count: raf.readShort(),
		doppler_gate_count: raf.readShort(),
		cut: raf.readShort(),
		calibration: raf.readFloat(),
		reflect_offset: raf.readShort(),
		velocity_offset: raf.readShort(),
		width_offset: raf.readShort(),
		resolution: raf.readShort(),
		vcp: raf.readShort(),
	};

	raf.skip(14);

	message.record.nyquist_vel = raf.readShort();
	message.record.attenuation = raf.readShort();
	message.record.threshold = raf.readShort();
	message.record.has_reflection_data = message.record.reflect_gate_count > 0;
	message.record.has_doppler_data = message.record.doppler_gate_count > 0;

	return message;
};
