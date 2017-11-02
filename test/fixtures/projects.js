/*
 * "owner","name","roles" are required. Everything else is optional. Defaults:
 *
 *   transient: false
 *   Public: false
 *   collaborators: []
 *
 */
const _ = require('lodash');
const utils = require('../../src/server/server-utils');
const fs = require('fs');
const path = require('path');
const PROJECT_DATA_DIR = path.join(__dirname, 'projects');

function loadProjectData(project) {
    const projectDir = path.join(PROJECT_DATA_DIR, project.projectData);
    let roleNames = fs.readdirSync(projectDir)
        .map(name => name.replace(/-(src|media)\.xml$/, ''));

    project.roles = {};

    roleNames = _.uniq(roleNames);
    project.roles = roleNames.map(name => {
        let src = fs.readFileSync(path.join(projectDir, `${name}-src.xml`), 'utf8');
        let media = fs.readFileSync(path.join(projectDir, `${name}-media.xml`), 'utf8');
        return {
            ProjectName: name,
            SourceCode: src,
            Media: media,
            SourceSize: src.length,
            MediaSize: media.length,
            Thumbnail: utils.xml.thumbnail(src),
            Updated: new Date(),
            Public: false,
            Notes: ''
        };
    });

    delete project.projectData;
    return project;
}

function addDefaults(project) {
    project.collaborators = project.collaborators || [];
    project.transient = !!project.transient;
    project.Public = !!project.Public;
    project.name = project.name || project.projectData;

    loadProjectData(project);

    project.activeRole = project.activeRole || project.roles[0].ProjectName;

    return project;
}

module.exports = [
    {
        owner: 'brian',
        name: 'PublicProject',
        Public: true,
        projectData: 'drawing'
    }
].map(addDefaults);
