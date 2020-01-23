const utils = require('../../../../../../src/server/services/procedures/utils/index'),
    _ = require('lodash'),
    assert = require('assert');

describe('encodeQueryData', () => {
    it('should not ignore null values', ()=>{
        let encodedQuery = utils.encodeQueryData({query: 'test', secret: null, fieldB: undefined});
        assert.equal(encodedQuery, 'query=test&secret=null&fieldB=undefined');
    });
});


describe('snap structure creation', function() {
    const singleData = {name: 'Jack', age: '30', friends: ['Emily', 'Doug']};
    const multipleData = [
        {name: 'Jack', age: '30', friends: ['Emily', 'Doug']},
        {name: 'Rosa', age: '23', friends: ['Emily', 'Doug']},
        {name: 'Melrose', age: '55', friends: ['Emily', 'Slim'], bday: new Date(1501022944000)}
    ];
    const multipleData2 = [
        {name: 'Jack', age: '30', friends: ['Emily', 'Doug']},
        27,
        {name: 'Melrose', friends: ['Emily', 'Slim']}
    ];

    const stringJson = '{"name":"Lisa","age":"2","gholi":"foo","friends":[{"avtar":true},23,45,56]}';


    it('should accept falsy values', function() {
        assert.deepEqual(utils.jsonToSnapList(null), undefined);
        assert.deepEqual(utils.jsonToSnapList(undefined), undefined);
        assert.deepEqual(utils.jsonToSnapList({}), []);
        assert.deepEqual(utils.jsonToSnapList([]), []);
    });

    it('should convert single json response to a singe snap structure', function() {
        assert.deepEqual(utils.jsonToSnapList(singleData)[0][1], 'Jack');
    });

    it('should convert array of json responses to a array of snap tuples', function() {
        assert.deepEqual(utils.jsonToSnapList(multipleData)[2][1][1], '55');
        assert.deepEqual(utils.jsonToSnapList(multipleData2)[2][0][1], 'Melrose');
    });

    it('should work on stringified json', function(){
        assert.deepEqual(utils.jsonToSnapList(stringJson)[2][1], 'foo');
    });

    it('should not remove null or falsy items from the array', function(){
        let arrayWithNull = [...multipleData];
        arrayWithNull.push(null);
        const nullArray = [null,null,false,undefined];
        assert.equal(utils.jsonToSnapList(arrayWithNull).length, 4);
        assert.deepEqual(utils.jsonToSnapList(nullArray).length, 4);
    });

    it('should convert date objects to GMT datestring', function(){
        assert(utils.jsonToSnapList(multipleData)[2][3][1] === 'Tue, 25 Jul 2017 22:49:04 GMT');
    });
});
