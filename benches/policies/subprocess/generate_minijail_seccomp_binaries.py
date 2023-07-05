#!/usr/bin/env python3

import argparse
import glob
import json
import os
import os.path
import random
import re
import string
import subprocess

parser = argparse.ArgumentParser(
    prog = 'generate_minijail_seccomp_binaries.py',
    description = 'Generate Minijail seccomp binaries necessary to sandbox the '
                  'tests with Minijail sandboxing and containment tool',
)

parser.add_argument('tests', help='File describing the tests')
parser.add_argument('directory',
                    help='Directory where to store Minijail seccomp binaries')

args = parser.parse_args()

# Parse input tests file
tests_file = open(args.tests)
tests = json.load(tests_file)

# Make sure output directory exists
os.makedirs(args.directory, exist_ok=True)

# Resolve relative paths before changing working directory
parent = os.path.dirname(os.path.realpath(__file__))
script = os.path.join(parent, 'generate_minijail_seccomp_binary.sh')
initial_working_directory = os.getcwd()
directory = os.path.realpath(args.directory)

for t in range(len(tests)):
    test = tests[t]
    command = test['command']

    # Resolve relative paths in command arguments
    for i in range(len(command)):
        arg = command[i]
        if arg.startswith("data/") or arg.startswith("../"):
            command[i] = os.path.realpath(arg)

    # Fill input and output placeholders
    if 'image' in test:
        image = test['image']
        for i in range(len(command)):
            match = re.search(r'^\$\{(input|output)FilePath\}$', command[i])
            if match:
                prefix = match.groups()[0]
                suffix = ''.join(random.choices(string.digits, k=10))
                path = image if prefix == 'input' else f'output-{suffix}'
                command[i] = os.path.realpath(path)

    # Resolve stdin relative path and embed the redirection in the command
    if 'stdin' in test:
        command.extend(['<', os.path.realpath(test['stdin'])])

# Change working directory to the root of the Minijail repository
os.chdir(os.environ["MINIJAIL"])

# TODO: Merge policy of the same binary multiple runs
for test in tests:
    command = test['command']
    
    prefix = os.path.basename(command[0])
    
    # When specified base the prefix on the name of the test to keep distinct
    # Minijail seccomp binaries for each test and have meaningful names
    if 'name' in test:
        prefix = re.sub(r'[.,\/#!$%\^&\*;:{}=\-_`~()\s]', '-',
                        test['name'].lower())
        prefix = re.sub('-{2,}', '-', prefix)
        prefix = prefix.rstrip('-')
    
    output = os.path.join(directory, prefix)
    subprocess.run([script, " ".join(command), output])

# Remove output placeholders
pattern = os.path.join(initial_working_directory, "output-*")
for filename in glob.glob(pattern):
    os.remove(filename)
