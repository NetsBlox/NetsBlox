const {hex_sha512} = require('../../../common/sha512');
const axios = require('axios');
const {StrategyNotFound, RequestError} = require('./errors');

class Strategy {
    constructor(type) {
        this.type = type;
    }

    async authenticate(/*username, pwd*/) {
    }

    async getEmail(/*username, pwd*/) {
    }
}

class SnapStrategy extends Strategy {
    constructor() {
        super('Snap!');
    }

    async authenticate(username, pwdOrHash) {
        const url = `https://snap.berkeley.edu/api/v1/users/${username}/login`;
        try {
            const resp = await axios.post(url, hex_sha512(pwdOrHash));
            return resp.headers['set-cookie'];
        } catch (err) {
            const {errors} = err.response.data;
            throw new RequestError(errors[0]);
        }
    }

    async getEmail(username, pwdOrHash) {
        const [cookie] = await this.authenticate(username, pwdOrHash);
        const url = `https://snap.berkeley.edu/api/v1/users/${username}`;
        const resp = await axios.get(url, {headers: {'Cookie': cookie}});
        return resp.data.email;
    }
}

class Strategies {
    constructor() {
        this.contents = [];
    }

    find(strategyType) {
        const strategy = this.contents.find(strategy => strategy.type === strategyType);
        if (!strategy) {
            throw new StrategyNotFound(strategyType);
        }
        return strategy;
    }
}

const strategies = new Strategies();
strategies.contents.push(new SnapStrategy());
strategies.Strategy = Strategy;

module.exports = strategies;
