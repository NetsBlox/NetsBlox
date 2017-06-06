const ApiConsumer = require('../utils/api-consumer');
const imageSearch = new ApiConsumer('imageSearch', 'https://pixabay.com/api/?');
const KEY = process.env.PIXABAY;

function parserFnGen(maxHeight) {
    let optimalSize;
    if (maxHeight == '' || maxHeight > 640) {
        optimalSize = ['_640', '_640'];
    } else if (maxHeight < 360) {
        optimalSize = ['_640', '_180'];
    } else {
        optimalSize = ['_640', '_340'];
    }
    return data => {
        return data.hits.map(item => {
            return {
                image_url: item.webformatURL.replace(optimalSize[0], optimalSize[1]),
                tags: item.tags.split(', '),
                type: item.type
            };
        });
    };
}

function encodeQueryData(options) {
    let ret = [];
    for (let d in options) ret.push(encodeURIComponent(d) + '=' + encodeURIComponent(options[d]));
    return ret.join('&');
}

function encodeQueryOptions(keywords, type, minHeight, self) {
    if (self === 'searchAll') {
        type = 'all';
    } else if (self === 'searchPhoto') {
        type = 'photo';
    } else if (self === 'searchIllustration') {
        type = 'illustration';
    }
    return {
        queryString: encodeQueryData({
            key: KEY,
            q: encodeURIComponent(keywords),
            image_type: type,
            safesearch: true,
            min_height: (minHeight || 0)
        })
    };
}

['searchAll', 'searchPhoto', 'searchIllustration'].forEach(function (item) {
    imageSearch[item] = (keywords, maxHeight, minHeight) => {
        return imageSearch._sendStruct(encodeQueryOptions(keywords, null, minHeight, item), parserFnGen(maxHeight));
    };
});

module.exports = imageSearch;