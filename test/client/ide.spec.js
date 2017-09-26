/*globals driver, expect, SnapUndo, SnapActions */
describe('ide', function() {
    before(function(done) {
        driver.reset(done);
    });

    describe('export', function() {
        it('should export locally if only one role', function(done) {
            var ide = driver.ide();
            ide.exportSingleRoleXml = function() {
                delete ide.exportSingleRoleXml;
                done();
            };
            ide.exportProject();
        });

        it('should export correct xml locally', function(done) {
            var ide = driver.ide();
            var local = null;
            ide.exportRoom = function(str) {
                if (!local) {
                    return local = str;
                }

                expect(local).to.be(str);
                delete ide.exportRoom;
                done();
            };
            ide.exportSingleRoleXml();
            ide.exportMultiRoleXml();
        });
    });

    describe('lang', function() {

        beforeEach(function(done) {
            driver.reset(done);
        });

        it('should not change replay length on lang change', function(done) {
            SnapActions.addVariable('testVar', true)
                .accept(() => {
                    var len = SnapUndo.allEvents.length;
                    var err;

                    driver.ide().setLanguage('en');
                    setTimeout(function() {  // give the project time to load
                        try {
                            expect(SnapUndo.allEvents.length).to.be(len);
                        } catch(e) {
                            err = e;
                        } finally {
                            done(err);
                        }
                    }, 50);
                });
        });

        it('should not change replay length on ide refresh', function(done) {
            SnapActions.addVariable('testVar', true)
                .accept(() => {
                    var len = SnapUndo.allEvents.length;
                    var err;

                    driver.ide().refreshIDE();
                    setTimeout(function() {  // give the project time to load
                        try {
                            expect(SnapUndo.allEvents.length).to.be(len);
                        } catch(e) {
                            err = e;
                        } finally {
                            done(err);
                        }
                    }, 50);
                });
        });

        it('should not change replay length on toggle dynamic input labels', function(done) {
            SnapActions.addVariable('testVar', true)
                .accept(() => {
                    var len = SnapUndo.allEvents.length;
                    var err;

                    driver.ide().toggleDynamicInputLabels();
                    setTimeout(function() {  // give the project time to load
                        try {
                            expect(SnapUndo.allEvents.length).to.be(len);
                        } catch(e) {
                            err = e;
                        } finally {
                            done(err);
                        }
                    }, 50);
                });
        });
    });

    describe.only('name', function() {
        beforeEach(function() {
            driver.reset();
        });

        describe('naming project with @ symbol', function() {
            it('should not allow from room tab', function() {
                // TODO
            });

            it('should not allow using "save as"', function() {
                // TODO
            });
        });

        it('should not allow naming role with @ symbol', function() {
            driver.selectTab('room');
            var roleLabel = driver.ide().spriteEditor.room.roleLabels.myRole._label;
            var name = 'role@name';

            roleLabel.mouseClickLeft();
            var dialog = driver.dialog();
            dialog.body.setContents(name);
            dialog.ok();

            dialog = driver.dialog();
            expect(dialog).to.not.be(null);
            // verify that the role name didn't change
            setTimeout(() => {
                expect(driver.ide().spriteEditor.room.roleLabels[name]).to.be(undefined);
            }, 50);
        });

        it('should not allow naming role with .', function() {
            driver.selectTab('room');
            var roleLabel = driver.ide().spriteEditor.room.roleLabels.myRole._label;
            var name = 'role.name';

            roleLabel.mouseClickLeft();
            var dialog = driver.dialog();
            dialog.body.setContents(name);
            dialog.ok();

            dialog = driver.dialog();
            expect(dialog).to.not.be(null);
            // verify that the role name didn't change
            setTimeout(() => {
                expect(driver.ide().spriteEditor.room.roleLabels[name]).to.be(undefined);
            }, 50);
        });
    });
});
