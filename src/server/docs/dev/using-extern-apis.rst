Using External APIs
===================

The recommended method of interacting with external APIs is using the ``ApiConsumer`` class.
The ``ApiConsumer`` is a superclass that helps you in creating services that are mainly about consuming data from a third-party provider.
``ApiConsumer`` provides several helpers and automatically handles processes such as:

- Caching external calls to third-party providers
- Naming the endpoint
- Receiving and handling image buffers
- Artificially slowing down message sending to the user
- Automatically aggregating results from multiple endpoints

When exporting an ``ApiConsumer`` subclass, any methods added to it that are not prefixed with an underscore (``_``) will be available as calls to the created RPC.

Concepts
--------

There are two important concepts worth explaining.

1. Query Options: is an object or an array of objects (if you want aggregated results from multiple endpoints) including instructions about the request to the server. it is then used by ``_requestData`` or ``_requestImage`` to query the provider.

.. code-block:: js

    queryOptions = {
    queryString: the unique query string for this request
    baseUrl: {string} representing the base url of the target api
    method: {string} html action: 'GET', 'POST', etc
    body: if posting, this is the place to indicate the body
    headers: {object} a key value dictionary of headers
    json: {boolean} to indicate if the response is json or not. default: true

2. Parser Functions: these are functions provided by the user of the class that should transform, filter, aggregate, and clean the response from the provider to simple (key value pairs with max depth of 2), understandable JSON objects presentable to NetsBlox users. Different methods in ``ApiConsumer`` expect such functions.

Methods
-------

Here are a few helpers to get you started with using ``ApiConsumer``

- ``_sendStruct`` - queries the provider and sends the response in form of a list of structured data to the caller. ``_sendMsgs``: same as ``_sendStruct`` but sends messages back instead of returning a single list.
- ``_sendImage`` - used for sending images that can be used as costumes to the caller.
-  ``_sendAnswer`` - use this to send a single answer from a query to the user. For example if there is an endpoint which returns information for a car and you are making a method that only returns the model of the car you can use ``MyService._sendAnswer(QueryOpts, '.model')``
- ``_stopMsgs`` - stops sending of the queued messages.

Some of the underlying methods could also be directly used to further customize the response.

- ``_requestData`` - fetches text data.
- ``_requestImage`` - fetches and image and makes it available as buffer to be sent to user.

API Keys
--------

Definition
^^^^^^^^^^

If a service requires an API key which isn't already defined, the API key type should be defined `here <https://github.com/NetsBlox/NetsBlox/blob/master/src/server/services/procedures/utils/api-key.js>`__.
An API key should provide a human-readable name and help URL.
The default value is preferred for the environment variable and can only be overridden for ensuring backwards compatibility.

Registration
^^^^^^^^^^^^

The service can register API keys as shown below.

.. code-block:: js

    ApiConsumer.setRequiredApiKey(GoogleMaps, GoogleMapsKey);

The API key can then be accessed via ``this.apiKey.value`` within the individual RPCs.
This ensures that a user's custom API key will be used when possible.

Error Handling
^^^^^^^^^^^^^^

In the event of an invalid custom API key, the user should be notified in a consistent manner.
To this end, it is important to throw an ``InvalidKeyError`` in the event of an "unauthorized" error by the given service.
Although this should be addressed by default using status codes, not all APIs handle these errors in the same way.

.. include:: api-consumer-example.js.txt
