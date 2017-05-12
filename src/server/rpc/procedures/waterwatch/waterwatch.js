let WaterWatchRPC = {
    isStateless: true,
    getPath: () => '/waterwatch'
};

let debug = require('debug'),
    rp = require('request-promise'), //maybe use request-promise-native?
    error = debug('netsblox:rpc:trends:error'),
    CacheManager = require('cache-manager'),
    trace = debug('netsblox:rpc:trends:trace');

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
    // response.json(err);
}

//sanitize coordinate inputs

//******************************
// factor out message sending and handling of multiple users = sendNext and Stop
// msgs: an array of msgs stored in global scope.
let DELAY = 250;
let msgs = [];

function sendNextMsg(socket){
    // QUESTION is there a need to check for the socket ID? no need.
    if (msgs.length < 1){
        return;
    }
    socket.send(msgs.shift());
    setTimeout(sendNextMsg,DELAY,socket);
}

function stopSendingMsgs(socket){
    if (msgs) {
        // remove those with a different roleId | dont remove other's messages
        msgs = msgs.filter(msg => {
            return msg.dstId !== socket.roleId;
        });
    }
    trace(`Stopped sending messages to user with roleId ${socket.roleId}`);
}

// notes: dont forget to return null in your stop since we are handling the response in here.
//**********************************

// factor our the bulk of the work to provide easily readable settings for users.
// requests for data from the api, processes the response and sends the messages
function send(options,socket,response,msgType){

    let url = baseUrl+encodeQueryData(options);
    trace('requesting this url for data', url);
    rp(url)
        .then(data => {
            // santize and send messages to user
            trace('Received data back');

            try {
                data = JSON.parse(data);
            } catch(e) {
                trace('Non-JSON data...');
                return response.send('Bad API Result: ' + data);
            }

            //clean and store the sections we want in a form of a message
            data.value.timeSeries.forEach(item => {
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
                msgs.push({
                    type: 'message',
                    msgType: msgType,
                    dstId: socket.roleId,
                    content: msgContent
                });
            });
            trace('loaded ', data.value.timeSeries.length,'  items');
            // filterout messages ( imp if having multiple people use the shared msgs var)
            let myMsgs = msgs.filter(msg => {
                return msg.dstId == socket.roleId && msg.msgType == msgType;
            });
            response.send(`Sending ${myMsgs.length} messages of ${msgType}`);
            // start sending messages - will send other user's messages too
            sendNextMsg(socket);
        })
        .catch(err => {
            showError(err,response);
        });
}


WaterWatchRPC.gageHeight = function (northernLat, easternLong, southernLat, westernLong) {
    //init
    // list of parameteCD: https://help.waterdata.usgs.gov/codes-and-parameters/parameters
    // query descriptions: https://waterservices.usgs.gov/rest/IV-Test-Tool.html
    // QUESTIONS i cant pass socket to send func when using let. why?
    westernLong = parseFloat(westernLong).toFixed(7);
    easternLong = parseFloat(easternLong).toFixed(7);
    southernLat = parseFloat(southernLat).toFixed(7);
    northernLat = parseFloat(northernLat).toFixed(7);
    var options = {'format':'json', 'bBox':`${westernLong},${southernLat},${easternLong},${northernLat}`,
        'siteType':'GL,ST,GW,GW-MW,SB-CV,LA-SH,FA-CI,FA-OF,FA-TEP,AW','siteStatus':'active','parameterCd':'00065'},
        socket = this.socket,
        response = this.response;

    send(options,socket,response,'gageHeight');

    return null;  // explicitly return null since async
};


WaterWatchRPC.streamFlow = function (northernLat, easternLong, southernLat, westernLong) {
    //init
    westernLong = parseFloat(westernLong).toFixed(7);
    easternLong = parseFloat(easternLong).toFixed(7);
    southernLat = parseFloat(southernLat).toFixed(7);
    northernLat = parseFloat(northernLat).toFixed(7);
    var options = {'format':'json', 'bBox':`${westernLong},${southernLat},${easternLong},${northernLat}`,
        'siteType':'GL,ST,GW,GW-MW,SB-CV,LA-SH,FA-CI,FA-OF,FA-TEP,AW','siteStatus':'active','parameterCd':'00060'},
        socket = this.socket,
        response = this.response;

    send(options,socket,response,'streamFlow');

    return null;  // explicitly return null since async
};

WaterWatchRPC.waterTemp = function (northernLat, easternLong, southernLat, westernLong) {
    //init
    westernLong = parseInt(westernLong).toFixed(7);
    easternLong = parseInt(easternLong).toFixed(7);
    southernLat = parseInt(southernLat).toFixed(7);
    northernLat = parseInt(northernLat).toFixed(7);
    var options = {'format':'json', 'bBox':`${westernLong},${southernLat},${easternLong},${northernLat}`,
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
