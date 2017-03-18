// TODO change console logs.
// eslint
let WaterWatchRPC = {
    isStateless: true,
    getPath: () => '/waterwatch'
};

let debug = require('debug'),
    // request = require('request'),
    rp = require('request-promise'), //maybe use request-promise-native?
    error = debug('netsblox:rpc:trends:error'),
    CacheManager = require('cache-manager'),
    trace = debug('netsblox:rpc:trends:trace'),
    Q = require('q');

let baseUrl = 'https://waterservices.usgs.gov/nwis/iv/?',
    cache = CacheManager.caching({store: 'memory', max: 1000, ttl: 36000});



// let westernLong = -82;
// let southernLat = 37;
// let easternLong = -81;
// let northernLat = 38;


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
    // response.json(err);
}


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

//checks msg ownership, needs access to socket. 
function isMsgOwner(msg){
    return msg.dstId = socket.roleId
}

function stopSendingMsgs($this){
    socket = $this.socket;
    response = $this.response;
    if (msgs) {
        // remove those with a different roleId | dont remove other's messages
        msgs = msgs.filter(msg => {
            return msg.dstId != socket.roleId;
        });
    }
    trace(`Stopped sending messages to user with roleId ${socket.roleId}`);
    response.send('Stopped sending messages.');
}

// notes: dont forget to return null in your stop since we are handling the response in here.
//**********************************

// factor our the bulk of the work to provide easily readable settings for users.
// TODO rename the function
function doTheWork(options,socket,response,msgType){

    let url = baseUrl+encodeQueryData(options);
    trace('Requesting data from ', url);
    rp(url)
        .then(data => {
            // santize and send messages to user
            trace("Received data back");

            try {
                data = JSON.parse(data);
            } catch(e) {
                trace('Non-JSON data...');
                return response.send('Bad API Result: ' + data);
            }

            //clean and store the sections we want in a form of a message
            data.value.timeSeries.forEach(item => {
                theData = {
                    siteName: item.sourceInfo.siteName,
                    lat: item.sourceInfo.geoLocation.geogLocation.latitude,
                    long: item.sourceInfo.geoLocation.geogLocation.longitude,
                    // varName: item.variable.variableName,
                    // varDescription: item.variable.variableDescription,
                    unit: item.variable.unit.unitCode,
                    value: item.values[0].value[0].value
                };
                trace(theData);
                msgs.push({
                    type: 'message',
                    msgType: msgType,
                    dstId: socket.roleId,
                    content: theData
                });
            });
            trace('loaded ', data.value.timeSeries.length,'  items');
            // filterout messages ( imp if having multiple people use the shared msgs var)
            let myMsgs = msgs.filter(msg => {
                return msg.dstId == socket.roleId && msg.msgType == msgType
            })
            response.send(`Sendig ${myMsgs.length} messages of ${msgType}`);
            // start sending messages - will send other user's messages too 
            // QUESTION: can you send to whatever socket.roleId you want from any source? yes can do
            sendNextMsg(socket);
        })
        .catch(err => {
            // show error
            showError(err,response);
        });
}


WaterWatchRPC.gageHeight = function (northernLat, easternLong, southernLat, westernLong) {
    //init
    // list of parameteCD: https://help.waterdata.usgs.gov/codes-and-parameters/parameters
    // query descriptions: https://waterservices.usgs.gov/rest/IV-Test-Tool.html
    // QUESTIONS i cant pass socket to doTheWork func when using let. why? 
    var options = {'format':'json', 'bBox':`${westernLong},${southernLat},${easternLong},${northernLat}`,
        'siteType':'GL,ST,GW,GW-MW,SB-CV,LA-SH,FA-CI,FA-OF,FA-TEP,AW','siteStatus':'active','parameterCd':'00065'},
        socket = this.socket,
        response = this.response;

    doTheWork(options,socket,response,'gageHeight');
    
    return null;  // explicitly return null since async
};


WaterWatchRPC.streamFlow = function (northernLat, easternLong, southernLat, westernLong) {
    //init
    // list of parameteCD: https://help.waterdata.usgs.gov/codes-and-parameters/parameters
    // query descriptions: https://waterservices.usgs.gov/rest/IV-Test-Tool.html
    var options = {'format':'json', 'bBox':`${westernLong},${southernLat},${easternLong},${northernLat}`,
        'siteType':'GL,ST,GW,GW-MW,SB-CV,LA-SH,FA-CI,FA-OF,FA-TEP,AW','siteStatus':'active','parameterCd':'00060'},
        socket = this.socket,
        response = this.response;

    doTheWork(options,socket,response,'streamFlow');
    
    return null;  // explicitly return null since async
};

WaterWatchRPC.waterTemp = function (northernLat, easternLong, southernLat, westernLong) {
    //init
    // list of parameteCD: https://help.waterdata.usgs.gov/codes-and-parameters/parameters
    // query descriptions: https://waterservices.usgs.gov/rest/IV-Test-Tool.html
    var options = {'format':'json', 'bBox':`${westernLong},${southernLat},${easternLong},${northernLat}`,
        'siteType':'GL,ST,GW,GW-MW,SB-CV,LA-SH,FA-CI,FA-OF,FA-TEP,AW','siteStatus':'active','parameterCd':'00010'},
        socket = this.socket,
        response = this.response;

    doTheWork(options,socket,response,'waterTemp');
    
    return null;  // explicitly return null since async
};

WaterWatchRPC.stop = function(){
    stopSendingMsgs(this);
    return null;
};



if(true) { // add check for the availability of api key
module.exports = WaterWatchRPC;
}
