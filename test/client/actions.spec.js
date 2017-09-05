/* globals driver, SnapActions, Point, SnapUndo, expect */
describe('actions', function() {
    var position = new Point(600, 600);

    beforeEach(function() {
        driver.reset();
    });

    it('should have default color w/ setColorField', function(done) {
        var action = driver.addBlock('setColor', position);
        action.accept(block => {
            SnapActions.setColorField(block.inputs()[0])
                .accept(() => done());
        });
    });

    it('should not animate move block when not focused', function(done) {
        var action = driver.addBlock('forward', position);

        // Create two blocks. Connect one to another then change to the stage and undo/redo
        action.accept(block => {
            driver.addBlock('forward', new Point(800, 800))
                .accept(block2 => {
                    // connect block to block2
                    var target = {
                        element: block2,
                        point: new Point(800, 800),
                        loc: 'bottom'
                    };
                    driver.selectStage();
                    SnapActions.moveBlock(block, target)
                        .accept(() => {
                            var id = Object.keys(SnapUndo.eventHistory)[0];
                            SnapUndo.undo(id)
                                .accept(() => SnapUndo.redo(id).accept(() => done()));
                        });
                });
        });
    });

    it('should only animate if focused', function() {
        var stage = driver.ide().stage;
        expect(SnapActions.canAnimate(stage)).to.be(false);
        driver.selectStage();
        expect(SnapActions.canAnimate(stage)).to.be(true);
    });

    describe('collaboration', function() {
        it('should detect collaboration if multiple users in role', function() {
            var ide = driver.ide(),
                uuid = ide.sockets.uuid;

            ide.room.roles[ide.projectName] = ['test', uuid];
            expect(SnapActions.isCollaborating()).to.be(true);
        });

        it('should detect not collaborating if only user in role', function() {
            expect(SnapActions.isCollaborating()).to.be(false);
        });
    });
});
