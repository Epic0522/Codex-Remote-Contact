#!/bin/zsh
cd "$(dirname "$0")" || exit 1
./script/build_and_run.sh --verify
