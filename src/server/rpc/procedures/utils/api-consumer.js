const NBService = require('./service.js'),
    CacheManager = require('cache-manager'),
    fsStore = require('cache-manager-fs'),
    Q = require('q'),
    _ = require('lodash'),
    request = require('request'),
    rp = require('request-promise');

class ApiConsumer extends NBService {
    constructor(name, baseUrl, opts) {
        opts = _.merge({
            cache: {
                ttl: 3600*24,
                path: process.env.CACHE_DIR || 'cache',
            }
        }, opts);
        super(name);

        this._baseUrl = baseUrl;

        // setup cache. maxsize is in bytes, ttl in seconds
        this._cache = CacheManager.caching({
            store: fsStore,
            options: {
                ttl: opts.cache.ttl,
                maxsize: 1024*1000*100,
                path: opts.cache.path + '/' + this.serviceName,
                preventfill: false,
                reviveBuffers: true
            }
        });
    }

    /**
     * requests data from an endpoint and caches it.
     * @param  {array/json} queryOptions a single item or an array of queryOptions
     * that describe the options used to call the endpoint.
     * @return {Promise}                 promise from request-promise
     */

    /**
        queryOptions = {
            queryString,
            baseUrl,
            method,
            body,
            headers,
            json: boolean to show indicate if the response is json or not. default: true
        }
     */
    _requestData(queryOptions){
        // when extending use urlencoding such as 'urlencode' to encode the query parameters
        // TODO implement a defaults object
        if (Array.isArray(queryOptions)) {
            this._logger.trace('requesting data from', queryOptions.length, 'sources');
            let promises = queryOptions.map( qo => this._requestData(qo));
            return Promise.all(promises);
        }
        let fullUrl = (queryOptions.baseUrl || this._baseUrl) + queryOptions.queryString;
        this._logger.trace('requesting data for', fullUrl);
        if (queryOptions.body) this._logger.trace('with the body', queryOptions.body);
        return this._cache.wrap(this._getCacheKey(queryOptions), ()=>{
            this._logger.trace('request is not cached, calling external endpoint');
            return rp({
                uri: fullUrl,
                method: queryOptions.method || 'GET',
                body: queryOptions.body,
                headers: queryOptions.headers,
                json: queryOptions.json !== undefined ? queryOptions.json : true
            });
        }).catch(err => {
            this._logger.error('error in requesting data from', fullUrl, err);
            throw err;
        });
    }

    _getCacheKey(queryOptions){
        let parameters = [];
        parameters.push(queryOptions.method || 'GET');
        let fullUrl = (queryOptions.baseUrl || this._baseUrl) + queryOptions.queryString;
        parameters.push(fullUrl);

        // NOTE: It is possible that an RPC will be made with a non-text request body, preventing this from generating a cache key.
        // Please override this method if you are developing an RPC with a body that will not stringify properly
        if (queryOptions.body) parameters.push(JSON.stringify(queryOptions.body));
        return parameters.join(' ');
    }

    /**
     * requests for an image
     * @param  {obj} queryOptions
     * @return {Response Obj}              response object from 'request' module
     */
    _requestImage(queryOptions){
        let logger = this._logger;
        let fullUrl = (queryOptions.baseUrl || this._baseUrl) + queryOptions.queryString;
        let requestImage = () => {
            logger.trace('requesting image from', fullUrl);
            var imgResponse = request.get(fullUrl);
            delete imgResponse.headers['cache-control'];
            imgResponse.isImage = true;
            imgResponse.on('response', res => {
                if (!res.headers['content-type'].startsWith('image')) {
                    logger.error(res.headers['content-type']);
                    logger.error('invalid id / response',res.headers);
                    imgResponse.isImage = false;
                    deferred.reject('requested resource is not a valid image.');
                }
            });
            let deferred = Q.defer();
            var imageBuffer = new Buffer(0);
            imgResponse.on('data', function(data) {
                imageBuffer = Buffer.concat([imageBuffer, data]);
            });
            imgResponse.on('end', function() {
                if (imgResponse.isImage){
                    deferred.resolve(imageBuffer);
                }
            });
            imgResponse.on('error', err => {
                deferred.reject(err);
            });
            return deferred.promise.catch(err => {
                this._logger.error('error in requesting the image',fullUrl, err);
                throw err;
            });
        };
        if (queryOptions.cache === false) {
            return requestImage();
        }else {
            return this._cache.wrap(fullUrl, ()=>{
                return requestImage();
            });
        }
    }


    /**
     * request a full response sending back a data structure.
     * @param  {string} queryOptions
     * @param  {Function} parseFn should convert a valid response from the api into an array of simple (tuple - keyvalue) Json Objects for  messages
     * @return {Promise}
     */
    _sendStruct(queryOptions,parserFn){
        return this._requestData(queryOptions)
            .then(res => {
                this._logger.trace('got response back',res);
                let parsedRes;
                try {
                    parsedRes =  parserFn(res);
                } catch(e) {
                    this._logger.error('exception occured when parsing the response', e);
                    this.response.status(500).send('');
                    return;
                }
                this._logger.trace('parsed response:', parsedRes);
                let snapStructure = this._createSnapStructure(parsedRes);
                this._logger.trace('responded with an structure', snapStructure);
                return snapStructure;
            });
    }

    _sendMsgs(queryOptions,parserFn,msgType){
        return this._requestData(queryOptions)
            .then(res => {
                let msgContents;
                try {
                    msgContents = parserFn(res);
                } catch(e) {
                    this._logger.error('exception occured when parsing the response', e);
                    this.response.status(500).send('');
                    return;
                }
                this._sendMsgsQueue(msgContents, msgType);
            });
    }

    /**
     * queries the endpoint for an specific string answer.
     * @param  {object} queryOptions
     * @param  {string} selector     json-query-like string
     * @return {Promise}
     */
    _sendAnswer(queryOptions,selector){
        return this._requestData(queryOptions)
            .then(res => {
                let answer = this.__queryJson(res,selector);
                this._logger.trace('answer is', answer);
                return answer;
            });
    }

    // sends an image to the user
    _sendImage(queryOptions){
        return this._requestImage(queryOptions)
            .then(imageBuffer => {
                this._sendImageBuffer(imageBuffer);
            }).catch(() => {
                this.response.status(404).send('');
            });
    }

    // helper test the response
    // = request data that logs then logs the response and limits it by selector
    _inspectResponse(queryOptions, selector){
        this._requestData(queryOptions)
            .then(res=> {
                this._logger.trace('got response');
                this._logger.trace(this.__queryJson(res,selector));
            });
    }
}


module.exports = ApiConsumer;
