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
});
