const AWS = require('aws-sdk');
const Q = require('q');

class S3Backend {

    constructor(_logger) {
        this.logger = _logger.fork('s3');
        this.client = new AWS.S3({
            endPoint: process.env.S3_ENDPOINT || 'http://127.0.0.1:9000',
            //port: process.env.S3_PORT || 9000,
            //secure: process.env.S3_SECURE !== undefined ? process.env.S3_SECURE : true,
            accessKeyId: process.env.S3_KEY_ID,
            secretAccessKey: process.env.S3_SECRET_KEY,
            s3ForcePathStyle: 'true',
            signatureVersion: 'v4'
        });
    }

    get(id) {
        let data = '';
        const deferred = Q.defer();

        this.client.getObject(id)
            .on('httpData', chunk => data += chunk)
            .on('httpDone', () => deferred.resolve(data))
            .on('error', err => {
                this.logger.error(`Could not read from ${JSON.stringify(id)}: ${err}`);
                throw err;
            });

        return deferred.promise;
    }

    store(id, data) {
        const obj = {
            Bucket: this.bucket,
            Key: id,
            Body: data
        };

        return Q.ninvoke(this.client, 'putObject', obj)
            .fail(err => {
                this.logger.error(`Could not save to s3 ${this.bucket}/${id}: ${err}`);
                throw err;
            });
    }
}

module.exports = S3Backend;
