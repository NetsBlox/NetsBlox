describe('projects', function() {
    const assert = require('assert');
    const utils = require('../../../assets/utils');
    const Logger = utils.reqSrc('./logger');
    const ProjectsAPI = utils.reqSrc('./api/core/projects');
    const Errors = utils.reqSrc('./api/core/errors');
    const SUtils = utils.reqSrc('./server-utils');
    let ProjectsStorage;
    let Projects = null;
    let projects, project;
    const username = 'brian';

    beforeEach(async () => {
        await utils.reset();
        Projects = new ProjectsAPI(new Logger('netsblox:test'));
        ProjectsStorage = utils.reqSrc('./storage/projects');
        projects = await ProjectsStorage.getUserProjects(username);
        [project] = projects;
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
            await Projects.saveProject(project, roleId, roleData, name);

            const newProject = await ProjectsStorage.getProjectMetadataById(project.getId());
            assert.equal(newProject.name, name);
        });

        it('should save project', async function() {
            const [roleId] = Object.keys(project.roles);
            await Projects.saveProject(project, roleId, roleData);
            const newProject = await ProjectsStorage.getProjectMetadataById(project.getId());
            assert.equal(newProject.roles[roleId].ProjectName, roleData.ProjectName);
        });

        it('should save project w/ (colliding) name', async function() {
            const [roleId] = Object.keys(project.roles);
            const [, otherProject] = projects;
            const {name} = otherProject;
            await Projects.saveProject(project, roleId, roleData, name);

            const newProject = await ProjectsStorage.getProjectMetadataById(project.getId());
            assert.equal(newProject.name, `${name} (2)`);
        });

        it('should save project w/ (colliding) name (overwrite=true)', async function() {
            const [roleId] = Object.keys(project.roles);
            const [, otherProject] = projects;
            const {name} = otherProject;
            await Projects.saveProject(project, roleId, roleData, name, true);

            const newProject = await ProjectsStorage.getProjectMetadataById(project.getId());
            assert.equal(newProject.name, name);
        });
    });

    describe('saveProjectCopy', function() {
        it('should create new project', async function() {
            await Projects.saveProjectCopy(username, project);
            const allProjects = await ProjectsStorage.getAllUserProjects(username);
            assert.equal(allProjects.length, projects.length + 1);
        });

        it('should start with "Copy of..." ', async function() {
            await Projects.saveProjectCopy(username, project);
            const allProjects = await ProjectsStorage.getAllUserProjects(username);
            const copy = allProjects.find(project => project.name.startsWith('Copy of'));
            assert(copy);
        });

        it('should contain same roles', async function() {
            await Projects.saveProjectCopy(username, project);
            const allProjects = await ProjectsStorage.getAllUserProjects(username);
            const copy = allProjects.find(project => project.name.startsWith('Copy of'));
            assert.deepEqual(copy.roles, project.roles);
        });

        it('should save copy', async function() {
            await Projects.saveProjectCopy(username, project);
            const allProjects = await ProjectsStorage.getAllUserProjects(username);
            const copy = allProjects.find(project => project.name.startsWith('Copy of'));
            assert(!copy.transient, 'Copy is set to transient');
        });
    });

    describe('deleteProject', function() {
        it('should delete the project', async function() {
            await Projects.deleteProject(project);
            const proj = await ProjectsStorage.getProjectMetadataById(project.getId());
            assert(!proj, 'Project not deleted.');
        });
    });

    describe('publishProject', function() {
        it('should publish projects', async function() {
            await Projects.publishProject(project.owner, project.name);
            const p = await ProjectsStorage.getProjectMetadataById(project.getId());
            assert(p.Public);
        });

        it('should throw error if not found', async function() {
            await utils.shouldThrow(
                () => Projects.publishProject(project.owner, 'IDontExist'),
                Errors.ProjectNotFound
            );
        });
    });

    describe('unpublishProject', function() {
        beforeEach(() => {
            project = projects.find(p => p.Public);
        });

        it('should set Public to false', async function() {
            await Projects.unpublishProject(project.owner, project.name);
            const p = await ProjectsStorage.getProjectMetadataById(project.getId());
            assert(!p.Public);
        });

        it('should throw err if project not found', async function() {
            await utils.shouldThrow(
                () => Projects.publishProject(project.owner, 'IDontExist'),
                Errors.ProjectNotFound
            );
        });
    });

    describe('newProject', function() {
        it('should create new project', async function() {
            await Projects.newProject(username);
            const allProjects = await ProjectsStorage.getAllUserProjects(username);
            assert.equal(allProjects.length, projects.length + 1);
        });

        it('should create role', async function() {
            const {projectId} = await Projects.newProject(username);
            const project = await Projects.getProjectSafe(projectId);
            const roleCount = Object.keys(project.roles).length;
            assert.equal(roleCount, 1);
        });

        it('should create role content', async function() {
            const {projectId} = await Projects.newProject(username);
            const project = await Projects.getProjectSafe(projectId);
            const [roleContent] = Object.values(project.roles);
            assert(roleContent.ProjectName, 'Role is missing project name.');
        });

        it('should create non-colliding project name', async function() {
            const state1 = await Projects.newProject(username);
            const state2 = await Projects.newProject(username);
            assert.notEqual(state1.name, state2.name);
        });
    });

    describe('getSharedProjectList', function() {
        it('should get projects shared w/ user', async function() {
            const sharedProjects = await Projects.getSharedProjectList(username);
            assert.equal(sharedProjects.length, 1);
            assert.equal(sharedProjects[0].ProjectName, 'SharedProject');
        });

        it('should not get projects shared by user', async function() {
            const sharedProjects = await Projects.getSharedProjectList('hamid');
            assert.equal(sharedProjects.length, 0);
        });
    });

    describe('getProjectList', function() {
        it('should get projects owned by user', async function() {
            const projList = await Projects.getProjectList(username);
            assert.equal(projects.length, projList.length);
        });

        it('should convert projects to preview format', async function() {
            const projList = await Projects.getProjectList(username);
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
            const {role} = await Projects.getProject(projectId, roleId);
            assert.equal(role.ID, roleId);
        });

        it.skip('should get last updated role by default', function() {
        });
    });

    describe('getPublicProject', function() {
        it('should return project', async function() {
            const project = await Projects.getPublicProject(username, 'PublicProject');
            assert(project);
        });

        it('should throw error if project not found', async function() {
            await utils.shouldThrow(
                () => Projects.getPublicProject(username, 'IDontExist'),
                Errors.ProjectNotFound
            );
        });

        it('should throw error if project not public', async function() {
            await utils.shouldThrow(
                () => Projects.getPublicProject(username, 'MultiRoles'),
                Errors.ProjectNotFound
            );
        });
    });

    describe('importProject', function() {
        const roles = ['firstRole', 'secondRole']
            .map(name => SUtils.getEmptyRole(name));
        const name = 'ImportedProject';

        it('should create new project', async function() {
            await Projects.importProject(
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
            const {projectId} = await Projects.importProject(
                username,
                roles,
                project.name,
                'firstRole',
                'someClientId'
            );
            const newProject = await Projects.getProjectSafe(projectId);
            assert.notEqual(newProject.name, project.name);
        });

        it('should import both roles', async function() {
            const {projectId} = await Projects.importProject(
                username,
                roles,
                name,
                'firstRole',
                'someClientId'
            );
            const newProject = await Projects.getProjectSafe(projectId);
            const roleIds = await newProject.getRoleIds();
            assert.equal(roleIds.length, roles.length);
        });
    });

    describe('setProjectName', function() {
        it('should set project name', async function() {
            const projectId = project.getId();
            const name = 'myNewName';
            await Projects.setProjectName(projectId, name);
            const newProject = await Projects.getProjectSafe(projectId);
            assert.equal(newProject.name, name);
        });

        it('should ensure non-colliding name', async function() {
            const projectId = project.getId();
            const [, otherProject] = projects;
            const {name} = otherProject;
            await Projects.setProjectName(projectId, name);
            const newProject = await Projects.getProjectSafe(projectId);
            assert.notEqual(newProject.name, name);
            assert(newProject.name.includes(name));
        });
    });
});
