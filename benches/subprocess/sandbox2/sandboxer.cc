// Copyright 2019 Google LLC
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     https://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

// A generic binary sandboxer.
// Usage: sandbox ARG...

#include <syscall.h>

#include <filesystem>
#include <string>
#include <vector>

#include "absl/flags/flag.h"
#include "absl/flags/parse.h"
#include "absl/log/globals.h"
#include "absl/log/initialize.h"
#include "sandboxed_api/sandbox2/executor.h"
#include "sandboxed_api/sandbox2/policybuilder.h"
#include "sandboxed_api/sandbox2/sandbox2.h"

ABSL_FLAG(std::vector<std::string>, deps, {},
          "comma-separated list of dependencies");

std::unique_ptr<sandbox2::Policy> GetPolicy(std::vector<std::string> paths) {
    if (paths.empty()) {
        return nullptr;
    }

    sandbox2::PolicyBuilder policy_builder = sandbox2::PolicyBuilder();
    
    // Bind mount binary dependencies and path arguments
    policy_builder.AddLibrariesForBinary(paths[0]);
    for (int i = 1; i < paths.size(); i++) {
        const std::filesystem::path path(paths[i]);
        if (std::filesystem::is_directory(path)) {
            policy_builder.AddDirectory(paths[i], /* is_ro = */ false);
        } else {
            policy_builder.AddFile(paths[i], /* is_ro = */ false);
        }
    }

    // Syscall filter
    policy_builder
        .AllowDynamicStartup()
        .AllowAccess()
        .AllowEpoll()
        .AllowExit()
        .AllowFork()
        .AllowGetPIDs()
        .AllowGetIDs()
        .AllowHandleSignals()
        .AllowMmap()
        .AllowOpen()
        .AllowRead()
        .AllowReaddir()
        .AllowSafeFcntl()
        .AllowSleep()
        .AllowSyscalls({
            __NR_arch_prctl,
            __NR_bind,
            __NR_capget,
            __NR_capset,
            __NR_clock_gettime,
            __NR_clone3,
            __NR_connect,
            __NR_dup2,
            __NR_eventfd2,
            __NR_fadvise64,
            __NR_futex,
            __NR_get_mempolicy,
            __NR_getcwd,
            __NR_getpeername,
            __NR_getrandom,
            __NR_getsockname,
            __NR_getsockopt,
            __NR_getxattr,
            __NR_ioctl,
            __NR_kill,
            __NR_lgetxattr,
            __NR_madvise,
            __NR_mremap,
            __NR_pipe,
            __NR_pipe2,
            __NR_poll,
            __NR_prctl,
            __NR_prlimit64,
            __NR_pselect6,
            __NR_recvfrom,
            __NR_recvmsg,
            __NR_rseq,
            __NR_rt_sigtimedwait,
            __NR_sched_setaffinity,
            __NR_sched_getaffinity,
            __NR_select,
            __NR_sendto,
            __NR_sendmsg,
            __NR_sendmmsg,
            __NR_setitimer,
            __NR_setsockopt,
            __NR_setuid,
            __NR_socket,
            __NR_socketpair,
            __NR_statx,
            __NR_sysinfo,
            __NR_times,
        })
        .AllowUnrestrictedNetworking()
        .AllowWrite();

    return policy_builder.BuildOrDie();
}

int main(int argc, char* argv[]) {
    absl::SetStderrThreshold(absl::LogSeverityAtLeast::kInfo);
    absl::InitializeLog();

    std::vector<char*> args = absl::ParseCommandLine(argc, argv);

    if (argc < 2) {
        LOG(ERROR) << "Missing necessary arguments: Usage: " << argv[0] << " ARG...";
        return EXIT_FAILURE;
    }

    // Skip path of the sandbox2 binary
    std::vector<std::string> command_args(std::next(args.begin()), args.end());

    // Retrieve argument paths
    std::vector<std::string> paths;
    for (std::string arg : command_args) {
        int pos = arg.find('/');
        if (pos != -1 && arg.find("https://") == -1) {
            paths.push_back(arg.substr(pos));
        }
    }

    // Add dependency paths
    std::vector<std::string> deps = absl::GetFlag(FLAGS_deps);
    paths.insert(paths.end(), deps.begin(), deps.end());
    
    auto executor = std::make_unique<sandbox2::Executor>(command_args[0], command_args);

    auto policy = GetPolicy(paths);
    if (policy == nullptr) {
        LOG(ERROR) << "Missing binary absolute path";
        return EXIT_FAILURE;
    }

    sandbox2::Sandbox2 s2(std::move(executor), std::move(policy));

    // Let the sandboxee run (synchronously).
    sandbox2::Result result = s2.Run();

    return result.final_status() == sandbox2::Result::OK ? EXIT_SUCCESS
                                                         : EXIT_FAILURE;
}
