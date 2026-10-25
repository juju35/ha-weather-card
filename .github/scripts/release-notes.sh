#!/usr/bin/env bash
# Print the CHANGELOG.md section for a version, without its "## x.y.z" heading.
set -euo pipefail
awk -v v="$1" '
  /^## / { if (found) exit; found = ($2 == v); next }
  found { print }
' CHANGELOG.md | sed -e '/./,$!d'
