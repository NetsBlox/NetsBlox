/* globals expect, driver, MessageCreatorMorph, PushButtonMorph, NetsProcess*/
describe('services', function() {

    var service = 'Dev',
        rpcSignature = ['echo', ['arg']];

    before(function() {
        driver.selectCategory('network');
    });

    describe('rpc inputs', function() {
        beforeEach(function() {
            driver.reset();
        });

        it('should serialize lists properly', function() {
            var listInput = new List([new List([2,3]),new List([3,4])]);
            var process = new NetsProcess();
            process.getJSFromRPCDropdown = (service, rpc, params)=> params;
            var rv = process.getJSFromRPCStruct(service, rpcSignature, listInput);
            expect(rv).to.be('arg[0][0]=2&arg[0][1]=3&arg[1][0]=3&arg[1][1]=4');
        });

        it('should serialize linked lists properly', function() {
            var linkedList = List.prototype.cons(2, new List([3,4,5]));
            var process = new NetsProcess();
            process.getJSFromRPCDropdown = (service, rpc, params)=> params;
            var rv = process.getJSFromRPCStruct(service, rpcSignature, linkedList);
            expect(rv).to.be('arg[0]=2&arg[1]=3&arg[2]=4&arg[3]=5');
        });
    });
});
