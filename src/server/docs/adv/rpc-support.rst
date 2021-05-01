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

- :doc:`/services/AirQuality/index` - ``AIR_NOW_KEY`` API key: `AirNow <https://www.airnow.gov/>`__
- :doc:`/services/Geolocation/index` - uses the same ``GOOGLE_MAPS_KEY``
- :doc:`/services/GoogleMaps/index` - ``GOOGLE_MAPS_KEY`` API key: `Google Static Maps <https://developers.google.com/maps/documentation/maps-static/get-api-key#get_key>`__
- :doc:`/services/MovieDB/index` - ``TMDB_API_KEY`` API key: `The Movie Database <https://developers.themoviedb.org/3/getting-started/introduction>`__
- :doc:`/services/NASA/index` - ``NASA_KEY`` API key: `NASA <https://api.nasa.gov/>`__
- :doc:`/services/ParallelDots/index` - ``PARALLELDOTS_KEY`` API key: `Parallel Dots <https://www.paralleldots.com/text-analysis-apis>`__
- :doc:`/services/Pixabay/index` - ``PIXABAY`` API key: `Pixabay <https://pixabay.com/api/docs/#api_key>`__
- :doc:`/services/Traffic/index` - ``BING_TRAFFIC_KEY`` API key: `Bing Traffic <https://docs.microsoft.com/en-us/bingmaps/getting-started/bing-maps-dev-center-help/getting-a-bing-maps-key>`__
- :doc:`/services/Translation/index` - ``AZURE_TRANSLATION_KEY`` API key: `Azure Translation <https://azure.microsoft.com/en-us/services/cognitive-services/translator-text-api/>`__
- :doc:`/services/Twitter/index` - ``TWITTER_BEARER_TOKEN`` API key: `Twitter <https://developer.twitter.com/en/docs/basics/authentication/oauth-2-0>`__
- :doc:`/services/Weather/index` - ``OPEN_WEATHER_MAP_KEY`` API key: `OpenWeatherMap <https://openweathermap.org/api>`__

To simplify this process (and to keep your ``~/.bashrc`` clean), these values can be stored in a ``.env`` file in the project root directory and they will be loaded into the environment on starting NetsBlox.
