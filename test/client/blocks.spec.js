/* globals SnapActions, expect, driver, Point, CustomBlockDefinition */
describe('blocks', function() {
    var position = new Point(400, 400);

    beforeEach(function() {
        driver.reset();
        driver.selectCategory('control');
    });

    it('should create block', function(done) {
        driver.addBlock('doIfElse', position)
            .accept(block => {
                expect(!!block).to.be(true);
                done();
            })
            .reject(err => done(err));
    });

    it('should relabel if-else block to if', function(done) {
        var fail = () => done('action rejected!');
        driver.addBlock('doIfElse', position)
            .accept(block => SnapActions.setSelector(block, 'doIf')
                .accept(() => done())
                .reject(fail)
            )
            .reject(fail);
    });

    describe('custom', function() {
        beforeEach(() => {
            driver.reset();
            driver.selectCategory('custom');
        });

        it('should create (sprite) custom block', function(done) {
            // Create a custom block definition
            var sprite = driver.ide().currentSprite,
                spec = 'sprite block %s',
                definition = new CustomBlockDefinition(spec, sprite);

            // Get the sprite
            definition.category = 'motion';
            SnapActions.addCustomBlock(definition, sprite)
                .accept(() => {
                    driver.addBlock(definition.blockInstance(), position)
                        .accept(() => done());
                });
        });
    });

    describe('rpc', function() {
        before(done => {
            driver.reset(done);
        });

        it('should populate method with `setField`', function(done) {
            // create rpc block
            driver.addBlock('getJSFromRPCStruct').accept(block => {
                var serviceField = block.inputs()[0];
                // set the service to weather
                SnapActions.setField(serviceField, 'Weather').accept(() => {
                    var methodField = block.inputs()[1];
                    // set the method to `humidity`
                    SnapActions.setField(methodField, 'humidity').accept(() => {
                        var err = null;
                        if (block.inputs().length < 3) err = `argument inputs not created!`;
                        done(err);
                    });
                });
            });
        });
    });
});
