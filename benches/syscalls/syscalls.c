#include <arpa/inet.h> 
#include <errno.h>
#include <fcntl.h>
#include <stdio.h>
#include <stdlib.h>
#include <sys/stat.h>
#include <sys/socket.h>
#include <sys/types.h>
#include <unistd.h>

void open_bench(char* pathname) {
        int fd = open(pathname, O_RDONLY);
        if (fd == -1) {
                printf("Error while opening file: %d", errno);
        }
}

void listen_bench(){
        // TCP socket
        int socket_fd = socket(AF_INET, SOCK_STREAM, 0); 
        
        // Create net address
        struct sockaddr_in localhost_addr = { 0 };
        localhost_addr.sin_family = AF_INET;
        localhost_addr.sin_addr.s_addr = inet_addr("127.0.0.1");
        localhost_addr.sin_port =  htons(8080);
        
        // Bind to localhost::8000
        if ((bind(socket_fd, (struct sockaddr*)&localhost_addr, sizeof(localhost_addr))) != 0) {
                printf("Cannot bind");
        }
        
        // Listen on localhost::8000
        if ((listen(socket_fd, 5)) != 0) {
                printf("Cannot listen");
        }
        
        close(socket_fd);
}

void connect_bench(){
        // TCP socket
        int socket_fd = socket(AF_INET, SOCK_STREAM, 0);

        // Create net address
        struct sockaddr_in localhost_addr = { 0 };
        localhost_addr.sin_family = AF_INET;
        localhost_addr.sin_addr.s_addr = inet_addr("127.0.0.1");
        localhost_addr.sin_port =  htons(8000);
        // Connect to localhost::8000
        if ((connect(socket_fd, (struct sockaddr*)&localhost_addr, sizeof(localhost_addr))) != 0) {
                printf("Cannot connect");
        }
        close(socket_fd);
}

void fifo_bench(char* pathname, char* msg) {
     int res = mkfifo(pathname, 0600);
     if (res != 0) {
        printf("Cannot create pipe %d", errno);
     }
}
