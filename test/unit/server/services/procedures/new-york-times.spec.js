const utils = require('../../../../assets/utils');

describe(utils.suiteName(__filename), function() {
    utils.verifyRPCInterfaces('NewYorkTimes', [
        ['getTopStories', ['section']],
        ['getArticleSections'],
        ['getLatestArticles', ['section']],
        ['getMovieCritics'],
        ['getMovieCriticInfo', ['name']],
        ['searchMovieReviews', ['query', 'offset']],
        ['getMovieReviews', ['offset']],
        ['getMovieReviewsByCritic', ['critic', 'offset']],
        ['getCriticsPicks', ['offset']],
        ['searchArticles', ['query', 'offset']],
        ['getBestSellers', ['list', 'date']],
        ['getBestSellerLists'],
        ['getTopBestSellers', ['date']],
        ['searchBestSellers', ['title', 'author', 'offset']],
        ['searchConcepts', ['query']],
        ['getConceptInfo', ['concept']],
        ['getConceptTypes'],
        ['getArticlesWithConcept', ['concept']],
        ['getMostEmailedArticles', ['period']],
        ['getMostViewedArticles', ['period']],
        ['getMostSharedArticles', ['period']],
    ]);
});
