const Logger = require('../../../logger'),
    CacheManager = require('cache-manager'),
    fsStore = require('cache-manager-fs'),
    fs = require('fs'),
    Q = require('q'),
    _ = require('lodash'),
    request = require('request'),
    rp = require('request-promise'),
    jsonQuery = require('json-query'),
    utils = require('./index'),
    MSG_SENDING_DELAY = 250;

class ApiConsumer {
    constructor(name, baseUrl, opts) {
        // or set opts like this: { cache } = { }
        // must be a urlfriendly name
        this._name = name;
        // set the defaults for the options
        opts = _.merge({
            cache: {
                ttl: 3600*24,
                path: process.env.CACHE_DIR || 'cache',
            }
        },opts);
        if (!fs.existsSync(opts.cache.path)) fs.mkdirSync(opts.cache.path);
        this._baseUrl = baseUrl;
        this._logger = new Logger('netsblox:rpc:'+this._name);
        // setup api endpoint
        this.COMPATIBILITY = {
            path: this._name
        };
        this._remainingMsgs = {};
        // setup cache. maxsize is in bytes, ttl in seconds
        this._cache = CacheManager.caching({
            store: fsStore,
            options: {
                ttl: opts.cache.ttl,
                maxsize: 1024*1000*100,
                path: opts.cache.path + '/' + this._name,
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
        if (queryOptions.body) parameters.push(queryOptions.body);
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

    // private
    _sendNext() {
        var msgs = this._remainingMsgs[this.socket.uuid];
        if (msgs && msgs.length) {
            var msg = msgs.shift();

            while (msgs.length && msg.dstId !== this.socket.role) {
                msg = msgs.shift();
            }

            // check that the socket is still at the role receiving the messages
            if (msg && msg.dstId === this.socket.role) {
                this._logger.trace('sending msg to', this.socket.uuid, this.socket.role);
                this.socket.send(msg);
            }

            if (msgs.length) {
                setTimeout(this._sendNext.bind(this), MSG_SENDING_DELAY);
            } else {
                delete this._remainingMsgs[this.socket.uuid];
            }
        } else {
            delete this._remainingMsgs[this.socket.uuid];
        }
    }

    /**
     * processes and queries json object or strings
     * @param  {json/string} json  [description]
     * @param  {string} query query string from json-query package
     * @return {json}       returns the value found withing the input json
     */
    _queryJson(json, query){
        try {
            if (typeof(json) === 'string') {
                json = JSON.parse(json);
            }
        } catch (e) {
            this._logger.error('input is not valid json');
        }
        return jsonQuery(query, {data: json}).value;
    }


    // creates snap friendly structure out of an array ofsimple keyValue json object or just single on of them.
    _createSnapStructure(input){
        return utils.jsonToSnapList(input);
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
        this._remainingMsgs[this.socket.uuid] = [];
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
                if (msgContents[0]) {
                    let msgKeys = Object.keys(msgContents[0]);
                    this.response.send(`sending ${msgContents.length} messages with message type: ${msgType} and following fields: ${msgKeys.join(', ')}`); // send back number of msgs
                }else {
                    this.response.send(`sending ${msgContents.length} messages with message type: ${msgType}`); // send back number of msgs
                }

                msgContents.forEach(content=>{
                    let msg = {
                        dstId: this.socket.role,
                        msgType,
                        content
                    };
                    this._remainingMsgs[this.socket.uuid].push(msg);
                });
                this._logger.trace(`initializing sending of ${msgContents.length} messages`);
                this._sendNext();
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
                let answer = this._queryJson(res,selector);
                this._logger.trace('answer is', answer);
                return answer;
            });
    }

    // sends an image to the user
    _sendImage(queryOptions){
        return this._requestImage(queryOptions)
            .then(imageBuffer => {
                utils.sendImageBuffer(this.response, imageBuffer);
                this._logger.trace('sent the image');
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
                this._logger.trace(this._queryJson(res,selector));
            });
    }

    _stopMsgs(){
        if (this._remainingMsgs[this.socket.uuid]) {
            this.response.status(200).send('stopping sending of the remaining ' + this._remainingMsgs[this.socket.uuid].length + 'msgs');
            delete this._remainingMsgs[this.socket.uuid];
            this._logger.trace('stopped sending messages for uuid:',this.socket.uuid, this.socket.role);
        }else {
            this.response.status(304).send('stopping sending of the remaining ' + 0 + 'msgs');
            this._logger.trace('there are no messages in the queue to stop.');
        }
        return null; // allows the caller to just return this function
    }
}


module.exports = ApiConsumer;
