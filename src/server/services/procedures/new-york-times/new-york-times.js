/**
 * The NewYorkTimes service provides access to the New York Times API including access
 * to Moview Reviews, Top Stories, and their Semantic API.
 *
 * @service
 * @alpha
 */
const ApiConsumer = require('../utils/api-consumer');
const {NewYorkTimesKey} = require('../utils/api-key');
const baseUrl = 'https://api.nytimes.com/svc/';
const hours = 60 * 60;
const NewYorkTimes = new ApiConsumer('NewYorkTimes', baseUrl, {cache: {ttl: 24*hours}});
ApiConsumer.setRequiredApiKey(NewYorkTimes, NewYorkTimesKey);

const {ArticleSections, ArticleSectionAliases, ConceptTypes, BestSellerLists, ArticleCodeToName} = require('./types');
const prepare = require('./data-prep');

/**
 * Get the top stories for a given section.
 *
 * @category Articles
 * @param{ArticleSection} section
 * @returns{Array<String>}
 */
NewYorkTimes.getTopStories = async function(section) {
    const response = await this._requestData({
        path: `topstories/v2/${section}.json`,
        queryString: `api-key=${this.apiKey.value}`,
    });
    return response.results.map(prepare.Article);
};

/**
 * Get a list of all valid article sections.
 *
 * @category Articles
 * @returns{Array<String>}
 */
NewYorkTimes.getArticleSections = function() {
    return Object.keys(ArticleSections)
        .filter(name => !ArticleSectionAliases[name]);
};

/**
 * Get the latest articles in a given section.
 *
 * @category Articles
 * @param{ArticleSection} section
 * @returns{Array<String>}
 */
NewYorkTimes.getLatestArticles = async function(section) {
    const source = 'all';
    const unsupportedSections = ['insider', 'politics'];
    if (unsupportedSections.includes(section)) {
        const sectionNames = unsupportedSections.map(code => ArticleCodeToName[code]);
        throw new Error(`Retrieving the latest articles is unsupported for sections: ${sectionNames.join(', ')}`);
    }

    if (section === 'home') {
        section = 'home & garden';
    } else if (section === 'nyregion') {
        section = 'new york';
    } else if (section === 'realestate') {
        section = 'real estate';
    } else if (section === 'sundayreview') {
        section = 'sunday review';
    } else if (section === 'upshot') {
        section = 'the upshort';
    } else if (section === 't-magazine') {
        section = 't magazine';
    } else if (section === 'us') {
        section = 'u.s.';
    }

    const response = await this._requestData({
        path: `/news/v3/content/${source}/${encodeURIComponent(section)}.json`,
        queryString: `api-key=${this.apiKey.value}`,
    });

    return response.results.map(prepare.Article);
};

/**
 * Get a list of movie critics.
 *
 * @category MovieReviews
 * @returns{Array<String>}
 */
NewYorkTimes.getMovieCritics = async function() {
    const response = await this._requestData({
        path: '/movies/v2/critics/all.json',
        queryString: `api-key=${this.apiKey.value}`,
    });
    return response.results.map(critic => critic.display_name);
};

/**
 * Get information about a given movie critic.
 *
 * @category MovieReviews
 * @param{String} name
 * @returns{Array<MovieCritic>}
 */
NewYorkTimes.getMovieCriticInfo = async function(name) {
    const response = await this._requestData({
        path: `/movies/v2/critics/${encodeURIComponent(name)}.json`,
        queryString: `api-key=${this.apiKey.value}`,
    });
    const [criticInfo] = response.results;
    return {
        name: criticInfo.display_name,
        status: criticInfo.status,
        bio: criticInfo.bio,
        multimedia: criticInfo.multimedia.resource,
    };
};

/**
 * Search for movie reviews starting at "offset". Returns up to 20 results.
 *
 * @category MovieReviews
 * @param{String} query
 * @param{BoundedNumber<0>=} offset Must be a multiple of 20
 * @returns{Array<MovieReview>}
 */
NewYorkTimes.searchMovieReviews = async function(query, offset=0) {
    const response = await this._requestData({
        path: '/movies/v2/reviews/search.json',
        queryString: `api-key=${this.apiKey.value}&query=${encodeURIComponent(query)}&offset=${offset}`
    });
    return response.results.map(prepare.MovieReview);
};

/**
 * Get 20 movie reviews starting at "offset".
 *
 * @category MovieReviews
 * @param{BoundedNumber<0>=} offset Must be a multiple of 20
 * @returns{Array<MovieReview>}
 */
NewYorkTimes.getMovieReviews = async function(offset=0) {
    const response = await this._requestData({
        path: '/movies/v2/reviews/all.json',
        queryString: `api-key=${this.apiKey.value}&offset=${offset}`,
    });
    return response.results.map(prepare.MovieReview);
};

/**
 * Get 20 movie reviews by a given critic starting at "offset".
 *
 * @category MovieReviews
 * @param{String} critic
 * @param{BoundedNumber<0>=} offset Must be a multiple of 20
 * @returns{Array<MovieReview>}
 */
NewYorkTimes.getMovieReviewsByCritic = async function(critic, offset=0) {
    const response = await this._requestData({
        path: '/movies/v2/reviews/search.json',
        queryString: `api-key=${this.apiKey.value}&offset=${offset}&reviewer=${encodeURIComponent(critic)}`,
    });
    return response.results.map(prepare.MovieReview);
};

/**
 * Get 20 movie reviews picked by critics starting at "offset".
 *
 * @category MovieReviews
 * @param{BoundedNumber<0>=} offset Must be a multiple of 20
 * @returns{Array<MovieReview>}
 */
NewYorkTimes.getCriticsPicks = async function(offset=0) {
    const response = await this._requestData({
        path: '/movies/v2/reviews/picks.json',
        queryString: `api-key=${this.apiKey.value}&offset=${offset}`,
    });
    return response.results.map(prepare.MovieReview);
};

/**
 * Search for articles given a query. Up to 10 articles will be returned.
 * More articles can be retrieved by specifying the "offset" or number of
 * results to skip before returning the results.
 *
 * @category Articles
 * @param{String} query
 * @param{BoundedNumber<0>=} offset Must be a multiple of 10
 * @returns{Array<SearchResult>}
 */
NewYorkTimes.searchArticles = async function(query, offset=0) {
    const page = Math.floor(offset/10) + 1;
    const {response} = await this._requestData({
        path: '/search/v2/articlesearch.json',
        queryString: `api-key=${this.apiKey.value}&q=${encodeURIComponent(query)}&page=${page}`,
    });
    return response.docs.map(prepare.SearchResult);
};

/**
 * Get the best selling books for a given list and date.
 *
 * @category Books
 * @param{BestSellerList} list
 * @param{Date=} date
 * @returns{Array<BestSeller>}
 */
NewYorkTimes.getBestSellers = async function(list, date) {
    if (date) {
        const year = date.getFullYear();
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = (date.getDate() + 1).toString().padStart(2, '0');
        date = [year, month, day].join('-');
    } else {
        date = 'current';
    }
    const response = await this._requestData({
        path: `/books/v3/lists/${date}/${list}.json`,
        queryString: `api-key=${this.apiKey.value}`,
    });
    return response.results.books.map(prepare.BestSeller);
};

/**
 * Get the best seller list names.
 *
 * @category Books
 * @returns{Array<String>}
 */
NewYorkTimes.getBestSellerLists = function() {
    return Object.keys(BestSellerLists);
};

/**
 * Get the top 5 books for all the best seller lists for a given date.
 *
 * @category Books
 * @param{Date} date
 * @returns{Array<BestSeller>}
 */
NewYorkTimes.getTopBestSellers = async function(date) {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = (date.getDate() + 1).toString().padStart(2, '0');
    date = [year, month, day].join('-');

    const response = await this._requestData({
        path: '/books/v3/lists/overview.json',
        queryString: `api-key=${this.apiKey.value}&published_date=${date}`,
    });
    return response.results.lists
        .map(list => [list.list_name, list.books.map(prepare.BestSeller)]);
};

/**
 * Search for books on current or previous best seller lists.
 *
 * @category Books
 * @param{String=} title
 * @param{String=} author
 * @param{BoundedNumber<0>=} offset
 * @returns{Array<Book>}
 */
NewYorkTimes.searchBestSellers = async function(title, author, offset=0) {
    if (!title && !author) throw new Error('title or author must be provided.');
    let queryString = `offset=${offset}`;
    if (title) queryString += `&title=${encodeURIComponent(title)}`;
    if (author) queryString += `&author=${encodeURIComponent(author)}`;
    const response = await this._requestData({
        path: '/books/v3/lists/best-sellers/history.json',
        queryString: `api-key=${this.apiKey.value}&${queryString}`,
    });
    return response.results.map(prepare.Book);
};

/**
 * Search for concepts of interest.
 *
 * @category Concepts
 * @param{String} query
 * @returns{Array<Concept>}
 */
NewYorkTimes.searchConcepts = async function(query) {
    const response = await this._requestData({
        path: '/semantic/v2/concept/search.json',
        queryString: `api-key=${this.apiKey.value}&query=${encodeURIComponent(query)}`,
    });
    return response.results.map(prepare.Concept);
};

/**
 * Get additional information about a concept such as links to other concepts and
 * geocodes.
 *
 * @category Concepts
 * @param{Object} concept
 * @param{String} concept.name
 * @param{ConceptType} concept.type
 * @returns{ConceptInfo}
 */
NewYorkTimes.getConceptInfo = async function(concept) {
    const response = await this._requestData({
        path: `/semantic/v2/concept/name/${concept.type}/${concept.name}`,
        queryString: `api-key=${this.apiKey.value}&fields=links,geocodes`,
    });
    const [conceptInfo] = response.results;
    return prepare.ConceptInfo(conceptInfo);
};

/**
 * Get a list of all concept types.
 *
 * @category Concepts
 * @returns{Array<String>}
 */
NewYorkTimes.getConceptTypes = function() {
    return Object.keys(ConceptTypes);
};

/**
 * Fetch up to 10 articles containing the given concept.
 *
 * @category Concepts
 * @category Articles
 * @param{Object} concept
 * @param{String} concept.name
 * @param{ConceptType} concept.type
 * @returns{Array<Article>}
 */
NewYorkTimes.getArticlesWithConcept = async function(concept) {
    const response = await this._requestData({
        path: `/semantic/v2/concept/name/${concept.type}/${concept.name}`,
        queryString: `api-key=${this.apiKey.value}&fields=article_list`,
    });
    const [conceptInfo] = response.results;
    return conceptInfo.article_list.results.map(prepare.ConceptArticle);
};

/**
 * Get the most emailed articles over the past day, week, or month.
 *
 * @category Articles;MostPopular
 * @param{DayWeekOrMonth} period
 * @returns{Array<Article>}
 */
NewYorkTimes.getMostEmailedArticles = async function(period) {
    const response = await this._requestData({
        path: `/mostpopular/v2/emailed/${period}.json`,
        queryString: `api-key=${this.apiKey.value}`,
    });
    return response.results.map(prepare.PopularArticle);
};

/**
 * Get the most viewed articles over the past day, week, or month.
 *
 * @category Articles;MostPopular
 * @param{DayWeekOrMonth} period
 * @returns{Array<Article>}
 */
NewYorkTimes.getMostViewedArticles = async function(period) {
    const response = await this._requestData({
        path: `/mostpopular/v2/viewed/${period}.json`,
        queryString: `api-key=${this.apiKey.value}`,
    });
    return response.results.map(prepare.PopularArticle);
};

/**
 * Get the articles shared most on Facebook over the past day, week, or month.
 *
 * @category Articles;MostPopular
 * @param{DayWeekOrMonth} period
 * @returns{Array<Article>}
 */
NewYorkTimes.getMostSharedArticles = async function(period) {
    const response = await this._requestData({
        path: `/mostpopular/v2/shared/${period}/facebook.json`,
        queryString: `api-key=${this.apiKey.value}`,
    });
    return response.results.map(prepare.PopularArticle);
};

module.exports = NewYorkTimes;
