const utils = require('../../../../../assets/utils');

describe(utils.suiteName(__filename), function() {
    const Autograders = utils.reqSrc('services/procedures/autograders/autograders');
    const RPCMock = require('../../../../../assets/mock-service');
    const service = new RPCMock(Autograders);
    const assert = require('assert');

    utils.verifyRPCInterfaces('Autograders', [
        ['getAutograders'],
        ['getAutograderConfig', ['name']],
        ['createAutograder', ['configuration']],
    ]);


    describe('getAutograders', function() {
        it('should require login', async function() {
            await assert.rejects(
                () => service.getAutograders()
            );
        });
    });

    describe('getAutograderConfig', function() {
        it('should require login', async function() {
            await assert.rejects(
                () => service.getAutograderConfig()
            );
        });
    });

    describe('createAutograder', function() {
        it('should require login', async function() {
            service.socket.username = null;
            await assert.rejects(
                () => service.createAutograder({}),
                /Login required./
            );
        });

        it('should require name', async function() {
            service.socket.username = 'brian';
            await assert.rejects(
                () => service.createAutograder({assignments: []}),
                /name is required/i
            );
        });

        it('should require assignments', async function() {
            service.socket.username = 'brian';
            await assert.rejects(
                () => service.createAutograder({name: 'TestGrader', assignments: []}),
                /Assignments are required/i
            );
        });

        it('should require names for assignments', async function() {
            service.socket.username = 'brian';
            await assert.rejects(
                () => service.createAutograder({name: 'TestGrader', assignments: [
                    {}
                ]}),
                /Assignment name is required/i
            );
        });

        it('should require test type', async function() {
            service.socket.username = 'brian';
            await assert.rejects(
                () => service.createAutograder({
                    name: 'TestGrader2',
                    assignments: [
                        Object.entries({
                            name: 'SomeAssignment',
                            tests: [
                                {}
                            ]
                        })
                    ]
                }),
                /Unspecified type of test/i
            );
        });

        it('should require spec for custom block tests', async function() {
            service.socket.username = 'brian';
            await assert.rejects(
                () => service.createAutograder({
                    name: 'TestGrader2',
                    assignments: [
                        Object.entries({
                            name: 'SomeAssignment',
                            tests: [
                                Object.entries({type: 'CustomBlockTest'})
                            ]
                        })
                    ]
                }),
                /missing block spec/i
            );
        });

        it('should require name for function tests', async function() {
            service.socket.username = 'brian';
            await assert.rejects(
                () => service.createAutograder({
                    name: 'TestGrader2',
                    assignments: [
                        Object.entries({
                            name: 'SomeAssignment',
                            tests: [
                                {}
                            ]
                        })
                    ]
                }),
                /Unspecified type of test/i
            );
        });

        it('should require function or inputs/outputs for tests', async function() {
            service.socket.username = 'brian';
            await assert.rejects(
                () => service.createAutograder({
                    name: 'TestGrader2',
                    assignments: [
                        Object.entries({
                            name: 'SomeAssignment',
                            tests: [
                                Object.entries({
                                    type: 'CustomBlockTest',
                                    spec: 'someBlockSpec'
                                })
                            ]
                        })
                    ]
                }),
                /must specify inputs and outputs or a function/i
            );
        });
    });
});
