/* globals driver, SnapActions, Point */
describe('actions', function() {
    var position = new Point(600, 600);

    before(function() {
        driver.reset();
    });

    it('should have default color w/ setColorField', function(done) {
        console.log(driver.ide().room.isOwner());
        var action = driver.addBlock('setColor', position);
        console.log('action', action);
        action.accept(block => {
            console.log(block);
            SnapActions.setColorField(block.inputs()[0])
                .accept(() => done());
        });
    });
});
