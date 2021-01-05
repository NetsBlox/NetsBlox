const Projects = require('./storage/projects');
const PUBLIC_ROLE_FORMAT = /^.*@.*@?.*$/;
const {AddressNotFound} = require('./api/core/errors');

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

    static async new(dstId, srcProjectId, srcRoleId) {
        if (PUBLIC_ROLE_FORMAT.test(dstId)) {  // inter-room message
            // Look up the socket matching
            //
            //     <role>@<project>@<owner> or <project>@<owner>
            //
            const [ownerId, roomName, roleName] = dstId.split('@').reverse();
            return Projects.getProjectMetadata(ownerId, roomName, true)
                .then(metadata => {
                    if (!metadata) {
                        throw new AddressNotFound(dstId, srcProjectId);
                    }

                    const projectId = metadata._id.toString();
                    const isBroadcast = !roleName;
                    if (isBroadcast) {
                        const allRoleIds = Object.keys(metadata.roles);
                        return new NetsBloxAddress(projectId, allRoleIds);
                    } else {
                        const roleId = Object.keys(metadata.roles).find(
                            id => metadata.roles[id].ProjectName === roleName
                        );

                        if (roleId) {
                            return new NetsBloxAddress(projectId, [roleId]);
                        } else {
                            throw new AddressNotFound(dstId, srcProjectId);
                        }
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
    }
}

NetsBloxAddress.EVERYONE = 'everyone in room';
NetsBloxAddress.OTHERS = 'others in room';

module.exports = NetsBloxAddress;
