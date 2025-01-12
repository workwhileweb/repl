#!/usr/bin/env bash

# https://github.com/liriliri/chobitsu/issues/18

set -euo pipefail

git clone https://github.com/liriliri/chobitsu
cd chobitsu
git checkout v1.8.4
git apply ../chobitsu.patch

npm install
npm run build