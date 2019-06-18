/** 
 * 
 * 
 * @service
 */

const ApiConsumer = require('../utils/api-consumer');
const DotsConsumer = new ApiConsumer('ParallelDots', 'https://apis.paralleldots.com/v4',{cache: {ttl: 5*60}});
const key = process.env.PARALLELDOTS_KEY;

DotsConsumer._parallelDotsRequest = function (query, text){
    let body = `api_key=${key}&text=${encodeURI(text)}`;
    return this._sendAnswer({queryString: query, method: 'POST',
    headers: {
        'Content-Type' : 'application/x-www-form-urlencoded',}, body: body})
        .catch(err => {
            throw err;
        });
}

/**
 * @param {String} text
 */
DotsConsumer.emotion = function( text ) {
    return this._parallelDotsRequest('/emotion', text);
}

/**
 * @param {String} text
 */
DotsConsumer.sarcasm = function( text ) {
    return this._parallelDotsRequest('/sarcasm', text);
}


DotsConsumer.isSupported = () => {
    if(!key){
        /* eslint-disable no-console*/
        console.error('PARALLELDOTS_KEY is missing.');
        /* eslint-enable no-console*/
    }
    return !!key;
};

module.exports = DotsConsumer;
