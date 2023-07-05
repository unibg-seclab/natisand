#!/usr/bin/env python3

import argparse
import json

parser = argparse.ArgumentParser(
    prog = 'to_native_sandbox_policy.py',
    description = 'Convert given policy to one compatible with the native'
                  ' sandbox',
)

parser.add_argument('-i', '--ipc', action='store_true', help='Allow IPC')
parser.add_argument('-n', '--network', action='store_true',
                    help='Allow networking')
parser.add_argument('input', help='Input cage4deno policy file')
parser.add_argument('output', help='Output native sandbox policy file')

args = parser.parse_args()

# Parse input cage4deno policy
input_policy_file = open(args.input)
input_policy = json.load(input_policy_file)

# Translate input policy to output policy
policies = []
for policy in input_policy['policies']:
    policy_name = policy['policy_name']
    read = policy['read']
    write = policy['write']
    exec = policy['exec']

    # Support input and output redirection to /dev/null
    read.append('/dev/null')
    write.append('/dev/null')

    native_sandbox_policy = {}
    native_sandbox_policy['name'] = policy_name.rsplit('_', 1)[1]
    native_sandbox_policy['fs'] = {
        'read': sorted(read),
        'write': sorted(write),
        'exec': sorted(exec),
    }
    native_sandbox_policy['ipc'] = args.ipc
    native_sandbox_policy['net'] = args.network

    policies.append(native_sandbox_policy)

# Write native sandbox policy to file
with open(args.output, 'w') as output_policy_file:
    output_policy_file.write(json.dumps(policies, indent=4))
