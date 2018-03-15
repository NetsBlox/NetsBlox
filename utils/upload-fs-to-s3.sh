# Upload every object in the fs blob to the s3 blob
#
# Requires awscli to be installed and configured.

for id in $(node list-blob-objects.js); do
    aws s3api put-object --bucket $S3_BUCKET --key $id --body $NETSBLOX_BLOB_DIR/${id:0:2}/${id:2}
done
