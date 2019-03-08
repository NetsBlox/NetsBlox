module.exports =  (SERVER_ADDRESS, axios) => {
    return {
    // WARN probably shouldn't use the return values from actions as they are not a reference  to the store
        async fetchGroups() {
            const endpoint = SERVER_ADDRESS + '/api/groups';
            let { data: groups } = await axios.get(endpoint, {
                withCredentials: true,
            });
            return groups;
        },

        async fetchGroup(groupId) {
            const endpoint = SERVER_ADDRESS + '/api/groups/' + groupId;
            let { data: group } = await axios.get(endpoint, {
                withCredentials: true,
            });
            return group;
        },

        async fetchUsers(groupId) { // gets group details
            if (!groupId || groupId.length !== 24) throw new Error('invalid group id', groupId);
            console.log('fetching users', groupId);
            const endpoint = SERVER_ADDRESS + `/api/groups/${groupId}/members`;
            let { data: users } = await axios.get(endpoint, {
                withCredentials: true,
            });
            return users;
        },

        async createUser(user) {
            console.debug(`creating user ${user.username}`);
            if (!user || !user.username || !user.groupId || !user.email || !user.password) throw new Error(`missing user data, ${user.username}`);
            const endpoint = SERVER_ADDRESS + `/api/groups/${user.groupId}/members`;
            let response = await axios.post(endpoint, user, {
                withCredentials: true
            });
            let createdUser = response.data;
            console.debug(`created user ${createdUser}`);
            console.assert(createdUser._id !== undefined, 'malformed user response');
            console.assert(createdUser.groupId !== undefined, 'malformed user response');
            console.assert(createdUser.username === user.username, 'malformed user response');
            return createdUser;
        },

        async updateUser(user) {
            console.log(`updating user ${user.username}`);
            if (!user || !user.username || !user.email) throw new Error(`missing user data, ${user}}`);
            const endpoint = SERVER_ADDRESS + `/api/groups/${user.groupId}/members/${user._id}`;
            let response = await axios.patch(endpoint, user, {
                withCredentials: true
            });
            return response.data;
        },

        async deleteUser(user) {
            console.log(`deleting user ${user.username}`);
            if (!user || !user.username || !user.email) throw new Error(`missing user data, ${user}}`);
            const endpoint = SERVER_ADDRESS + `/api/groups/${user.groupId}/members/${user._id}`;
            let response = await axios.delete(endpoint, {
                withCredentials: true
            });
            return response.data;
        },

        async updateGroup(group) {
            console.log(`updating group ${group.name}`);
            if (!group || !group.name) throw new Error(`missing group data, ${group}}`);
            const endpoint = SERVER_ADDRESS + `/api/groups/${group._id}`;
            let response = await axios.patch(endpoint, group, {
                withCredentials: true
            });
            return response.data;
        },

        async deleteGroup(group) {
            console.log('deleting group', group.name);
            const endpoint = SERVER_ADDRESS + '/api/groups/' + group._id;
            let { data: resp } = await axios.delete(endpoint, {
                withCredentials: true
            });
            return resp;
        },

        async createGroup(name) {
            console.log('creating group', name);
            const endpoint = SERVER_ADDRESS + '/api/groups';
            let { data: group } = await axios.post(endpoint, {name: name}, {
                withCredentials: true
            });
            console.assert(group._id !== undefined, 'malformed group response');
            return group;
        },
    };
};
