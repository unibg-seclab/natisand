#!/bin/bash
#
# Copyright 2021 Google LLC
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     https://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

# Unit test for sandboxer example.

die() {
  echo "$1" 1>&2
  exit 1
}

[[ -n "$COVERAGE" ]] && exit 0

BIN=$TEST_SRCDIR/bench_sandbox2/subprocess/sandbox2/sandboxer

BINARY_DIRECTORY=$(dirname "$BUILD_WORKSPACE_DIRECTORY/$TEST_BINARY")
DATA_DIRECTORY="$(dirname "$BINARY_DIRECTORY")/data"

"$BIN" '/usr/bin/sum' "$DATA_DIRECTORY/wikidatawiki-latest-pages-logging.xml" || die 'FAILED: it should have exited with 0'

echo 'PASS'
