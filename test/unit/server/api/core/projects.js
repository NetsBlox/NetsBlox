describe('projects', function() {
    const assert = require('assert');
    const utils = require('../../../../assets/utils');
    const ProjectsAPI = utils.reqSrc('./api/core/projects');
    const Errors = utils.reqSrc('./api/core/errors');
    const SUtils = utils.reqSrc('./server-utils');
    let ProjectsStorage;
    let projects, project;
    const username = 'brian';
    const otherUser = 'nobody';

    beforeEach(async () => {
        await utils.reset();
        ProjectsStorage = utils.reqSrc('./storage/projects');
        projects = await ProjectsStorage.getUserProjects(username);
        [project] = projects;
    });

    describe('exportProject', function() {
        it('should export project', async function() {
            const xml = await ProjectsAPI.exportProject(username, project.getId());
            assert(xml.startsWith('<room'));
            // TODO: Check all the roles
        });

        it('should throw unauthorized if non-existent project', async function() {
            await utils.shouldThrow(
                () => ProjectsAPI.exportProject(otherUser, 'IDontExist'),
                Errors.Unauthorized
            );
        });

        it('should not export other user projects', async function() {
            const privateProject = projects.find(project => !project.Public);
            await utils.shouldThrow(
                () => ProjectsAPI.exportProject(otherUser, privateProject.getId()),
                Errors.Unauthorized
            );
        });
    });

    describe.only('exportRole', function() {
        it('should export role', async function() {
            const [roleId] = await project.getRoleIds();
            const xml = await ProjectsAPI.exportRole(username, project.getId(), roleId);
            assert(xml.startsWith('<role'), `Expected role XML but found: ${xml}`);
            assert(xml.includes('<media'), `Role XML missing <media/>: ${xml}`);
        });

        it('should fetch latest role content in export', async function() {
            // TODO
        });

        it('should throw unauthorized if non-existent project', async function() {
            await utils.shouldThrow(
                () => ProjectsAPI.exportRole(otherUser, 'IDontExist', 'NotReal'),
                Errors.ProjectNotFound
            );
        });

        it('should throw unauthorized if non-existent role', async function() {
            await utils.shouldThrow(
                () => ProjectsAPI.exportRole(otherUser, project.getId(), 'NotReal'),
                Errors.ProjectRoleNotFound
            );
        });

        it('should not export other user projects', async function() {
            const privateProject = projects.find(project => !project.Public);
            const [roleId] = await privateProject.getRoleIds();
            await utils.shouldThrow(
                () => ProjectsAPI.exportRole(otherUser, privateProject.getId(), roleId),
                Errors.Unauthorized
            );
        });
    });

    describe('saveProject', function() {
        const roleData = {
            ProjectName: 'hello!',
            SourceCode: '<test/>',
            Media: '<media/>',
        };

        it('should save project w/ new name', async function() {
            const [roleId] = Object.keys(project.roles);
            const name = 'newName';
            await ProjectsAPI.saveProject(project, roleId, roleData, name);

            await ProjectsAPI.getProjectSafe(project.owner, name);
        });

        it('should keep original project on save as', async function() {
            const [roleId] = Object.keys(project.roles);
            const name = 'newName';
            await ProjectsAPI.saveProject(project, roleId, roleData, name);

            await ProjectsAPI.getProjectSafe(project.owner, project.name);
        });

        it('should not keep unsaved project on save as', async function() {
            const unsaved = await project.getCopy({
                name: 'UnsavedProject',
                transient: true
            });
            const [roleId] = Object.keys(unsaved.roles);
            const name = 'newName';
            await ProjectsAPI.saveProject(unsaved, roleId, roleData, name);

            await utils.shouldThrow(
                () => ProjectsAPI.getProjectSafe(unsaved.owner, unsaved.name),
                Errors.ProjectNotFound
            );
        });

        it('should save project', async function() {
            const [roleId] = Object.keys(project.roles);
            await ProjectsAPI.saveProject(project, roleId, roleData);
            const newProject = await ProjectsAPI.getProjectSafe(project.owner, project.name);
            assert.equal(newProject.roles[roleId].ProjectName, roleData.ProjectName);
        });

        it('should save project w/ (colliding) name', async function() {
            const [roleId] = Object.keys(project.roles);
            const [, otherProject] = projects;
            const {name} = otherProject;
            const saved = await ProjectsAPI.saveProject(project, roleId, roleData, name);

            const newProject = await ProjectsStorage.getProjectMetadataById(saved.getId());
            assert.equal(newProject.name, `${name} (2)`);
        });

        it('should save project w/ (colliding) name (overwrite=true)', async function() {
            const [roleId] = Object.keys(project.roles);
            const [, otherProject] = projects;
            const {name} = otherProject;
            const saved = await ProjectsAPI.saveProject(project, roleId, roleData, name, true);

            const newProject = await ProjectsStorage.getProjectMetadataById(saved.getId());
            assert.equal(newProject.name, name);
        });
    });

    describe('saveProjectCopy', function() {
        it('should create new project', async function() {
            await ProjectsAPI.saveProjectCopy(username, project);
            const allProjects = await ProjectsStorage.getAllUserProjects(username);
            assert.equal(allProjects.length, projects.length + 1);
        });

        it('should start with "Copy of..." ', async function() {
            await ProjectsAPI.saveProjectCopy(username, project);
            const allProjects = await ProjectsStorage.getAllUserProjects(username);
            const copy = allProjects.find(project => project.name.startsWith('Copy of'));
            assert(copy);
        });

        it('should contain same roles', async function() {
            await ProjectsAPI.saveProjectCopy(username, project);
            const allProjects = await ProjectsStorage.getAllUserProjects(username);
            const copy = allProjects.find(project => project.name.startsWith('Copy of'));
            assert.deepEqual(copy.roles, project.roles);
        });

        it('should have no collaborators', async function() {
            const project = projects.find(proj => proj.collaborators.length);
            await ProjectsAPI.saveProjectCopy(username, project);
            const allProjects = await ProjectsStorage.getAllUserProjects(username);
            const copy = allProjects.find(project => project.name.startsWith('Copy of'));
            assert.deepEqual(copy.collaborators, []);
        });

        it('should save copy', async function() {
            await ProjectsAPI.saveProjectCopy(username, project);
            const allProjects = await ProjectsStorage.getAllUserProjects(username);
            const copy = allProjects.find(project => project.name.startsWith('Copy of'));
            assert(!copy.transient, 'Copy is set to transient');
        });
    });

    describe('deleteProject', function() {
        it('should delete the project', async function() {
            await ProjectsAPI.deleteProject(project);
            const proj = await ProjectsStorage.getProjectMetadataById(project.getId());
            assert(!proj, 'Project not deleted.');
        });
    });

    describe('publishProject', function() {
        it('should publish projects', async function() {
            await ProjectsAPI.publishProject(project.owner, project.name);
            const p = await ProjectsStorage.getProjectMetadataById(project.getId());
            assert(p.Public);
        });

        it('should throw error if not found', async function() {
            await utils.shouldThrow(
                () => ProjectsAPI.publishProject(project.owner, 'IDontExist'),
                Errors.ProjectNotFound
            );
        });
    });

    describe('unpublishProject', function() {
        beforeEach(() => {
            project = projects.find(p => p.Public);
        });

        it('should set Public to false', async function() {
            await ProjectsAPI.unpublishProject(project.owner, project.name);
            const p = await ProjectsStorage.getProjectMetadataById(project.getId());
            assert(!p.Public);
        });

        it('should throw err if project not found', async function() {
            await utils.shouldThrow(
                () => ProjectsAPI.publishProject(project.owner, 'IDontExist'),
                Errors.ProjectNotFound
            );
        });
    });

    describe('newProject', function() {
        it('should create new project', async function() {
            await ProjectsAPI.newProject(username);
            const allProjects = await ProjectsStorage.getAllUserProjects(username);
            assert.equal(allProjects.length, projects.length + 1);
        });

        it('should be transient', async function() {
            const {projectId} = await ProjectsAPI.newProject(username);
            const newProject = await ProjectsAPI.getProjectSafe(projectId);
            assert(newProject.transient, 'New project should be transient.');
        });

        it('should create role', async function() {
            const {projectId} = await ProjectsAPI.newProject(username);
            const project = await ProjectsAPI.getProjectSafe(projectId);
            const roleCount = Object.keys(project.roles).length;
            assert.equal(roleCount, 1);
        });

        it('should create role content', async function() {
            const {projectId} = await ProjectsAPI.newProject(username);
            const project = await ProjectsAPI.getProjectSafe(projectId);
            const [roleContent] = Object.values(project.roles);
            assert(roleContent.ProjectName, 'Role is missing project name.');
        });

        it('should create non-colliding project name', async function() {
            const state1 = await ProjectsAPI.newProject(username);
            const state2 = await ProjectsAPI.newProject(username);
            assert.notEqual(state1.name, state2.name);
        });
    });

    describe('getSharedProjectList', function() {
        it('should get projects shared w/ user', async function() {
            const sharedProjects = await ProjectsAPI.getSharedProjectList(username);
            assert.equal(sharedProjects.length, 1);
            assert.equal(sharedProjects[0].ProjectName, 'SharedProject');
        });

        it('should not get projects shared by user', async function() {
            const sharedProjects = await ProjectsAPI.getSharedProjectList('hamid');
            assert.equal(sharedProjects.length, 0);
        });
    });

    describe('getProjectList', function() {
        it('should get projects owned by user', async function() {
            const projList = await ProjectsAPI.getProjectList(username);
            assert.equal(projects.length, projList.length);
        });

        it('should convert projects to preview format', async function() {
            const projList = await ProjectsAPI.getProjectList(username);
            projList.forEach((preview, i) => {
                const project = projects[i];
                assert.equal(project.name, preview.ProjectName);
            });
        });
    });

    describe('getProject', function() {
        it('should get role given a project and role ID', async function() {
            const projectId = project.getId();
            const [roleId] = Object.keys(project.roles);
            const {role} = await ProjectsAPI.getProject(projectId, roleId);
            assert.equal(role.ID, roleId);
        });

        it.skip('should get last updated role by default', function() {
        });
    });

    describe('getPublicProject', function() {
        it('should return project', async function() {
            const project = await ProjectsAPI.getPublicProject(username, 'PublicProject');
            assert(project);
        });

        it('should throw error if project not found', async function() {
            await utils.shouldThrow(
                () => ProjectsAPI.getPublicProject(username, 'IDontExist'),
                Errors.ProjectNotFound
            );
        });

        it('should throw error if project not public', async function() {
            await utils.shouldThrow(
                () => ProjectsAPI.getPublicProject(username, 'MultiRoles'),
                Errors.ProjectNotFound
            );
        });
    });

    describe('importProject', function() {
        const roles = ['firstRole', 'secondRole']
            .map(name => {
                const role = SUtils.getEmptyRole(name);
                role.SourceCode = '<room><empty source code/></room>';
                role.Media = '<media/>';
                return role;
            });
        const name = 'ImportedProject';

        it('should create new project', async function() {
            await ProjectsAPI.importProject(
                username,
                roles,
                name,
                'firstRole',
                'someClientId'
            );
            const allProjects = await ProjectsStorage.getAllUserProjects(username);
            assert.equal(allProjects.length, projects.length + 1);
        });

        it('should choose non-colliding name', async function() {
            const {projectId} = await ProjectsAPI.importProject(
                username,
                roles,
                project.name,
                'firstRole',
                'someClientId'
            );
            const newProject = await ProjectsAPI.getProjectSafe(projectId);
            assert.notEqual(newProject.name, project.name);
        });

        it('should import both roles', async function() {
            const {projectId} = await ProjectsAPI.importProject(
                username,
                roles,
                name,
                'firstRole',
                'someClientId'
            );
            const newProject = await ProjectsAPI.getProjectSafe(projectId);
            const roleIds = await newProject.getRoleIds();
            assert.equal(roleIds.length, roles.length);
        });

        it('should upload role data to blob', async function() {
            const {projectId} = await ProjectsAPI.importProject(
                username,
                roles,
                name,
                'firstRole',
                'someClientId'
            );
            const newProject = await ProjectsAPI.getProjectSafe(projectId);
            const [roleId] = await newProject.getRoleIds();
            const newRole = newProject.roles[roleId];
            const originalRole = roles.find(role => role.ProjectName === newRole.ProjectName);
            const sourceCodeHash = newRole.SourceCode;
            assert.notEqual(
                sourceCodeHash,
                originalRole.SourceCode,
                'Role metadata should store hash - not the original xml'
            );
        });
    });

    describe('setProjectName', function() {
        it('should set project name', async function() {
            const projectId = project.getId();
            const name = 'myNewName';
            await ProjectsAPI.setProjectName(projectId, name);
            const newProject = await ProjectsAPI.getProjectSafe(projectId);
            assert.equal(newProject.name, name);
        });

        it('should ensure non-colliding name', async function() {
            const projectId = project.getId();
            const [, otherProject] = projects;
            const {name} = otherProject;
            await ProjectsAPI.setProjectName(projectId, name);
            const newProject = await ProjectsAPI.getProjectSafe(projectId);
            assert.notEqual(newProject.name, name);
            assert(newProject.name.includes(name));
        });
    });
});
