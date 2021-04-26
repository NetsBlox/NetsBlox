Display
=======

This section covers all of the RPCs that relate to manipulation of the customizable interactive display on the mobile device.
The device display is a large rectangular region called the `canvas`.

Locations on the canvas are defined by ``x`` and ``y`` coordinates that range from ``[0, 100]``.
These coordinates are relative to the size of the display.
Thus, a button at position ``[25, 25]`` and size ``[50, 50]`` will take up a fourth of the screen (half the width and half the height), and will be centered in the canvas.

Many controls take optional parameters, which are specified as a list of pairs (lists of size 2), where each pair is the name of an option and the desired value.
For instance, most controls take one or more optional parameters to control the color of the display.
You can obtain color codes from :func:`PhoneIoT.getColor`.

>>>RPCS<<<
