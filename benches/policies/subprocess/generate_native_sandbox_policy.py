#!/usr/bin/env python3

import argparse
import glob
import json
import os
import os.path
import random
import re
import shutil
import string
import subprocess

parser = argparse.ArgumentParser(
    prog = 'generate_native_sandbox_policy.py',
    description = 'Generate native sandbox policy necessary to sandbox the '
                  'tests with our Deno native sandboxing extension',
)

parser.add_argument('tests', help='File describing the tests')
parser.add_argument('output',
                    help='File where to store the native sandbox policy')

args = parser.parse_args()

# Parse input tests file
tests_file = open(args.tests)
tests = json.load(tests_file)

# Make sure intermediates directory exists
os.makedirs('native-sandbox-policy-intermediates', exist_ok=True)

# Retrieve companion script absolute path
parent = os.path.dirname(os.path.realpath(__file__))
script = os.path.join(parent, 'generate_native_sandbox_policy.sh')

binaries = set()
policies = []
for test in tests:
    command = test['command']
    binary = os.path.basename(command[0])
    # Avoid running the same utils multiple times for policy and efficiency
    # reasons
    # TODO: Merge policy of the same binary multiple runs
    if binary not in binaries:
        # Fill input and output placeholders
        if 'image' in test:
            image = test['image']
            for i in range(len(command)):
                match = re.search(r'^\$\{(input|output)FilePath\}$',
                                  command[i])
                if match:
                    prefix = match.groups()[0]
                    suffix = ''.join(random.choices(string.digits, k=10))
                    command[i] = (image
                                  if prefix == 'input'
                                  else f'output-{suffix}')

        # Embed input redirection in command
        if 'stdin' in test:
            command.extend(['<', test['stdin']])

        # Prepare script arguments
        native_sandbox = test.get('native-sandbox', {})
        ipc = ['-i'] if native_sandbox.get('ipc', False) else []
        net = ['-n'] if native_sandbox.get('net', False) else []
        output = os.path.join('native-sandbox-policy-intermediates',
                              binary + ".json")
        subprocess.run([script, *ipc, *net, " ".join(command), output])
        binaries.add(binary)

        # Merge the generated native sandbox policy with the others
        with open(output) as policy_file:
            policy = json.load(policy_file)
            actual_policy = policy[0]

            # Fix generated policy
            if 'image' in test:
                fs_policy = actual_policy['fs']
                
                for kind in ['read', 'write']:
                    # Remove hard coded absolute path of the input and wrong
                    # output path
                    to_keep = lambda path: not (
                        path.endswith(image) or
                        re.search(r'output-\d{10}', path)
                    )
                    fs_policy[kind] = list(filter(to_keep, fs_policy[kind]))
                    # Add input and output relative path
                    fs_policy[kind].append('data')
                
                # Add Tesseract missing dependency
                fs_policy['read'].append('/usr/share/tesseract-ocr')

            policies.append(actual_policy)

with open(args.output, 'w') as output_policy_file:
    output_policy_file.write(json.dumps(policies, indent=4))

# Remove output placeholders
shutil.rmtree('native-sandbox-policy-intermediates')

# Remove output placeholders
pattern = os.path.join(os.getcwd(), "output-*")
for filename in glob.glob(pattern):
    os.remove(filename)
