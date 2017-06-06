const ApiConsumer = require('../utils/api-consumer');
let image = new ApiConsumer('image','');

image.display = function(url){
    this._sendImage({
        queryString: url
    });
    return null;
};

module.exports = image;
