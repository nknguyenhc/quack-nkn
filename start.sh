#!/bin/bash

npm run migrate
npm run setup
pm2-runtime ecosystem.config.js
