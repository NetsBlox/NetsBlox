const Logger = require('../../logger');

class CommunityService {
    constructor(logger) {
        this.logger = logger;
        this.types = [
            require('./data-service'),
            require('./device-service'),
        ];
    }

    new(data) {
        const Service = this.types.find(type => type.name === data.type);
        if (!Service) {
            this.logger.warn(`Unsupported community service type: ${data.type}`);
            return null;
        }
        return new Service(...arguments);
    }
}

module.exports = new CommunityService(new Logger('netsblox:services:community'));
