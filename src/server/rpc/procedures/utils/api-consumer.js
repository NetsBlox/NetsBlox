const Logger = require('../../../logger'),
    CacheManager = require('cache-manager'),
    cache = CacheManager.caching({store: 'memory', max: 1000, ttl: 86400}), // cache for 24hrs
    R = require('ramda'),
    request = require('request'),
    rp = require('request-promise'),
    jsonQuery = require('json-query'),
    MSG_SENDING_DELAY = 250;

let remainingMsgs = {};

class ApiConsumer {
    constructor(name, baseUrl) {
        // should be a urlfriendly name
        this._name = name;
        this._baseUrl = baseUrl;
        this._logger = new Logger('netsblox:rpc:'+name);
        // setup api endpoint
        this.getPath = () => '/'+name;
        this.isStateless = true;

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
            json
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
            this._logger.trace('first time requesting this resource, calling external endpoint for data',fullUrl);
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
        // TODO add optional caching
        let fullUrl = (queryOptions.baseUrl || this._baseUrl) + queryOptions.queryString;
        var imgResponse = request.get(fullUrl);
        this._logger.trace('requesting image', fullUrl);
        delete imgResponse.headers['cache-control'];
        imgResponse.isImage = true;
        imgResponse.on('response', res => {
            if (!res.headers['content-type'].startsWith('image')) {
                this._logger.error(res.headers['content-type']);
                this._logger.error('invalid id / response',res.headers);
                imgResponse.isImage = false;
                this.response.send('null');
            }
        });
        return imgResponse;
    }

    // private
    _sendNext() {
        var msgs = remainingMsgs[this.socket.uuid];
        if (msgs && msgs.length) {
            var msg = msgs.shift();

            // while (msgs.length && msg.dstId !== this.socket.uuid) {
            //     msg = msgs.shift();
            // }

            // check that the socket is still at the role receiving the messages
            if (msg && msg.dstId === this.socket.roleId) {
                this._logger.trace('sending msg to', this.socket.uuid, this.socket.roleId);
                this.socket.send(msg);
            }

            if (msgs.length) {
                setTimeout(this._sendNext.bind(this), MSG_SENDING_DELAY);
            } else {
                delete remainingMsgs[this.socket.uuid];
            }
        } else {
            delete remainingMsgs[this.socket.uuid];
        }
    }

    // TODO move this out of the class as a helper
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
    _createSnapStructure(jsonData){
        this._logger.trace('creating snap friendly structure');
        let snapStructure = '';
        try{
            if (Array.isArray(jsonData)) {
                snapStructure = jsonData.map( obj => R.toPairs(obj));
            }else {
                snapStructure = R.toPairs(jsonData);
            }
        } catch (e) {
            this._logger.error('input structure has invalid format',e);
        }
        return snapStructure;
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
                // TODO check if parserFn is doing ok
                let snapStructure = this._createSnapStructure(parsedRes);
                this.response.send(snapStructure);
                this._logger.trace('responded with an structure', snapStructure);
            });
    }

    _sendMsgs(queryOptions,parserFn,msgType){
        remainingMsgs[this.socket.uuid] = [];
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
                let msgKeys = Object.keys(msgContents[0]);
                this.response.send(`sending ${msgContents.length} messages with message type: ${msgType} and following fields: ${msgKeys.join(', ')}`); // send back number of msgs
                // TODO check if parserFn is doing ok
                msgContents.forEach(content=>{
                    let msg = {
                        dstId: this.socket.roleId,
                        msgType,
                        content
                    };
                    remainingMsgs[this.socket.uuid].push(msg);
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
        let logger = this._logger,
            response = this.response;
        var imageBuffer = new Buffer(0);
        let imgResponse = this._requestImage(queryOptions);
        imgResponse.on('data', function(data) {
            imageBuffer = Buffer.concat([imageBuffer, data]);
        });

        imgResponse.on('end', function() {
            if (imgResponse.isImage){
                response.set('cache-control', 'private, no-store, max-age=0');
                response.set('content-type', 'image/png');
                response.set('content-length', imageBuffer.length);
                response.set('connection', 'close');
                response.status(200).send(imageBuffer);
                logger.trace('sent the image');
            }
        });
        imgResponse.on('error', err => {
            logger.error(err);
            // QUESTION what to return in case of an error?
            response.status(404).send('null');
        });
    }

    // WIP needs further testing
    _makeHelpers(argsArr,fnMap, queryOptionsMaker){
        fnMap.forEach(fnEntry => {
            this[fnEntry.name] = (...argsArr) => {
                // QUESTION can I pass in an obj with place holder for future defined variables?
                let queryOptions = queryOptionsMaker(...argsArr);
                this._sendAnswer(queryOptions,fnEntry.selector);
                return null;
            };
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

    // QUESTION how to make this apply whenever sendMsgs() is used?
    _stopMsgs(){
        this.response.status(200).send('stopping sending of the remaining ' + remainingMsgs[this.socket.uuid].length + 'msgs');
        delete remainingMsgs[this.socket.uuid];
        this._logger.trace('stopped sending messages for uuid:',this.socket.uuid, this.socket.roleId);
    }

}


module.exports = ApiConsumer;
