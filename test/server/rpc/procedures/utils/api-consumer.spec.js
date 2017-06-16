const ApiConsumer = require('../../../../../src/server/rpc/procedures/utils/api-consumer.js'),
    apiConsumer = new ApiConsumer('testConsumer',''),
    assert = require('assert');

let singleData = {name: 'Jack', age: '30', friends: ['Emily', 'Doug']};
let multipleData = [
    {name: 'Jack', age: '30', friends: ['Emily', 'Doug']},
    {name: 'Rosa', age: '23', friends: ['Emily', 'Doug']},
    {name: 'Melrose', age: '55', friends: ['Emily', 'Slim']}
];
let multipleData2 = [
    {name: 'Jack', age: '30', friends: ['Emily', 'Doug']},
    27,
    {name: 'Melrose', friends: ['Emily', 'Slim']}
];
const stringJson = '{"name":"Lisa","age":"2","gholi":"foo","friends":[{"avtar":true},23,45,56]}';


describe('snap structure creation form ApiConsumer', function() {
    it('should accept falsy values', function() {
        assert.deepEqual(apiConsumer._createSnapStructure(null), []);
        assert.deepEqual(apiConsumer._createSnapStructure(undefined), []);
        assert.deepEqual(apiConsumer._createSnapStructure({}), []);
        assert.deepEqual(apiConsumer._createSnapStructure([]), []);
    });

    it('should convert single json response to a singe snap structure', function() {
        assert.deepEqual(apiConsumer._createSnapStructure(singleData)[0][1], 'Jack');
    });

    it('should convert array of json responses to a array of snap tuples', function() {
        assert.deepEqual(apiConsumer._createSnapStructure(multipleData)[2][1][1], '55');
        assert.deepEqual(apiConsumer._createSnapStructure(multipleData2)[2][0][1], 'Melrose');
    });

    it('should work on stringified json', function(){
        assert.deepEqual(apiConsumer._createSnapStructure(stringJson)[2][1], 'foo');
    });
});
