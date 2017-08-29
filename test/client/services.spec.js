/* globals expect, driver, MessageCreatorMorph, PushButtonMorph, NetsProcess*/
describe('services', function() {
    before(function() {
        driver.selectCategory('network');
    });

    describe('rpc inputs', function() {
        beforeEach(function() {
            driver.reset();
        });

        it('should serialize lists properly', function() {
// NetsProcess.prototype.getJSFromRPCStruct = function (rpc, methodSignature) {
            var world = driver.world();
            var palette = driver.palette();
            var service = 'Dev',
                rpcSignature = ['echo', ['argument']];
            var listInput = new List([new List([2,3]),new List([3,4])]);
            var process = new NetsProcess();
            process.getJSFromRPCDropdown = (service, rpc, params)=> params;
            var rv = process.getJSFromRPCStruct(service, rpcSignature, listInput);
            expect(rv).to.be('argument[0][0]=2&argument[0][1]=3&argument[1][0]=3&argument[1][1]=4');
        });
    });
});
