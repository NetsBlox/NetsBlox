const NBService = require('./service.js'),
    CacheManager = require('cache-manager'),
    fsStore = require('cache-manager-fs'),
    fs = require('fs'),
    Q = require('q'),
    _ = require('lodash'),
    request = require('request'),
    rp = require('request-promise');

const {InvalidKeyError} = require('./api-key');
const utils = require('./index');

class ApiConsumer extends NBService {
    constructor(name, baseUrl, opts) {
        opts = _.merge({
            cache: {
                ttl: 3600*24,
                path: process.env.CACHE_DIR || 'cache',
            }
        }, opts);
        super(name);

        this._baseUrl = baseUrl.replace(/\?$/, '').replace(/\/$/, '');

        // setup cache. maxsize is in bytes, ttl in seconds
        if (!fs.existsSync(opts.cache.path)) fs.mkdirSync(opts.cache.path); // ensure path exists
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
            url,
            path,
            queryString,
            baseUrl,
            method,
            body,
            headers,
            json: boolean to show indicate if the response is json or not. default: true
        }
     */
    _getFullUrl(queryOptions){
        const queryString = queryOptions.queryString ?
            queryOptions.queryString.replace(/^\??/, '?') : '';
        const path = queryOptions.path ?
            queryOptions.path.replace(/^\/?/, '/') : '';

        const baseUrl = queryOptions.baseUrl || this._baseUrl;
        return queryOptions.url || (baseUrl + path + queryString);
    }

    _requestData(queryOptions){
        // when extending use urlencoding such as 'urlencode' to encode the query parameters
        // TODO implement a defaults object
        if (Array.isArray(queryOptions)) {
            this._logger.trace('requesting data from', queryOptions.length, 'sources');
            let promises = queryOptions.map(qo => this._requestData(qo));
            return Promise.all(promises);
        }
        const fullUrl = this._getFullUrl(queryOptions);
        this._logger.trace('requesting data for', fullUrl);
        if (queryOptions.body) this._logger.trace('with the body', queryOptions.body);
        return this._cache.wrap(this._getCacheKey(queryOptions), ()=>{
            this._logger.trace('request is not cached, calling external endpoint');
            return rp({
                uri: fullUrl,
                method: queryOptions.method || 'GET',
                body: queryOptions.body,
                auth: queryOptions.auth,
                headers: queryOptions.headers,
                json: queryOptions.json !== undefined ? queryOptions.json : true
            });
        }).catch(err => {
            const isStatusCodeError = err.name === 'StatusCodeError';
            if (isStatusCodeError) {
                this._checkInvalidApiKey(err.statusCode);
            }
            this._logger.error('error in requesting data from', fullUrl, err.message);
            throw err;
        });
    }

    _checkInvalidApiKey(statusCode) {
        const is4xxError = statusCode > 399 && statusCode < 500;
        if (is4xxError && this.apiKey) {
            throw new InvalidKeyError(this.apiKey);
        }
    }

    _getCacheKey(queryOptions){
        let parameters = [];
        parameters.push(queryOptions.method || 'GET');
        const fullUrl = this._getFullUrl(queryOptions);
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
        const logger = this._logger;
        const fullUrl = this._getFullUrl(queryOptions);
        let requestImage = () => {
            logger.trace('requesting image from', fullUrl);
            const deferred = Q.defer();
            const imgResponse = request.get(fullUrl);
            delete imgResponse.headers['cache-control'];
            imgResponse.on('response', res => {
                try {
                    this._checkInvalidApiKey(res.statusCode);
                } catch (err) {
                    return deferred.reject(err);
                }

                const success = res.statusCode > 199 && res.statusCode < 300;
                let respData = new Buffer(0);  // FIXME
                imgResponse.on('data', function(data) {
                    respData = Buffer.concat([respData, data]);
                });
                imgResponse.on('end', function() {
                    if (success) {
                        deferred.resolve(respData);
                    } else {
                        const defaultError = 'requested resource is not a valid image.';
                        deferred.reject(new Error(respData.toString() || defaultError));
                    }
                });
                imgResponse.on('error', deferred.reject);
            });

            return deferred.promise;
        };

        if (queryOptions.cache === false) {
            return requestImage();
        } else {
            return this._cache.wrap(fullUrl, () => {
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

    static setRequiredApiKey(service, apiKey) {
        utils.setRequiredApiKey(service, apiKey);
    }
}


module.exports = ApiConsumer;
