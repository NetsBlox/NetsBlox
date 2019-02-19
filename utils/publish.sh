VERSION=$(cat package.json| grep version | sed 's/.*"\([0-9\.]\+\).*/\1/')
IS_LOGGED_IN=$(docker info | grep 'Username: netsblox')
if [[ $IS_LOGGED_IN ]]; then
    echo "Building docker images for version $VERSION"
    docker build -t netsblox/base:latest -t netsblox/base:$VERSION -f Dockerfile.base .
    docker build -t netsblox/server:latest -t netsblox/server:$VERSION .
    docker push netsblox/base:latest
    docker push netsblox/base:$VERSION
    docker push netsblox/server:latest
    docker push netsblox/server:$VERSION
else
    echo "Please log in before publishing netsblox"
fi
