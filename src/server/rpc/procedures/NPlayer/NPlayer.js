// This is the NPlayer game RPC. It ensures round-robin turn taking with N players.

'use strict';

var R = require('ramda'),
    debug = require('debug'),
    log = debug('NetsBlox:RPCManager:NPlayer:log'),
    trace = debug('NetsBlox:RPCManager:NPlayer:trace'),
    Constants = require('../../../../common/Constants'),
    info = debug('NetsBlox:RPCManager:NPlayer:info');

/**
 * NPlayerRPC - This constructor is called on the first request to an RPC
 * from a given room
 *
 * @constructor
 * @return {undefined}
 */
var NPlayerRPC = function() {
    this.active = null;
    this.previous = null;
    this.players = [];
};

/**
 * Return the path to the given RPC
 *
 * @return {String}
 */
NPlayerRPC.getPath = function() {
    return '/NPlayer';
};

/**
 * This function is used to expose the public API for RPC calls
 *
 * @return {Array<String>}
 */
NPlayerRPC.getActions = function() {
    return [
            'start',  // start (or restart) the game
            'getN',  // Get N
            'getActive',  // get the active Player's role id
            'getNext',  // get the next Player's role id
            'getPrevious',  // get the previous Player's role id
            'endTurn']  // Signal end of turn
};

// Actions

// start the game
NPlayerRPC.prototype.start = function(req, res) {

	// populate the players list
    this.players = [];
    req.netsbloxSocket._room.sockets()
        .forEach(socket => {
        	this.players = R.append({role: socket.roleId, socket: socket}, this.players);
		});

    // set the active player to the current one
	this.active = R.findIndex(R.propEq('role', req.netsbloxSocket.roleId))(this.players);

    // info('Player #' +this.active+' ('+ this.players[this.active] +') is (re)starting a ' +R.length(this.players)+' player game');
    info('Player #' +this.active+' ('+ this.players[this.active].role +') is (re)starting a ' +R.length(this.players)+' player game');

    // Send the start message to everyone
    this.players.forEach(player => player.socket.send({
            type: 'message',
            dstId: player.role,
            msgType: 'NPlayerStart',
            content: {
            }
        }));
    res.status(200).send(true);
};

// get the number of players
NPlayerRPC.prototype.getN = function(req, res) {	
    res.send(R.length(this.players).toString());
};

// get the active role
NPlayerRPC.prototype.getActive = function(req, res) {
	if(R.length(this.players) == 0) {
		res.send('');
	} else {
    	res.send(this.players[this.active].role);
    }
};

// get the previous role
NPlayerRPC.prototype.getPrevious = function(req, res) {
	if(this.previous == null || R.length(this.players) == 0) {
		res.send('');
	} else {
    	res.send(this.players[this.previous].role);
    }
};

// get the next role
NPlayerRPC.prototype.getNext = function(req, res) {
	if(R.length(this.players) == 0) {
		res.send('');
	} else {
    	res.send(this.players[(this.active + 1) % R.length(this.players)].role);
    }
};


// signal end of turn
NPlayerRPC.prototype.endTurn = function(req, res) {

	if(this.active === null || req.netsbloxSocket.roleId != this.players[this.active].role ) {
		// bail out if there's no game yet, or if it's somebody else's turn
		res.status(200).send(false);
	} else {

		info('Player #' +this.active+' ('+ this.players[this.active].role +') called endTurn');

		var nextIndex;
		if(req.query.next == '') {
			nextIndex = (this.active + 1) % R.length(this.players);
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
	            msgType: 'NPlayerPlay',
	            content: {
	            }
	        });
	    res.status(200).send(true);
	}
};

module.exports = NPlayerRPC;
