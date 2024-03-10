#!/bin/bash -e
fallocate -l 1024M /swapfile
chmod 0600 /swapfile
mkswap /swapfile
swapon /swapfile
node dist-server/server.js