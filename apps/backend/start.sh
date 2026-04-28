#!/bin/sh
set -e

node_modules/.bin/drizzle-kit migrate

node dist/index.js
