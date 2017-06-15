const Logger = require('../../../logger'),
    CacheManager = require('cache-manager'),
    cache = CacheManager.caching({store: 'memory', max: 1000, ttl: 86400}), // cache for 24hrs
    Q = require('q'),
    request = require('request'),
    rp = require('request-promise'),
    jsonQuery = require('json-query'),
    MSG_SENDING_DELAY = 250;

class ApiConsumer {
    constructor(name, baseUrl) {
        // should be a urlfriendly name
        this._name = name;
        this._baseUrl = baseUrl;
        this._logger = new Logger('netsblox:rpc:'+name);
        // setup api endpoint
        this.getPath = () => '/'+name;
        this.isStateless = true;
        this._remainingMsgs = {};
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
            headers,
            json: boolean to show indicate if the response is json or not. default: true
        }
     */
    _requestData(queryOptions){
        // when extending use urlencoding such as 'urlencode' to encode the query parameters
        if (Array.isArray(queryOptions)) {
            this._logger.trace('requesting data from', queryOptions.length, 'sources');
            let promises = queryOptions.map( qo => this._requestData(qo));
            return Promise.all(promises);
        }
        let fullUrl = (queryOptions.baseUrl || this._baseUrl) + queryOptions.queryString;
        this._logger.trace('requesting data for',fullUrl);
        return cache.wrap(fullUrl, ()=>{
            this._logger.trace('request is not cached, calling external endpoint');
            return rp({
                uri: fullUrl,
                headers: queryOptions.headers,
                json: queryOptions.json !== undefined ? queryOptions.json : true
            });
        }).catch(err => {
            this._logger.error('error in requesting data from', fullUrl, err);
        });
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
                this._logger.error('error in requesting the image', err);
            });
        };
        if (queryOptions.cache === false) {
            return requestImage();
        }else {
            return cache.wrap(fullUrl, ()=>{
                return requestImage();
            });
        }
    }

    // private
    _sendNext() {
        var msgs = this._remainingMsgs[this.socket.uuid];
        if (msgs && msgs.length) {
            var msg = msgs.shift();

            while (msgs.length && msg.dstId !== this.socket.roleId) {
                msg = msgs.shift();
            }

            // check that the socket is still at the role receiving the messages
            if (msg && msg.dstId === this.socket.roleId) {
                this._logger.trace('sending msg to', this.socket.uuid, this.socket.roleId);
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
        this._logger.trace('creating snap friendly structure');
        // if an string is passed check to see if it can be parsed to json
        if (typeof input === 'string') {
            try {
                input =  JSON.parse(input);
            } catch (e) {
                this._logger.trace('input data has is not json',e);
            }
        }

        // if it's not an obj(json or array)
        if (input === null || input === undefined) return [];
        if (typeof input !== 'object') return input;

        let keyVals = [];
        try {
            if (Array.isArray(input)) {
                for (let i = 0; i < input.length; i++) {
                    keyVals.push(this._createSnapStructure(input[i]));
                }
            }else{
                for (let i = 0; i < Object.keys(input).length; i++) {
                    keyVals.push([Object.keys(input)[i], this._createSnapStructure(Object.values(input)[i]) ]);
                }
            }
        } catch (e) {
            this._logger.error('error in creating snap structure', e);
        } finally {
            return keyVals;
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
                this.response.send(snapStructure);
                this._logger.trace('responded with an structure', snapStructure);
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
                        dstId: this.socket.roleId,
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
                this.response.send(answer);
            });
    }

    // sends an image to the user
    _sendImage(queryOptions){
        return this._requestImage(queryOptions)
            .then(imageBuffer => {
                this.response.set('cache-control', 'private, no-store, max-age=0');
                this.response.set('content-type', 'image/png');
                this.response.set('content-length', imageBuffer.length);
                this.response.set('connection', 'close');
                this.response.status(200).send(imageBuffer);
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
            this._logger.trace('stopped sending messages for uuid:',this.socket.uuid, this.socket.roleId);
        }else {
            this.response.send('there are no messages in the queue to stop.');
        }
    }

}


module.exports = ApiConsumer;
