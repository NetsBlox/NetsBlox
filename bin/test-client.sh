#!/bin/env bash

# runs the client tests in a headless chrome

# check if server is currently running: get the pid
server_pid=$(netstat -nltp 2>/dev/null | grep 8080 | head -n 1 | grep -Eo '[0-9]+/node' | cut -d '/' -f 1)

# only start and stop the server if it's not up already
if [ -z $server_pid ]; then
  echo "starting the server..."
  npm start >/dev/null &
  # TODO loop while server hasn't started listening yet
  sleep 5
  npx mocha-chrome http://localhost:8080/test --chrome-flags '["--no-sandbox"]'
  kill %1
else
  echo "server is already up with pid '$server_pid'"
  npx mocha-chrome http://localhost:8080/test --chrome-flags '["--no-sandbox"]'
fi
