/* globals SnapActions, expect, driver, Point, CustomBlockDefinition */
describe('blocks', function() {
    var position = new Point(400, 400);

    beforeEach(function(done) {
        driver.reset(() => {
            driver.selectCategory('control');
            done();
        });
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
        beforeEach(done => {
            driver.reset(() => {
                driver.selectCategory('custom');
                done();
            });
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
});
