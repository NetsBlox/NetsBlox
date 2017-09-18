/*globals driver, expect, SnapActions, SnapUndo */
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
});
