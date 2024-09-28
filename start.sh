#!/bin/bash

service nginx start
npm run migrate
npm run setup
pm2-runtime ecosystem.config.js
