#!/bin/bash
# Creating and removing directories
# mkdir  stands  for  make directory and  rmdir  stands  for remove directory
# you  cannot  use  mkdir  to  create a  directory that  already  exists
# you  cannot  use  rmdir  to  remove a  directory that  does  not  exist  
# you  cannot  use  rmdir  to  remove a  directory that  is  not  empty

#this  is  how  ypu  create  a  filder 
cd Desktop
ls
mkdir  Kingsley_1
ls


#this  is  how  you  create  a  file    
cd Desktop
touch my_file.txt
ls
#this is how you remove a file 
rm my_file.txt
ls
#this is how you remove a directory     
cd Desktop
rmdir Kingsley_1
ls