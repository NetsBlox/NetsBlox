describe('project routes', function() {
    const utils = require('../../assets/utils');
    const assert = require('assert');
    const supertest = require('supertest');
    let port = 8393,
        options = {
            port: port,
            vantage: false
        },
        api,
        Server,
        server;

    before(function(done) {
        utils.reset()
            .then(() => {
                Server = utils.reqSrc('server');
                server = new Server(options);
                api = supertest('http://localhost:'+port+'/api');
                server.start(done);
            });
    });

    after(function(done) {
        server.stop(done);
    });

    describe('thumbnail', function() {
        const fs = require('fs');
        const path = require('path');
        const thumbnail = fs.readFileSync(path.join(__dirname, 'thumbnail.png'));
        const thumbnail161 = fs.readFileSync(path.join(__dirname, 'thumbnail1.61.png'));

        it('should return an image', function(done) {
            api.get(`/projects/brian/PublicProject/thumbnail`)
                .expect(200)
                .expect('content-type', 'image/png')
                .end(done);
        });

        it('should correct image', function(done) {
            api.get(`/projects/brian/PublicProject/thumbnail`)
                .expect(200)
                .expect(res => assert.equal(res.body.toString(), thumbnail))
                .expect('content-length', '13275')
                .end(done);
        });

        it('should apply aspect ratio', function(done) {
            api.get(`/projects/brian/PublicProject/thumbnail?aspectRatio=1.61`)
                .expect(200)
                .expect('content-type', 'image/png')
                .expect(res => assert.equal(res.body.toString(), thumbnail161.toString()))
                .end(done);
        });

        // Examples
        it('should return example thumbnail', function(done) {
            api.get(`/examples/Battleship/thumbnail`)
                .expect(200)
                .expect('content-type', 'image/png')
                .end(done);
        });
    });
});
