/**
 * The core functionality for the NetsBlox API pertaining to interacting
 * with projects.
 */
const Logger = require('../../logger');
const ProjectsStorage = require('../../storage/projects');
const UsersData = require('../../storage/users');
const NetworkTopology = require('../../network-topology');
const Utils = require('../../server-utils.js');
const {ProjectNotFound, ProjectRoleNotFound, UserNotFound} = require('./errors');
const assert = require('assert');
const _ = require('lodash');
const Auth = require('./auth');
const P = Auth.Permission;

class Projects {
    constructor() {
        this.logger = new Logger('netsblox:projects');
    }

    async exportProject(requestor, projectId) {
        const project = await ProjectsStorage.getById(projectId);
        assert(project, new ProjectNotFound());
        await Auth.ensureAuthorized(requestor, P.Project.READ(project));

        const roleIds = await project.getRoleIds();
        const roleContents = await Promise.all(
            roleIds.map(roleId => this.exportRole(requestor, projectId, roleId, project))
        );

        const xml = Utils.xml.format('<room name="@" app="@">', project.name, Utils.APP) +
            roleContents.join('') + '</room>';
        this.logger.trace(`Exporting project ${projectId} for ${requestor}`);

        return xml;
    }

    async exportRole(requestor, projectId, roleId, project=null) {
        if (!project) {
            project = await ProjectsStorage.getById(projectId);
            assert(project, new ProjectNotFound());
        }
        await Auth.ensureAuthorized(requestor, P.Project.READ(project));
        const isValidRoleId = project.roles[roleId];
        assert(isValidRoleId, new ProjectRoleNotFound(project.name));

        // TODO: Can I ensure that I am getting the latest?
        const [occupant] = NetworkTopology.getSocketsAt(projectId, roleId);
        const content = occupant ? 
            await occupant.getProjectJson().catch(err => {
                this._logger.info(`Failed to retrieve project via ws. Falling back to content from database... (${err.message})`);
                return project.getRoleById(roleId);
            }) : await project.getRoleById(roleId);

        const xml = Utils.xml.format('<role name="@">', content.ProjectName)
            + content.SourceCode + content.Media + '</role>';

        return xml;
    }

    async saveProject(project, roleId, roleData, name, overwrite=false) {
        // TODO: Check permissions
        const projectId = project.getId();
        this.logger.trace(`Saving ${roleId} from ${name || project.name} (${projectId})`);

        // if project name is different from save name,
        // it is "Save as" (make a copy)
        const isSaveAs = name && project.name !== name;

        if (isSaveAs) {
            this.logger.trace(`Detected "save as". Saving ${project.name} as ${name}`);
            return await this._saveProjectAs(project, name, roleId, roleData, overwrite);
        }

        await this.saveRole(project, roleId, roleData);
        return project;
    }

    async saveProjectCopy(username, project, clientId) {
        // Save the latest role content (include xml in the req)
        // TODO
        // make a copy of the project for the given user and save it!
        const projectInfo = await this._saveProjectCopy(username, project);
        await NetworkTopology.setClientState(
            clientId,
            projectInfo.projectId,
            undefined,
            username
        );
        return projectInfo;
    }

    async _saveProjectCopy(username, project) {
        const name = `Copy of ${project.name}`;
        const uniqName = await this._getProjectName(username, name, project.getId());
        const overrides = {
            name: uniqName,
            transient: false
        };
        const copy = await project.getCopyFor(username, overrides);
        this.logger.trace(`${username} saved a copy of project: ${name}`);
        return {
            name: uniqName,
            projectId: copy.getId()
        };
    }

    async saveRole(project, roleId, roleData) {
        await NetworkTopology.onRoomUpdate(project.getId());
        await project.archive();
        await project.setRoleById(roleId, roleData);
        await project.persist();
    }

    async _saveProjectAs(project, name, roleId, roleData, overwrite=false) {
        // Only copy original if it has already been saved
        const {owner} = project;
        const isAlreadySaved = !project.transient;
        if (isAlreadySaved) {
            this.logger.trace(`Original project already saved. Copying original ${project.name}`);
            project = await project.getCopy({transient: false});
        }

        if (overwrite) {
            const collision = await ProjectsStorage.get(owner, name);
            if (collision) {
                await this.deleteProject(collision);
            }
        }
        await this._setProjectName(owner, project.getId(), name);  // TODO: optimize
        await this.saveRole(project, roleId, roleData);
        return project;
    }

    async deleteProject(project) {
        await project.destroy();
    }

    async publishProject(owner, name) {
        return this._setProjectPublished(owner, name, true);
    }

    async unpublishProject(owner, name) {
        return this._setProjectPublished(owner, name, false);
    }

    async _setProjectPublished(owner, name, isPublished=false) {
        const query = {owner, name};
        const result = await ProjectsStorage.updateCustom(query, {$set: {Public: isPublished}});
        assert(result.matchedCount === 0, new ProjectNotFound(name));
    }

    async newProject(owner, roleName='myRole', clientId=null) {
        const name = await this._getProjectName(owner, 'untitled');
        const roleId = `${roleName}-${Date.now()}`;
        const roleData = await ProjectsStorage.uploadRoleToBlob(Utils.getEmptyRole(roleName));
        const projectData = {
            owner,
            name,
            roles: {},
            transient: true,
        };
        projectData.roles[roleId] = roleData;
        const project = await ProjectsStorage.new(projectData);
        const projectId = project.getId();

        this.logger.trace(`Created new project: ${projectId} (${roleName})`);
        await NetworkTopology.setClientState(clientId, projectId, roleId, owner);
        return {
            projectId,
            roleId,
            name: project.name,
            roleName
        };
    }

    async importProject(owner, roles, name, roleName, clientId) {
        name = await this._getProjectName(owner, name);

        const rolesMetadata = await Promise.all(roles.map(ProjectsStorage.uploadRoleToBlob));
        const rolesWithIds = rolesMetadata.map(roleData => {
            const roleId = ProjectsStorage.getNewRoleId(roleData.ProjectName);
            return [roleId, roleData];
        });
        const rolesDict = _.fromPairs(rolesWithIds);
        const [roleId] = rolesWithIds.find(pair => {
            const [, content] = pair;
            return !roleName || content.ProjectName === roleName;
        });
        const projectData = {
            owner,
            name,
            roles: rolesDict
        };
        const project = await ProjectsStorage.new(projectData);
        const projectId = project.getId();
        const state = await NetworkTopology.setClientState(clientId, projectId, roleId, owner);
        return {
            projectId,
            roleId,
            state,
        };
    }

    async getSharedProjectList(username, origin='') {
        await this._ensureValidUser(username);

        const projects = await ProjectsStorage.getSharedProjects(username);
        this.logger.trace(`found ${projects.length} shared projects ` +
            `for ${username}`);

        const previews = projects.map(project => this._getProjectMetadata(project, origin));
        const names = JSON.stringify(previews.map(preview =>
            preview.ProjectName));

        this.logger.info(`shared projects for ${username} are ${names}`);

        return previews;
    }

    async getProjectList(username, origin='') {
        await this._ensureValidUser(username);

        const projects = await ProjectsStorage.getUserProjects(username);
        this.logger.trace(`found ${projects.length} projects for ${username}`);
        const previews = projects.map(project => this._getProjectMetadata(project, origin));
        return previews;
    }

    async hasConflictingStoredProject(username, name, projectId) {
        const projects = await ProjectsStorage.getAllUserProjects(username);
        const isColliding = project => project.getId() !== projectId && project.name === name;
        return !!projects.find(isColliding);
    }

    async getProjectByName(owner, name, requestor) {
        let project = await ProjectsStorage.get(owner, name);
        assert(project, new ProjectNotFound(name));
        if (requestor && requestor !== owner) {  // send a copy
            project = await project.getCopyFor(requestor);
        }
        const role = await project.getLastUpdatedRole();
        return {project, role};
    }

    async getProject(projectId, roleId) {
        const project = await this.getProjectSafe(projectId);
        const role = roleId ? await project.getRoleById(roleId) :
            await project.getLastUpdatedRole();

        return {role, project};
    }

    async getPublicProject(owner, name) {
        await this._ensureValidUser(owner);
        const project = await this.getProjectSafe(owner, name);
        assert(project.Public, new ProjectNotFound(name));
        return project;
    }

    async getProjectSafe(projectIdOrOwner, name) {
        const project = arguments.length === 2 ?
            await ProjectsStorage.get(projectIdOrOwner, name) :
            await ProjectsStorage.getById(projectIdOrOwner);

        assert(project, new ProjectNotFound(name));
        return project;
    }

    async getRoleToJoin(projectId) {
        const project = await this.getProjectSafe(projectId);
        const metadata = await project.getRawRoles();
        const occupiedRoles = NetworkTopology.getSocketsAtProject(projectId)
            .map(socket => socket.roleId);
        const unoccupiedRoles = metadata
            .filter(data => !occupiedRoles.includes(data.ID));
        const roleChoices = unoccupiedRoles.length ?
            unoccupiedRoles : metadata;

        const roleId = Utils.sortByDateField(roleChoices, 'Updated', -1).shift().ID;
        return {
            project,
            role: await project.getRoleById(roleId),
        };
    }

    async _ensureValidUser(username) {
        const user = await UsersData.get(username);
        assert(user, new UserNotFound(username));
    }

    _getProjectMetadata(project, origin='') {
        let metadata = this.getProjectInfo(project);
        metadata.Thumbnail = `${origin}/api/projects/${project.owner}/${project.name}/thumbnail`;
        return metadata;
    }

    getProjectInfo(project) {  // TODO: Convert this to ProjectPreview class
        const roles = Object.values(project.roles);
        const preview = {
            ProjectName: project.name,
            Public: !!project.public
        };

        let role;
        for (var i = roles.length; i--;) {
            role = roles[i];
            // Get the most recent time
            preview.Updated = Math.max(
                preview.Updated || 0,
                new Date(role.Updated).getTime()
            );

            // Notes
            preview.Notes = preview.Notes || role.Notes;
            preview.Thumbnail = preview.Thumbnail ||
                (role.Thumbnail instanceof Array ? role.Thumbnail[0] : role.Thumbnail);
        }
        preview.Updated = new Date(preview.Updated);
        preview.Public = project.Public;
        preview.Owner = project.owner;
        preview.ID = project.getId();
        return preview;
    }

    async setProjectName(projectId, name) {
        // Resolve conflicts with transient, marked for deletion projects
        const project = await this.getProjectSafe(projectId);
        const projects = await ProjectsStorage.getAllUserProjects(project.owner);
        const projectsByName = _.fromPairs(projects.map(p => [p.name, p]));

        const basename = name;
        let i = 2;
        let collision = projectsByName[name];
        while (collision &&
            collision.getId() !== projectId &&
            !collision.deleteAt  // delete existing a little early
        ) {
            name = `${basename} (${i++})`;
            collision = projectsByName[name];
        }

        if (collision && collision.deleteAt) {
            await ProjectsStorage.destroy(collision._id);
        }

        await project.setName(name);
        const state = await NetworkTopology.onRoomUpdate(projectId);
        return state;
    }

    async _setProjectName(ownerId, projectId, name) {
        const uniqName = await this._getProjectName(ownerId, name, projectId);
        await ProjectsStorage.update(projectId, {$set: {name: uniqName}});
    }

    async _getProjectName(ownerId, basename, projectId=null) {
        const metadata = (await ProjectsStorage.getAllUserProjects(ownerId))
            .filter(metadata => metadata.getId() !== projectId);
        const takenNames = metadata.map(md => md.name);
        let name = basename;
        let count = 2;

        while (takenNames.includes(name)) {
            name = `${basename} (${count++})`;
        }

        return name;
    }
}

module.exports = new Projects();
