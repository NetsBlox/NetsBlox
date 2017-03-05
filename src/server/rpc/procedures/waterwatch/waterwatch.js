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
    console.log('error',err);
    // response.json(err);
}

// factor out message sending and handling of multiple users
// msgs: an array of msgs.
function sendMsgs(msgs,socket){
    // QUESTION is there a need to check for the socket ID? 
    msgs.forEach(msg => {
        socket.send(msg);
    })
}

WaterWatchRPC.byCoordinates = function (northernLat, easternLong, southernLat, westernLong) {
    //init
    let options = {'format':'json', 'bBox':`${westernLong},${southernLat},${easternLong},${northernLat}`,
        'siteType':'ST','siteStatus':'active','parameterCd':'00060,00065'},
        url = baseUrl+encodeQueryData(options),
        socket = this.socket,
        response = this.response;

    console.log('Requesting data from ', url);
    rp(url)
        .then(data => {
            // santize and send messages to user
            console.log("Received data back");

            try {
                data = JSON.parse(data);
            } catch(e) {
                trace('Non-JSON data...');
                return response.send('Bad API Result: ' + data);
            }

            //clean and store the sections we want in a form of a message
            let msgs = [];
            data.value.timeSeries.forEach(item => {
                theData = {
                    siteName: item.sourceInfo.siteName,
                    lat: item.sourceInfo.geoLocation.geogLocation.latitude,
                    long: item.sourceInfo.geoLocation.geogLocation.longitude,
                    varName: item.variable.variableName,
                    varDescription: item.variable.variableDescription,
                    unit: item.variable.unit.unitCode,
                    value: item.values[0].value[0].value
                };
                msgs.push({
                    type: 'message',
                    msgType: 'streamInfo',
                    dstId: socket.roleId,
                    content: theData
                });
            });
            console.log('loaded ', data.value.timeSeries.length,'  items');
            response.send(`Sendig ${msgs.length} messages of type "streamInfo"`);
            // start sending messages - will send other user's messages too 
            // QUESTION: can you send to whatever socket.roleId you want from any source? 
            sendMsgs(msgs,socket);
        })
        .catch(err => {
            // show error
            showError(err,response);
        });

    return null;  // explicitly return null since async
};



if(true) { // add check for the availability of api key
module.exports = WaterWatchRPC;
}
