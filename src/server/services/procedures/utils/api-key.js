class ApiKey {
    constructor(provider, helpUrl, envVar) {
        this.provider = provider;
        this.helpUrl = helpUrl;
        this.envVar = envVar || this.getDefaultEnvVar();
        this.value = process.env[this.envVar];
    }

    getDefaultEnvVar() {
        const capName = this.provider.split(' ')
            .map(word => word.toUpperCase()).join('_');
        return capName + '_KEY';
    }

    withValue(value) {
        const apiKey = new ApiKey(this.provider, this.helpUrl, this.envVar);
        apiKey.value = value;
        return apiKey;
    }
}

module.exports.GoogleMapsKey = new ApiKey(
    'Google Maps',
    'https://developers.google.com/maps/documentation/maps-static/get-api-key#get_key'
);
module.exports.AirNowKey = new ApiKey(
    'Air Now',
    'https://docs.airnowapi.org/'
);
module.exports.ParallelDotsKey = new ApiKey(
    'ParallelDots',
    'https://www.paralleldots.com/text-analysis-apis',
    'PARALLELDOTS_KEY'
);
module.exports.BingMapsKey = new ApiKey(
    'Bing Maps',
    'https://docs.microsoft.com/en-us/bingmaps/getting-started/bing-maps-dev-center-help/getting-a-bing-maps-key',
    'BING_TRAFFIC_KEY'
);
module.exports.NASAKey = new ApiKey(
    'NASA',
    'https://api.nasa.gov/'
);
module.exports.TheMovieDBKey = new ApiKey(
    'The Movie Database',
    'https://developers.themoviedb.org/3/getting-started/introduction',
    'TMDB_API_KEY'
);
module.exports.OpenWeatherMapKey = new ApiKey(
    'Open Weather Map',
    'https://developers.themoviedb.org/3/getting-started/introduction',
);
module.exports.AzureTranslationKey = new ApiKey(
    'Azure Translation',
    'https://azure.microsoft.com/en-us/services/cognitive-services/translator-text-api/'
);
module.exports.PixabayKey = new ApiKey(
    'Pixabay',
    'https://pixabay.com/api/docs/#api_key',
    'PIXABAY'
);
module.exports.TwitterKey = new ApiKey(
    'Twitter',
    'https://developer.twitter.com/en/docs/basics/authentication/oauth-2-0',
    'TWITTER_BEARER_TOKEN'
);

class InvalidKeyError extends Error {
    constructor(apiKey) {
        const message = `Invalid API key. Please update your ${apiKey.provider} API key.`;
        super(message);
    }
}
module.exports.InvalidKeyError = InvalidKeyError;
