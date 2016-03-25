// This is a key value store that can be used across tables
'use strict';

var debug = require('debug'),
    log = debug('NetsBlox:RPCManager:PubSub:log'),
    trace = debug('NetsBlox:RPCManager:PubSub:trace');

var subs = {};

var removeSub = function(topic, socket) {
    var id = subs[topic].indexOf(socket);
    subs[topic].splice(id, 1);

    if (subs[topic].length === 0) {
        delete subs[topic];
    }
};

module.exports = {

    // This is very important => Otherwise it will try to instantiate this
    isStateless: true,

    // These next two functions are the same from the stateful RPC's
    getPath: function() {
        return '/pubsub';
    },

    getActions: function() {
        return ['pub', 'sub'];
    },

    sub: function(req, res) {
        var topic = req.query.topic.toLowerCase(),
            socket = req.netsbloxSocket;

        if (!subs[topic]) {
            subs[topic] = [];
        }

        trace(`${socket.username} has subscribed to ${topic}`);
        subs[topic].push(socket);
        socket.onclose.push(removeSub.bind(null, topic, socket));
        res.sendStatus(200);
    },

    unsub: function(req, res) {
        var topic = req.query.topic.toLowerCase(),
            socket = req.netsbloxSocket;

        removeSub(topic, socket);
        res.sendStatus(200);
    },

    pub: function(req, res) {
        var topic = req.query.topic.toLowerCase(),
            content = req.query.content;

        // publish the message to all the subscribers
        if (subs[topic]) {
            trace(`publishing ${content} to ${topic}`);
            subs[topic].forEach(socket => socket.send({
                type: 'message',
                dstId: socket.roleId,
                msgType: 'message',
                content: { msg: content }
            }));
        } else {
            log(`${topic} has no subscribers`);
        }

        res.sendStatus(200);
    }
};
