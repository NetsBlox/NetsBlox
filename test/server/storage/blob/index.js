describe('blob-storage', function() {
    const utils = require('../../../assets/utils');
    const blob = utils.reqSrc('storage/blob');
    const assert = require('assert');
    const path = require('path');
    const BLOB_DIR = path.join(__dirname, '..', '..', '..', 'test-blob-storage');
    const rm_rf = require('rimraf');

    before(function() {
        blob.configure(BLOB_DIR);
    });

    after(function() {
        rm_rf.sync(BLOB_DIR);
    });

    describe('role', () => {
        let project = null;
        let role = null;

        beforeEach(function() {
            project = {owner: 'test-user', name: 'PROJECT'};
            role = {
                ProjectName: 'role1',
                SourceCode: '<src-code/>',
                Media: 'SomeMediaContent'
            };
        });

        describe('store', () => {

            it('should replace source, media with ids', function(done) {
                blob.putRole(role, project)
                    .then(content => {
                        assert.notEqual(content.SourceCode, role.SourceCode);
                        assert.notEqual(content.Media, role.Media);
                        done();
                    });
            });

            it('should get role back from the blob', function(done) {
                blob.putRole(role, project)
                    .then(role => blob.getRole(role, project))
                    .then(content => {
                        assert.equal(content.SourceCode, role.SourceCode);
                        assert.equal(content.Media, role.Media);
                        done();
                    });
            });
        });

        describe('deletion', function() {

            it('should remove blob data when project deleted', function(done) {
                blob.putRole(role, project)
                    .then(role => blob.deleteRole(role, project))
                    .then(() => blob.getRoleUuid(role, project))
                    .then(name => blob.backend.exists('projects', name))
                    .then(exists => {
                        assert(!exists);
                        done();
                    })
                    .catch(done);
            });

            it('should not get role after deletion', function(done) {
                blob.putRole(role, project)
                    .then(role => blob.deleteRole(role, project))
                    .then(() => blob.getRole(role, project))
                    .then(role => {
                        assert(!role);
                        done();
                    })
                    .catch(() => done());
            });
        });

        describe('uuid', function() {
            it('should generate unique uuids', function() {
                let id1 = blob.getRoleUuid(role, project);
                let id2 = blob.getRoleUuid(role, project);
                assert.notEqual(id1, id2);
            });
        });
    });

});
