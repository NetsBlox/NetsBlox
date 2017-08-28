/* globals SnapActions, expect, driver, Point */
describe('blocks', function() {
    var position = new Point(400, 400);

    beforeEach(function() {
        driver.reset();

        // create an if-else block
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
});
