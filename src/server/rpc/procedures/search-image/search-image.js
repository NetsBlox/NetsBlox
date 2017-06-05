/**
 * Created by admin on 6/5/17.
 */
const ApiConsumer = require('../utils/api-consumer');
const imageSearch = new ApiConsumer('imageSearch', 'https://pixabay.com/api/?');
const KEY = '5553987-d2bf6e3c8db7e4a1515be8a86';

function parser(data) {
  return data.hits.map(item => {
    return {
      image_url: item.webformatURL,
      tags: item.tags.split(", "),
      type: item.type
    }
  });
}

function parserSmall(data) {
  return data.hits.map(item => {
    return {
      image_url: item.webformatURL.replace("_640", "_180"),
      tags: item.tags.split(", "),
      type: item.type
    }
  });
}


function parserMedium(data) {
  return data.hits.map(item => {
    return {
      image_url: item.webformatURL.replace("_640", "_340"),
      tags: item.tags.split(", "),
      type: item.type
    }
  });
}

function parserFn (maxHeight) {
  if (maxHeight == "" || maxHeight > 640) {
    return parser;
  }
  if (maxHeight < 360) {
    return parserSmall;
  }
  return parserMedium;
}

console.log(parserFn());

function encodeQueryData(options) {
      let ret = [];
      for (let d in options)
            ret.push(encodeURIComponent(d) + '=' + encodeURIComponent(options[d]));
      return ret.join('&');
}

function encodeQueryOptions(keywords, type, maxHeight, minHeight) {
  return {
    queryString: encodeQueryData({
      key: KEY,
      q: encodeURIComponent(keywords),
      image_type: (type || 'all'),
      safesearch: true,
      min_height: (minHeight || 0)
    })
  };
}

imageSearch.searchAll = function (keywords, maxHeight, minHeight) {
  return this._sendStruct(encodeQueryOptions(keywords, minHeight), parserFn(maxHeight));
}

imageSearch.searchPhoto = function (keywords, maxHeight, minHeight) {
  return this._sendStruct(encodeQueryOptions(keywords, "photo", minHeight), parserFn(maxHeight));
}

imageSearch.searchIllustration = function (keywords, maxHeight, minHeight) {
  return this._sendStruct(encodeQueryOptions(keywords, "illustration", minHeight), parserFn(maxHeight));
}

module.exports = imageSearch;

