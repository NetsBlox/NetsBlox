class ApiKey {
    constructor(name, helpUrl, envVar) {
        this.name = name;
        this.helpUrl = helpUrl;
        this.envVar = envVar || this.getDefaultEnvVar();
        this.value = process.env[this.envVar];
    }

    getDefaultEnvVar() {
        const capName = this.name.split(' ')
            .map(word => word.toUpperCase()).join('_');
        return capName + '_KEY';
    }

    withValue(value) {
        const apiKey = new ApiKey(this.name, this.helpUrl, this.envVar);
        apiKey.value = value;
        return apiKey;
    }
}

module.exports = ApiKey;
