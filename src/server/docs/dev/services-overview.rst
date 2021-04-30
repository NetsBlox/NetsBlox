Services Overview
=================

What are services?
------------------

NetsBlox provides users access to server side functionality through enabling users to make synchronous remote procedure calls (RPCs) which are grouped into "services".
This enables users to:

- gain access to real-world datasets including climate data from NOAA and weather data from OpenWeatherMap.
- use a variety of third-party APIs including Google Maps, ThingSpeak, ParallelDots, and Azure Translation.
- leverage capabilities provided by NetsBlox itself such as cloud variables and cybersecurity capabilities! Services have been designed to be simple to implement and include rich functionality including strict typing, help message generation, and message-sending capability.

Are there different types of services?
--------------------------------------

At the time of this writing, there are three different types of services in NetsBlox:

- Native NetsBlox Services. These services are defined in JavaScript in NetsBlox itself. Most of the documentation describes the creation of this type of service.
- User-Defined Services. These services are created using the :doc:`/services/ServiceCreation/index` service from within NetsBlox.
- Auxiliary (Private) Services. These services are hosted by other servers and enable users or classes to have their own private services. An example can be found `here <https://github.com/NetsBlox/Custom-Python-Services>`_.

A comparison of the different types of services is given below:

.. include:: service-types.table.txt

How can I contribute a native service?
--------------------------------------

If you are interested in contributing a (native) custom service back to NetsBlox (or in your own fork), I would recommend starting with the `simple example <https://raw.githubusercontent.com/wiki/NetsBlox/NetsBlox/Hello-Custom-Services.md>`_ and then checking out the :doc:`best-practices`.

For examples of existing services, check out the featured projects on https://netsblox.org or the `source code <https://github.com/NetsBlox/NetsBlox/tree/master/src/server/services/procedures>`__.
Examples include:

- :doc:`/services/GoogleMaps/index` (`source code <https://github.com/NetsBlox/NetsBlox/tree/master/src/server/services/procedures/google-maps/google-maps.js>`__)
- :doc:`/services/Earthquakes/index` (`source code <https://github.com/NetsBlox/NetsBlox/tree/master/src/server/services/procedures/earthquakes/earthquakes.js>`__)
- :doc:`/services/AirQuality/index` (`source code <https://github.com/NetsBlox/NetsBlox/tree/master/src/server/services/procedures/air-quality/air-quality.js>`__)
- :doc:`/services/CloudVariables/index` (`source code <https://github.com/NetsBlox/NetsBlox/tree/master/src/server/services/procedures/cloud-variables/cloud-variables.js>`__)
- :doc:`/services/Trivia/index` (`source code <https://github.com/NetsBlox/NetsBlox/tree/master/src/server/services/procedures/trivia/trivia.js>`__)
- :doc:`/services/ConnectN/index` (`source code <https://github.com/NetsBlox/NetsBlox/tree/master/src/server/services/procedures/connect-n/connect-n.js>`__)
- and more!
