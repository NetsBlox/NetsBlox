/**
 * The core functionality for the NetsBlox API pertaining to interacting
 * with projects.
 */
const ProjectsData = require('../../storage/projects');
const UsersData = require('../../storage/users');
const NetworkTopology = require('../../network-topology');
const Utils = require('../../server-utils.js');
const Errors = require('./errors');
const _ = require('lodash');

class Projects {
    constructor(logger) {
        this.logger = logger.fork('projects');
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
    }

    async saveProjectCopy(username, project) {
        // Save the latest role content (include xml in the req)
        // TODO
        // make a copy of the project for the given user and save it!
        const name = `Copy of ${project.name || 'untitled'}`;
        const uniqName = this._getProjectName(username, name, project.getId());
        const overrides = {
            name: uniqName,
            transient: true
        };
        await project.getCopyFor(username, overrides);
        this.logger.trace(`${username} saved a copy of project: ${name}`);
        return {
            name: uniqName,
            projectId: project.getId()
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
        const isAlreadySaved = project.transient;
        if (isAlreadySaved) {
            this.logger.trace(`Original project already saved. Copying original ${project.name}`);
            const copy = project.getCopy();
            await copy.persist();
        }

        if (overwrite) {
            const collision = await ProjectsData.get(owner, name);
            if (collision) {
                await this.deleteProject(collision);
            }
        }
        await this._setProjectName(owner, project.getId(), name);  // TODO: optimize
        await this.saveRole(project, roleId, roleData);
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
        const result = await ProjectsData.updateCustom(query, {$set: {Public: isPublished}});
        if (result.matchedCount === 0) {
            throw new Errors.ProjectNotFound(name);
        }
    }

    async newProject(owner, roleName='myRole', clientId=null) {
        const name = await this._getProjectName(owner, 'untitled');
        const roleId = `${roleName}-${Date.now()}`;
        const roleData = await ProjectsData.uploadRoleToBlob(Utils.getEmptyRole(roleName));
        const projectData = {
            owner,
            name,
            roles: {},
        };
        projectData.roles[roleId] = roleData;
        const project = await ProjectsData.new(projectData);
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
        const rolesWithIds = roles.map(roleData => {
            const roleId = ProjectsData.getNewRoleId(roleData.ProjectName);
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
        const project = await ProjectsData.new(projectData);
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

        const projects = await ProjectsData.getSharedProjects(username);
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

        const projects = await ProjectsData.getUserProjects(username);
        this.logger.trace(`found ${projects.length} projects for ${username}`);
        const previews = projects.map(project => this._getProjectMetadata(project, origin));
        return previews;
    }

    async hasConflictingStoredProject(username, name, projectId) {
        const projects = await ProjectsData.getAllUserProjects(username);
        const isColliding = project => project.getId() !== projectId && project.name === name;
        return !!projects.find(isColliding);
    }

    async getProjectByName(owner, name, requestor) {
        let project = await ProjectsData.get(owner, name);
        if (!project) throw new Errors.ProjectNotFound(name);
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
        if (!project.Public) throw new Errors.ProjectNotFound(name);
        return project;
    }

    async getProjectSafe(projectIdOrOwner, name) {
        const project = arguments.length === 2 ?
            await ProjectsData.get(projectIdOrOwner, name) :
            await ProjectsData.getById(projectIdOrOwner);

        if (!project) throw new Errors.ProjectNotFound(name);
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
        if (!user) throw new Errors.UserNotFound(username);
    }

    _getProjectMetadata(project, origin='') {
        let metadata = this.getProjectInfo(project);
        metadata.Thumbnail = `${origin}/api/projects/${project.owner}/${project.name}/thumbnail`;
        return metadata;
    }

    getProjectInfo(project) {  // TODO: Convert this to ProjectPreview class
        const roles = Object.keys(project.roles).map(k => project.roles[k]);
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
        const projects = await ProjectsData.getAllRawUserProjects(project.owner);
        const projectsByName = {};

        projects
            .forEach(project => projectsByName[project.name] = project);

        const basename = name;
        let i = 2;
        let collision = projectsByName[name];
        while (collision &&
            collision._id.toString() !== projectId &&
            !collision.deleteAt  // delete existing a little early
        ) {
            name = `${basename} (${i})`;
            i++;
            collision = projectsByName[name];
        }

        if (collision && collision.deleteAt) {
            await ProjectsData.destroy(collision._id);
        }

        await project.setName(name);
        const state = await NetworkTopology.onRoomUpdate(projectId);
        return state;
    }

    async _setProjectName(ownerId, projectId, name) {
        const uniqName = await this._getProjectName(ownerId, name, projectId);
        await ProjectsData.update(projectId, {$set: {name: uniqName}});
    }

    async _getProjectName(ownerId, basename, projectId=null) {
        const metadata = (await ProjectsData.getAllUserProjects(ownerId))
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

module.exports = Projects;