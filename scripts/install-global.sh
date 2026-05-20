#!/usr/bin/env sh
set -e

for v in $(fnm list | grep -oE 'v[0-9]+\.[0-9]+\.[0-9]+'); do
  echo "==> $v"
  fnm exec --using "$v" npm i -g
done
