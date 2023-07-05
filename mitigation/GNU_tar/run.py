#!/usr/bin/python3

from glob import glob
from pathlib import Path 
import os
import subprocess
import sys
import unittest

deno = "../../../../target/debug/deno"
cwd = os.getcwd()
home = str(Path.home())
pfile = str(Path(home + "/.cage4denos_profiles/tar.json").resolve())

test_order_map = {"test_tar_works": 0, "test_tar_exploit": 1, "test_deno_sandbox": 2, "test_benchmark":3}

"""
TESTS
All the test should run as expected (exitStatus = 0)
The results can be found in `./output_archives`
"""
class TAR_tests(unittest.TestCase):

    def test_tar_works(self):
        print("\n==============")
        print("Normal input for tar")
        print("==============")
        t = subprocess.run(args=[deno,
                                 "run",
                                 "--policy-file=" + pfile,
                                 "test1.js"],
                           stderr=subprocess.DEVNULL)
        self.assertTrue(t.returncode==0)

    def test_tar_exploit(self):
        print("\n==============")
        print("Exploit against Deno for tar")
        print("==============")
        t = subprocess.run(args=[deno,
                                 "run",
                                 "--allow-run=tar",
                                 "test2.js"],
                           stderr=subprocess.DEVNULL)
        self.assertTrue(t.returncode==0)
        with open("output_archives/legitimate_dep/target_file.txt", "r") as f:
            print("Contents of legitimate_dep/target_file.txt")
            print(f.read())
    def test_deno_sandbox(self):
        print("\n==============")
        print("Exploit blocked by Cage4Deno")
        print("==============")
        t = subprocess.run(args=[deno,
                                 "run",
                                 "--policy-file=" + pfile,
                                 "test1.js"],
                           stdout=subprocess.DEVNULL,
                           stderr=subprocess.DEVNULL)

        t = subprocess.run(args=[deno,
                                 "run",
                                 "--policy-file=" + pfile,
                                 "test3.js"],
                           stderr=subprocess.DEVNULL)        
        self.assertTrue(t.returncode==0)
        with open("output_archives/legitimate_dep/target_file.txt", "r") as f:
            print("Contents of legitimate_dep/target_file.txt")
            print(f.read())

    def test_benchmark(self):

        t = subprocess.run(args=[deno,
                                 "run",
                                 "--policy-file=" + pfile,
                                 "test1.js",
                                 "--bench=true"],
                           stderr=subprocess.DEVNULL)

        t = subprocess.run(args=[deno,
                                 "run",
                                 "--allow-run=tar",
                                 "test1.js",
                                 "--bench=true"],
                           stderr=subprocess.DEVNULL)        
        self.assertTrue(t.returncode==0)


def cmp(a,b):
    return (a > b) - (a < b)

if __name__ == "__main__":

    """
    Configure test policy
    """
    plhld1 = '<PATH_TO_USE_CASE_FOLDER>'
    plhld2 = '<PATH_TO_YOUR_HOME>'
    
    # Create and clean output directory
    Path("output_archives").mkdir(parents=True, exist_ok=True)
    for f in glob('./output_archives/*'):
        try:
            os.remove(f)
            continue
        except:
            pass
        try:
            os.rmdir(f)
        except:
            pass


    data = []

    # read the policy template and resolve placeholders
    with open("./tar.json", "r") as f:
        data = f.read().replace(plhld1, cwd)

    # write the json policy file to the default folder
    with open(pfile, "w") as f:        
        f.write(data)

    # fix 'max_depth' attribute in the json policy
    subprocess.run(args=["dmng", "--fixdepth", pfile.split("/")[-1]])        

    """
    Grant CAP_BPF and CAP_PERFMON to the deno binary
    """
    try :
        subprocess.run(args=["sudo",
                            "setcap",
                            "cap_perfmon,cap_bpf+p",
                            deno])
    except e:
        print("Something went wrong", e)
        sys.Exit(1)
    

    """
    Run the tests
    """
    unittest.defaultTestLoader.sortTestMethodsUsing = lambda x,y : cmp(test_order_map[x], test_order_map[y])
    unittest.main(verbosity=2)
