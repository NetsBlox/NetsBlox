#!/bin/env bash

# runs the client tests in a headless chrome

# TODO make sure the server is up and running before starting the client tests

npx mocha-chrome http://localhost:8080/test --chrome-flags '["--no-sandbox"]'
