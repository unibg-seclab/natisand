#include <errno.h>
#include <stdio.h>
#include <stdlib.h>

void open()
{
   FILE *fptr;

   fptr = fopen("random","r");

   if(fptr == NULL)
   {
      printf("fail with errno: %d\n", errno);
      exit(1);             
   }

   printf("success\n");
   fclose(fptr);
}
