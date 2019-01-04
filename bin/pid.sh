#!/bin/bash

# read the port from the environment or set it
server_port=$PORT
[ -z $server_port ] && server_port=8080

# check if server is currently running: get the pid
pid=$(netstat -nltp 2>/dev/null | grep $server_port | head -n 1 | grep -Eo '[0-9]+/node' | cut -d '/' -f 1)

# OPT ensure that process is running node

echo $pid
