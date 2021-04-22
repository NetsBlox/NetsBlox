Main RPCs
=========

This page covers the "main RPCs", which are general usage RPCs that don't fall under any particular category.
These are very important, as they relate to connections between NetsBlox and the PhoneIoT app running on your phone.

.. _authenticate:

``authenticate(device)``
------------------------

This RPC simply checks that the connection to the device is still good.
In particular, you can use this to check if the password is still valid.

On success, returns ``OK``, otherwise gives an error.

.. _listenToGUI:

``listenToGUI(device)``
-----------------------

This RPC requests that you receive any events from the `Graphical User Interface` (GUI) on the phone's display.
This is needed to receive any type of GUI event, including button clicks, joystick movements, and textbox update events.
You only need to call this RPC once, which you can do at the start of your program (but after calling :ref:`setCredentials`).

See the :doc:`display` section for more information.

On success, returns ``OK``, otherwise gives an error.

.. _listenToSensors:

``listenToSensors(device, sensors)``
------------------------------------

This RPC requests that you receive periodic sensor update events from the device.
The ``sensors`` input is a list of pairs (lists of length 2), where each pair is a sensor name and an update period in milliseconds.
You can have different update periods for different sensors.
You will receive a message of the same name as the sensor at most once per whatever update period you specified.
Any call to this RPC will invalidate all previous calls - thus, calling it with an empty list will stop all updates.

This method of accessing sensor data is often easier, as it doesn't require loops or error-checking code.
If a networking error occurs, you simply miss that single message.

The :ref:`getSensors` RPC can be used to get a list of the valid sensor names.
See the :doc:`sensors` section for more information, esp. the required fields for each message type.

Returns ``OK`` on success, otherwise gives an error.

.. _setCredentials:

``setCredentials(device, password)``
------------------------------------

This is the first RPC you should `always` call when working with PhoneIoT.
It sets the login credentials (password) to use for all future interactions with the device.

On success, returns ``OK``, otherwise gives an error.
