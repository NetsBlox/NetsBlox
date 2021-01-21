const utils = require('../../../../assets/utils');

describe.only(utils.suiteName(__filename), function() {
    utils.verifyRPCInterfaces('PhoneIoT', [
        ['getDevices', []],
        ['getColor', ['red', 'green', 'blue']],
        ['isAlive', ['device']],
        ['authenticate', ['device', 'password']],
        ['clearControls', ['device', 'password']],
        ['removeControl', ['device', 'password', 'id']],
        ['addButton', ['device', 'password', 'x', 'y', 'width', 'height', 'color', 'textColor', 'id', 'event', 'text']],
        ['addTextField', ['device', 'password', 'x', 'y', 'width', 'height', 'color', 'textColor', 'id', 'event', 'text']],
        ['addCheckbox', ['device', 'password', 'x', 'y', 'checkColor', 'textColor', 'state', 'id', 'event', 'text']],
        ['addToggleswitch', ['device', 'password', 'x', 'y', 'checkColor', 'textColor', 'state', 'id', 'event', 'text']],
        ['addRadioButton', ['device', 'password', 'x', 'y', 'checkColor', 'textColor', 'state', 'id', 'group', 'event', 'text']],
        ['addLabel', ['device', 'password', 'x', 'y', 'textColor', 'id', 'text']],
        ['listen', ['device', 'password']],
        ['getToggleState', ['device', 'password', 'id']],
        ['getOrientation', ['device', 'password']],
        ['getCompassHeading', ['device', 'password']],
        ['getCompassHeadingDegrees', ['device', 'password']],
        ['getCompassDirection', ['device', 'password']],
        ['getCompassCardinalDirection', ['device', 'password']],
        ['getAccelerometer', ['device', 'password']],
        ['getAccelerometerNormalized', ['device', 'password']],
        ['getFacingDirection', ['device', 'password']],
        ['getGravity', ['device', 'password']],
        ['getGravityNormalized', ['device', 'password']],
        ['getLinearAcceleration', ['device', 'password']],
        ['getLinearAccelerationNormalized', ['device', 'password']],
        ['getGyroscope', ['device', 'password']],
        ['getRotation', ['device', 'password']],
        ['getGameRotation', ['device', 'password']],
        ['getMagneticFieldVector', ['device', 'password']],
        ['getMagneticFieldVectorNormalized', ['device', 'password']],
        ['getMicrophoneLevel', ['device', 'password']],
        ['getLocation', ['device', 'password']],
        ['getProximity', ['device', 'password']],
        ['getStepCount', ['device', 'password']],
        ['getLightLevel', ['device', 'password']],
        ['getImage', ['device', 'password']],



        ['setTotalRate', ['device', 'rate']],
        ['setClientRate', ['device', 'rate', 'penalty']],
        ['send', ['device', 'command']],
    ]);
});
