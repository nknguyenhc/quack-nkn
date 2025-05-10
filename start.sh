#!/bin/bash

service nginx start
npm run migrate
npm run setup
npm run run
