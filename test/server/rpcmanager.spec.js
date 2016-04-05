/*globals describe,it,before,beforeEach,afterEach,after*/
'use strict';

var supertest = require('supertest'),
    assert = require('assert'),
    port = 4493,
    WebSocket = require('ws'),  // jshint ignore:line
    api = supertest('http://localhost:'+port+'/rpc/tictactoe'),  // https?
    Server = require('../../src/server/Server'),
    ROOM_NAME = 'ttt-test-room';

describe('RPC Manager Tests', function() {
    var uuid,
        server;

    before(function(done) {
        server = new Server({
            port: port,
            vantage: false
        });
        server.start(done);
    });

    after(function(done) {
        server.stop(done);
    });

    // Testing an example RPC
    describe('Basic tests', function() {
        it('should exist', function(done) {
            api.get('/isGameOver?uuid='+uuid)
                .expect(401)
                .end(done);
        });
    });

    describe('TicTacToe tests', function() {
        var socket,
            host = 'ws://localhost:'+port;

        // Connect a websocket
        before(function(done) {
            socket = new WebSocket(host);
            socket.on('open', function() {
                socket.on('message', function(msg) {
                    msg = JSON.parse(msg);

                    if (msg.type === 'uuid') {
                        uuid = msg.body;
                        // create a room
                        var res = {
                            type: 'create-room',
                            room: ROOM_NAME,
                            role: 's1'
                        };
                        socket.send(JSON.stringify(res));
                        done();
                    }
                });
            });
        });

        afterEach(function(done) {
            api.get('/clear?uuid='+uuid)
                .expect(200)
                .end(done);
        });

        it('should return 400 if bad action', function(done) {
            api.get('/I_dont_exist?uuid='+uuid)
                .expect(400)
                .end(done);
        });

        it('should respond to queries', function(done) {
            api.get('/isGameOver?uuid='+uuid)
                .expect(function(res) {
                    assert.equal(res.body, false);
                })
                .end(done);
        });

        it('should maintain state', function(done) {
            var play = api.get('/play?uuid='+uuid+'&row=1&column=1')
                .expect(200)
                .end(function() {
                    api.get('/getTile?uuid='+uuid+'&row=1&column=1')
                        .expect(function(res) {
                            assert.equal(res.text, uuid);
                        })
                        .end(done);
                });
        });

        describe('Second connection', function() {
            var newSocket,
                username2;  // This is an intentionally challenging name

            before(function(done) {
                newSocket = new WebSocket(host);
                newSocket.on('open', function() {
                    newSocket.on('message', function(msg) {
                        msg = JSON.parse(msg);

                        if (msg.type === 'uuid') {
                            username2 = msg.body;

                            socket.send(JSON.stringify({
                                type: 'add-role',
                                name: 's2'
                            }));
                            var res = {
                                type: 'join-room',
                                room: ROOM_NAME,
                                owner: uuid,
                                role: 's2'
                            };
                            newSocket.send(JSON.stringify(res));
                            done();
                        }
                    });
                });
            });

            beforeEach(function(done) {
                api.get('/play?uuid='+uuid+'&row=1&column=1')
                    .expect(200)
                    .end(done);
            });

            afterEach(function(done) {
                api.get('/clear?uuid='+uuid)
                    .expect(200)
                    .end(function() {
                        api.get('/clear?uuid='+username2)
                            .expect(200)
                            .end(done);
                    });
            });

            it('should share a game board', function(done) {

                api.get('/isOpen?uuid='+uuid+'&row=1&column=1')
                    .expect(function(res) {
                        assert.equal(res.statusCode, 200);
                        assert.equal(res.text, 'false');
                    })
                    .end(done);
            });
        });
    });
});
