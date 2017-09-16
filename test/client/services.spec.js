/* globals expect, driver, MessageCreatorMorph, PushButtonMorph, NetsProcess*/
describe('services', function() {


    before(function() {
        driver.selectCategory('network');
    });

    describe('rpc inputs', function() {
        var service = 'Dev',
            rpcSignature = ['echo', ['arg']],
            process = new NetsProcess();
        beforeEach(function() {
            driver.reset();
        });

        function serialize(input, expectedOutput){
            process.getJSFromRPCDropdown = (service, rpc, params)=> params;
            var serialized = process.getJSFromRPCStruct(service, rpcSignature, input);
            return serialized;
        }

        it('should serialize lists properly', function() {
            var listInput = new List([new List([2,3]),new List([3,4])]);
            var expectedOutput = 'arg[0][0]=2&arg[0][1]=3&arg[1][0]=3&arg[1][1]=4';
            expect(serialize(listInput)).to.be(expectedOutput);
        });

        // we are not gonna have undefined in snaplists
        it('should serialize [0,undefined]', function() {
            var listInput = new List([0,undefined]);
            expect(serialize(listInput)).to.be('arg[0]=0');
        });

        it('should serialize [0,null]', function() {
            var listInput = new List([0,null]);
            expect(serialize(listInput)).to.be('arg[0]=0&arg[1]=');
        });

        it('should serialize [0,""]', function() {
            var listInput = new List([0,'']);
            expect(serialize(listInput)).to.be('arg[0]=0&arg[1]=');
        });

        it('should serialize [0,"null"]', function() {
            var listInput = new List([0,"null"]);
            expect(serialize(listInput)).to.be('arg[0]=0&arg[1]=null');
        });

        it('should serialize []', function() {
            var listInput = new List([]);
            // effectively sending an array with no element = not sending the array. 
            // but sending name: null doesn't work like this.
            expect(serialize(listInput)).to.be('');
        });


        it('should serialize linked lists properly', function() {
            var linkedList = List.prototype.cons(2, new List([3,4,5]));
            expect(serialize(linkedList)).to.be('arg[0]=2&arg[1]=3&arg[2]=4&arg[3]=5');
        });
    });
});
