let WaterWatchRPC = {
    isStateless: true,
    getPath: () => '/waterwatch'
};

let debug = require('debug'),
rp = require('request-promise'), //maybe use request-promise-native?
error = debug('netsblox:rpc:waterwatch:error'),
CacheManager = require('cache-manager'),
trace = debug('netsblox:rpc:waterwatch:trace');

let baseUrl = 'https://waterservices.usgs.gov/nwis/iv/?',
cache = CacheManager.caching({store: 'memory', max: 1000, ttl: 36000});


// turn an options object into query friendly string
function encodeQueryData(options) {
    let ret = [];
    for (let d in options)
    ret.push(encodeURIComponent(d) + '=' + encodeURIComponent(options[d]));
    return ret.join('&');
}

// used to send feedback about errors to the caller.
function showError(err, response) {
    error('error',err);
    response.send('Error occured. Bounding box too big?');
}

//sanitize coordinate inputs

//******************************
// factor out message sending and handling of multiple users = sendNext and Stop
// msgs: an array of msgs stored in global scope.
let DELAY = 250;
let waterwatchMsgs = {};

function sendNextMsg(socket){
    if (waterwatchMsgs[socket.roleId].length < 1){
        return;
    }
    socket.send(waterwatchMsgs[socket.roleId].shift());
    setTimeout(sendNextMsg,DELAY,socket);
}

function stopSendingMsgs(socket){
    waterwatchMsgs[socket.roleId] = [];
    trace(`Stopped sending messages to user with roleId ${socket.roleId}`);
}

// notes: dont forget to return null in your stop since we are handling the response in here.
//**********************************

// factor our the bulk of the work to provide easily readable settings for users.
// requests for data from the api, processes the response and sends the messages
function send(options,socket,response,msgType){
    waterwatchMsgs[socket.roleId] = [];
    // parse and make the coordinates compatible with the api
    options.bBox = options.bBox.map(coord => parseFloat(coord).toFixed(7))
    console.log(options);
    let url = baseUrl+encodeQueryData(options);
    cache.wrap(url, cacheCallback => {
        trace('requesting this url for data (not cached!)', url);
        rp(url)
        .then(data => {
            // santize and send messages to user
            try {
                data = JSON.parse(data);
                return cacheCallback(null,data);
            } catch(e) {
                trace('Non-JSON data...');
                return cacheCallback('Bad API result',null);
            }
        })
        .catch(err => {
            error(err);
            return cacheCallback('Bad API result',null);
        });

    }, (err, results) => {
        if(results){
            // after we have the data from the endpoint proceed
            //clean and store the sections we want in a form of a message
            results.value.timeSeries.forEach(item => {
                let msgContent = {
                    siteName: item.sourceInfo.siteName,
                    lat: item.sourceInfo.geoLocation.geogLocation.latitude,
                    lon: item.sourceInfo.geoLocation.geogLocation.longitude,
                    // we can include more information in the messages that we
                    //  are sending to the user
                    // varName: item.variable.variableName,
                    // varDescription: item.variable.variableDescription,
                    unit: item.variable.unit.unitCode,
                    value: item.values[0].value[0].value
                };
                waterwatchMsgs[socket.roleId].push({
                    type: 'message',
                    msgType: msgType,
                    dstId: socket.roleId,
                    content: msgContent
                });
            });
            trace('loaded ', results.value.timeSeries.length,'  items');
            response.send(`Sending ${waterwatchMsgs[socket.roleId].length} messages of ${msgType}`);
            // start sending messages - will send other user's messages too
            sendNextMsg(socket);
        }else {
            showError(err, response);
        }
    });


} // end of send()


WaterWatchRPC.gageHeight = function (northernLat, easternLong, southernLat, westernLong) {
    //init
    // list of parameteCD: https://help.waterdata.usgs.gov/codes-and-parameters/parameters
    // query descriptions: https://waterservices.usgs.gov/rest/IV-Test-Tool.html
    // QUESTIONS i cant pass socket to send func when using let. why?
    var options = {'format':'json', 'bBox':[westernLong,southernLat,easternLong,northernLat],
    'siteType':'GL,ST,GW,GW-MW,SB-CV,LA-SH,FA-CI,FA-OF,FA-TEP,AW','siteStatus':'active','parameterCd':'00065'},
    socket = this.socket,
    response = this.response;

    send(options,socket,response,'gageHeight');

    return null;  // explicitly return null since async
};


WaterWatchRPC.streamFlow = function (northernLat, easternLong, southernLat, westernLong) {
    //init
    var options = {'format':'json', 'bBox': [westernLong,southernLat,easternLong,northernLat],
    'siteType':'GL,ST,GW,GW-MW,SB-CV,LA-SH,FA-CI,FA-OF,FA-TEP,AW','siteStatus':'active','parameterCd':'00060'},
    socket = this.socket,
    response = this.response;

    send(options,socket,response,'streamFlow');

    return null;  // explicitly return null since async
};

WaterWatchRPC.waterTemp = function (northernLat, easternLong, southernLat, westernLong) {
    //init
    var options = {'format':'json', 'bBox':[westernLong,southernLat,easternLong,northernLat],
    'siteType':'GL,ST,GW,GW-MW,SB-CV,LA-SH,FA-CI,FA-OF,FA-TEP,AW','siteStatus':'active','parameterCd':'00010'},
    socket = this.socket,
    response = this.response;

    send(options,socket,response,'waterTemp');

    return null;  // explicitly return null since async
};

WaterWatchRPC.stop = function(){
    stopSendingMsgs(this.socket);
    this.response.send('Stopped sending messages.');
    return null;
};



module.exports = WaterWatchRPC;
