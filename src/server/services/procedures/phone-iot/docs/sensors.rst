Sensors
=======

This section covers all of the RPCs that are specific to actively retrieving sensor data from the device.
Each of these sensors has an equivelent passive form of access through :ref:`listenToSensors`.
The sensor names and message fields are provided for each sensor.

.. _getAccelerometer:

``getAccelerometer(device)``
----------------------------

Gets the current output of the accelerometer sensor, if the device supports it.
This is a vector representing the acceleration along the ``x``, ``y``, and ``z`` axes, relative to the device.
When at rest, you can expect to measure the acceleration due to gravity.

On success, returns the current acceleration vector, otherwise gives an error.

Sensor name: ``accelerometer``

Message fields: ``x``, ``y``, ``z``

.. _getAltitude:

``getAltitude(device)``
-----------------------

Returns the current altitude of the device, expressed in meters above sea level.
This is provided by the location service on the device, so you must have location turned on and give the app permission.

On success, returns the current altitude, otherwise gives an error.

Sensor name: ``location``

Message fields: ``latitude``, ``longitude``, ``bearing``, ``altitude``

.. _getBearing:

``getBearing(device)``
----------------------

Returns the current bearing (direction of travel) from the device.
This is provided by the location sensor, so you must have location turned on and give the app permission.
The bearing is expressed as the angle (in degrees) from North, going clockwise.
Thus, you can directly use this value in a ``point in direction`` block to point a sprite in the direction of travel (assuming North is up).

On success, return the current bearing (in degrees), otherwise gives an error.

Sensor name: ``location``

Message fields: ``latitude``, ``longitude``, ``bearing``, ``altitude``

.. _getCompassCardinalDirection:

``getCompassCardinalDirection(device)``
---------------------------------------

Equivalent to :ref:`getCompassDirection`, except that it only returns ``N``, ``E``, ``S``, or ``W``.

.. _getCompassDirection:

``getCompassDirection(device)``
-------------------------------

Returns the current compass direction of the device, which is one of ``N``, ``NE``, ``E``, ``SE``, ``S``, ``SW``, ``W``, or ``NW``.
This is provided by the magnetic field sensor, so using this RPC on devices without a magnetometer will result in an error.
The output of this RPC assumes the device is face-up.

On success, returns the current compass direction (a string/text), otherwise gives an error.

.. _getCompassHeading:

``getCompassHeading(device)``
-----------------------------

Gets the current compass heading from the device. This is similar to :ref:`getBearing`, except that it returns the angle from magnetic north, rather than the direction of travel.
This is provided by the magnetic field sensor, so using this RPC on devices without a magnetometer will result in an error.
The output of this RPC assumes the device is face-up.

On success, returns the current compass heading (in degrees), otherwise gives an error.

.. _getFacingDirection:

``getFacingDirection(device)``
------------------------------

Attempts to determine the general orientation of the device based on the accelerometer output.
This represents which direction the face of the device's screen is pointing.
The possible values are:

- ``up`` - the device is face up
- ``down`` - the device is face down
- ``vertical`` - the device is upright
- ``upside down`` - the device is vertical, but upside down
- ``left`` - the device is horizontal, lying on its left side (when facing the screen)
- ``right`` - the device is horizontal, lying on its right side (when facing the screen)

On success, returns the facing direction, otherwise gives an error.

.. _getGameRotation:

``getGameRotation(device)``
---------------------------

Equivalent to the :ref:`getOrientation` RPC except that it gets the orientation relative to a fixed reference frame, thus making it good for use in games.

Sensor name: ``gameRotation``

Message fields: ``x``, ``y``, ``z``

.. _getGravity:

``getGravity(device)``
----------------------

Attempts to get the gravity acceleration angle, divorced from any linear acceleration the device might be experiencing.
For example, even if you start running, this vector should always have roughly the same value.
This is provided by a hybrid sensor, and is not available on all devices.

The counterpart to this RPC is :ref:`getLinearAcceleration`.

On success, returns the gravity acceleration vector, otherwise gives an error.

Sensor name: ``gravity``

Message fields: ``x``, ``y``, ``z``

.. _getGyroscope:

``getGyroscope(device)``
------------------------

Gets the current output of the gyroscope sensor, which measures rotational acceleration (in degress/s²) along the three axes of the device.

On success, returns the rotational acceleration vector, otherwise gives an error.

Sensor name: ``gyroscope``

Message fields: ``x``, ``y``, ``z``

.. _getLightLevel:

``getLightLevel(device)``
-------------------------

Gets the current light level from the device.
This is represented as a number with higher values being brighter.

On success, returns the current light level, otherwise gives an error.

Sensor name: ``lightLevel``

Message fields: ``value``

.. _getLinearAcceleration:

``getLinearAcceleration(device)``
---------------------------------

This RPC attempts to get the linear acceleration vector, divorced from the constant gravitational acceleration.
Theoretically, if the device is at rest this RPC would report a nearly-zero vector (nothing is ever perfectly still).
This is provided by a hybrid sensor, and is not available on all devices.

The counterpart to this RPC is :ref:`getGravity`.

on success, returns the current linear acceleration vector, otherwise gives an error.

Sensor name: ``linearAcceleration``

Message fields: ``x``, ``y``, ``z``

.. _getLocation:

``getLocation(device)``
-----------------------

Gets the current location of the device, specified as latitude and longitude coordinates (in degrees).
This is provided by the location service on the device, so you must have location turned on and give the app permission.

On success, returns a list containing the latitude and longitude, otherwise gives an error.

Sensor name: ``location``

Message fields: ``latitude``, ``longitude``, ``bearing``, ``altitude``

.. _getMagneticField:

``getMagneticField(device)``
----------------------------------

Gets the current ouput of the magnetic field sensor, measured in μT (micro Tesla) along each axis of the device.
This is provided by the magnetic field sensor, so using this RPC on devices without a magnetometer will result in an error.

Notably, this RPC can be used as a compass (measuring Earth's magnetic field).

On success, returns the magnetic field vector, otherwise gives an error.

Sensor name: ``magneticField``

Message fields: ``x``, ``y``, ``z``

.. _getMicrophoneLevel:

``getMicrophoneLevel(device)``
------------------------------

Gets the current level (volume) of the microphone on the device.
This is specified as a number where ``0.0`` denotes silence and ``1.0`` is the maximum volume the microphone can record.

On success, returns the volume level, otherwise gives an error.

Sensor name: ``microphoneLevel``

Message fields: ``volume``

.. _getOrientation:

``getOrientation(device)``
--------------------------

Gets the current output of the orientation sensor, relative to Earth's magnetic reference frame.
This is given as a vector (list) with three angular components (in degrees):

- azimuth (effectively the compass heading) ``[-180, 180]``
- pitch (vertical tilt) ``[-90, 90]``
- roll ``[-90, 90]``

On success returns the current orientation vector, otherwise gives an error.

Sensor name: ``orientation``

Message fields: ``x``, ``y``, ``z``

.. _getProximity:

``getProximity(device)``
------------------------

Gets the current output of the proximity (distance) sensor, measured in cm.
Phones typically have this sensor for turning off the display when you put it to your ear, but tablets typically do not.
In any case, the distances are not typically very long, and some devices only have binary (near/far) sensors.

On success, returns the current proximity sensor output, otherwise gives an error.

Sensor name: ``proximity``

Message fields: ``distance``

.. _getRotation:

``getRotation(device)``
-----------------------

Gets the current output of the rotation sensor.
This is a 4D rotation vector, given as rotation along 3 axes, plus a scalar component.
This is provided in case it is needed, but in practice, it's typically easier to use 3D quantities, as provided by :ref:`getOrientation`.

On success, returns the rotation vector, otherwise gives an error.

Sensor name: ``rotation``

Message fields: ``x``, ``y``, ``z``, ``w``

.. _getStepCount:

``getStepCount(device)``
------------------------

Gets the current step count from the device's step counter sensor.
Not all devices have a step counter sensor, but you can manually emulate one by using the accelerometer.

On success, returns the current step count, otherwise gives an error.

Sensor name: ``stepCount``

Message fields: ``count``
