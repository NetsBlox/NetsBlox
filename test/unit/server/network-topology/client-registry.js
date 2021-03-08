const ROOT_DIR = '../../../../';
const utils = require(ROOT_DIR + 'test/assets/utils');
describe(utils.suiteName(__filename), function() {
    const ClientRegistry = utils.reqSrc('network-topology/client-registry');
    const assert = require('assert').strict;
    const WebSocket = utils.reqSrc('../../test/assets/mock-websocket');
    const Client = utils.reqSrc('client');
    const Logger = utils.reqSrc('logger');
    const logger = new Logger('client');
    const [client1, client2, client3] = [1,2,3]
        .map(id => new Client(logger, new WebSocket(), `client_${id}`));
    let registry;

    describe('add', function() {
        beforeEach(() => registry = new ClientRegistry());

        it('should add clients', function() {
            registry.add(client1);
            assert.equal(registry.toArray().length, 1);
            assert.equal(registry.toArray()[0], client1);
        });
    });

    describe('add', function() {
        beforeEach(() => {
            registry = new ClientRegistry();
            registry.add(client1);
            registry.add(client2);
            registry.remove(client1);
        });

        it('should remove clients', function() {
            assert.equal(registry.toArray().length, 1);
            assert.equal(registry.toArray()[0], client2);
        });

        it('should not listen to client events on remove', function() {
            client1.setState('p1', 'r1');
            assert.equal(registry.at('p1', 'r1').length, 0);
            assert(!registry._eventHandlers[client1.uuid]);
        });
    });

    describe('withUuid', function() {
        beforeEach(() => {
            registry = new ClientRegistry();
            registry.add(client1);
            registry.add(client2);
        });

        it('should find client', function() {
            assert.equal(registry.withUuid(client1.uuid), client1);
        });

        it('should clear after removal', function() {
            registry.remove(client1);
            assert.equal(registry.withUuid(client1.uuid), undefined);
        });
    });

    describe('withUsername', function() {
        beforeEach(() => {
            registry = new ClientRegistry();
            registry.add(client1);
            registry.add(client2);
            // TODO: set the username of the client?
        });

        it('should find client', function() {
        });

        it('should clear after removal', function() {
            //assert.equal(count, 3);
        });
    });

    describe('at(<project>, <role>)', function() {
        const project = 'project1';
        const role = 'role1';
        beforeEach(() => {
            registry = new ClientRegistry();
            client1.setState(project, role);
            client2.setState(project, role);
            registry.add(client1);
            registry.add(client2);
            registry.add(client3);
        });

        it('should find clients', function() {
            const clients = registry.at(project, role);
            const uuids = clients.map(c => c.uuid);
            assert.deepEqual(uuids, [client1.uuid, client2.uuid]);
        });

        it('should update on client state change', function() {
            client1.setState('project2', role);
            const clients = registry.at(project, role);
            const uuids = clients.map(c => c.uuid);
            assert.deepEqual(uuids, [client2.uuid]);
            assert.deepEqual(
                registry.at('project2', role).map(c => c.uuid),
                [client1.uuid]
            );
        });

        it('should clear after removal', function() {
            registry.remove(client1);
            const clients = registry.at(project, role);
            const uuids = clients.map(c => c.uuid);
            assert.deepEqual(uuids, [client2.uuid]);
        });

        it('should not find users at (null, null)', function() {
            const clients = registry.at(null, null);
            const uuids = clients.map(c => c.uuid);
            assert.deepEqual(uuids, []);
        });
    });

    describe('atProject(<project>)', function() {
        const project = 'project1';
        beforeEach(() => {
            registry = new ClientRegistry();
            client1.setState(project, 'r1');
            client2.setState(project, 'r2');
            registry.add(client1);
            registry.add(client2);
            registry.add(client3);
        });

        it('should find clients', function() {
            const clients = registry.atProject(project);
            const uuids = clients.map(c => c.uuid);
            assert.deepEqual(uuids, [client1.uuid, client2.uuid]);
        });

        it('should clear after removal', function() {
            registry.remove(client2);
            const clients = registry.atProject(project);
            const uuids = clients.map(c => c.uuid);
            assert.deepEqual(uuids, [client1.uuid]);
        });
    });

    describe('count', function() {
        const project = 'project1';
        beforeEach(() => {
            registry = new ClientRegistry();
            client1.setState(project, 'r1');
            client2.setState(project, 'r2');
            registry.add(client1);
            registry.add(client2);
            registry.add(client3);
        });

        it('should get the number of clients', function() {
            assert.equal(registry.count(), 3);
        });

        it('should get the number of clients after change', function() {
            registry.remove(client1);
            assert.equal(registry.count(), 2);
        });
    });

    describe('contains', function() {
        beforeEach(() => {
            registry = new ClientRegistry();
            registry.add(client1);
            registry.add(client2);
            registry.add(client3);
        });

        it('should return true if exists', function() {
            assert(registry.contains(client1));
        });

        it('should return false after removal', function() {
            registry.remove(client1);
            assert(!registry.contains(client1));
        });
    });
});
