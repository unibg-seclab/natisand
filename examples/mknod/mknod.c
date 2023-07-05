#include <fcntl.h>
#include <stdio.h>
#include <stdlib.h>
#include <sys/stat.h>

void my_mknod() {
    int result = mknod("random", S_IRUSR | S_IWUSR | S_IFIFO, 0);
    if (result < 0) {
        printf("fail");
        perror("mknod");
        exit(2);
    }
    printf("success");
}
