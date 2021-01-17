describe('salio', function() {
    const utils = require('../../../../assets/utils');

    utils.verifyRPCInterfaces('SalIO', [
        ['getSensors', []],
        ['getColor', ['red', 'green', 'blue']],
        ['isAlive', ['sensor']],
        ['authenticate', ['sensor', 'password']],
        ['clearControls', ['sensor', 'password']],
        ['removeControl', ['sensor', 'password', 'id']],
        ['addButton', ['sensor', 'password', 'x', 'y', 'width', 'height', 'color', 'textColor', 'id', 'event', 'text']],
        ['addTextField', ['sensor', 'password', 'x', 'y', 'width', 'height', 'color', 'textColor', 'id', 'event', 'text']],
        ['addCheckbox', ['sensor', 'password', 'x', 'y', 'checkColor', 'textColor', 'state', 'id', 'event', 'text']],
        ['addToggleswitch', ['sensor', 'password', 'x', 'y', 'checkColor', 'textColor', 'state', 'id', 'event', 'text']],
        ['addRadioButton', ['sensor', 'password', 'x', 'y', 'checkColor', 'textColor', 'state', 'id', 'group', 'event', 'text']],
        ['addLabel', ['sensor', 'password', 'x', 'y', 'textColor', 'id', 'text']],
        ['guiListen', ['sensor', 'password']],
        ['getToggleState', ['sensor', 'password', 'id']],
        ['getOrientation', ['sensor', 'password']],
        ['getCompassHeading', ['sensor', 'password']],
        ['getCompassHeadingDegrees', ['sensor', 'password']],
        ['getCompassDirection', ['sensor', 'password']],
        ['getCompassCardinalDirection', ['sensor', 'password']],
        ['getAccelerometer', ['sensor', 'password']],
        ['getAccelerometerNormalized', ['sensor', 'password']],
        ['getFacingDirection', ['sensor', 'password']],
        ['getGravity', ['sensor', 'password']],
        ['getGravityNormalized', ['sensor', 'password']],
        ['getLinearAcceleration', ['sensor', 'password']],
        ['getLinearAccelerationNormalized', ['sensor', 'password']],
        ['getGyroscope', ['sensor', 'password']],
        ['getRotation', ['sensor', 'password']],
        ['getGameRotation', ['sensor', 'password']],
        ['getMagneticFieldVector', ['sensor', 'password']],
        ['getMagneticFieldVectorNormalized', ['sensor', 'password']],
        ['getMicrophoneLevel', ['sensor', 'password']],
        ['getLocation', ['sensor', 'password']],
        ['getProximity', ['sensor', 'password']],
        ['getStepCount', ['sensor', 'password']],
        ['getLightLevel', ['sensor', 'password']],
        ['getImage', ['sensor', 'password']],



        ['setTotalRate', ['sensor', 'rate']],
        ['setClientRate', ['sensor', 'rate', 'penalty']],
        ['send', ['sensor', 'command']],
    ]);
});
