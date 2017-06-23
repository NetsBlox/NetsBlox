const assert = require('assert');
// test if the services are being extracted/identified correctly.
describe('examples', function() {
    const ROOT_DIR = '../../',
        NBSocket = require(ROOT_DIR + 'src/server/rooms/netsblox-socket'),
        RoomManager = require(ROOT_DIR + 'src/server/rooms/room-manager'),
        Logger = require(ROOT_DIR + 'src/server/logger'),
        UserStorage = require(ROOT_DIR + 'src/server/storage/users'),
        Storage = require(ROOT_DIR + 'src/server/storage/storage'),
        EXAMPLES = require(ROOT_DIR + 'src/server/examples');
    describe('testing if services are being detected and populated correctly', function() {

        it('test Earthquakes examples', function() {
            assert(EXAMPLES.Earthquakes.services.includes('earthquakes'));
            assert(EXAMPLES.Earthquakes.services.includes('staticmap'));
        });

        it('test Story examples', function(){
            assert(EXAMPLES.Story.services.includes('NPlayer'));
        });

        it('test Weather examples', function(){
            assert(EXAMPLES.Weather.services.includes('weather'));
        });

        it('test Movies examples', function(){
            assert(EXAMPLES.Movies.services.includes('MovieDB'));
        });

        it('test GoogleTrends examples', function(){
        	assert(EXAMPLES.GoogleTrends.services.includes('GoogleTrends'));
        	assert(EXAMPLES.GoogleTrends.services.includes('staticmap'));
        });

        it('test Quizzer examples', function(){
        	assert(EXAMPLES.Quizzer.services.includes('kv-store'));
        });

    });

    describe('room creation', function() {
        const logger = new Logger('example');
        let room;
        before(function(done){
            let storage = new Storage(logger);
            storage.connect('mongodb://localhost:27017/netsbloxTest').then(()=> {
                RoomManager.init(logger, storage);
                let socket = new NBSocket(logger, {on: () => {}});
                room = RoomManager.createRoom(socket, 'roomName', 'ownerId');
                EXAMPLES.Battleship.toRoom(room).then(()=>done());
            })
        });
        it('should return role from room', function(){
            // console.log('role names:', room.getRoleNames().join());
            assert.equal(room.getRoleNames().length, 2);
        });
        it.only('should get correct role data', function(done){
            // UserStorage.get('hamid').then(console.log);
            console.log(UserStorage.get);
            room.getRole('player 1').then(role => {
                console.log(role);
                done();
            })
        })
    });

    describe('project source creation', ()=>{
        it('should get the source code for roles', (done)=>{
            EXAMPLES.Battleship.toFullProject().then(src => {
                assert(src.indexOf('</room>') > -1);
                assert(src.indexOf('player 1') > -1);
                assert(src.indexOf('player 2') > -1);
                assert(src.indexOf('Battleship') > -1);
                done();
            });
        });
    });

});
