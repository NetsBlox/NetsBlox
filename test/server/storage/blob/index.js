describe('blob-storage', function() {
    const utils = require('../../../assets/utils');
    const blob = utils.reqSrc('storage/blob'),
        assert = require('assert'),
        path = require('path'),
        projects = utils.reqSrc('storage/projects'),
        BLOB_DIR = path.join(__dirname, '..', '..', '..', 'test-blob-storage'),
        rm_rf = require('rimraf');

    before(function(/*done*/) {
        blob.configure(BLOB_DIR)
        //utils.reset()
            //.then(() => blob.configure(BLOB_DIR))
            //.nodeify(done);
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
                        console.log('content', content);
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
                    .catch(err => done());
            });
        });
    });

    describe('user-actions', () => {
    });

    describe.only('project integration', () => {
        let project = null;
        let role = null;
        before(done => {
            utils.reset()
                .then(() => console.log('about to get project...'))
                .then(projects.get('brian', 'PublicProject'))
                .then(result => {
                    project = result;
                    return project.getRoles();
                })
                .then(roles => role = roles[0])
                .nodeify(done);
        });

        it('should remove the role data on role destroy', done => {
            project.removeRole(role.ProjectName)
                .then(() => blob.getRole(role, project))
                .catch(() => done());
        });

        it('should remove the role data on project destroy', done => {
        });

    });
});
