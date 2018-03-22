const AWS = require('aws-sdk');
const Q = require('q');

class S3Backend {

    constructor(_logger) {
        this.logger = _logger.fork('s3');

        const endPoint = process.env.S3_ENDPOINT || 'http://127.0.0.1:9000';
        this.logger.trace(`Connecting to ${endPoint}`);
        this.logger.trace(`Using access key id: "${process.env.S3_KEY_ID}"`);
        this.client = new AWS.S3({
            endpoint: endPoint,
            //port: process.env.S3_PORT || 9000,
            //secure: process.env.S3_SECURE !== undefined ? process.env.S3_SECURE : true,
            accessKeyId: process.env.S3_KEY_ID,
            secretAccessKey: process.env.S3_SECRET_KEY,
            s3ForcePathStyle: true,
            signatureVersion: 'v4'
        });
        this.bucket = process.env.S3_BUCKET || 'netsblox-data';
    }

    get(id) {
        let data = '';
        const deferred = Q.defer();
        const params = {
            Bucket: this.bucket,
            Key: id
        };

        this.client.getObject(params)
            .on('httpData', chunk => data += chunk)
            .on('httpDone', () => deferred.resolve(data))
            .on('error', err => {
                this.logger.error(`Could not read from ${JSON.stringify(id)}: ${err}`);
                deferred.reject(err);
            })
            .send();

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

    list() {
        const deferred = Q.defer();
        let ids = [];
        const params = {
            Bucket: this.bucket,
            MaxKeys: 2000
        };
        const callback = (err, data) => {
            if (err) return deferred.reject(err);

            ids = ids.concat(data.Contents.map(data => data.Key));

            if (data.IsTruncated) {
                params.ContinuationToken = data.NextContinuationToken;
                this.client.listObjectsV2(params, callback);
            } else {
                deferred.resolve(ids);
            }
        };

        this.client.listObjectsV2(params, callback);

        return deferred.promise;
    }
}

module.exports = S3Backend;
