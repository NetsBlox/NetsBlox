#!/bin/bash

./src/server/rpc/procedures/met-museum/dlDataset.sh
node ./src/server/rpc/procedures/met-museum/prepare.js /tmp/metobjects.csv
