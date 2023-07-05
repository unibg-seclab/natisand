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
pfile = str(Path(home + "/.cage4denos_profiles/gm.json").resolve())

"""
TESTS
All the test should run as expected (exitStatus = 0)
The results can be found in `./output_images/`
"""
class GM_tests(unittest.TestCase):

    capture_output = True

    def test_1_gm_works(self):
        print("\n==============")
        print("Normal input for GraphicsMagick")
        print("==============")
        t = subprocess.run(args=[deno,
                                 "run",
                                 "--policy-file=" + pfile,
                                 "--allow-run=gm",
                                 "--allow-read=./input_images",
                                 "--allow-write=./output_images",
                                 "test1.js"],
                           stdout=subprocess.PIPE)                           
        self.assertTrue(t.returncode==0)

    def test_2_gm_exploit(self):
        print("\n==============")
        print("Exploit against Deno for GraphicsMagick")
        print("==============")
        
        t = subprocess.run(args=[deno,
                                 "run",
                                 "--policy-file=" + pfile,
                                 "--allow-run=gm",
                                 "--allow-read=./input_images",
                                 "--allow-write=./output_images",
                                 "test2.js"],
                           stdout=subprocess.PIPE)
        self.assertTrue(t.returncode==0)
        
        with open("output_images/vulnerable_out.jpeg", "rb") as f:
            print("First 150 Bytes of vulnerable_out.jpeg:")
            print(f.read(150))

    def test_3_deno_sandbox(self):
        print("\n==============")
        print("Exploit blocked by Cage4Deno")
        print("==============")
        t = subprocess.run(args=[deno,
                                 "run",
                                 "--policy-file=" + pfile,
                                 "--allow-run=gm",
                                 "--allow-read=./input_images",
                                 "--allow-write=./output_images",
                                 "test3.js"],
                           stdout=subprocess.PIPE)                        
        self.assertTrue(t.returncode==0)

    def test_4_benchmark(self):
        
        t = subprocess.run(args=[deno,
                                 "run",
                                 "--policy-file=" + pfile,
                                 "test1.js",
                                 "--bench=true"],
                           stderr=subprocess.DEVNULL)

        t = subprocess.run(args=[deno,
                                 "run",
                                 "--allow-run=gm",
                                 "test1.js",
                                 "--bench=true"],
                           stderr=subprocess.DEVNULL)
        self.assertTrue(t.returncode==0)
    
    
if __name__ == "__main__":

    """
    Configure test policy
    """
    plhld1 = '<PATH_TO_USE_CASE_FOLDER>'
    plhld2 = '<PATH_TO_YOUR_HOME>'
    
    for f in glob('./output_images/*.jpeg'):
        os.remove(f)

    data = []

    # read the policy template and resolve placeholders    
    with open("./gm.json", "r") as f:
        data = f.read().replace(plhld1, cwd).replace(plhld2, home)

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
    if len(sys.argv) > 1:
        if sys.argv[1] == '-v' or sys.argv[1] == '--verbose':
            GM_tests.capture_output = False
    unittest.main(verbosity=2)
