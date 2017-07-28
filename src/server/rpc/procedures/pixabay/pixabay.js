const ApiConsumer = require('../utils/api-consumer');
const pixabay = new ApiConsumer('Pixabay', 'https://pixabay.com/api/?');
const KEY = process.env.PIXABAY;
const rpcUtils = require('../utils');

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

function encodeQueryOptions(keywords, type, minHeight, self) {
    if (self === 'searchAll') {
        type = 'all';
    } else if (self === 'searchPhoto') {
        type = 'photo';
    } else if (self === 'searchIllustration') {
        type = 'illustration';
    }
    return {
        queryString: rpcUtils.encodeQueryData({
            key: KEY,
            q: encodeURIComponent(keywords),
            image_type: type,
            safesearch: true,
            min_height: (minHeight || 0)
        })
    };
}


['searchAll', 'searchPhoto', 'searchIllustration'].forEach(function (item) {
    pixabay[item] = function (keywords, maxHeight, minHeight) {
        return this._sendStruct(encodeQueryOptions(keywords, null, minHeight, item), parserFnGen(maxHeight));
    };
});

pixabay.getImage = function(url){
    return this._sendImage({queryString: '', baseUrl:url});
};

if(!process.env.PIXABAY) {
    console.log('Warning: environment variable PIXABAY not defined, search-image RPC will not work.');
} else {
    module.exports = pixabay;
}
