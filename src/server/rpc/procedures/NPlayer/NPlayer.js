// This is the NPlayer game RPC. It ensures round-robin turn taking with N players.

'use strict';

var R = require('ramda'),
    debug = require('debug'),
    info = debug('NetsBlox:RPCManager:NPlayer:info');

/**
 * NPlayer - This constructor is called on the first request to an RPC
 * from a given room
 *
 * @constructor
 * @return {undefined}
 */
var NPlayer = function() {
    this.active = null;
    this.previous = null;
    this.players = [];
};

/**
 * Return the path to the given RPC
 *
 * @return {String}
 */
NPlayer.getPath = function() {
    return '/NPlayer';
};

/**
 * This function is used to expose the public API for RPC calls
 *
 * @return {Array<String>}
 */
NPlayer.getActions = function() {
    return [
        'start',  // start (or restart) the game
        'getN',  // Get N
        'getActive',  // get the active Player's role id
        'getNext',  // get the next Player's role id
        'getPrevious',  // get the previous Player's role id
        'endTurn'];  // Signal end of turn
};

// Actions

// start the game
NPlayer.prototype.start = function(req, res) {

    // populate the players list
    this.players = [];
    
    this.players = req.netsbloxSocket._room.sockets().map(socket => {
        return {role: socket.roleId, socket: socket};
    });

    // set the active player to the current one
    this.active = R.findIndex(R.propEq('role', req.netsbloxSocket.roleId))(this.players);

    // info('Player #' +this.active+' ('+ this.players[this.active] +') is (re)starting a ' +R.length(this.players)+' player game');
    info('Player #' +this.active+' ('+ this.players[this.active].role +') is (re)starting a ' +R.length(this.players)+' player game');

    // Send the start message to everyone
    this.players.forEach(player => player.socket.send({
        type: 'message',
        dstId: player.role,
        msgType: 'start game',
        content: {
        }
    }));
    res.status(200).send(true);
};

// get the number of players
NPlayer.prototype.getN = function(req, res) {    
    res.send(this.players.length.toString());
};

// get the active role
NPlayer.prototype.getActive = function(req, res) {
    if(this.players.length == 0) {
        res.send('');
    } else {
        res.send(this.players[this.active].role);
    }
};

// get the previous role
NPlayer.prototype.getPrevious = function(req, res) {
    if(this.previous == null || this.players.length == 0) {
        res.send('');
    } else {
        res.send(this.players[this.previous].role);
    }
};

// get the next role
NPlayer.prototype.getNext = function(req, res) {
    if(this.players.length == 0) {
        res.send('');
    } else {
        res.send(this.players[(this.active + 1) % R.length(this.players)].role);
    }
};


// signal end of turn
NPlayer.prototype.endTurn = function(req, res) {

    if(this.active === null || req.netsbloxSocket.roleId != this.players[this.active].role ) {
        // bail out if there's no game yet, or if it's somebody else's turn
        res.status(200).send(false);
    } else {

        info('Player #' +this.active+' ('+ this.players[this.active].role +') called endTurn');

        var nextIndex;
        if(req.query.next == '') {
            nextIndex = (this.active + 1) % this.players.length;
        } else {
            nextIndex = R.findIndex(R.propEq('role', req.query.next))(this.players);
            if(nextIndex == -1) {
                info('Role ' +req.query.next+ ' is not part of the game');              
                res.status(200).send(false);        
                return;
            }                       
        }

        // save previous player's index, and make the next player active
        this.previous = this.active;
        this.active = nextIndex;

        info('Player #' +this.active+' ('+ this.players[this.active].role +') is the new active player');

        // Send the play message to the newly activated player
        this.players[this.active].socket.send({
            type: 'message',
            dstId: this.players[this.active].role,
            msgType: 'start turn',
            content: {
            }
        });
        res.status(200).send(true);
    }
};

module.exports = NPlayer;
