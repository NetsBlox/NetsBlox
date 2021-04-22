PhoneIoT Documentation
======================

PhoneIoT is a service in `NetsBlox <https://netsblox.org/>`_ that's meant to teach Internet of Things (IoT) topics as early as K-12 education.
It allows you to programmatically access your smartphone's sensors and display.
This includes accessing hardware sensors such as the accelerometer, gyroscope, microphone, camera, and many others depending on the device.
PhoneIoT also allows you to control a customizable interactive display, enabling you to use your device as a custom remote control, or even create and run distributed (multiplayer) applications.
The limits are up to your imagination!

Getting Started
---------------

To get started using PhoneIoT, download the PhoneIoT app on your mobile device, available for `Android <https://play.google.com/store/apps/details?id=org.netsblox.phoneiot>`_ and iOS (`coming soon`), and then go to the `NetsBlox editor <https://editor.NetsBlox.org>`_.
In the top left of the editor, you should see a grid of several colored tabs.
Under the ``Network`` tab, grab a ``call`` block and place it in the center script area.
Click the first dropdown on the ``call`` block and select the ``PhoneIoT`` service.
The second dropdown selects the specific `Remote Procedure Call` (RPC) to execute - see the table of contents  for information about the various RPCs.

Inside the PhoneIoT app on your mobile device, click the button at the top left to open the menu, and then click ``connect``.
If you successfully connected, you should get a small popup message at the bottom of the screen.
`If you don't see this message, make sure you have either Wi-Fi or mobile data turned on and try again.`
Near the top of the menu, you should see an ID and password, which will be needed to connect to the device from NetsBlox.

Back in NetsBlox, select the ``setCredentials`` RPC and give it your ID and password.
For convenience, you might want to save the ID in a variable (e.g. ``device``), as it will be referenced many times.
If you click the ``call`` block to run it, you should get an ``OK`` result, meaning you successfully connected.
`If you don't see this, make sure you entered the ID and password correctly.`

You're now ready to start using the other RPCs in PhoneIoT to communicate with the device!

.. toctree::
   :maxdepth: 2
   :caption: Contents:
   
   errors
   mainrpcs
   utility
   sensors
   display
