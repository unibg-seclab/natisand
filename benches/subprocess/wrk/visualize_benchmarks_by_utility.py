#!/usr/bin/env python3

import argparse
import json
import os
from collections import defaultdict

import matplotlib.pyplot as plt
import numpy as np


# Fix font size of the plots
plt.rcParams.update({'font.size': 20})

COLORS = ["tab:blue", "tab:red", "tab:green", "tab:orange"]
FILENAMES = {
    "latency": "latency.pdf",
    "throughput": "throughput.pdf",
}
LABELS = ["Deno", "Native Sandbox", "Deno + Minijail", "Deno + Sandbox2"]
YLABELS = {
    "latency": "Latency [ms]",
    "throughput": "Throughput [req/s]",
}

def group(directory):
    """Group benchmark results files by utility and test."""
    for filename in os.listdir(directory):
        utility, suffix = filename.split("-", 1)
        test = ""
        if "-" in suffix:
            test, _ = suffix.rsplit("-", 1)

        if test in ["1-1", "rotate"]:
            continue

        groups[utility][test] = groups[utility].get(test, [])
        groups[utility][test].append(os.path.join(directory, filename))


def plot(utility, data, type="latency"):
    x_axis = np.arange(len(tests))
    for i, label in enumerate(LABELS):
        plt.bar(x_axis - 0.3 + 0.2 * i, data[i], 0.2, color=COLORS[i], label=label)
    plt.xticks(x_axis, map(str.capitalize, tests))
    plt.ylabel(YLABELS[type])

    legend = plt.legend(bbox_to_anchor=(-0.1, 1),
                        frameon=False,
                        loc='lower left',
                        prop={'size': 16},
                        ncol=2)

    fig = plt.gcf()
    fig.savefig(os.path.join(output_directory,
                             utility + "-" + FILENAMES[type]),
                bbox_extra_artists=(legend, ),
                bbox_inches='tight')
    if is_interactive: plt.show()
    # Clear the current Figure’s state without closing it
    plt.clf()


parser = argparse.ArgumentParser(
    description='Visualize subprocess macro benchmarks.'
)
parser.add_argument('results', metavar='RESULTS',
                    help='path of the generic benchmark directory')
parser.add_argument('native_sandbox_results', metavar='NATIVE_SANDBOX_RESULTS',
                    help='path of the native sandbox benchmark directory')
parser.add_argument('output', metavar='OUTPUT',
                    help='path of the directory where to store images')
parser.add_argument('-i',
                    '--interactive',
                    action='store_true',
                    help='show plots')

args = parser.parse_args()
directory = os.path.realpath(args.results)
native_sandbox_directory = os.path.realpath(args.native_sandbox_results)
output_directory = os.path.realpath(args.output)
is_interactive = args.interactive

groups = defaultdict(dict)
group(directory)
group(native_sandbox_directory)

utilities = sorted(groups.keys())
for utility in utilities:
    by_test = groups[utility]

    latencies = [[] for _ in LABELS]
    throughputs = [[] for _ in LABELS]

    tests = sorted(by_test.keys())
    for test in tests:
        paths = by_test[test]

        sorted_paths = sorted(paths[:-1])
        sorted_paths.insert(1, paths[-1])
        for i, path in enumerate(sorted_paths):
            benchmark = json.load(open(path))
            duration = benchmark["summary"]["duration"] / 10**6
            requests = benchmark["summary"]["requests"]
            latencies[i].append(benchmark["latency"]["mean"] / 10**3)
            throughputs[i].append(requests / duration)

    plot(utility, latencies, type="latency")
    plot(utility, throughputs, type="throughput")
