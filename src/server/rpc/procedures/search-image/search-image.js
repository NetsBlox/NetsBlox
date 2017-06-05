/**
 * Created by admin on 6/5/17.
 */
const ApiConsumer = require('../utils/api-consumer');
const imageSearch = new ApiConsumer('imageSearch', 'https://pixabay.com/api/?');
const KEY = '5553987-d2bf6e3c8db7e4a1515be8a86';

function parser(data) {
  return data.hits.map(item => {
    return {
      url: item.webformatURL,
      tags: item.tags.split(", "),
      type: item.type,
    }

  });
}

function encodeQueryData(options) {
      let ret = [];
      for (let d in options)
            ret.push(encodeURIComponent(d) + '=' + encodeURIComponent(options[d]));
      return ret.join('&');
}

function encodeQueryOptions(keywords, type) {
  return {
    queryString: encodeQueryData({
      key: KEY,
      q: encodeURIComponent(keywords),
      image_type: (type || 'all')
    })
  };
}

imageSearch.searchAll = function (keywords) {
  return this._sendStruct(encodeQueryOptions(keywords), parser);
}

imageSearch.searchPhoto = function (keywords) {
  return this._sendStruct(encodeQueryOptions(keywords, "photo"), parser);
}

imageSearch.searchIllustration = function (keywords) {
  return this._sendStruct(encodeQueryOptions(keywords, "illustration"), parser);
}

module.exports = imageSearch;

