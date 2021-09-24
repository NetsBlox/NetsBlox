Service Annotations
===================

Service/RPC Annotations
-----------------------

Annotations use the google closure compiler syntax to

- describe the service
- validate RPC inputs 

    - cast to correct type
    - uniform error reporting for invalid inputs (to the end user)

- populate the help messages for the end user
- make your code more readable and maintainable

Service Annotations
-------------------

An annotation tagged with ``@service`` will be used to describe the Service and is shown to the user when getting help about the ``call <service> <RPC>`` block without any RPC set.
An example is provided below:

.. code-block:: js

    /**
    * The IEXTrading Service provides access to real-time and historical stock price data.
    * For more information, check out https://iextrading.com/developer.
    *
    * Terms of use: https://iextrading.com/api-exhibit-a
    * @service
    */

RPC Annotations
---------------

RPC annotations can be used for RPC input validation and generating help messages for the user.
An example of an annotation block for the ``city`` RPC from the geolocation service is shown below.

.. code-block:: js

    /** 
    * Get the name of the city nearest to the given latitude and longitude.
    *
    * @param {Latitude} latitude latitude of the target location
    * @param {Longitude} longitude longitude of the target location
    * @returns {String} city name
    */
    GeoLocationRPC.city = function (latitude, longitude) {

Annotation blocks should be close to the RPC/function definition.

Read more: `Annotations Guide <https://github.com/google/closure-compiler/wiki/Annotating-JavaScript-for-the-Closure-Compiler>`__

Essential Tags
^^^^^^^^^^^^^^

- required param: ``@param`` ``{Type}`` ``name`` ``description sentence...``
- optional param: ``@param`` ``{Type=}`` ``name`` ``description sentence...``
- required object field: ``@param`` ``{Type}`` ``objectName.fieldName`` ``description sentence...``
- optional object field: ``@param`` ``{Type=}`` ``objectName.fieldName`` ``description sentence...``
- return value: ``@returns`` ``{Type}`` ``description sentence...``
- no return value: *no annotation needed*

Supported Types
^^^^^^^^^^^^^^^

When both JavaScript and NetsBlox types exist, the types are specified using the JavaScript type.
For example, ``Array`` is used instead of ``List``.
Here are some of the common parsers that are available (note that values inside angled brackets ``<...>`` are optional; if one is omitted, in general that constraint is not enforced):

- ``Number``
- ``BoudedNumber<min, max>`` - This limits the range of a ``Number``. For example, ``BoundedNumber<0>`` guarantees a non-negative number.
- ``Latitude``
- ``Longitude``
- ``String``
- ``BoundedString<min, max>`` - This is used to put limits on the length of a ``String`` input.
- ``Array<Type, min, max>``
- ``Boolean``
- ``Enum<option1,option2,option3,...>`` - This is essentially a ``String`` value, except that you are guaranteed it will be one of the listed options.
- ``Date``
- ``Object`` - This is only used for defining structured data (list of key-value pairs). See `Essential Tags`_ for how to define fields. Currently, if no fields are specified, any field name is allowed to be passed by the user.

For a full list of the standard parsers, or more information on how to make a custom parser, see the `source code <https://github.com/NetsBlox/NetsBlox/tree/master/src/server/services/input-types.js>`__.