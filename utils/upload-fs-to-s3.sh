# Upload every object in the fs blob to the s3 blob
#
# Requires awscli to be installed and configured.

BLOB_BACKEND=fs
node list-blob-objects.js > fs-objects.txt
echo "Found $(wc -l fs-objects.txt) objects in the fs blob"

BLOB_BACKEND=s3
node list-blob-objects.js > s3-objects.txt
echo "Found $(wc -l s3-objects.txt) objects in the s3 blob"

grep -v -F -x -f s3-objects.txt fs-objects.txt > new-objects.txt
echo "Found $(wc -l new-objects.txt) new objects to upload to s3"

for id in $(cat new-objects.txt); do
    aws s3api put-object --bucket $S3_BUCKET --key $id --body $NETSBLOX_BLOB_DIR/${id:0:2}/${id:2}
done

echo "Removing temp files..."
rm s3-objects.txt fs-objects.txt new-objects.txt
