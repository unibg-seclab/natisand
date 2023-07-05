#!/usr/bin/env python3

import argparse
import json
import os
import re

parser = argparse.ArgumentParser(
    prog = 'export_tests.py',
    description = 'Export tests listed in the given JSON file to directory'
)

parser.add_argument('tests', help='File describing the tests')
parser.add_argument('directory',
                    help='Directory where to store the set of tests')

args = parser.parse_args()

# Parse input tests file
tests_file = open(args.tests)
tests = json.load(tests_file)

# Make sure output directory exists
os.makedirs(args.directory, exist_ok=True)

for test in tests:
    command = test['command']
    
    prefix = os.path.basename(command[0])
    
    # When specified base the prefix on the name of the test
    if 'name' in test:
        prefix = re.sub(r'[.,\/#!$%\^&\*;:{}=\-_`~()\s]', '-',
                        test['name'].lower())
        prefix = re.sub('-{2,}', '-', prefix)
        prefix = prefix.rstrip('-')

    output_path = os.path.join(args.directory, prefix + '.json')
    with open(output_path, 'w') as output_policy_file:
        output_policy_file.write(json.dumps([test], indent=4))
