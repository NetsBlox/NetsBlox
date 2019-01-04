#!/bin/env bash

# runs the client tests in a headless chrome

# get the script directory path
cur_dir="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"

# check if server is currently running: get the pid
function serverPid()
{
  echo $(bash $cur_dir/pid.sh)
}

initial_pid=$(serverPid)

# only start and stop the server if it's not up already
if [ -z $initial_pid ]; then
  echo "starting the server..."
  npm start >/dev/null &
  # wait while server hasn't started listening yet
  while [ -z $(serverPid) ]; do
    echo waiting for the server to startup..
    sleep 0.5
  done
  npx mocha-chrome http://localhost:8080/test --chrome-flags '["--no-sandbox"]'
  exit_code=$?
  kill %1 # shutdown netsblox server (job id 1)
else
  echo "server is already up with pid '$initial_pid'"
  npx mocha-chrome http://localhost:8080/test --chrome-flags '["--no-sandbox"]'
  exit_code=$?
fi
exit $exit_code
