Best Practices for NetsBlox Services
====================================

It is important to provide consistent conventions across all the NetsBlox services to ensure predictability (and quality!).
This page explicitly outlines best practices and conventions for NetsBlox services.

Naming Conventions
------------------

Service names\* should be in *upper* camelcase (eg, ``CloudVariables`` not ``cloudVariables`` or ``cloud-variables``).
When the service is exposing a public API, it should be named accordingly to be transparent about the API used.
This enables us to post links to the source of the API and make it more relevant and credible to the end users (hopefully improving engagement!).
RPC names should be in *lower* camelcase (eg, ``getVariable``).
Arguments should have meaningful names to be understood by novice users.

**Good:**
    - Service: ``CloudVariables``, ``GoogleMaps``
    - RPC: ``getVariable``
    - Arguments: ``name``, ``value``, ``password``

**Bad:**
    - Service: ``cloudVariables``, ``cloudvariables``, ``cloud-variables``, ``StaticMaps`` (uses the name of the API provider!)
    - RPC: ``getvariable``
    - Arguments: ``n``, ``val``, ``pass``

\* If the service follows the directory naming conventions (eg, ``cloud-variables/cloud-variables.js``), the service name will be created automatically from the service directory name and will follow the recommended convention (the directory ``cloud-variables`` will become ``CloudVariables``).
For services containing an acronym in the name, a field, ``serviceName``, can be set on the service to manually set the service name.
This is useful to have services such as ``NASA`` without naming the service directory ``n-a-s-a``.
**This should only be used in these exceptional cases and not to completely rename the service (e.g., ``static-maps -> GoogleMaps``).**

Argument Names
--------------

Arguments defined for the function (or in the annotations) are used as the interface for the RPC and are exposed as hint text to the end user.
That being said, it is important that the argument names are meaningful for the end user.
For example, if your function requires two inputs arguments, latitude and longitude, use ``latitude`` and ``longitude` - not ``lat``, ``lng``; it is important that the arguments are obvious to novice users.

Annotations and Argument Types
------------------------------

Both RPCs and services should have descriptions in the form of :doc:`service-annotations`.
These enable the client to populate the ``help...`` option when right-clicking on blocks.
Descriptions should be concise but easy for novices to understand.
Links to more details are also good, when appropriate.

Argument types in annotations are enforced by the NetsBlox server and will ensure consistent error messages for invalid types.
Use the most restrictive types available to get the most appropriate and meaningful error messages.
If you have a new type, feel free to open a PR adding the new type - avoid writing input validation for arguments in the method itself!

Argument Order
--------------

Required arguments should precede optional arguments (like in many other programming languages).
It is also a good rule of thumb to have more important arguments precede less important arguments though this can be subjective and dependent upon the capabilities of the given service.

Tests
-----

At the very least, write tests for the interface to ensure that we don't break backwards compatibility with existing projects.
If it can be tested more thoroughly, that is even better!
These tests are available `here <https://github.com/NetsBlox/NetsBlox/blob/master/test/unit/server/services/procedures/>`__.

Error Handling
--------------

If there is an error in a method, simply throw an exception.
Avoid sending a custom response via ``this.response`` as it is less legible and can be error prone.
Error messages thrown in the method are shown to the end users - make sure they are easy to understand!
That said, when using an external API, consider converting the error responses to something easily understood by novices.

Handling Complex Data
---------------------

Complex data, such as JSON, can be returned from the method directly; NetsBlox will convert it to the appropriate data structure for the NetsBlox client.
Generally, lists of JSON objects are preferred to tables of data (such as in :func:`Geolocation.nearbySearch`).
One exception is services where the results of the RPC correspond to data.
In these cases, returning data as a table makes it easier to plot and facilitates use by novices (such as in the OceanData service).

In cases of large amounts of structured data being returned, it is also acceptable to send the data as messages.

Conditional Loading of Services
-------------------------------

Sometimes services require configuration such as a port to use, etc.
These should be configured via environment variables and then verified by adding a method called ``isSupported``.
Upon load, NetsBlox will automatically disable any services that have a ``isSupported`` method that evaluates to ``false``.

Sending messages to sender
--------------------------

Sockets can be accessed using ``this.socket`` in the body of the RPC.
This allows the RPC to send messages to the given user (or the user's room, etc) by invoking the ``sendMessage`` or ``sendMessageToRoom`` method.
Examples of this can be found in the :doc:`/services/Trivia/index` and :doc:`/services/Battleship/index` services.
