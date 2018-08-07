/**
 * The WaterWatch Service provides access to real-time water data.
 * For more information, check out https://waterservices.usgs.gov/
 * @service
 */
const ApiConsumer = require('../utils/api-consumer'),
    waterwatch = new ApiConsumer('waterwatch','https://waterservices.usgs.gov/nwis/iv/?');


// turn an options object into query friendly string
function encodeQueryData(options) {
    options.bBox = options.bBox.map(coord => parseFloat(coord).toFixed(7));
    let ret = [];
    for (let d in options)
        ret.push(encodeURIComponent(d) + '=' + encodeURIComponent(options[d]));
    return ret.join('&');
}


waterwatch.gageHeight = function (minLatitude, maxLatitude, minLongitude, maxLongitude) {
    // https://help.waterdata.usgs.gov/codes-and-parameters/parameters
    // query descriptions: https://waterservices.usgs.gov/rest/IV-Test-Tool.html
    // QUESTIONS i cant pass socket to send func when using let. why?
    var options = {'format':'json', 'bBox':[minLongitude,minLatitude,maxLongitude,maxLatitude], 'siteType':'GL,ST,GW,GW-MW,SB-CV,LA-SH,FA-CI,FA-OF,FA-TEP,AW','siteStatus':'active','parameterCd':'00065'};


    let queryOptions = {
        queryString: encodeQueryData(options)
    };

    let parser = data => {
        return data.value.timeSeries.map(item => {
            let idealObj = {
                siteName: item.sourceInfo.siteName,
                latitude: item.sourceInfo.geoLocation.geogLocation.latitude,
                longitude: item.sourceInfo.geoLocation.geogLocation.longitude,
                // we can include more information in the messages that we
                //  are sending to the user
                // varName: item.variable.variableName,
                // varDescription: item.variable.variableDescription,
                ft: item.values[0].value[0].value
            };
            return idealObj['ft'] < 0 ? null : idealObj;
        }).filter(item => item!==null);
    };

    // this._sendStruct(queryOptions, parser);
    return this._sendMsgs(queryOptions, parser, 'gageHeight');
};

waterwatch.streamFlow = function (minLatitude, maxLatitude, minLongitude, maxLongitude) {
    var options = {'format':'json', 'bBox': [minLongitude,minLatitude,maxLongitude,maxLatitude], 'siteType':'GL,ST,GW,GW-MW,SB-CV,LA-SH,FA-CI,FA-OF,FA-TEP,AW','siteStatus':'active','parameterCd':'00060'};

    let queryOptions = {
        queryString: encodeQueryData(options)
    };

    let parser = data => {
        return data.value.timeSeries.map(item => {
            let idealObj = {
                siteName: item.sourceInfo.siteName,
                latitude: item.sourceInfo.geoLocation.geogLocation.latitude,
                longitude: item.sourceInfo.geoLocation.geogLocation.longitude,
                'ft3/s': item.values[0].value[0].value
            };
            return idealObj['ft3/s'] < 0 ? null : idealObj;
        }).filter(item => item!==null);


    };

    return this._sendMsgs(queryOptions, parser, 'streamFlow');

};

waterwatch.waterTemp = function (minLatitude, maxLatitude, minLongitude, maxLongitude) {
    var options = {'format':'json', 'bBox':[minLongitude,minLatitude,maxLongitude,maxLatitude], 'siteType':'GL,ST,GW,GW-MW,SB-CV,LA-SH,FA-CI,FA-OF,FA-TEP,AW','siteStatus':'active','parameterCd':'00010'};

    let queryOptions = {
        queryString: encodeQueryData(options)
    };

    let parser = data => {
        return data.value.timeSeries.map(item => {
            let idealObj = {
                siteName: item.sourceInfo.siteName,
                latitude: item.sourceInfo.geoLocation.geogLocation.latitude,
                longitude: item.sourceInfo.geoLocation.geogLocation.longitude,
                c: item.values[0].value[0].value
            };
            return idealObj['c'] < -9999 ? null : idealObj;
        }).filter(item => item!==null);
    };

    return this._sendMsgs(queryOptions, parser, 'waterTemp');
};

waterwatch.stop = function(){
    return this._stopMsgs();
};

module.exports = waterwatch;
