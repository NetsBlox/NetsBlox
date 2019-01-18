#!/bin/env bash

# runs the client tests in a headless chrome

[ -z $PORT ] && port=8080 || port=$PORT
# WARN if running multilple instances, VANTAGE_PORTs might collide

# check if server is currently running: get the pid
function serverPid()
{
  local pid=$(netstat -nltp 2>/dev/null | grep $port | head -n 1 | grep -Eo '[0-9]+/node' | cut -d '/' -f 1)
  echo $pid
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
  npx mocha-chrome http://localhost:$port/test --chrome-flags '["--no-sandbox"]'
  exit_code=$?
  kill %1 # shutdown netsblox server (job id 1)
else
  echo "server is already up with pid '$initial_pid'"
  npx mocha-chrome http://localhost:$port/test --chrome-flags '["--no-sandbox"]'
  exit_code=$?
fi
exit $exit_code
