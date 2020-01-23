describe('twentyquestions', function() {
    const utils = require('../../../../assets/utils');
    var TwentyQuestions = utils.reqSrc('services/procedures/twenty-questions/twenty-questions'),
        RPCMock = require('../../../../assets/mock-rpc'),
        twentyquestions = new RPCMock(TwentyQuestions),
        assert = require('assert');

    before(function () {
        twentyquestions = new RPCMock(TwentyQuestions);
    });

    utils.verifyRPCInterfaces('TwentyQuestions', [
        ['start', ['answer']],
        ['guess', ['guess']],
        ['answer', ['answer']],
        ['gameStarted'],
        ['restart']
    ]);

    describe('basic command without role', function () {
        it ('can restart the game', function () {
            twentyquestions.restart();
        });
        it ('can find whether the game has started', function () {
            twentyquestions.gameStarted();
        });
    });

    describe('twenty questions', function () {
        beforeEach(function () {
            twentyquestions.restart();
        });

        describe('errors', function () {
            it('should return false when restarting a game', function () {
                assert.equal(twentyquestions.restart(), false);
            });

            it('should return an error when starting a started game', function () {
                twentyquestions.start('books');
                assert.throws(() => twentyquestions.start('books'), /Game has already started./);
            });

            it ('should return an error when guessing before game started', function () {
                assert.throws(() => twentyquestions.guess('books'), /Game has not yet started./);
            });

            it ('should return an error when answering before game started', function () {
                assert.throws(() => twentyquestions.answer('yes'), /Game has not yet started./);
            });

            describe('for answerer', function () {
                beforeEach(function () {
                    twentyquestions.start('books');
                });
                it ('should return an error when guessing as an answerer', function () {
                    assert.throws(() => twentyquestions.guess('books'), /You're not the guesser!/);
                });

                it ('should return an error when invalid answer', function () {
                    assert.throws(() => twentyquestions.answer('y'), /Answer the guess with yes or no!/);
                });
            });

            describe('for guesser', function () {
                beforeEach(function () {
                    twentyquestions.socket.roleId = 'answerer';
                    twentyquestions.start('books');
                    twentyquestions.socket.roleId = 'guesser';
                });

                it ('should return an error when invalid answer', function () {
                    assert.throws(() => twentyquestions.answer('yes'), /You're not the answerer!/);
                });

                it('should return false when incorrect guess', function () {
                    assert(!twentyquestions.guess('wrong'));
                });
            });
        });

        describe('game started', function () {
            function switchRole () {
                if (twentyquestions.socket.roleId === 'guesser') {
                    twentyquestions.socket.roleId = 'answerer';
                } else {
                    twentyquestions.socket.roleId = 'guesser';
                }
            }
            beforeEach(function () {
                twentyquestions.restart();
                twentyquestions.socket.roleId = 'answerer';
                twentyquestions.start('book shelf');
            });

            it ('end answerer\'s turn', function () {
                assert.equal(twentyquestions.answer('yes'), true);
            });

            describe('for answerer', function () {
                beforeEach(switchRole);

                it('get the right guessCount', function () {
                    for (let i = 1; i <= 5; i++) {
                        twentyquestions.guess('book');
                    }
                    assert.equal(twentyquestions._rpc._state.guessCount, 5);
                });
            });
        });
    });

});
