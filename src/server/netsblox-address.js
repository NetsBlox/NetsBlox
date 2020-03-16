const Logger = require('./logger');
const logger = new Logger('netsblox:addresses');
const Projects = require('./storage/projects');
const PUBLIC_ROLE_FORMAT = /^.*@.*@.*$/;

class NetsBloxAddress {
    constructor(projectId, roleIds) {
        this.projectId = projectId;
        this.roleIds = roleIds;
    }

    resolve () {  // get the public role IDs for the given dst ID
        return this.roleIds.map(id => [this.projectId, id]);
    }

    getPublicIds () {  // get the public role IDs for the given dst ID
        return Projects.getProjectMetadataById(this.projectId, {cache: true})
            .then(metadata => {
                if (!metadata) {
                    throw new Error('Project no longer exists. Cannot resolve address');
                }
                const projectName = metadata.name;
                const owner = metadata.owner;
                return this.roleIds
                    .map(id => metadata.roles[id].ProjectName)
                    .map(roleName => `${roleName}@${projectName}@${owner}`);
            });
    }
}

NetsBloxAddress.new = function(dstId, srcProjectId, srcRoleId) {
    // TODO: Explore caching options to increase perf
    // (it's common to have a lot of msg throughput)

    logger.trace(`resolving netsblox address: "${dstId}" from ${srcRoleId} at ${srcProjectId}`);
    if (PUBLIC_ROLE_FORMAT.test(dstId)) {  // inter-room message
        // Look up the socket matching
        //
        //     <role>@<project>@<owner> or <project>@<owner>
        //
        var idChunks = dstId.split('@'),
            ownerId = idChunks.pop(),
            roomName = idChunks.pop(),
            roleName = idChunks.pop();

        // Resolve the role, owner, project name
        return Projects.getProjectMetadata(ownerId, roomName, true)
            .then(metadata => {
                const projectId = metadata._id.toString();
                let roleId = null;

                if (roleName) {
                    roleId = Object.keys(metadata.roles).find(
                        id => metadata.roles[id].ProjectName === roleName
                    );
                }

                if (roleId || roleId === null) {
                    return new NetsBloxAddress(projectId, [roleId]);
                } else {
                    throw new Error(`Invalid absolute address: ${dstId} from ${srcProjectId}`);
                }
            });

    } else {
        return Projects.getProjectMetadataById(srcProjectId, {cache: true})
            .then(metadata => {
                if (!metadata) {
                    throw new Error(`No source project found: ${srcProjectId}`);
                }

                let roleIds = [];

                if (dstId === NetsBloxAddress.OTHERS) {
                    roleIds = Object.keys(metadata.roles).filter(id => id !== srcRoleId);
                } else if (dstId === NetsBloxAddress.EVERYONE) {
                    roleIds = Object.keys(metadata.roles);
                } else {  // assume dstId is a role name
                    roleIds = Object.keys(metadata.roles)
                        .filter(id => metadata.roles[id].ProjectName === dstId);
                }

                return new NetsBloxAddress(srcProjectId, roleIds);
            });
    }
};

NetsBloxAddress.EVERYONE = 'everyone in room';
NetsBloxAddress.OTHERS = 'others in room';

module.exports = NetsBloxAddress;
