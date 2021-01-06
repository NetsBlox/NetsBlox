class CommunityService {
    constructor() {
        this.types = [
            require('./data-service'),
            require('./device-service'),
        ];
    }

    new(data) {
        const Service = this.types.find(type => type.name === data.type);
        if (!Service) {
            throw new Error(`Unsupported community service type: ${data.type}`);
        }
        return new Service(...arguments);
    }
}

module.exports = new CommunityService();
