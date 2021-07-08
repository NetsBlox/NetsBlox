const types = require('../../input-types');
const BestSellerLists = Object.fromEntries(require('./bestseller-list-names.json').results.map(result => [result.display_name, result.list_name_encoded]));
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

const ConceptTypes = {
    Descriptor: 'nytd_des',
    Location: 'nytd_geo',
    Person: 'nytd_per',
    Organization: 'nytd_org',
    'Public Company': 'nytd_porg',
    Title: 'nytd_ttl',
    Topic: 'nytd_topic',
};

types.defineType('ArticleSection', input => types.parse.Enum(input, ArticleSections, undefined, 'ArticleSection'));
types.defineType('BestSellerList', input => types.parse.Enum(input, BestSellerLists, undefined, 'BestSellerList'));
types.defineType('ConceptType', input => types.parse.Enum(input, ConceptTypes, undefined, 'ConceptType'));
types.defineType('DayWeekOrMonth', input => types.parse.Enum(input, {day: 1, week: 7, month: 30}, undefined, 'DayWeekOrMonth'));

module.exports = {ArticleSections, ConceptTypes, BestSellerLists};
