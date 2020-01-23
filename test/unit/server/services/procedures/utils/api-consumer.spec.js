describe('ApiConsumer', function(){
    const ApiConsumer = require('../../../../../../src/server/services/procedures/utils/api-consumer.js'),
        apiConsumer = new ApiConsumer('testConsumer',''),
        RPCMock = require('../../../../../assets/mock-rpc'),
        testRpc = new RPCMock(apiConsumer),
        assert = require('assert');


    describe('cache manager filestorage store', function(){
        it('should be able to save and read data to and from cache', done=>{
            let cache = testRpc._rpc._cache;
            cache.set('foo', 'bar', function(err) {
                if (err) { throw err; }
                cache.get('foo', function(err, result) {
                    assert(result,'bar');
                    cache.del('foo', done);
                });
            });
        });
    });

    describe('_getFullUrl', () => {
        const baseUrl = 'https://abc.com';
        const service = testRpc._rpc;

        it('should override url with "url" option', function() {
            const options = {baseUrl, queryString: 'a=b&c=d'};
            options.url = 'http://github.com';
            const url = service._getFullUrl(options);
            assert.equal(url, options.url);
        });

        it('should add ? before query string', function() {
            const url = service._getFullUrl({baseUrl, queryString: 'a=b&c=d'});
            assert.equal(url, `${baseUrl}?a=b&c=d`);
        });

        it('should not add ? before query string if exists', function() {
            const url = service._getFullUrl({baseUrl, queryString: '?a=b&c=d'});
            assert.equal(url, `${baseUrl}?a=b&c=d`);
        });

        it('should add / before path', function() {
            const url = service._getFullUrl({baseUrl, path: 'test/path'});
            assert.equal(url, `${baseUrl}/test/path`);
        });

        it('should not add / before path if exists', function() {
            const url = service._getFullUrl({baseUrl, path: '/test/path'});
            assert.equal(url, `${baseUrl}/test/path`);
        });
    });

    describe('requestData', ()=>{

        it('should get correct data from the endpoint', done => {
            let queryOpts = {
                queryString: '/',
                baseUrl: 'http://google.com',
                json: false
            };
            apiConsumer._requestData(queryOpts).then(data => {
                assert(data.match(/www\.google\.com/).length > 0);
                done();
            }).catch(e => {
                done(e);
            });
        });

        it('should get response from the cache', done => {
            let cache = testRpc._rpc._cache;
            let queryOpts = {
                queryString: '',
                baseUrl: 'http://google.com',
                json: false
            };

            let requestCacheKey = testRpc._rpc._getCacheKey(queryOpts);
            // cache the key for this request to 'response'
            cache.set(requestCacheKey, 'response', function(err) {
                if (err) { throw err; }
                testRpc._rpc._requestData(queryOpts)
                    .then(data => {
                    // requesting for the same key should return 'response' as data
                        assert.deepEqual(data,'response');
                        done();
                    });
            });
        });

        it('should throw when requesting a nonexisintg resource', done => {
            const queryOpts = {
                queryString: '/',
                baseUrl: 'http://AAnonexistingdomainadslfjazxcvsadf.com',
                json: false
            };
            const errorMsg = 'this request shouldn\'t resolve';
            apiConsumer._requestData(queryOpts).then(() => {
                // we shouldn't get here, fail the test if we get here
                throw new Error(errorMsg);
            }).catch(e => {
                assert.deepEqual(e.name, 'RequestError');
                done();
            });
        });

        it('should not cache rejected promises', done => {
            const queryOpts = {
                queryString: '/',
                baseUrl: 'http://BBnonexistingdomainadslfjazxcvsadf.com',
                json: false
            };
            apiConsumer._requestData(queryOpts).catch( () => {
                // check if it is cached or not
                testRpc._rpc._cache.get(queryOpts.baseUrl + queryOpts.queryString, function(err, result) {
                    assert.equal(err,null);
                    assert.equal(result,null);
                    done();
                });
            });
        });

    });
}); // end of ApiConsumer describe
