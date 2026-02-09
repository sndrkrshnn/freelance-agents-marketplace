#!/bin/sh
# shellcheck shell=dash
# shellcheck disable=SC2034

# This script is run by Git hooks to support the typical workflow of having
# a "pre-commit hook" which runs in each worktree.

current_hook=$(basename "$0")

# allow debugging the shell script
if [ -n "${HUSKY_DEBUG:-}" ]; then
  echo "husky:debug $current_hook: current_dir=$(pwd)"
  echo "husky:debug $current_hook: command= $*"
fi

# run user-defined script, if it exists
. "$(dirname "$0")/$current_hook"
