/** 
 * Uses Badge Server API to communicate with Parallax Badges .
 * See the API documentation, at 
 * https://github.com/TheBizzle/Vandyland/wiki/Web-API-(Badger-State)
 * 
 * @service
 */

const ApiConsumer = require('../utils/api-consumer');
//const BadgeConsumer = new ApiConsumer('BadgeServer', 'http://rendupo.com:8000',{cache: {ttl: 1}});
const BadgeConsumer = new ApiConsumer('BadgeServer', 'https://gallery.app.vanderbilt.edu',{cache: {ttl: 1}});

/**
 * @param {String} groupid  The group that you want to join.
 */
BadgeConsumer.join = function ( groupid ){
    let body = ''; //`group-id=${encodeURI(groupid)}`;
    return this._sendAnswer({queryString: '/badgerstate/join/'+groupid+'/', method: 'POST',
        headers: {
            'Content-Type' : 'application/x-www-form-urlencoded',}, body: body})
        .catch(err => {
            throw err;
        });
};


/**
 * @param {String} groupid  The group whose participants you want to list.
 */
BadgeConsumer.participants = function ( groupid ){
    //let body = `group-id=${encodeURI(theid)}`;
    let body = '';
    return this._sendAnswer({queryString: '/badgerstate/participants/'+groupid+'/', method: 'GET',
        headers: {
            'Content-Type' : 'application/x-www-form-urlencoded',}, body: body})
        .catch(err => {
            throw err;
        });
};

/**
 * @param {String} group  The group that you want to join.
 * @param {String} bucket  The 'bucket' whose data you're adding to (the participant).
 * @param {String} thedata  The arbitrary data you want to store in that bucket.
 */
BadgeConsumer.adddata = function ( group, bucket, thedata ){
    //let body = `group-id=${encodeURI(group)}&bucket-id=${encodeURI(bucket)}&data=${encodeURI(thedata)}`;
    let body = ''; //`group-id=${encodeURI('123456789')}&bucket-id=${encodeURI('07cbee79-b3f3-4c0a-a59a-b11be55d7602')}&data=${encodeURI('12345')}`;
    return this._sendAnswer({queryString: '/badgerstate/data/'+group+'/'+bucket+'/'+thedata, method: 'POST',
        headers: {
            'Content-Type' : 'application/x-www-form-urlencoded',}, body: body})
        .catch(err => {
            throw err;
        });
};


/**
 * @param {String} group  The group that you want to join.
 * @param {String} bucket  The 'bucket' whose data you're adding to (the participant).
 * @param {String} n  The number of records to get; 0 for all.
 */
BadgeConsumer.getdata = function ( group, bucket, n ){
    let body = '';//`group-id=${encodeURI(group)}&bucket-id=${encodeURI(bucket)}&n=${encodeURI(n)}`;
    return this._sendAnswer({queryString: '/badgerstate/data/'+group+'/'+bucket+'/'+n, method: 'GET',
        headers: {
            'Content-Type' : 'application/x-www-form-urlencoded',}, body: body})
        .catch(err => {
            throw err;
        });
};

/**
 * @param {String} group  The group that you want to join.
 * @param {String} bucket  The 'bucket' whose data you're adding to (the participant).
 * @param {String} signal  The arbitrary data you want to store in that bucket.
 */
BadgeConsumer.setsignal = function ( group, bucket, signal ){
    let body = ''; //`signal=${encodeURI(signal)}`;
    return this._sendAnswer({queryString: '/badgerstate/signal/'+group+'/'+bucket+'/'+signal, method: 'POST',
        headers: {
            'Content-Type' : 'application/x-www-form-urlencoded',}, body: body})
        .catch(err => {
            throw err;
        });
};

/**
 * @param {String} group  The group that you want to join.
 * @param {String} bucket  The 'bucket' whose data you're adding to (the participant).
 */
BadgeConsumer.getsignal = function ( group, bucket ){
    let body = ''; //`bucket-id=${encodeURI(bucket)}`;
    return this._sendAnswer({queryString: '/badgerstate/signal/'+group+'/'+bucket, method: 'GET',
        headers: {
            'Content-Type' : 'application/x-www-form-urlencoded',}, body: body})
        .catch(err => {
            throw err;
        });
};


module.exports = BadgeConsumer;