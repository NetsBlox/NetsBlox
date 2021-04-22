Utility
=======

The RPCs listed in this section are not directly tied to any other part of PhoneIoT, but are helpers with using them.

.. _getColor:

``getColor(red, green blue, alpha=255)``
----------------------------------------

Many of the :doc:`display` RPCs take one or more optional parameters for controlling display color, which is specified as an integer.
This RPC is a convenience function for constructing a color code from ``red``, ``green``, ``blue``, and ``alpha`` values (each is ``0-255``).
The ``alpha`` value controls transparency, with ``0`` being invisible and ``255`` being opaque.
If not specified, ``alpha`` will default to ``255``.

Returns the constructed color code (an integer).

.. _getSensors:

``getSensors()``
----------------

This RPC returns a list containing the name of every sensor supported by PhoneIoT.
Note that your specific device might not support all of these sensors, depending on the model.

See :doc:`sensors` for more information.

Returns a list of sensor names.

.. _magnitude:

``magnitude(vec)``
------------------

Given a list of numbers representing a vector, this RPC returns the magnitude (length) of the vector.
This can be used to get the total acceleration from the accelerometer (which gives a vector).

Returns the magnitude of the vector (a non-negative number).

.. _normalize:

``normalize(vec)``
------------------

Given a list of numbers representing a vector, returns the normalized vector (same direction but with a magnitude of ``1.0``).
This is identical to dividing each component by the magnitude.

Returns the normalized vector.
