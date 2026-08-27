#!/bin/bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"
docker build -f installer/test/Dockerfile -t keel-installer-test .
docker run --rm keel-installer-test
