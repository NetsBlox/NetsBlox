const _ = require('lodash');
const types = require('../../input-types');
const BestSellerLists = Object.fromEntries(require('./best-seller-list-names.json').results.map(result => [result.display_name, result.list_name_encoded]));
const ArticleSections = {
    Arts: 'arts',
    Automobiles: 'automobiles',
    Books: 'books',
    Business: 'business',
    Climate: 'climate',
    Education: 'education',
    Fashion: 'fashion',
    Food: 'food',
    Health: 'health',
    Home: 'home',
    Insider: 'insider',
    Magazine: 'magazine',
    Movies: 'movies',
    'New York Region': 'nyregion',
    Obituaries: 'obituaries',
    Opinion: 'opinion',
    Politics: 'politics',
    'Real Estate': 'realestate',
    Science: 'science',
    Sports: 'sports',
    'Sunday Review': 'sundayreview',
    Technology: 'technology',
    Theater: 'theater',
    'T Magazine': 't-magazine',
    Travel: 'travel',
    Upshot: 'upshot',
    US: 'us',
    World: 'world',
};

const ArticleSectionAliases = {
    'U.S.': 'us',
};

Object.entries(ArticleSectionAliases).forEach(entry => {
    const [key, value] = entry;
    ArticleSections[key] = value;
});

const ConceptTypes = {
    Descriptor: 'nytd_des',
    Location: 'nytd_geo',
    Person: 'nytd_per',
    Organization: 'nytd_org',
    'Public Company': 'nytd_porg',
    Title: 'nytd_ttl',
    Topic: 'nytd_topic',
};

types.defineType({
    name: 'ArticleSection',
    description: 'The type of article to retrieve from the NewYorkTimes service.',
    baseType: 'Enum',
    baseParams: ArticleSections,
});
types.defineType({
    name: 'BestSellerList',
    description: 'An item from the NewYorkTimes best sellers list.',
    baseType: 'Enum',
    baseParams: BestSellerLists,
});
types.defineType({
    name: 'ConceptType',
    description: 'They type of information to retrieve from the NewYorkTimes service.',
    baseType: 'Enum',
    baseParams: ConceptTypes,
});
types.defineType({
    name: 'DayWeekOrMonth',
    description: 'A time period used by the NewYorkTimes service.',
    baseType: 'Enum',
    baseParams: {day: 1, week: 7, month: 30},
});

const ArticleCodeToName = _.invert(ArticleSections);

module.exports = {ArticleSections, ArticleSectionAliases, ConceptTypes, BestSellerLists, ArticleCodeToName};
