RPC Support
===========

Some of the NetsBlox services, such as :doc:`/services/GoogleMaps/index`, require a default API key to be provided on the deployment to be available.
Requests to these services will then use the default API key if the user does not have any API keys defined for him/herself or for the group/class.

If you don't mind viewing the source code, the keys (and links to set up an API key) can be found `here <https://github.com/NetsBlox/NetsBlox/blob/master/src/server/services/procedures/utils/api-key.js#L22-L75>`__.
All API keys can be set by setting the corresponding environment variable.
The environment variable is either generated automatically by converting the name to all caps and replacing spaces with underscores (eg, ``Google Maps -> GOOGLE_MAPS_KEY``) or is is listed in the referenced code snippet as the third value passed to ``ApiKey``.
For example, ``The Movie Database`` is set using ``TMDB_API_KEY``.

Required Environment Variables for RPCs
---------------------------------------

.. list-table::
    :header-rows: 1

    * - Service
      - Environment Variable
      - Provider
<% for (const serviceName of Object.keys(apiKeys).filter(s => apiKeys[s]).sort()) { %>
<% const key = apiKeys[serviceName]; %>
    * - :doc:`/services/<%= serviceName %>/index`
      - ``<%= key.envVar %>``
      - `<%= key.provider %> <<%= key.helpUrl %>>`__
<% } %>

To simplify this process (and to keep your ``~/.bashrc`` clean), these values can be stored in a ``.env`` file in the project root directory and they will be loaded into the environment on starting NetsBlox.
