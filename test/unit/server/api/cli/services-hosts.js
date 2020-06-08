const utils = require('../../../../assets/utils');

describe(utils.suiteName(__filename), function() {
    const cli = utils.reqSrc('api/cli/services-hosts');
    const Users = utils.reqSrc('./storage/users');
    const Groups = utils.reqSrc('./storage/groups');
    const url = 'http://localhost:5050';

    beforeEach(() => utils.reset());

    describe('user', function() {
        it('should add host', async function() {
            await cli.parse(cmd(`add brian ${url} -c Test`));
            await utils.expect(
                async () => {
                    const user = await Users.get('brian');
                    return user.servicesHosts.length;
                },
                'Services host not added to user'
            );
        });

        describe('w/ existing', function() {
            beforeEach(async () => {
                const user = await Users.get('brian');
                user.servicesHosts.push(
                    {url},
                    {url: 'https://editor.netsblox.org/services'},
                );
                await user.save();
            });

            it('should remove host', async function() {
                await cli.parse(cmd(`rm brian ${url}`));
                await utils.expect(
                    async () => {
                        const user = await Users.get('brian');
                        return user.servicesHosts.length === 1;
                    },
                    'Services host not removed from user'
                );
            });

            it('should clear host', async function() {
                await cli.parse(cmd('clear brian'));
                await utils.expect(
                    async () => {
                        const user = await Users.get('brian');
                        return user.servicesHosts.length === 0;
                    },
                    'Services hosts not cleared for user'
                );
            });
        });
    });

    describe('group', function() {
        let groupId;

        beforeEach(async () => {
            const [group] = await Groups.all();
            groupId = group._id;
        });

        it('should add host', async function() {
            await cli.parse(cmd(`add ${groupId} ${url} -g`));
            await utils.expect(
                async () => {
                    const group = await Groups.get(groupId);
                    return group.servicesHosts.length === 1;
                },
                'Services host not added to group'
            );
        });

        it('should list hosts', function() {
        });

        describe('w/ existing', function() {
            beforeEach(async () => {
                const group = await Groups.get(groupId);
                group.servicesHosts.push(
                    {url},
                    {url: 'https://editor.netsblox.org/services'},
                );
                await group.save();
            });

            it('should remove host', async function() {
                await cli.parse(cmd(`rm ${groupId} ${url} -g`));
                await utils.expect(
                    async () => {
                        const group = await Groups.get(groupId);
                        return group.servicesHosts.length === 0;
                    },
                    'Services hosts not cleared for group'
                );
            });

            it('should clear host', async function() {
                await cli.parse(cmd(`clear ${groupId} -g`));
                await utils.expect(
                    async () => {
                        const group = await Groups.get(groupId);
                        return group.servicesHosts.length === 0;
                    },
                    'Services hosts not cleared for group'
                );
            });
        });
    });

    function cmd(args) {
        return ['node', 'services-hosts.js'].concat(args.split(' '));
    }
});
