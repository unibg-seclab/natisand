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
pfile = str(Path(home + "/.cage4denos_profiles/im.json").resolve())

"""
TESTS
All the test should run as expected (exitStatus = 0)
The results can be found in `./' and './output_images/`
"""
class IM_tests(unittest.TestCase):

    capture_output = True

    def test_1_im_works(self):
        print("\n==============")
        print("Normal input for ImageMagick")
        print("==============")
        t = subprocess.run(args=[deno,
                                 "run",
                                 "--policy-file=" + pfile,
                                 "--allow-run=convert",
                                 "--allow-read=./output_images",
                                 "--allow-write=./output_images",
                                 "test1.js"],
                           stdout=subprocess.PIPE)                           
        self.assertTrue(t.returncode==0)

    def test_2_im_exploit(self):
        print("\n==============")
        print("Exploit against Deno for ImageMagick")
        print("==============")
        t = subprocess.run(args=[deno,
                                 "run",
                                 "--policy-file=" + pfile,
                                 "--allow-run=convert",
                                 "--allow-read=./output_images",
                                 "--allow-write=./output_images,exploited.txt",
                                 "test2.js"],
                           stdout=subprocess.PIPE)                           
        self.assertTrue(t.returncode==0)
        with open('exploited.txt', 'r') as f:
            print(f'Contents of exploited.txt:\n{f.read()}')
        os.remove('exploited.txt')
            
    def test_3_deno_sandbox(self):
        print("\n==============")
        print("Exploit blocked by Cage4Deno")
        print("==============")
        t = subprocess.run(args=[deno,
                                 "run",
                                 "--policy-file=" + pfile,
                                 "--allow-run=convert",
                                 "--allow-read=./output_images",
                                 "--allow-write=./output_images,should_not_appear.txt",
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
                                 "-A",
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
    
    try:
        os.remove("exploited.txt")
    except:
        pass

    for f in glob('./output_images/*.png'):
        os.remove(f)

    data = []

    # read the policy template and resolve placeholders    
    with open("./im.json", "r") as f:
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
            IM_tests.capture_output = False
    unittest.main(verbosity=2)
