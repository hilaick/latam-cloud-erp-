# sms-faq-pdf.pdf

Extracted from: docs/pdf-resources-kit/sms-faq-pdf.pdf
Pages: 242

--- Page 1 ---
Server Migration Service
FAQs
Issue 70
Date 2025-11-05
HUAWEI CLOUD COMPUTING TECHNOLOGIES CO., LTD.

--- Page 2 ---
 
 
Copyright © Huawei Cloud Computing Technologies Co., Ltd. 2025. All rights reserved.
No part of this document may be reproduced or transmitted in any form or by any means without prior
written consent of Huawei Cloud Computing Technologies Co., Ltd.
 
Trademarks and Permissions
 and other Huawei trademarks are the property of Huawei Technologies Co., Ltd.
All other trademarks and trade names mentioned in this document are the property of their respective
holders.
 
Notice
The purchased products, services and features are stipulated by the contract made between Huawei
Cloud and the customer. All or part of the products, services and features described in this document may
not be within the purchase scope or the usage scope. Unless otherwise specified in the contract, all
statements, information, and recommendations in this document are provided "AS IS" without
warranties, guarantees or representations of any kind, either express or implied.
The information in this document is subject to change without notice. Every effort has been made in the
preparation of this document to ensure accuracy of the contents, but all statements, information, and
recommendations in this document do not constitute a warranty of any kind, express or implied.
  
 
 
 
 
 
Issue 70 (2025-11-05) Copyright © Huawei Cloud Computing Technologies Co., Ltd. i

--- Page 3 ---
Contents
1 Question Summary................................................................................................................. 1
2 Product Consultation..............................................................................................................4
2.1 Can I Migrate ECSs from Huawei Cloud to On-Premises Environments or Other Clouds Using SMS?
.............................................................................................................................................................................................................. 4
2.2 Can I Ask Huawei Cloud Technical Support to Help Me Migrate Services?........................................................4
2.3 Does SMS Support Resumable Data Transfer?............................................................................................................. 4
2.4 How Do I Migrate an ECS from One Account to Another?...................................................................................... 5
2.5 How Do I Migrate an ECS from One Region to Another Using SMS?..................................................................5
2.6 How Do I Migrate a Linux Source Server as a Non-root User?.............................................................................. 6
2.7 How Do I Create an ECS?..................................................................................................................................................... 7
2.8 What Is Block-Level Migration?..........................................................................................................................................8
2.9 What are Valid Data Blocks?...............................................................................................................................................8
2.10 How Does Migration Using SMS Differ from Migration Using IMS?..................................................................8
2.11 Why Is the OS Name of the Target ECS Displayed on the ECS Console Different from That of the
Source Server?................................................................................................................................................................................. 9
2.12 How Do I Determine Whether a Migration Is Complete?....................................................................................10
2.13 How Does SMS Differ from IMS in the Migration Scenario?..............................................................................10
2.14 What Are the Snapshots of a Target Server Used for?..........................................................................................11
2.15 How Many Source Resources Will Be Used for a Linux Block-Level Migration?..........................................12
2.16 Do I Need to Activate the Windows OS and Paid Software After the Migration Is Complete?............. 13
2.17 Which Directories Are Not Synchronized by Default During Incremental Synchronization on a Linux
Server?............................................................................................................................................................................................. 13
2.18 Why Can't the Create new Option Be Selected When I Configure a Migration Task for a Windows
Source Server?............................................................................................................................................................................... 14
3 Billing....................................................................................................................................... 15
3.1 Billing........................................................................................................................................................................................ 15
4 OS Compatibility and Migration Restrictions................................................................ 17
4.1 What Are the Constraints on and What OSs Are Supported by SMS?...............................................................17
4.2 What Are the Important Statements of SMS?............................................................................................................36
4.3 How Many Servers Can I Migrate Concurrently Using SMS?................................................................................ 39
4.4 How Do I Check the Firmware Type of a Source Server?....................................................................................... 39
4.5 Why Do I Need to Install Additional Components Before Migrating Amazon Linux 2023?.......................39
Server Migration Service
FAQs Contents
Issue 70 (2025-11-05) Copyright © Huawei Cloud Computing Technologies Co., Ltd. ii

--- Page 4 ---
4.6 What Should I Consider and Prepare Before Migrating a Server Running Red Hat Enterprise Linux
CoreOS?........................................................................................................................................................................................... 40
5 Source Servers........................................................................................................................ 42
5.1 Can I Migrate Servers from Other Clouds to Huawei Cloud?............................................................................... 42
5.2 Will My Services on the Source Server Be Interrupted During Migration?.......................................................42
5.3 What Information Does SMS Collect About Source Servers?................................................................................42
5.4 Can I Migrate Only Some Workloads from a Source Server?............................................................................... 45
5.5 Can I Migrate a Source Server If There Is No Matching Image Available on Huawei Cloud?...................45
5.6 Can I Use SMS to Migrate Self-built Databases, Big Data Services, or Websites Deployed on a Source
Server?............................................................................................................................................................................................. 45
5.7 Does Using a Non-default SSH Port on the Source Server Affect the Migration?.........................................45
6 Agent Installation and Startup..........................................................................................46
6.1 How Do I Download the SMS-Agent for Windows and the SHA256 Verification File?...............................46
6.2 How Do I Download and Install the Agent on Source Servers?...........................................................................47
6.3 What Can I Do If I Fail to Download the Agent Installation File?.......................................................................51
6.4 How Do I Verify the Integrity of the Agent Installation File?............................................................................... 51
6.5 Why Wasn't My Source Server Added to the SMS Console After I Configured the Agent?....................... 52
6.6 How Do I Configure Certificate Verification in the SMS-Agent Configuration File?..................................... 52
6.7 Where Can I Find the Agent Run Logs?........................................................................................................................ 53
6.8 How Do I Resolve Error "SMS.5109 The application cannot be started due to incorrect parallel
configuration" When I Start the Agent? .............................................................................................................................54
6.9 Why Does the Agent Not Start the First Time I Launch It?................................................................................... 54
6.10 Why Does the Windows Agent Executable Not Run When I Double-Click It?............................................. 54
6.11 How Do I Fix Error "INTERNAL ERROR: cannot create temporary directory!" When I Start the Agent?
............................................................................................................................................................................................................ 55
6.12 How Do I Troubleshoot Failures of Pasting the AK/SK Pair When I Start the SMS-Agent (Python 2)
on Windows Server 2008?........................................................................................................................................................ 55
6.13 How Do I Resolve Error "utf-8 codec can't decode byte 0xce in position0: invalid continuation byte"
When I Start the Agent?............................................................................................................................................................56
6.14 How Do I Restart the Agent?......................................................................................................................................... 57
6.15 How Do I Fix Agent Startup Failures Due to Insufficient Space in /tmp on a Linux Source Server?.... 57
6.16 How Do I Fix Error "Failed to start sms agent! disks" When I Start the Agent on a Linux Source
Server?............................................................................................................................................................................................. 58
6.17 How Do I Fix Error "Failed to obtain information about disk %s" When I Start the Agent on a Linux
Source Server?............................................................................................................................................................................... 59
6.18 How Do I Choose When the System Asks Whether to Disable the Google Services Detected on My
Source Server on Google Cloud?............................................................................................................................................ 60
6.19 What Do I Do If a Source Server's Name I Modified on the SMS Console Is Overwritten After the
SMS-Agent Is Restarted?........................................................................................................................................................... 61
6.20 How Do I Fix the Error "DLL load failed" When I Try to Start the SMS-Agent on a Windows Source
Server?............................................................................................................................................................................................. 62
7 Target Server Consultation................................................................................................. 64
7.1 Can I Migrate Workloads to FlexusL and FlexusX Instances, DeHs, DeCs, Kunpeng ECSs, or BMSs Using
SMS?................................................................................................................................................................................................. 64
Server Migration Service
FAQs Contents
Issue 70 (2025-11-05) Copyright © Huawei Cloud Computing Technologies Co., Ltd. iii

--- Page 5 ---
7.2 What ECS Types Are Supported by SMS?..................................................................................................................... 64
7.3 What Are the Differences Between Target and Source Servers After the Migration?..................................65
7.4 What Determines the Specifications of a Target Server?....................................................................................... 70
7.5 How Will the Authentication of a Target Server Change After the Migration?..............................................71
7.6 Why Is the File System Size Inconsistent Before and After the Migration?..................................................... 71
7.7 Will an Incremental Synchronization Overwrite Existing Data on a Launched Target Server?.................72
7.8 How Do I Create a Target Server That Meets the SMS Requirements?.............................................................73
7.9 Why Can't I See Data Disks on a Windows Target Server After the Migration Is Complete?................... 74
7.10 Why Are the Agent Plug-ins from the Source Cloud Service Provider Retained on the Target Server
After the Migration Is Complete?...........................................................................................................................................77
7.11 After the Migration Is Complete, Will Deleting the Target Server Configuration or Server Record
Affect the Source or Target Server?.......................................................................................................................................78
7.12 If I Change the Password of the Source Server and Perform an Incremental Synchronization After the
Full Migration Is Complete, Will the New Password Be Synchronized to the Target Server?...........................78
7.13 Why Is My Target Server Locked During the Migration?......................................................................................79
7.14 How Do I Unlock a Target Server Manually?........................................................................................................... 79
8 Target Server Configuration............................................................................................... 81
8.1 How Do I Select a Target Server?................................................................................................................................... 81
8.2 How Do I Configure Data Compression for a Linux Block-Level Migration?................................................... 81
8.3 How Do I Limit Resource Allocation for the Agent in a Linux Migration?....................................................... 83
8.4 How Do I Set the Number of Concurrent Processes for a Linux File-Level Migration?............................... 86
8.5 How Do I Fix Error "SMS.0601 ECS creation failed?"............................................................................................... 87
8.6 Why Can't I Save the Migration Configuration as a Template?........................................................................... 88
8.7 How Do I Resolve Error "Inconsistent firmware type. Source: UEFI, Target: BIOS" When I Create a
Migration Task?............................................................................................................................................................................ 88
8.8 How Do I Uninstall VMware Tools from the Target Server After Migration?..................................................90
9 Target Server Launch............................................................................................................92
9.1 How Do I Optimize a Windows Target Server After the Migration Is Complete?......................................... 92
9.2 After a Windows Server Is Migrated, Why Is the Used Space of C: Drive Increased?...................................93
9.3 How Do I Uninstall the SMS-Agent from the Source and Target Servers After the Migration Is
Complete?.......................................................................................................................................................................................95
9.4 Why Can't a Windows Target Server Access the Internet After the Migration Is Complete?.................... 95
9.5 Why Is the System Recovery Options Window Displayed When the Target Server Is Started?................96
9.6 How Do I Fix a GRUB Error Because an XFS Volume Is Mounted to the /boot Partition?..........................97
9.7 How Do I Troubleshoot a MySQL Startup Failure on the Target Server After the Migration?..................99
9.8 How Do I Resolve Error "SELinux targeted" When I Start a Linux Target Server After the Migration Is
Complete?.......................................................................................................................................................................................99
9.9 Why Is the Usable Memory (RAM) Less Than the Total Installed Memory on a Target Server Running
64-bit Windows?........................................................................................................................................................................ 100
9.10 How Do I Fix BSOD Errors When I Start a Windows Target Server After the Migration?......................101
9.11 How Do I Fix Startup Failures of a Windows Target Server After the Migration?.................................... 102
9.12 What Configuration Items Do I Need to Modify for the Target Server After the Migration Is
Complete?.................................................................................................................................................................................... 103
Server Migration Service
FAQs Contents
Issue 70 (2025-11-05) Copyright © Huawei Cloud Computing Technologies Co., Ltd. iv

--- Page 6 ---
10 Data Consistency...............................................................................................................105
10.1 Can the Target Server Run a Different Type of OS from the Source Server?............................................. 105
10.2 How Do I Verify Data Consistency Between the Source and Target Servers?............................................ 105
10.3 How Do I Display the OS Name of a Target Server on the ECS Console?...................................................110
10.4 Why Is Consistency Verification Not Supported for Red Hat Enterprise Linux CoreOS?........................ 113
11 Credentials..........................................................................................................................114
11.1 How Do I Obtain an AK/SK Pair for a Huawei Cloud Account?...................................................................... 114
11.2 How Do I Obtain an AK/SK Pair for an IAM User?.............................................................................................. 114
11.3 Can I Use an AK/SK Pair of a Federated User (Virtual IAM User) for Authentication During the SMS-
Agent Startup?............................................................................................................................................................................115
11.4 How Do I Obtain the SMS Domain Name Required for Starting the SMS-Agent?..................................115
11.5 Can I Use a Temporary AK/SK Pair for Migration?...............................................................................................117
12 Migration Network...........................................................................................................118
12.1 How Do I Set Up a Secure Migration Network for Using SMS?......................................................................118
12.2 What Are the Network Requirements for Existing Target Servers?................................................................120
12.3 How Do I Configure Security Group Rules for Target Servers?........................................................................121
12.4 How Do I Restore the Connection Between the Agent and SMS?................................................................. 122
12.5 Why the Migration Progress Is Suspended or Slow?........................................................................................... 126
12.6 Does a Source Server Need Internet Access If It Can Communicates with the Target Server Through a
Direct Connect, VPN, or VPC Peering Connection?........................................................................................................127
12.7 How Do I Configure a Source Server to Access Huawei Cloud Through a Proxy?....................................128
12.8 Can I Release or Change the Target Server EIP During the Migration?........................................................131
12.9 How Do I Measure the Network Performance Before the Migration?..........................................................131
12.10 Can I Set a Rate Limit for a Migration?.................................................................................................................133
12.11 How Do I Configure Automatic Recovery?........................................................................................................... 133
13 Migration Duration.......................................................................................................... 135
13.1 How Long Does a Migration Take?........................................................................................................................... 135
13.2 How Do I View the Remaining Migration Time?.................................................................................................. 138
13.3 How Is the Migration Rate Displayed on the SMS Console Calculated?......................................................139
13.4 How Do I Speed Up Migration?.................................................................................................................................. 142
13.5 Why Does the Migration Speed Fluctuate?............................................................................................................ 142
13.6 How Do I Test the Network Bandwidth Between the Source and Target Servers Using iPerf?........... 142
13.7 Why Isn't the Increased Bandwidth Being Used During the Migration?...................................................... 145
13.8 Is the Migration Speed Determined by the Source Bandwidth or the Target Bandwidth?....................146
13.9 Why Does the Migration Stay at a Stage for a Long Time?............................................................................. 146
13.10 What Factors Affect the Migration Speed?.......................................................................................................... 147
13.11 Why Is the Linux Block-Level Migration Very Slow?......................................................................................... 149
14 Disk Management............................................................................................................ 150
14.1 Why Was a 40-GB EVS Disk Added to the Target Server During the Migration?..................................... 150
14.2 Why Can't I Attach the Original System Disk Back to a Target Server?.......................................................150
14.3 How Do I Resize Partitions and Disks When I Migrate a Windows Source Server?................................. 152
Server Migration Service
FAQs Contents
Issue 70 (2025-11-05) Copyright © Huawei Cloud Computing Technologies Co., Ltd. v

--- Page 7 ---
14.4 How Do I Shrink the Disk Partitions on a Windows Source Server?..............................................................154
14.5 How Do I Exclude a Partition from Migration in Windows?.............................................................................156
14.6 How Do I Resolve Error "Target server has fewer disks than source server. Select another target
server" When I Configure the Target Server?.................................................................................................................. 156
14.7 What Are the Disk Requirements for Source and Target Servers?................................................................. 157
14.8 How Can I Migrate a Source Server with a Large System Disk?.....................................................................158
14.9 How Do I Resolve Error "Some disks on the target server are smaller than those on the source
server. Select another target server" When I Configure the Target Server?......................................................... 159
14.10 Can SMS Migrate Local Disks on a Source Server?........................................................................................... 160
14.11 When I Migrate a Windows Source Server from Alibaba Cloud, Why Do I Need to Choose a Target
Disk at Least 1 GB Larger than the Paired GPT Source Disk?....................................................................................160
14.12 Why Can't I Specify Whether to Migrate a Physical Volume When I Resize Disk Partitions in Linux?
......................................................................................................................................................................................................... 160
14.13 Why Can't I Specify Whether to Migrate a Logical Volume When I Resize Disk Partitions in Linux?
......................................................................................................................................................................................................... 162
14.14 What Are the Rules for Resizing Volume Groups, Disks, and Partitions?.................................................. 163
14.15 How Do I Migrate a Server with a System Disk Larger Than 1 TB?............................................................164
14.16 How Do I Manually Detach the Temporary System Disk from My Target Server and Re-attach the
Original System Disk?.............................................................................................................................................................. 165
14.17 Why Is the Amount of Migrated Data Less Than the Total Amount of Data to Be Migrated After the
Migration Is Complete?........................................................................................................................................................... 167
14.18 How Do I Detach the Temporary System Disk from My Target Server and Re-attach the Original
System Disk using SMS-Agent?............................................................................................................................................ 169
14.19 What Do I Do If Some Disks Are Not Attached to the Target Server After the Migration Is
Complete?.................................................................................................................................................................................... 171
15 Migration or Synchronization Failures........................................................................ 172
15.1 After the Migration Is Complete, How Do I Replicate Any New Data from the Source Server to the
Target Server?............................................................................................................................................................................. 172
15.2 What Do I Do If the SMS-Agent Exits Suddenly and Disconnects a Windows Source Server from the
SMS Console During a Migration?.......................................................................................................................................172
15.3 How Do I Fix Error SMS.3805 When a Migration Drill Fails?........................................................................... 176
16 Error Codes and Solutions...............................................................................................178
16.1 SMS.0202 AK/SK Authentication Failed. Ensure that the AK and SK Are Correct..................................... 178
16.2 SMS.0203 Connection from Source Server to API Gateway Timed Out....................................................... 179
16.3 SMS.0204 Insufficient Permissions. Obtain the Required Fine-grained Permissions................................181
16.4 SMS.0205 Incorrect System Time or Time Zone on Source Server.................................................................181
16.5 SMS.0206 Only x86 Servers Can Be Migrated....................................................................................................... 182
16.6 SMS.0208 Failed to Send Your Service Statement Confirmation to SMS.....................................................182
16.7 SMS.0210 Failed to Create File on Target Server..................................................................................................183
16.8 SMS.0212 Agent Restarted........................................................................................................................................... 183
16.9 SMS.0219 Failed to Obtain Temporary Credential from Configuration File................................................184
16.10 SMS.0303 Unable to Access Domain Name.........................................................................................................185
16.11 SMS.0304 SSL/TLS Authentication Failed..............................................................................................................186
16.12 SMS.0410 Failed to Obtain NIC Information....................................................................................................... 187
Server Migration Service
FAQs Contents
Issue 70 (2025-11-05) Copyright © Huawei Cloud Computing Technologies Co., Ltd. vi

--- Page 8 ---
16.13 SMS.0412 Target Server Does Not Exist................................................................................................................ 189
16.14 SMS.0515 Migration Failed. Source Disk Information Has Changed. Delete Target Server
Configuration and Restart the Agent................................................................................................................................. 190
16.15 SMS.0609 An Older Version of Agent Is Detected. Please Exit the Current Program, Uninstall the
Old Agent Completely, and Install the Newest One..................................................................................................... 191
16.16 SMS.0805 Failed to Migrate Partition to Target Server....................................................................................191
16.17 SMS.0806 Failed to Synchronize Partition to Target Server............................................................................192
16.18 SMS.0807 Network Error Between Source and Target Servers..................................................................... 192
16.19 SMS.1104 Failed to Detach Disk xx.........................................................................................................................194
16.20 SMS.1113 Failed to Reconfigure Partition Details on the Target Server....................................................194
16.21 SMS.1105 Disk Creation Failed................................................................................................................................. 195
16.22 SMS.1106 Failed to Delete Disk XX......................................................................................................................... 195
16.23 SMS.1204 Failed to Create File on Source Server...............................................................................................196
16.24 SMS.1205 Failed to Load WMI..................................................................................................................................196
16.25 SMS.1351: Mount Point /xxx Detected on the Source Server, Which Has No Free Space. Ensure that
There Is at Least 1 MB of Space...........................................................................................................................................198
16.26 SMS.1352: Unknown Physical Volumes Detected on the Source Server....................................................198
16.27 SMS.1353: Bind Mount or Repeated Mount Detected on /xxx of the Source Server............................ 199
16.28 SMS.1402 SSH Client Not Installed......................................................................................................................... 203
16.29 SMS.1414 The Migration Module Stopped Abnormally and Cannot Synchronize Data.......................203
16.30 SMS.1807 Failed to Connect to the Target Server. Check Whether Its IP Address Is Reachable and
Confirm that Port 8900 Is Enabled...................................................................................................................................... 204
16.31 SMS.1901 Agent Could Not Read Disk Information..........................................................................................205
16.32 SMS.1902 Failed to Start the I/O Monitoring Module..................................................................................... 206
16.33 SMS.1904 Failed to Create a Snapshot for the Windows Server.................................................................. 208
16.34 SMS.2802 Failed to Connect to the Target Server. Check Whether Its IP Address Is Reachable and
Port 8899 Is Enabled.................................................................................................................................................................209
16.35 SMS.3102 Failed to Modify the initrd File on the Target Server...................................................................210
16.36 SMS.3205 Failed to Mount Partition XXX to Directory XXX............................................................................211
16.37 SMS.3802 Failed to Establish an SSH Connection with the Target Server................................................ 212
16.38 SMS.3803 The Connection to the Port 22 of Target Server Failed Because an Error Occurred During
the Public Key Verification on the Target Server............................................................................................................ 212
16.39 SMS.3804 The Connection to the Port 22 of Target Server Failed Due to Invalid Connection
Credential..................................................................................................................................................................................... 213
16.40 SMS.3805 The Connection to the Port 22 of Target Server Timed Out..................................................... 214
16.41 SMS.3806 The Connection to the Port 22 of Target Server Was Rejected................................................ 214
16.42 SMS.5102 Agent Startup Failed Because the noexec Permission Is Unavailable on /tmp in Linux..215
16.43 SMS.5105 Agent Startup Failed. Insufficient Permissions to Add Files to or Delete Files from xxx. 216
16.44 SMS.5108 Failed to Execute df -TH.........................................................................................................................216
16.45 SMS.5112: Agent Main Program linuxmain Could Not Run...........................................................................217
16.46 SMS.5113 Check %s on Linux Timed Out.............................................................................................................217
16.47 SMS.6303 The Installed Agent Is of an Earlier Version. Download the Latest Version.........................218
16.48 SMS.6509 Incompatible File System of the Source Server..............................................................................218
16.49 SMS.6511 The Source Server Lacks Driver Files..................................................................................................219
Server Migration Service
FAQs Contents
Issue 70 (2025-11-05) Copyright © Huawei Cloud Computing Technologies Co., Ltd. vii

--- Page 9 ---
16.50 SMS.6517 rsync Not Installed on the Source Server......................................................................................... 220
16.51 SMS.6526 Insufficient Quota..................................................................................................................................... 224
16.52 SMS.6528 Complete Real-name Authentication to Invoke SMS APIs.........................................................225
16.53 SMS.6533 VSS Not Installed on the Source Server............................................................................................ 225
16.54 SMS.6537 SMS Cannot Migrate System Disks Larger Than 1 TB................................................................. 228
16.55 SMS.6564 Component i386-pc Not Found on Source Server. For Solution, See SMS API Reference
......................................................................................................................................................................................................... 229
16.56 SMS.6563 File initrd or initramfs of the xxxx Version Not Found Under /boot Directory. For solution,
see SMS API Reference............................................................................................................................................................ 230
16.57 SMS.6616 The Current OS Does Not Support Block-level Migration/SMS.6617 The Current Kernel
Version Does Not Support Block-level Migration........................................................................................................... 232
16.58 SMS.9007 Migration Task Paused. Rate Limit Not Applied. Rate Exceeded Limit Multiple Times....233
Server Migration Service
FAQs Contents
Issue 70 (2025-11-05) Copyright © Huawei Cloud Computing Technologies Co., Ltd. viii

--- Page 10 ---
1 Question Summary
Product Consultation
● Can I Migrate Servers from Other Clouds to Huawei Cloud?
● Can I Ask Huawei Cloud Technical Support to Help Me Migrate Services?
● How Do I Migrate an ECS from One Account to Another?
● How Do I Migrate an ECS from One Region to Another Using SMS?
● Can I Migrate Workloads to FlexusL and FlexusX Instances, DeHs, DeCs,
Kunpeng ECSs, or BMSs Using SMS?
● Can I Migrate ECSs from Huawei Cloud to On-Premises Environments or
Other Clouds Using SMS?
● How Do I Obtain an AK/SK Pair for a Huawei Cloud Account?
● How Do I Obtain an AK/SK Pair for an IAM User?
● Does SMS Support Resumable Data Transfer?
● How Do I Display the OS Name of a Target Server on the ECS Console?
● How Do I Create a Target Server That Meets the SMS Requirements?
● Can I Use SMS to Migrate Self-built Databases, Big Data Services, or
Websites Deployed on a Source Server?
● How Do I Obtain the SMS Domain Name Required for Starting the SMS-
Agent?
● Do I Need to Activate the Windows OS and Paid Software After the
Migration Is Complete?
Billing
How Is SMS Billed?
OS Compatibility and Migration Restrictions
● What Are the Constraints on and What OSs Are Supported by SMS?
● How Do I Resolve Error "Inconsistent firmware type. Source: UEFI, Target:
BIOS" When I Create a Migration Task?
Server Migration Service
FAQs 1 Question Summary
Issue 70 (2025-11-05) Copyright © Huawei Cloud Computing Technologies Co., Ltd. 1

--- Page 11 ---
Migration Network
● SMS.3802 Failed to Establish an SSH Connection with the Target Server
● SMS.1807 Failed to Connect to the Target Server. Check Whether Its IP
Address Is Reachable and Confirm that Port 8900 Is Enabled
● SMS.0203 Connection from Source Server to API Gateway Timed Out
● How Do I Restore the Connection Between the Agent and SMS?
● Why the Migration Progress Is Suspended or Slow?
● How Do I Set Up a Secure Migration Network for Using SMS?
● What Are the Network Requirements for Existing Target Servers?
● How Do I Configure Security Group Rules for Target Servers?
Known Errors and Solutions
● SMS.0202 AK/SK Authentication Failed. Ensure that the AK and SK Are
Correct
● SMS.0203 Connection from Source Server to API Gateway Timed Out
● SMS.0204 Insufficient Permissions. Obtain the Required Fine-grained
Permissions
● SMS.3802 Failed to Establish an SSH Connection with the Target Server
● SMS.6517 rsync Not Installed on the Source Server
● 4.10.42 SMS.6563 File initrd or initramfs of the xxxx Version Not Found
Under /boot Directory. For solution, see SMS API Reference.
Agent Installation and Startup
● How Do I Download and Install the Agent on Source Servers?
● Why Is My Target Server Locked During the Migration?
● How Do I Unlock a Target Server Manually?
● Why Does the Agent Not Start the First Time I Launch It?
● SMS.1902 Failed to Start the I/O Monitoring Module
● How Do I Resolve Error "utf-8 codec can't decode byte 0xce in position0:
invalid continuation byte" When I Start the Agent?
Disk Management
● Why Was a 40-GB EVS Disk Added to the Target Server During the
Migration?
● How Do I Resize Partitions and Disks When I Migrate a Windows Source
Server?
● How Do I Shrink the Disk Partitions on a Windows Source Server?
● How Do I Resolve Error "Some disks on the target server are smaller than
those on the source server. Select another target server" When I
Configure the Target Server?
● How Do I Resolve Error "Target server has fewer disks than source server.
Select another target server" When I Configure the Target Server?
Server Migration Service
FAQs 1 Question Summary
Issue 70 (2025-11-05) Copyright © Huawei Cloud Computing Technologies Co., Ltd. 2

--- Page 12 ---
Migration or Synchronization Failures
● After the Migration Is Complete, How Do I Replicate Any New Data from
the Source Server to the Target Server?
● What Do I Do If the SMS-Agent Exits Suddenly and Disconnects a
Windows Source Server from the SMS Console During a Migration?
Target Server Configuration and Launch
● What Are the Differences Between Target and Source Servers After the
Migration?
● How Will the Authentication of a Target Server Change After the
Migration?
● After a Windows Server Is Migrated, Why Is the Used Space of C: Drive
Increased?
● Why Is the File System Size Inconsistent Before and After the Migration?
● Why Can't I See Data Disks on a Windows Target Server After the
Migration Is Complete?
● After the Migration Is Complete, Will Deleting the Target Server
Configuration or Server Record Affect the Source or Target Server?
● If I Change the Password of the Source Server and Perform an
Incremental Synchronization After the Full Migration Is Complete, Will
the New Password Be Synchronized to the Target Server?
Server Migration Service
FAQs 1 Question Summary
Issue 70 (2025-11-05) Copyright © Huawei Cloud Computing Technologies Co., Ltd. 3

--- Page 13 ---
2 Product Consultation
2.1 Can I Migrate ECSs from Huawei Cloud to On-
Premises Environments or Other Clouds Using SMS?
No, but you can create images for your ECSs, export the images, and download
them to a local PC or transfer them to other clouds. For details, see Exporting
Images.
2.2 Can I Ask Huawei Cloud Technical Support to Help
Me Migrate Services?
We do not directly migrate your services. To learn how to use SMS for the
migration, see SMS Documentation.
If you need professional migration solutions and tools, Cloud Migration Service
on Huawei Cloud is available for you. It helps you smoothly and quickly migrate
services and makes you stay focused on service development.
2.3 Does SMS Support Resumable Data Transfer?
Yes. Data transfer can be resumed if:
● The transfer is interrupted because the source server is disconnected from
SMS due to network problems or other reasons. In this case, you do not need
to worry about data loss or migration failure. All you need to do is restore the
connection and restart the migration using the Start button on the SMS
console. For details about how to restore the connection, see How Do I
Restore the Connection Between the Agent and SMS?
● You are performing a Linux file-level migration, but the transfer is interrupted
because the source server is disconnected from SMS after the Agent or the
source server is restarted. You need to click Start on the SMS console to
continue the unfinished migration task. If you are performing a Windows or
Linux block-level migration, the data transfer cannot be resumed, and you
Server Migration Service
FAQs 2 Product Consultation
Issue 70 (2025-11-05) Copyright © Huawei Cloud Computing Technologies Co., Ltd. 4

--- Page 14 ---
need to delete the migration task and create a new one to migrate all data
again.
2.4 How Do I Migrate an ECS from One Account to
Another?
To migrate an ECS from one account to another, perform the following operations:
1. Install the Agent on the ECS under the original account, but when starting the
Agent, enter the AK/SK pair of the destination account. To learn how to install
the SMS-Agent, see Installing the SMS-Agent on Windows or Installing the
SMS-Agent on Linux.
2. Sign in to the console using the destination account, configure the target
server, start the replication, and launch the target server.
NO TE
You can also migrate ECSs across regions. For details, see How Do I Migrate an ECS from
One Region to Another Using SMS?
2.5 How Do I Migrate an ECS from One Region to
Another Using SMS?
The figure below illustrates how to migrate ECSs from one region to another.
Figure 2-1 Migration process
Server Migration Service
FAQs 2 Product Consultation
Issue 70 (2025-11-05) Copyright © Huawei Cloud Computing Technologies Co., Ltd. 5

--- Page 15 ---
Table 2-1 Migration procedure
Step Description
Make
preparations.
Before using SMS to migrate servers, you need to prepare
and configure accounts, permissions, and source and target
servers.
Install the Agent
on source
servers.
Install the Agent on the source ECSs in the region you are
migrating from.
● Installing the Windows Agent
● Installing the Linux Agent
.
Configure
target servers.
.
After the SMS-Agent is installed and started, configure target
servers in the target region on the SMS console.
.
Start a full
replication.
.
After the target servers are configured, start the migration
tasks to migrate applications and data from the source
servers to the target servers.
.
Launch the
target servers.
.
After the full data migration is complete, launch the target
servers to verify services.
Synchronize
incremental
data.
After the target servers are launched, if there are data
changes on your source servers, you can synchronize the
incremental data to the target servers.
 
2.6 How Do I Migrate a Linux Source Server as a Non-
root User?
Scenarios
If you must use a non-root user account to perform the migration, ensure that the
user has the required permissions.
Procedure
Step 1 For a hypothetical user, test, check whether the user is included in /etc/passwd. If
it is not, run the two commands below to add the user and set a password for it.
If it is, confirm that user test has a /home directory. If the user does not have a
home directory, add one.
useradd -m test
passwd test
Server Migration Service
FAQs 2 Product Consultation
Issue 70 (2025-11-05) Copyright © Huawei Cloud Computing Technologies Co., Ltd. 6

--- Page 16 ---
Step 2 Modify the /etc/sudoers file to configure permissions.
1. Add the following information to the end of the /etc/sudoers file based on
the OS distribution:
– Debian and Ubuntu
test    ALL=(ALL:ALL)    ALL
test    ALL=(ALL:ALL)   NOPASSWD:ALL
– Other distributions
test    ALL=(ALL)    ALL
test    ALL=(ALL)   NOPASSWD:ALL
2. If Defaults requiretty is in the /etc/sudoers file, comment it out.
CA UTION
These modifications to the sudoers file enable the user to execute
administrator-level commands without entering a password. After the
migration is completed, you need to undo the modifications, or an exception
occurs.
Step 3 Switch to the regular account (test in this example) and run the following
command to start the Agent:
sudo ./startup.sh
----End
2.7 How Do I Create an ECS?
Scenarios
Source servers can be migrated to ECSs on Huawei Cloud. You can prepare one or
more ECSs as target servers on Huawei Cloud before the migration.
Procedure
Step 1 Sign in to the console.
Step 2 Click 
  in the upper left corner and select the desired region and project.
Step 3 Click Service List and choose Compute > Elastic Cloud Server.
The Elastic Cloud Server page is displayed.
Step 4 Click Buy ECS and configure basic parameters.
For more information, see Purchasing an ECS.
NO TE
● A target server running Windows must have at least 2 GB of memory.
● A target server must run the same type of OS as the source server.
● A target server must have at least as many disks as the source server, and each disk on
the target server must be at least as large as the paired source disk.
Server Migration Service
FAQs 2 Product Consultation
Issue 70 (2025-11-05) Copyright © Huawei Cloud Computing Technologies Co., Ltd. 7

--- Page 17 ---
Step 5 Click Next.
After the ECS is purchased, it will be displayed in the ECS list.
----End
2.8 What Is Block-Level Migration?
What is a block?
In block-level migrations, a block refers to a disk block. A disk block is the
minimum logical unit for file systems to manage disk partitions. Disk blocks are
similar to clusters in Windows. A block is also the minimum logic unit of disks
used by OSs and software. The smallest unit for disk read or write is a sector. A
sector is a physical area on a disk. The read and write operations to disk blocks are
performed in sectors. Generally, a file is stored in several blocks, and one block
maps to several physical sectors.
What is a block-level migration?
In block-level migrations, file systems are migrated by blocks. If the network is
interrupted before the migration is complete, only impacted blocks need to be
migrated again after the network recovers. If files are modified during the
migration, only modified blocks need to be synchronized.
In file-level migrations, various tools like TAR are used for remote replication over
SSH or other transmission protocols. If a file is modified during decompression or
the network is interrupted before the migration is complete, the migration will fail.
In addition, if a file is modified during the migration, the entire file needs to be
synchronized. It means that all the blocks of the file must be synchronized. So, the
synchronization efficiency is low.
2.9 What are Valid Data Blocks?
Valid data blocks are blocks that are allocated or used by a file system, for
example, Ext. SMS migrates only valid data blocks. SMS does not migrate data
blocks that are not allocated or used. This reduces the amount of data that needs
to be migrated and improves migration efficiency.
2.10 How Does Migration Using SMS Differ from
Migration Using IMS?
Migration Using SMS
SMS helps you migrate applications and data from x86 physical or virtual servers
on premises or in other private or public clouds to ECSs on Huawei Cloud.
Advantages
● Ease of use
Server Migration Service
FAQs 2 Product Consultation
Issue 70 (2025-11-05) Copyright © Huawei Cloud Computing Technologies Co., Ltd. 8

--- Page 18 ---
You just need to install and configure the Agent on source servers and
configure the target servers and start the migration on the SMS console. SMS
takes care of the remaining work automatically.
● Seamless migration
Your services do not have to go down during the migration. If the network is
interrupted during migration, SMS allows you to restart the migration and
continue transferring data from where it left off.
● High security
The Agent installed on source servers uses AK/SK pairs for authentication.
Dynamically generated SSL certificates and keys are used to encrypt
transmission channels for data security.
Constraints
For details, see What OSs Can Be Migrated and What Are the Restrictions on
Using SMS?
Migration Using IMS
If you want to migrate a server using IMS, you need to complete the initial
network and driver (Xen or KVM) configurations on the server, create an image of
the server, import the image to the IMS console, and use the image to create an
ECS.
Advantages
● IMS enables you to import images (in VHD, VMDK, QCOW2, or RAW format)
of existing servers to the cloud platform.
– The supported formats include VHD, VMDK, QCOW2, RAW, VHDX,
QCOW, VDI, QED, ZVHD, and ZVHD2. Image files in other formats need
to be converted into any of these supported formats before being
imported. The open-source tool qemu-img can be used for conversion.
– The supported OSs includes SUSE, Oracle Linux, Red Hat Enterprise Linux,
Ubuntu, openSUSE, CentOS, Debian, Fedora, and EulerOS.
● IMS allows you to share or replicate images across regions to migrate ECSs
between accounts and regions.
● IMS enables you to create system and data disk images and use these images
on the cloud platform for batch deployment.
Constraints
Local storage space is occupied, and only image files no larger than 1 TB can be
imported.
2.11 Why Is the OS Name of the Target ECS Displayed
on the ECS Console Different from That of the Source
Server?
The console displays the ECS image name rather than the OS name.
Server Migration Service
FAQs 2 Product Consultation
Issue 70 (2025-11-05) Copyright © Huawei Cloud Computing Technologies Co., Ltd. 9

--- Page 19 ---
Figure 2-2 Image name
● If you use an existing ECS as the target server, the name of the image used to
create the ECS is displayed on the ECS console.
● If you choose to automatically create an ECS as the target server, the name of
the public image selected by SMS is displayed on the ECS console.
NO TICE
To display the OS name of the source server on the ECS console, prepare an
image named after the source server OS, create an ECS using that image, and
use that ECS as the target server.
2.12 How Do I Determine Whether a Migration Is
Complete?
A migration in the Finished status is complete.
2.13 How Does SMS Differ from IMS in the Migration
Scenario?
The following describes the differences between SMS and IMS in terms of
application scenarios, migration processes, and service continuity.
Application Scenarios
● IMS is used to migrate on-premises servers to the cloud. IMS enables you to
create images for source servers and use the images for migration. The
images are usually used for deploying specific software environments, batch
deploying software environments, and backing up server running
environments. For details, see IMS Application Scenarios.
● SMS is used to migrate x86 physical servers or VMs on premises or in private
or public clouds to Huawei Cloud. For details, see What Is SMS?
Server Migration Service
FAQs 2 Product Consultation
Issue 70 (2025-11-05) Copyright © Huawei Cloud Computing Technologies Co., Ltd. 10

--- Page 20 ---
Migration Process
● To use IMS for migration, you need to create images for source servers and
then use the images to create target servers. For details, see Creating a
Private Image.
● To use SMS for migration, you need to install and start the SMS-Agent on
each source server and start the migration. For details, see How Do I Install
the Agent on Source Servers?
Service Continuity
● If you use IMS for migration, your services need to be stopped for a long time
for image creation.
● If you use SMS for migration, your services do not have to go down during
the migration. You only need to pause services briefly for service cutover
before the final synchronization. After the final synchronization is complete,
you can start services on the target server. SMS ensures minimal downtime.
NO TE
Service cutover refers to switching services from the source to the target.
2.14 What Are the Snapshots of a Target Server Used
for?
SMS creates snapshots for target servers at certain time points. These snapshots
are used for service cutover, data synchronization, and cloning target servers.
● Cutover snapshots: After a migration is complete, SMS creates a snapshot for
each target server disk. These snapshots are used for rollback if any service
faults happen after the service cutover. Old snapshots are deleted and new
snapshots are created automatically whenever the target server is launched
again.
NO TE
It is recommended that these snapshots are deleted after your services have been
running properly on the target server.
● Synchronization snapshots: For a Windows migration or Linux block-level
migration, after the source data is migrated and synchronized and before the
target server is launched, SMS creates a snapshot for each target server disk
to ensure data consistency between the source and target.
● Clone snapshots: When you clone a target server, SMS creates a snapshot for
each target server disk. These snapshots are used to clone the target server
and put the migration status back to continuous synchronization after the
clone is complete.
Server Migration Service
FAQs 2 Product Consultation
Issue 70 (2025-11-05) Copyright © Huawei Cloud Computing Technologies Co., Ltd. 11

--- Page 21 ---
2.15 How Many Source Resources Will Be Used for a
Linux Block-Level Migration?
Memory Usage (for Data Cache)
There are six data cache nodes configured by the Agent on a source server. The
default size of a single cache node is 4 MB.
● Minimum memory occupied by data cache: 6 × 1 MB = 6 MB
● Default memory occupied by data cache: 6 × 4 MB = 24 MB
● Maximum memory occupied by data cache: 6 × 8 MB = 48 MB
CPU Usage
The following table describes how much CPU resource is used by a Linux block-
level migration.
Number of
CPUs
CPU Usage
Before the Agent
Starts (n)
Default Compression
Threads
Configured by the
Agent
CPU Usage
After the Agent
Starts
1 - 0. Data is not
compressed.
< n + 10%
2 n ≥ 50% 0. Data is not
compressed.
< n + 10%
2 n < 50% 1 < n + 50%
4 n ≥ 75% 0. Data is not
compressed.
< n + 4%
4 50% ≤ = n ≤ 75% 1 < n + 25%
4 25% ≤ n < 50% 2 < n + 50%
4 n < 25% 3 < n + 75%
8 n ≥ 87% 0. Data is not
compressed.
< n + 3%
8 75% ≤ n < 87% 1 < n + 13%
8 62% ≤ n < 75% 2 < n + 25%
8 n < 62% 3 < n + 38%
16 n ≥ 93% 0. Data is not
compressed.
< n + 1%
16 87% ≤ n < 93% 1 < n + 6%
Server Migration Service
FAQs 2 Product Consultation
Issue 70 (2025-11-05) Copyright © Huawei Cloud Computing Technologies Co., Ltd. 12

--- Page 22 ---
Number of
CPUs
CPU Usage
Before the Agent
Starts (n)
Default Compression
Threads
Configured by the
Agent
CPU Usage
After the Agent
Starts
16 82% ≤ n < 87% 2 < n + 13%
16 n < 82% 3 < n + 17%
≥ 32 - 3 < n + 10%
 
● If the number of compression threads is larger than 0, the CPU usage after
the Agent starts can be calculated as follows:
in which, c indicates the number of CPUs, p indicates the number of
compression threads, and n indicates the CPU usage before the Agent starts.
● If the number of compression threads is 0, the Agent occupies less than 10%
of the CPU capacity. The formula for calculating the CPU usage is as follows:
By default, data compression is enabled for Linux block-level migrations. To
disable this function, see How Do I Disable Data Compression When the
CPU Usage Is Too High During a Linux Block-level Migration?
2.16 Do I Need to Activate the Windows OS and Paid
Software After the Migration Is Complete?
SMS migrates entire servers. After you use SMS to migrate a source server running
Windows, you need to activate Windows and other paid software on the target
server by yourself. SMS cannot help you do that. You can get help from the
software providers.
2.17 Which Directories Are Not Synchronized by
Default During Incremental Synchronization on a Linux
Server?
When incremental synchronization is performed after full replication is complete
on a Linux server, data will not be synchronized for the following directories
related to server configurations:
/proc/*,
/sys/*,
Server Migration Service
FAQs 2 Product Consultation
Issue 70 (2025-11-05) Copyright © Huawei Cloud Computing Technologies Co., Ltd. 13

--- Page 23 ---
/lost+found/*,
/tmp/_MEI*,
/var/lib/ntp/proc/*,
/etc/fstab,
/etc/X11/*,
/root/initrd_bak/*,
/lib/modules/*,
/boot/grub2/x86_64-efi/*,
/boot/grub2/i386-pc/*
Reasons
After the full migration of a Linux server, some parameter settings in the
preceding directories on the target server are modified to make the target server
compatible with Huawei Cloud and ensure that the target server can start
properly. During incremental synchronization, to ensure that the parameter
settings in these directories on the target server are not overwritten or modified
by the source server settings, these directories are not synchronized by default.
Notes
If there is service data in the preceding directories, you need to manually
synchronize the incremental service data to the target server.
2.18 Why Can't the Create new Option Be Selected
When I Configure a Migration Task for a Windows
Source Server?
SMS does not support automatic creation of Windows target servers. You need to
create a server with the recommended specifications and use the server as the
target server.
Server Migration Service
FAQs 2 Product Consultation
Issue 70 (2025-11-05) Copyright © Huawei Cloud Computing Technologies Co., Ltd. 14

--- Page 24 ---
3 Billing
3.1 Billing
SMS is free, but you are billed at standard rates for resources used during the
migration process.
CA UTION
The costs are for reference only. The actual amounts may vary.
EVS Disks
SMS creates and attaches a 40-GB EVS disk to each target server during the
migration. These EVS disks are billed on a pay-per-use basis. After the migration is
complete, these temporary EVS disks will be released. Do not delete these EVS
disks or change their billing mode to yearly/monthly before the migration is
complete, or the migration will fail.
For pricing details about EVS, see EVS Pricing Details.
For example, if a 40-GB high I/O EVS disk with the unit price of $0.0002 USD/GB-
hour is used for 10 hours during migration, the EVS disk price is $0.08 USD
(0.0002 × 40 × 10).
EVS Disk Snapshots
SMS creates snapshots for target servers at certain time points. These snapshots
are used for service cutover, data synchronization, and cloning target servers. For
details, see What Are the Snapshots of a Target Server Used for?
Legacy snapshots are free. You can use them free of charge. For the billing
information about standard snapshots, see Billing for EVS Snapshots.
Data Transfer
Traffic is generated during the migration and is billed as follows:
Server Migration Service
FAQs 3 Billing
Issue 70 (2025-11-05) Copyright © Huawei Cloud Computing Technologies Co., Ltd. 15

--- Page 25 ---
● If the source public IP address is billed by bandwidth and you use the fixed
bandwidth for migration over the Internet, the traffic you used will not be
billed.
● If the source public IP address is billed by traffic and you migrate data over
the Internet, the price is calculated by multiplying the unit price of traffic by
the amount of data migrated. For details about the unit price of traffic,
contact the provider of the source public IP address. The amount of data
migrated is the actual usage of disks on source servers.
If the public IP address is billed by traffic, the unit price is $0.15 USD/GB, and
the total disk size of a source server is 500 GB (including 300 GB of used
space), the cost is $45 USD (0.15 × 300). Note that the fees are billed by the
provider of the source public IP address.
● If you use Direct Connect or Virtual Private Network (VPN) for migration,
the cost depends on the price of your Direct Connect or VPN connections.
Server Migration Service
FAQs 3 Billing
Issue 70 (2025-11-05) Copyright © Huawei Cloud Computing Technologies Co., Ltd. 16

--- Page 26 ---
4 OS Compatibility and Migration
Restrictions
4.1 What Are the Constraints on and What OSs Are
Supported by SMS?
Server Requirements
Item Constraint
Server specifications ● Windows: Source and target servers must each
have more than 1 CPU and 1 GB of memory.
● Linux: Source and target servers must each have at
least 1 CPU and 1 GB of memory.
CPU and memory ● The CPU usage of a source server must not exceed
80%.
● The available memory of a source server must be
greater than 256 MB.
OSs ● Supported Windows OSs
● Supported Linux OSs
● A server running multiple OSs cannot be migrated.
Available disk space ● Windows
– At least 320 MB available space on a partition
not smaller than 600 MB
– At least 40 MB available space on a partition
smaller than 600 MB
● Linux
At least 200 MB of available space on the root
partition
Server Migration Service
FAQs 4 OS Compatibility and Migration Restrictions
Issue 70 (2025-11-05) Copyright © Huawei Cloud Computing Technologies Co., Ltd. 17

--- Page 27 ---
Item Constraint
Disk quantity SMS imposes a disk limit on source servers due to ECS
constraints. While an ECS supports up to 24 disks,
SMS reserves one slot for a temporary disk during
migration. This means that a source server can have a
maximum of 23 disks.
Disk size ● The mkfs tool included in the SMS agent image for
Linux cannot create file systems larger than 16 TB.
As a result, disks exceeding 16 TB are not
supported on target servers. To ensure
compatibility, you can adjust disk and partition
settings of source servers to meet this requirement.
This restriction does not apply to Windows servers.
● To migrate a source server with GPT disks, the
paired disks on the target server must be at least 1
GB larger.
File systems ● Windows: Only NTFS file systems are supported.
● Linux: Only Ext2, Ext3, Ext4, VFAT, and XFS file
systems are supported.
Shared file systems Only files on local disks can be migrated. Shared file
systems cannot be migrated.
For example, files in Network File System (NFS),
Common Internet File System (CIFS), and Network
Attached Storage (NAS).
Nested LVM systems Nested LVM systems cannot be migrated.
Required components Source servers must contain the components required
for migration.
● Windows: WMI and VSS
● Linux: SSH (such as OpenSSH), rsync, and GRUB
 
Migration Constraints
Item Constraint
Source server quantity A maximum of 1,000 source servers are allowed per
account. Delete the records of migrated servers in a
timely manner so that other servers can continue to be
migrated.
Number of concurrent
migrations
A maximum of 100 source servers can be migrated at
the same time.
External storage of
servers
SMS cannot migrate data from the external storage
attached to a source server.
Server Migration Service
FAQs 4 OS Compatibility and Migration Restrictions
Issue 70 (2025-11-05) Copyright © Huawei Cloud Computing Technologies Co., Ltd. 18

--- Page 28 ---
Item Constraint
Encrypted files SMS cannot migrate OSs that contain protected folders
or encrypted volumes.
Encrypted systems SMS cannot migrate OSs that are encrypted, such as
Windows OSs protected with BitLocker.
Servers that run multi-
node databases and
Active Directory
Domain Services (AD
DS)
SMS cannot migrate servers that host active directories
or multi-node databases.
Data of database
applications and
domain controller
applications
SMS cannot migrate data of database applications and
domain controller applications.
Applications bound to
hardware
SMS cannot migrate OSs that contain applications
bound to hardware.
Dynamic disks Dynamic disks in Windows systems are migrated as
basic disks. After the migration is complete, the target
server will not have dynamic disks.
Unmounted or
uninitialized disks
(empty disks)
SMS only migrates data on disks that are mounted and
actively used on a source server. Data on unmounted
or uninitialized disks will not be migrated.
SMS requires that the source and target servers have
the same number of disks, including any unmounted
or uninitialized disks.
● If you use an existing server as the target, make
sure it has the same number of disks as the source
server, including unmounted or uninitialized ones.
After the migration is complete, you can delete any
unmounted or uninitialized disks from the target
server if they are no longer needed.
● If you allow the system to create a new target
server, the system will automatically create a server
with the same number of disks as the source server,
including unmounted or uninitialized disks. After
the migration is complete, you can delete any
unmounted or uninitialized disks from the target
server if they are no longer needed.
NOTE
If you want to migrate data from an unmounted disk on the
source server, mount the disk to the source server before the
migration.
Servers with system
volumes located on
disks other than the
first disk
SMS cannot migrate servers whose system volumes are
not on the first disk.
Server Migration Service
FAQs 4 OS Compatibility and Migration Restrictions
Issue 70 (2025-11-05) Copyright © Huawei Cloud Computing Technologies Co., Ltd. 19

--- Page 29 ---
Item Constraint
Thinly-provisioned
logical volumes
SMS cannot migrate thinly-provisioned volumes
tagged with pool.
Servers with RAID
arrays
SMS cannot migrate servers with RAID arrays.
Big data clusters and
container clusters
SMS cannot migrate clusters including but not limited
to container clusters and big data clusters.
Compressed RAM-
based block devices
(ZRAM devices)
SMS cannot migrate ZRAM devices. These devices are
ignored during the collection phase, as they
temporarily store compressed memory blocks. Manual
configuration is required after the migration is
complete.
 
Supported Windows OSs
Table 4-1 Supported Windows OSs
OS Version Bit UEFI Supported Remarks
Windows Server
2008
64 No Windows Server
2008 and
Windows Server
2008 R2 cannot
boot in UEFI
mode.
Windows Server
2008 R2
64 No
Windows Server
2012
64 Yes -
Windows Server
2012 R2
64 Yes
Windows Server
2016
64 Yes
Windows Server
2019
64 Yes
Windows Server
2022
64 Yes
Windows 7 64 No
Windows 8.1 64 No
Windows 10 64 Yes
 
Server Migration Service
FAQs 4 OS Compatibility and Migration Restrictions
Issue 70 (2025-11-05) Copyright © Huawei Cloud Computing Technologies Co., Ltd. 20

--- Page 30 ---
Linux OSs Supported for File-Level Migration
Table 4-2 Linux distributions supported for file-level migration
OS Version Bit UEFI
Suppor
ted
Red Hat
Enterprise
Linux
Red Hat Enterprise Linux 6.0 (Only KVM
servers are supported.)
64 No
Red Hat Enterprise Linux
6.1/6.2/6.3/6.4/6.5/6.7/6.8/6.9/6.10
64 No
Red Hat Enterprise Linux 7.0 64 No
Red Hat Enterprise Linux
7.1/7.2/7.3/7.4/7.5/7.6/7.7/7.8/7.9
64 Yes
Red Hat Enterprise Linux
8.0/8.1/8.2/8.3/8.4/8.5/8.6/8.7/8.8/8.9/8.10
64 Yes
Red Hat Enterprise Linux
9.0/9.1/9.2/9.3/9.4/9.5/9.6
64 Yes
Red Hat
Enterprise
Linux
CoreOS
NOTE
Data
consistency
verification
is not
supported.
Before the
migration,
view What
Should I
Consider
and
Prepare
Before
Migrating
a Server
Running
Red Hat
Enterprise
Linux
CoreOS?
Red Hat Enterprise Linux CoreOS 4.15 64 Yes
CentOS CentOS 6.0 (Only KVM servers are supported.) 64 No
CentOS 6.1/6.2/6.3/6.4/6.5/6.6/6.7/6.8/6.9/6.10 64 No
CentOS 7.0 64 No
CentOS 7.1/7.2/7.3/7.4/7.5/7.6/7.7/7.8/7.9 64 Yes
Server Migration Service
FAQs 4 OS Compatibility and Migration Restrictions
Issue 70 (2025-11-05) Copyright © Huawei Cloud Computing Technologies Co., Ltd. 21

--- Page 31 ---
OS Version Bit UEFI
Suppor
ted
CentOS 8.0/8.1/8.2/8.3/8.4/8.5 64 Yes
CentOS Stream 8
NOTE
This distribution will be identified as CentOS 8.0.
This does not affect the migration.
64 Yes
CentOS Stream 9
NOTE
This distribution will be identified as CentOS 9.0.
This does not affect the migration.
64 Yes
Oracle Oracle Linux
6.0/6.1/6.2/6.3/6.4/6.5/6.6/6.7/6.8/6.9/6.10
64 No
Oracle Linux 7.0 64 No
Oracle Linux 7.1/7.2/7.3/7.4/7.5/7.6/7.7/7.8/7.9 64 Yes
Oracle Linux 8.0/8.1/8.2/8.3/8.4/8.5/8.6/8.7/8.8 64 Yes
Oracle Linux 9.0/9.1/9.2/9.3 64 Yes
SUSE SUSE Linux Enterprise Server 11 SP3 64 No
SUSE Linux Enterprise Server 11 SP4 64 Yes
SUSE Linux Enterprise Server 12 SP0
NOTE
Btrfs file systems on this distribution cannot be
migrated.
64 Yes
SUSE Linux Enterprise Server 12
SP1/SP2/SP3/SP4/SP5
64 Yes
SUSE Linux Enterprise Server 15
SP0/SP1/SP2/SP3/SP5/SP6
64 Yes
SUSE Linux Enterprise Server 15 SP4 64 No
Ubuntu Ubuntu Server 12.04 64 No
Ubuntu Server 12.10 64 Yes
Ubuntu Server 13.10 64 Yes
Ubuntu Server 14.04/14.10 64 Yes
Ubuntu Server 15.04/15.10 64 Yes
Ubuntu Server 16.04/16.10 64 Yes
Ubuntu Server 17.04/17.10 64 Yes
Ubuntu Server 18.04 64 Yes
Server Migration Service
FAQs 4 OS Compatibility and Migration Restrictions
Issue 70 (2025-11-05) Copyright © Huawei Cloud Computing Technologies Co., Ltd. 22

--- Page 32 ---
OS Version Bit UEFI
Suppor
ted
Ubuntu Server 18.10 64 No
Ubuntu Server 19.04/19.10 64 Yes
Ubuntu Server 20.04 64 Yes
Ubuntu Server 21.04/21.10 64 Yes
Ubuntu Server 22.04/22.10 64 Yes
Ubuntu Server 23.04/23.10 64 Yes
Ubuntu Server 24.04 64 Yes
Debian Debian GNU/Linux 6.0.10 64 No
Debian GNU/Linux 7.11.0 64 No
Debian GNU/Linux
8.0/8.1/8.2/8.3/8.4/8.5/8.6/8.7/8.8/8.9/8.10/8.11
64 No
Debian GNU/Linux
9.0/9.1/9.2/9.3/9.4/9.5/9.6/9.7/9.8/9.9/9.10/9.11
/9.12/9.13
64 No
Debian GNU/Linux
10.0/10.1/10.2/10.3/10.4/10.5/10.6/10.7/10.8/1
0.9/10.10/10.11/10.12/10.13
64 Yes
Debian GNU/Linux 11.0/11.1/11.2 64 Yes
Debian GNU/Linux 11.3/11.4/11.5/11.7/11.11 64 No
Debian GNU/Linux 11.6/11.9 64 Yes
Debian GNU/Linux 12.0/12.1/12.2/12.4/12.5 64 Yes
Debian GNU/Linux 12.11 64 No
Fedora Fedora 23/24/25/26/27/28/29/33/34/35/36/37 64 No
Fedora 30/31/32/38/39 64 Yes
EulerOS EulerOS 2.2.0 64 No
EulerOS 2.3.0 64 No
EulerOS 2.5.0 64 No
Amazon
Linux
Amazon Linux 2.0 64 No
Amazon Linux 2018.3 64 No
Server Migration Service
FAQs 4 OS Compatibility and Migration Restrictions
Issue 70 (2025-11-05) Copyright © Huawei Cloud Computing Technologies Co., Ltd. 23

--- Page 33 ---
OS Version Bit UEFI
Suppor
ted
Amazon Linux 2023 AMI
NOTE
You are advised to run the following command on
the source server as the root user to install the
required components before the migration:
yum install kernel-modules-extra
64 No
Alibaba
Cloud Linux
Alibaba Cloud Linux 3.2104 64 Yes
Alibaba Cloud Linux 3.2104 (Quick Start) 64 No
Alibaba Cloud Linux 3.2104 (SCC) 64 Yes
Alibaba Cloud Linux 3.2104 LTS (MLPS 2.0
Level 3)
64 No
Alibaba Cloud Linux 2.1903 LTS 64 Yes
Alibaba Cloud Linux 2.1903 LTS (SCC) 64 No
Alibaba Cloud Linux 2.1903 LTS (Quick Start) 64 No
Alibaba Cloud Linux 2.1903 LTS (MLPS 2.0
Level 2)
64 No
AlmaLinux AlmaLinux OS
8.3/8.4/8.5/8.6/8.7/8.8/8.9/8.10/9.0/9.1/9.2/9.3/
9.4
64 Yes
TencentOS TencentOS Server 2.4 64 No
TencentOS Server 2.4 (TK4) 64 No
TencentOS Server 3.1 (TK4) 64 No
Kylin Kylin Linux Advanced Server V10 (Sword) 64 No
openEuler openEuler 20.03 64 No
openEuler 21.09 64 No
openSUSE openSUSE 15.1/15.2/15.3/15.4 64 No
openSUSE 15.0/15.5 64 Yes
Rocky Linux Rocky Linux 8.5/8.6/8.7/9.0/9.1 64 No
Rocky Linux 8.3/8.4/8.8/8.9/9.2/9.3/9.4 64 Yes
 
Server Migration Service
FAQs 4 OS Compatibility and Migration Restrictions
Issue 70 (2025-11-05) Copyright © Huawei Cloud Computing Technologies Co., Ltd. 24

--- Page 34 ---
Linux OSs Supported for Block-Level Migration
Table 4-3 Linux OSs and kernel versions supported for block-level migration
OS Kernel Version
CentOS 2.6.32-131.0.15.el6.x86_64
2.6.32-220.13.1.el6.x86_64
2.6.32-220.17.1.el6.x86_64
2.6.32-220.2.1.el6.x86_64
2.6.32-220.23.1.el6.x86_64
2.6.32-220.4.1.el6.x86_64
2.6.32-220.4.2.el6.x86_64
2.6.32-220.7.1.el6.x86_64
2.6.32-220.el6.x86_64
2.6.32-279.11.1.el6.x86_64
2.6.32-279.1.1.el6.x86_64
2.6.32-279.14.1.el6.x86_64
2.6.32-279.19.1.el6.x86_64
2.6.32-279.2.1.el6.x86_64
2.6.32-279.22.1.el6.x86_64
2.6.32-279.5.1.el6.x86_64
2.6.32-279.5.2.el6.x86_64
2.6.32-279.9.1.el6.x86_64
2.6.32-279.el6.x86_64
2.6.32-358.0.1.el6.x86_64
2.6.32-358.11.1.el6.x86_64
2.6.32-358.14.1.el6.x86_64
2.6.32-358.18.1.el6.x86_64
2.6.32-358.2.1.el6.x86_64
2.6.32-358.23.2.el6.x86_64
2.6.32-358.6.1.el6.x86_64
2.6.32-358.6.2.el6.x86_64
2.6.32-358.el6.x86_64
Server Migration Service
FAQs 4 OS Compatibility and Migration Restrictions
Issue 70 (2025-11-05) Copyright © Huawei Cloud Computing Technologies Co., Ltd. 25

--- Page 35 ---
OS Kernel Version
2.6.32-431.11.2.el6.x86_64
2.6.32-431.1.2.0.1.el6.x86_64
2.6.32-431.17.1.el6.x86_64
2.6.32-431.20.3.el6.x86_64
2.6.32-431.20.5.el6.x86_64
2.6.32-431.23.3.el6.x86_64
2.6.32-431.29.2.el6.x86_64
2.6.32-431.3.1.el6.x86_64
2.6.32-431.5.1.el6.x86_64
2.6.32-431.el6.x86_64
2.6.32-504.12.2.el6.x86_64
2.6.32-504.1.3.el6.x86_64
2.6.32-504.16.2.el6.x86_64
2.6.32-504.23.4.el6.x86_64
2.6.32-504.30.3.el6.x86_64
2.6.32-504.3.3.el6.x86_64
2.6.32-504.8.1.el6.x86_64
2.6.32-504.el6.x86_64
2.6.32-573.1.1.el6.x86_64
2.6.32-573.12.1.el6.x86_64
2.6.32-573.18.1.el6.x86_64
2.6.32-573.22.1.el6.x86_64
2.6.32-573.26.1.el6.x86_64
2.6.32-573.3.1.el6.x86_64
2.6.32-573.7.1.el6.x86_64
2.6.32-573.8.1.el6.x86_64
2.6.32-573.el6.x86_64
2.6.32-642.11.1.el6.x86_64
2.6.32-642.1.1.el6.x86_64
2.6.32-642.13.1.el6.x86_64
2.6.32-642.13.2.el6.x86_64
2.6.32-642.15.1.el6.x86_64
2.6.32-642.3.1.el6.x86_64
2.6.32-642.4.2.el6.x86_64
2.6.32-642.6.1.el6.x86_64
2.6.32-642.6.2.el6.x86_64
2.6.32-642.el6.x86_64
Server Migration Service
FAQs 4 OS Compatibility and Migration Restrictions
Issue 70 (2025-11-05) Copyright © Huawei Cloud Computing Technologies Co., Ltd. 26

--- Page 36 ---
OS Kernel Version
2.6.32-696.10.1.el6.x86_64
2.6.32-696.10.2.el6.x86_64
2.6.32-696.10.3.el6.x86_64
2.6.32-696.1.1.el6.x86_64
2.6.32-696.13.2.el6.x86_64
2.6.32-696.16.1.el6.x86_64
2.6.32-696.18.7.el6.x86_64
2.6.32-696.20.1.el6.x86_64
2.6.32-696.23.1.el6.x86_64
2.6.32-696.28.1.el6.x86_64
2.6.32-696.30.1.el6.x86_64
2.6.32-696.3.1.el6.x86_64
2.6.32-696.3.2.el6.x86_64
2.6.32-696.6.3.el6.x86_64
2.6.32-696.el6.x86_64
2.6.32-71.14.1.el6.x86_64
2.6.32-71.18.1.el6.x86_64
2.6.32-71.18.2.el6.x86_64
2.6.32-71.24.1.el6.x86_64
2.6.32-71.29.1.el6.x86_64
2.6.32-71.7.1.el6.x86_64
2.6.32-71.el6.x86_64
Server Migration Service
FAQs 4 OS Compatibility and Migration Restrictions
Issue 70 (2025-11-05) Copyright © Huawei Cloud Computing Technologies Co., Ltd. 27

--- Page 37 ---
OS Kernel Version
2.6.32-754.10.1.el6.x86_64
2.6.32-754.11.1.el6.x86_64
2.6.32-754.12.1.el6.x86_64
2.6.32-754.14.2.el6.x86_64
2.6.32-754.15.3.el6.x86_64
2.6.32-754.17.1.el6.x86_64
2.6.32-754.18.2.el6.x86_64
2.6.32-754.2.1.el6.x86_64
2.6.32-754.22.1.el6.x86_64
2.6.32-754.23.1.el6.x86_64
2.6.32-754.24.2.el6.x86_64
2.6.32-754.24.3.el6.x86_64
2.6.32-754.25.1.el6.x86_64
2.6.32-754.27.1.el6.x86_64
2.6.32-754.28.1.el6.x86_64
2.6.32-754.29.1.el6.x86_64
2.6.32-754.29.2.el6.x86_64
2.6.32-754.30.2.el6.x86_64
2.6.32-754.31.1.el6.x86_64
2.6.32-754.33.1.el6.x86_64
2.6.32-754.35.1.el6.x86_64
2.6.32-754.3.5.el6.x86_64
2.6.32-754.6.3.el6.x86_64
2.6.32-754.9.1.el6.x86_64
2.6.32-754.el6.x86_64
3.10.0-1062.1.1.el7.x86_64
3.10.0-1062.12.1.el7.x86_64
3.10.0-1062.1.2.el7.x86_64
3.10.0-1062.18.1.el7.x86_64
3.10.0-1062.4.1.el7.x86_64
3.10.0-1062.4.2.el7.x86_64
3.10.0-1062.4.3.el7.x86_64
3.10.0-1062.7.1.el7.x86_64
3.10.0-1062.9.1.el7.x86_64
3.10.0-1062.el7.x86_64
Server Migration Service
FAQs 4 OS Compatibility and Migration Restrictions
Issue 70 (2025-11-05) Copyright © Huawei Cloud Computing Technologies Co., Ltd. 28

--- Page 38 ---
OS Kernel Version
3.10.0-1127.10.1.el7.x86_64
3.10.0-1127.13.1.el7.x86_64
3.10.0-1127.18.2.el7.x86_64
3.10.0-1127.19.1.el7.x86_64
3.10.0-1127.8.2.el7.x86_64
3.10.0-1127.el7.x86_64
3.10.0-1160.2.1.el7.x86_64
3.10.0-1160.2.2.el7.x86_64
3.10.0-1160.el7.x86_64
3.10.0-123.1.2.el7.x86_64
3.10.0-123.13.1.el7.x86_64
3.10.0-123.13.2.el7.x86_64
3.10.0-123.20.1.el7.x86_64
3.10.0-123.4.2.el7.x86_64
3.10.0-123.4.4.el7.x86_64
3.10.0-123.6.3.el7.x86_64
3.10.0-123.8.1.el7.x86_64
3.10.0-123.9.2.el7.x86_64
3.10.0-123.9.3.el7.x86_64
3.10.0-123.el7.x86_64
3.10.0-229.11.1.el7.x86_64
3.10.0-229.1.2.el7.x86_64
3.10.0-229.14.1.el7.x86_64
3.10.0-229.20.1.el7.x86_64
3.10.0-229.4.2.el7.x86_64
3.10.0-229.7.2.el7.x86_64
3.10.0-229.el7.x86_64
Server Migration Service
FAQs 4 OS Compatibility and Migration Restrictions
Issue 70 (2025-11-05) Copyright © Huawei Cloud Computing Technologies Co., Ltd. 29

--- Page 39 ---
OS Kernel Version
3.10.0-327.10.1.el7.x86_64
3.10.0-327.13.1.el7.x86_64
3.10.0-327.18.2.el7.x86_64
3.10.0-327.22.2.el7.x86_64
3.10.0-327.28.2.el7.x86_64
3.10.0-327.28.3.el7.x86_64
3.10.0-327.3.1.el7.x86_64
3.10.0-327.36.1.el7.x86_64
3.10.0-327.36.2.el7.x86_64
3.10.0-327.36.3.el7.x86_64
3.10.0-327.4.4.el7.x86_64
3.10.0-327.4.5.el7.x86_64
3.10.0-327.el7.x86_64
3.10.0-514.10.2.el7.x86_64
3.10.0-514.16.1.el7.x86_64
3.10.0-514.21.1.el7.x86_64
3.10.0-514.21.2.el7.x86_64
3.10.0-514.2.2.el7.x86_64
3.10.0-514.26.1.el7.x86_64
3.10.0-514.26.2.el7.x86_64
3.10.0-514.6.1.el7.x86_64
3.10.0-514.6.2.el7.x86_64
3.10.0-514.el7.x86_64
3.10.0-693.11.1.el7.x86_64
3.10.0-693.11.6.el7.x86_64
3.10.0-693.1.1.el7.x86_64
3.10.0-693.17.1.el7.x86_64
3.10.0-693.21.1.el7.x86_64
3.10.0-693.2.1.el7.x86_64
3.10.0-693.2.2.el7.x86_64
3.10.0-693.5.2.el7.x86_64
3.10.0-693.el7.x86_64
Server Migration Service
FAQs 4 OS Compatibility and Migration Restrictions
Issue 70 (2025-11-05) Copyright © Huawei Cloud Computing Technologies Co., Ltd. 30

--- Page 40 ---
OS Kernel Version
3.10.0-862.11.6.el7.x86_64
3.10.0-862.14.4.el7.x86_64
3.10.0-862.2.3.el7.x86_64
3.10.0-862.3.2.el7.x86_64
3.10.0-862.3.3.el7.x86_64
3.10.0-862.6.3.el7.x86_64
3.10.0-862.9.1.el7.x86_64
3.10.0-862.el7.x86_64
Server Migration Service
FAQs 4 OS Compatibility and Migration Restrictions
Issue 70 (2025-11-05) Copyright © Huawei Cloud Computing Technologies Co., Ltd. 31

--- Page 41 ---
OS Kernel Version
Ubuntu 4.4.0-21-generic
4.4.0-22-generic
4.4.0-24-generic
4.4.0-28-generic
4.4.0-31-generic
4.4.0-34-generic
4.4.0-36-generic
4.4.0-38-generic
4.4.0-42-generic
4.4.0-43-generic
4.4.0-45-generic
4.4.0-47-generic
4.4.0-51-generic
4.4.0-53-generic
4.4.0-57-generic
4.4.0-59-generic
4.4.0-62-generic
4.4.0-63-generic
4.4.0-64-generic
4.4.0-66-generic
4.4.0-67-generic
4.4.0-70-generic
4.4.0-71-generic
4.4.0-72-generic
4.4.0-75-generic
4.4.0-77-generic
4.4.0-78-generic
4.4.0-79-generic
4.4.0-81-generic
4.4.0-83-generic
4.4.0-87-generic
4.4.0-89-generic
4.4.0-91-generic
4.4.0-92-generic
4.4.0-93-generic
4.4.0-96-generic
4.4.0-97-generic
4.4.0-98-generic
Server Migration Service
FAQs 4 OS Compatibility and Migration Restrictions
Issue 70 (2025-11-05) Copyright © Huawei Cloud Computing Technologies Co., Ltd. 32

--- Page 42 ---
OS Kernel Version
4.4.0-101-generic
4.4.0-103-generic
4.4.0-104-generic
4.4.0-116-generic
4.4.0-119-generic
4.4.0-121-generic
4.4.0-122-generic
4.4.0-124-generic
4.4.0-127-generic
4.4.0-128-generic
4.4.0-130-generic
4.4.0-131-generic
4.4.0-133-generic
4.4.0-134-generic
4.4.0-135-generic
4.4.0-137-generic
4.4.0-138-generic
4.4.0-139-generic
4.4.0-140-generic
4.4.0-141-generic
4.4.0-142-generic
4.4.0-143-generic
4.4.0-145-generic
4.4.0-146-generic
4.4.0-148-generic
4.4.0-150-generic
4.4.0-151-generic
4.4.0-154-generic
4.4.0-157-generic
4.4.0-159-generic
4.4.0-161-generic
4.4.0-164-generic
4.4.0-165-generic
4.4.0-166-generic
4.4.0-168-generic
4.4.0-169-generic
4.4.0-170-generic
4.4.0-171-generic
Server Migration Service
FAQs 4 OS Compatibility and Migration Restrictions
Issue 70 (2025-11-05) Copyright © Huawei Cloud Computing Technologies Co., Ltd. 33

--- Page 43 ---
OS Kernel Version
4.4.0-173-generic
4.4.0-174-generic
4.4.0-176-generic
4.4.0-177-generic
4.4.0-178-generic
4.4.0-179-generic
4.4.0-184-generic
4.4.0-185-generic
4.4.0-186-generic
4.4.0-187-generic
4.4.0-189-generic
4.4.0-190-generic
4.4.0-193-generic
4.4.0-194-generic
4.4.0-197-generic
4.4.0-198-generic
4.4.0-200-generic
4.4.0-201-generic
4.4.0-203-generic
4.4.0-204-generic
Server Migration Service
FAQs 4 OS Compatibility and Migration Restrictions
Issue 70 (2025-11-05) Copyright © Huawei Cloud Computing Technologies Co., Ltd. 34

--- Page 44 ---
OS Kernel Version
4.15.0-20-generic
4.15.0-22-generic
4.15.0-23-generic
4.15.0-24-generic
4.15.0-29-generic
4.15.0-30-generic
4.15.0-32-generic
4.15.0-33-generic
4.15.0-34-generic
4.15.0-36-generic
4.15.0-38-generic
4.15.0-39-generic
4.15.0-42-generic
4.15.0-43-generic
4.15.0-44-generic
4.15.0-45-generic
4.15.0-46-generic
4.15.0-47-generic
4.15.0-48-generic
4.15.0-50-generic
4.15.0-51-generic
4.15.0-52-generic
4.15.0-54-generic
4.15.0-55-generic
4.15.0-58-generic
4.15.0-60-generic
4.15.0-62-generic
4.15.0-64-generic
4.15.0-65-generic
4.15.0-66-generic
4.15.0-69-generic
4.15.0-70-generic
4.15.0-72-generic
4.15.0-74-generic
4.15.0-76-generic
4.15.0-101-generic
4.15.0-106-generic
4.15.0-108-generic
Server Migration Service
FAQs 4 OS Compatibility and Migration Restrictions
Issue 70 (2025-11-05) Copyright © Huawei Cloud Computing Technologies Co., Ltd. 35

--- Page 45 ---
OS Kernel Version
4.15.0-109-generic
4.15.0-111-generic
4.15.0-112-generic
4.15.0-115-generic
4.15.0-117-generic
4.15.0-118-generic
4.15.0-121-generic
4.15.0-122-generic
4.15.0-123-generic
4.15.0-124-generic
4.15.0-128-generic
4.15.0-129-generic
4.15.0-130-generic
4.15.0-132-generic
4.15.0-134-generic
4.15.0-135-generic
4.15.0-136-generic
4.15.0-137-generic
SUSE 4.4.21-69-default
4.12.14-94.41-default
4.12.14-95.29-default
4.12.14-122.46-default
4.12.14-197.64-default
4.12.14-122.176-default
4.12.14-122.186-default
4.12.14-122.201-default
4.12.14-122.216-default
 
4.2 What Are the Important Statements of SMS?
● Source server data collection
After the Agent starts on a source server, it reports the source server details to
SMS for migration feasibility check. For details about what information is
collected from source servers, see What Information Does SMS Collect
About Source Servers? The collected information is only used for migration
feasibility check. To use SMS, you need to allow SMS to collect source server
information.
Server Migration Service
FAQs 4 OS Compatibility and Migration Restrictions
Issue 70 (2025-11-05) Copyright © Huawei Cloud Computing Technologies Co., Ltd. 36

--- Page 46 ---
● License invalidity
After OSs, applications, and files on source servers are migrated to target
servers, the SIDs and MAC addresses of the servers will change. This means
that some OS or application licenses may become invalid. SMS is not
responsible for this type of issue. You can use the license server on Huawei
Cloud to obtain new Windows OS licenses and update or obtain application
licenses at your own expense.
● Do not perform operations on the OS or disks of target servers before the
migration is complete. This includes, but is not limited to, changing or
reinstalling the OS. SMS is not responsible for any fees or data damage
resulting from such actions.
● Target server disk formatting
During the migration, disks on the target server are formatted and re-
partitioned based on the source disk settings. Any existing data on the target
server will be lost. Before the migration, make sure you have backed up any
data on the target server that you need to save and ensure that the disks can
be formatted. SMS is not responsible for any data losses incurred.
● Source disk data security
SMS does not monitor data in source disks during the migration. You need to
ensure the security of your source disk data yourself. If the target servers or
servers in the same VPC as the target servers are infected by any Trojans or
viruses migrated from the source servers, SMS is not responsible for such
problems.
● Migration errors caused by source servers
SMS is not responsible for migration errors caused by source server problems,
including but is not limited to damaged hardware (such as damaged disks or
NICs), improper configurations, or software compatibility issues (such as
incompatible OSs and applications), damaged data files, heavy service traffic,
or slow network speeds. You can fix these problems by yourself, but if any
such problems persist, you can contact Huawei Cloud for assistance. Huawei
Cloud will make every effort to assist in resolving the problems but does not
guarantee all possible problems can be resolved. The following problems with
a source server may lead to migration errors:
– A faulty source server OS. For example, a Windows startup file is
damaged or missing.
– An incorrectly configured source server OS. For example, GRUB or fstab is
incorrectly configured on the source server.
– Source server network problems. For example, the source server cannot
access the Internet, the network is too slow, or the SSH connection or
firewall is faulty.
– Slow I/O on source server disks, too much incremental data, scattered
effective clusters (on Windows), or too many small files (on Linux). These
problems can slow down the migration or synchronization progress.
– An incompatible source platform service or software
– The Agent may be disabled by a source platform service or software, or
the I/O monitoring could be disabled by antivirus software on the source
server.
● If your target servers on Huawei Cloud cannot be started after the migration
is complete, Huawei Cloud can provide technical support to help you solve
Server Migration Service
FAQs 4 OS Compatibility and Migration Restrictions
Issue 70 (2025-11-05) Copyright © Huawei Cloud Computing Technologies Co., Ltd. 37

--- Page 47 ---
problems, but does not promise that all possible problems can be resolved.
There are many possible reasons that a target server may be unable to start,
for example:
– The source server cannot be restarted.
– The source server has a non-standard OS configuration.
– The source server has drivers or software that is incompatible with
Huawei Cloud.
● To ensure compatibility with Huawei Cloud, SMS modifies the system
configurations for target servers. For details, see What Are the Differences
Between Target and Source Servers After the Migration? SMS can ensure
data consistency before and after the migration but cannot ensure that your
services run properly after the migration. You need to modify related service
configurations thereafter.
● You are advised not to add data to target servers before the service cutover or
to source servers after the service cutover. If new data is generated on both
your source and target servers after the service cutover, SMS cannot combine
data on the source and target servers. If you want to combine the new data
on the source and target servers, you must design a solution by yourself.
● GPU server driver problems
If driver problems, such as lacking drivers for computing or graphics
acceleration, occur on target GPU servers after the migration is complete, you
need to install related drivers. If the problem persists, Huawei Cloud can
provide technical support for you, but does not guarantee all problems can be
resolved.
● Change to Huawei Cloud EulerOS (HCE)
HCE is an openEuler-based cloud operating system. When migrating servers
running CentOS 7 or CentOS 8, SMS allows you to change the OS to HCE. But
you need to use x2hce-ca to evaluate the compatibility of applications with
HCE and perform the OS change only after the applications are adapted to
HCE. If services on the target servers cannot run properly, Huawei Cloud can
provide technical support for you, but does not guarantee all problems can be
resolved.
● When migrating Windows servers, SMS calls some Windows APIs to obtain
data. SMS is not responsible for any call failures caused by the OS
configuration and hardware problems of these Windows servers. You need to
solve the problems by yourself.
● Service isolation and conflicts
SMS does not check your services on source servers or target servers, let alone
conflicts between them. You need to identify service conflicts and make
isolation if necessary. If there are such conflicts, SMS is not responsible.
● Temporary disks
SMS is free, but you pay for the temporary disks used during the migration.
For each migration, a temporary disk is created and attached to the target
server to ensure that the migration proceeds smoothly. Once the migration is
complete, the disk is automatically detached and deleted.
– If you delete a migration task before it is complete, you need to manually
delete the temporary disk. Otherwise, the disk will continue to be billed,
resulting in additional costs.
Server Migration Service
FAQs 4 OS Compatibility and Migration Restrictions
Issue 70 (2025-11-05) Copyright © Huawei Cloud Computing Technologies Co., Ltd. 38

--- Page 48 ---
– If you reinstall or change the OS for the target server before the
migration is complete, the migration task will fail. You need to manually
delete the temporary disk used for the migration. Otherwise, the disk will
continue to be billed, resulting in additional costs.
SMS is not liable for any additional fees incurred due to the temporary disk.
4.3 How Many Servers Can I Migrate Concurrently
Using SMS?
SMS allows you to register a maximum of 1,000 servers and migrate up to 100
servers concurrently. If you need to migrate more than 1,000 servers, delete
completed entries from the server list promptly to allow new servers to be
registered and migrated.
NO TE
Each migration task can transfer a source server to a target server.
4.4 How Do I Check the Firmware Type of a Source
Server?
After the Agent is installed and started on the source server, it reports source
server details to SMS. On the SMS console, you can click the source server name
on the Servers page and on the displayed page, review the firmware type of the
source server.
4.5 Why Do I Need to Install Additional Components
Before Migrating Amazon Linux 2023?
Reasons
The default kernel of Amazon Linux 2023 lacks certain essential components
needed for Huawei Cloud. These components are critical for the system to interact
Server Migration Service
FAQs 4 OS Compatibility and Migration Restrictions
Issue 70 (2025-11-05) Copyright © Huawei Cloud Computing Technologies Co., Ltd. 39

--- Page 49 ---
with the cloud platform. Without these components, the system cannot access
Huawei Cloud VNC feature or other dependent functions after the migration.
Preparations Before Migration
Run the following commands as the root user on the source server to install
necessary components for proper system operations after migration:
yum install kernel-modules-extra
4.6 What Should I Consider and Prepare Before
Migrating a Server Running Red Hat Enterprise Linux
CoreOS?
Red Hat Enterprise Linux CoreOS (RHCOS) is primarily designed to serve as the OS
for container nodes. To ensure a successful migration, specific constraints,
precautions, and preparatory steps must be considered.
Constraints
Item Constraint
Read-only /sysroot By default, the /sysroot directory is mounted as read-
only with the chattr +i /sysroot command. Before the
migration, you must remove the write protection of the /
sysroot directory.
Read-only mount
points
The /etc, /sysroot, /boot, and /usr directories are
mounted as read-only by default. To proceed with the
migration, you must remount them with read-write
permissions.
/boot/efi not
mounted by default
The /boot/efi directory is not mounted by default after
system startup. You must mount it manually.
Servers with BIOS
and GPT
File-level migration does not support BIOS boot
partitions. As a result, servers with BIOS firmware and
GPT partitioning cannot be migrated using this method.
They must be migrated using block-level migration
instead.
Automatic injection
of VirtIO drivers
during the migration
RHCOS uses the initramfs kernel structure tied to its
system version, so it is impossible to use the dracut
command to inject drivers during the migration. If the
VirtIO drivers are missing on the source server, the
migration cannot proceed.
 
Precautions
● Slow migration or synchronization: SMS migrates data by remotely
replicating files. The time required for the initial replication or synchronization
cannot be accurately estimated.
Server Migration Service
FAQs 4 OS Compatibility and Migration Restrictions
Issue 70 (2025-11-05) Copyright © Huawei Cloud Computing Technologies Co., Ltd. 40

--- Page 50 ---
● Impact on PVS-based mounting: During the migration, the target server
inherits the disk settings of the source server. This may change the settings of
any existing PVs and PVCs on the target server, thereby affecting the original
mounting mode.
NO TE
In PVS-based mounting, PVs and PVCs are created statically, and then PVs are bound
to PVCs so pods can access them.
● Container startup failure: SMS ensures file system consistency but does not
ensure that containers can be started properly after migration.
Preparations
● Remove the read-only attribute for /sysroot.
The read-only attribute of /sysroot is enforced using the chattr +i /sysroot
command. To remove the write protection for /sysroot, run the following
command on the source server as user root:
chattr -i /sysroot
● Remount the mount points with read-write permissions.
The /etc, /sysroot, /boot, and /usr directories are mounted as read-only by
default. You need to remount them with read-write permissions on the source
server as user root.
mount -o remount,rw /etc
mount -o remount,rw /sysroot
mount -o remount,rw /boot
mount -o remount,rw /usr
● Manually mount the /boot/efi directory.
RHCOS automatically unmounts the /boot/efi directory after startup, but the
files in the mount point must be accessible for migration. You can run the
blkid command to find the device for the /boot/efi directory. Typically, the
device is the partition labeled LABEL="EFI-SYSTEM".
Then, manually mount the partition. The command below is an example.
mount /dev/vda2 /boot/efi
● Check for the VirtIO drivers.
RHCOS uses the initramfs kernel structure tied to its system version, so it is
impossible to use the dracut command to inject drivers during the migration.
You can run the following command to check whether the initrd file includes
VirtIO drivers. If they are missing, manually add them.
lsinitrd {initrd-file} | grep virtio
Server Migration Service
FAQs 4 OS Compatibility and Migration Restrictions
Issue 70 (2025-11-05) Copyright © Huawei Cloud Computing Technologies Co., Ltd. 41

--- Page 51 ---
5 Source Servers
5.1 Can I Migrate Servers from Other Clouds to Huawei
Cloud?
Yes.
You can use SMS to migrate x86 cloud servers from AWS, Azure, Alibaba Cloud,
Tencent Cloud, and many other popular cloud platforms. You can also use SMS to
migrate on-premises x86 physical or virtual servers.
For details about the supported OSs, see What Are the Constraints on and What
OSs Are Supported by SMS?
5.2 Will My Services on the Source Server Be
Interrupted During Migration?
No. The migration primarily consumes the source bandwidth and requires minimal
additional resources like CPU and memory.
Before the migration, you are advised to check the source bandwidth usage and
properly allocate bandwidth to the migration process.
5.3 What Information Does SMS Collect About Source
Servers?
SMS uses the Agent to collect source server details to evaluate the migration
feasibility and provide data required for selecting or configuring target servers.
Table 5-1 lists the data collected from a Windows server. Table 5-2 lists the data
collected from a Linux server. All collected data is used for migration only.
Server Migration Service
FAQs 5 Source Servers
Issue 70 (2025-11-05) Copyright © Huawei Cloud Computing Technologies Co., Ltd. 42

--- Page 52 ---
Table 5-1 Collected Windows server details
Item Sub-Item Usage
Environme
nt
information
OS version Used for migration feasibility check.
Only source servers with OSs included
in Table 4-1 can be migrated.
Firmware type Used for migration feasibility check.
The source server can be booted from
BIOS or UEFI.
CPU Used for recommending the target
server flavor.
Memory Used for recommending the target
server flavor.
System directory Used for configuring the target server.
After the migration is complete, it will
be used to restore the registry.
Disk partition style Used for configuring the target server.
Before the migration starts, the disks of
the target server must be formatted
based on the disk settings of the source
server.
File system Used for migration feasibility check.
Only the NTFS partitions can be
migrated.
Available space Used for migration feasibility check. If
there is not enough space on a source
server partition, the migration may fail.
OEM system check Used for migration feasibility check. If
the system is an OEM system, the OS
needs to be reactivated after the
migration is complete.
Driver files Used for migration feasibility check.
The source server must have basic disk
drivers.
System services Used for migration feasibility check.
Volume Shadow Copy Service (VSS)
must be available on the source server.
User permissions Used for migration feasibility check.
You must have the administrator
permissions to run the Agent.
Server Migration Service
FAQs 5 Source Servers
Issue 70 (2025-11-05) Copyright © Huawei Cloud Computing Technologies Co., Ltd. 43

--- Page 53 ---
Item Sub-Item Usage
Disk
information
● Disk name
● Disk partition style
● Disk size
● Used space
Used for checking whether the disk
specifications of the target server meet
the migration requirements.
 
Table 5-2 Collected Linux server details
Item Sub-Item Usage
Environme
nt
information
OS version Used for migration feasibility check.
Only servers with OSs included in Table
4-2 or Table 4-3 can be migrated.
CPU Used for recommending the target
server flavor.
Memory Used for recommending the target
server flavor.
Paravirtualization Used for migration feasibility check.
SMS cannot migrate paravirtualized
source servers.
Firmware type Used for migration feasibility check.
The source server can be booted from
BIOS or UEFI.
Boot mode Used for migration feasibility check.
The source server must be booted from
BIOS.
rsync Used for evaluating synchronization
feasibility. SMS synchronization
depends on rsync on the source server.
Raw device Used for migration feasibility check.
Source servers using raw devices cannot
be migrated.
Disk partition Used for migration feasibility check.
The source disk partition style must be
Main Boot Record (MBR) or GUID
Partition Table (GPT).
Disk partition style Used for configuring the target server.
Before the migration starts, the disks of
the target server must be formatted
based on the disk settings of the source
server.
Server Migration Service
FAQs 5 Source Servers
Issue 70 (2025-11-05) Copyright © Huawei Cloud Computing Technologies Co., Ltd. 44

--- Page 54 ---
Item Sub-Item Usage
File system Used for migration feasibility check.
Supported file systems include Ext2,
Ext3, Ext4, VFAT, and XFS.
Disk
information
● Disk name
● Disk partition style
● Disk size
● Used space
Used for checking whether the disk
specifications of the target server meet
the migration requirements.
 
5.4 Can I Migrate Only Some Workloads from a Source
Server?
No. SMS migrates entire servers. If you want to migrate only some applications
such as databases on source servers, Data Replication Service (DRS) can help
you.
5.5 Can I Migrate a Source Server If There Is No
Matching Image Available on Huawei Cloud?
Yes. The server uses the same OS before and after the migration. You can do so by
preparing an image by yourself, as long as the server OS is supported by SMS.
Check the OSs supported by SMS.
5.6 Can I Use SMS to Migrate Self-built Databases, Big
Data Services, or Websites Deployed on a Source
Server?
You are advised not to use SMS to migrate databases, big data clusters, or
container clusters.
If you still want to use SMS in the above scenarios, the required migration time
cannot be estimated. After the migration is complete, you need to pause the
source services but do not stop the source servers or the Agent before performing
the final service cutover. Otherwise, the target servers may take a long time to
launch, data will be inconsistent between the source and target servers, or your
services may be unable to start on the target servers.
5.7 Does Using a Non-default SSH Port on the Source
Server Affect the Migration?
Using a non-default SSH port on the source server does not affect the migration.
Server Migration Service
FAQs 5 Source Servers
Issue 70 (2025-11-05) Copyright © Huawei Cloud Computing Technologies Co., Ltd. 45

--- Page 55 ---
6 Agent Installation and Startup
6.1 How Do I Download the SMS-Agent for Windows
and the SHA256 Verification File?
Step 1 Sign in to the SMS console.
Step 2 In the navigation pane on the left, choose Agents.
Step 3 Select the Windows card. Locate the SMS-Agent that matches the source server
OS, and click the 
  icon next to Agent to download the SMS-Agent installation
package. Click the 
  icon next to SHA256 File to download the file that
contains the hash value used to verify the integrity of the installation package.
● GUI-based Windows Agent (Python 3): Windows Server 2012, Windows Server
2016, Windows Server 2019, Windows Server 2022, Windows 10, and
Windows 8.1
● CLI-based Windows Agent (Python 2): Windows Server 2008 and Windows 7
----End
Server Migration Service
FAQs 6 Agent Installation and Startup
Issue 70 (2025-11-05) Copyright © Huawei Cloud Computing Technologies Co., Ltd. 46

--- Page 56 ---
6.2 How Do I Download and Install the Agent on
Source Servers?
Windows
Step 1 Sign in to the SMS console. In the navigation pane on the left, choose Agents.
Step 2 Select the Windows card, locate the Agent that matches the source server OS,
and click the 
  icon next to Agent to download the Agent installation package.
You can also use the following links to download the desired Agent:
● Windows Agent (Python 3)
https://sms-resource-intl-ap-southeast-3.obs.ap-
southeast-3.myhuaweicloud.com/SMS-Agent-Py3.exe
● Windows Agent (Python 2)
https://sms-resource-intl-ap-southeast-3.obs.ap-
southeast-3.myhuaweicloud.com/SMS-Agent-Py2.exe
CA UTION
When you download the Agent from the preceding links, you need to go to the
SMS console to read and agree to the Service Agreement.
Step 3 Click the 
  icon next to SHA256 File to download the SHA256 verification code.
Verify the integrity of the Agent installation file. For details, see How Do I Verify
the Integrity of the Agent Installation File?
You can also use the following links to download SHA256 verification code:
● Windows Agent (Python 3)
https://sms-resource-intl-ap-southeast-3.obs.ap-
southeast-3.myhuaweicloud.com/SMS-Agent-Py3.exe.sha256
Server Migration Service
FAQs 6 Agent Installation and Startup
Issue 70 (2025-11-05) Copyright © Huawei Cloud Computing Technologies Co., Ltd. 47

--- Page 57 ---
● Windows Agent (Python 2)
https://sms-resource-intl-ap-southeast-3.obs.ap-
southeast-3.myhuaweicloud.com/SMS-Agent-Py2.exe.sha256
Step 4 Install the software by referring to Installing the SMS-Agent on Windows.
----End
Linux
Step 1 Sign in to the SMS console. In the navigation pane on the left, choose Agents.
Step 2 Select the Linux card, and in the Linux Agent area, click the 
  icon next to
Agent URL to copy the Agent download command. Run the command on the
source server to download the Agent installation package.
You can also use either of the following commands to download the Agent:
wget -t 3 -T 15 https://sms-resource-intl-ap-southeast-3.obs.ap-southeast-3.myhuaweicloud.com/SMS-
Agent.tar.gz
curl -O https://sms-resource-intl-ap-southeast-3.obs.ap-southeast-3.myhuaweicloud.com/SMS-Agent.tar.gz
CA UTION
When you download the Agent using the preceding commands, you need to go to
the SMS console to read and agree to the Service Agreement.
Step 3 Copy the command next to SHA256 File and run the command on the source
server. Use the hash value contained in the SHA256 file to verify the integrity of
the Agent installation package. For details, see How Do I Verify the Integrity of
the Agent Installation File?
Server Migration Service
FAQs 6 Agent Installation and Startup
Issue 70 (2025-11-05) Copyright © Huawei Cloud Computing Technologies Co., Ltd. 48

--- Page 58 ---
You can also run either of the following commands to download the SHA256
verification code:
wget -t 3 -T 15 https://sms-resource-intl-ap-southeast-3.obs.ap-southeast-3.myhuaweicloud.com/SMS-
Agent.tar.gz.sha256
Step 4 Decompress the Agent software package.
tar -zxvf SMS-Agent.tar.gz
Step 5 Switch to the SMS-Agent directory on the source server.
cd SMS-Agent
Step 6 If you do not need to use an HTTPS proxy, go to 7.
If you do not need to use an HTTPS proxy, go to 8.
CA UTION
● If your source server cannot access Huawei Cloud over the Internet, you can
use a proxy server. You will need to configure the proxy server yourself.
● In a migration over a private line or VPN, a proxy server is only used for
registering the source server with SMS. It is not used for data migration.
Step 7 (Optional) Configure the HTTP/HTTPS proxy for the Agent.
1. Go to the config directory.
cd SMS-Agent/agent/config
2. Open and edit the auth.cfg file. Do not edit the auth.cfg file unless you need
to use an HTTP/HTTPS proxy.
vi auth.cfg
The values shown here are for reference only.
[proxy-config]
enable = true
proxy_addr = https://<your-proxy-address>.com
proxy_port = 3128
proxy_user = root
use_password = true
NO TE
– enable: To use a proxy, set it to true.
– proxy_addr: Replace <your-proxy-address> with the IP address of the proxy server,
not that of the target server. Use the protocol configured for the proxy. HTTPS is
recommended.
– proxy_user: Enter the username required for the proxy. If no username is required,
leave it blank.
– use_password: If a password is required for the proxy, set it to true. If no password
is required, set it to false.
3. Save the auth.cfg file and exit.
:wq
Step 8 Start the Agent.
./startup.sh
Step 9 Read the displayed information carefully, enter y, and press Enter.
Server Migration Service
FAQs 6 Agent Installation and Startup
Issue 70 (2025-11-05) Copyright © Huawei Cloud Computing Technologies Co., Ltd. 49

--- Page 59 ---
Figure 6-1 Entering y
Step 10 Enter the AK/SK pair for the Huawei Cloud account that you are migrating to and
the SMS domain name. You can obtain the SMS domain name on the Agents
page of the SMS console, as shown in Figure 6-3.
Figure 6-2 Entering the AK/SK pair
Figure 6-3 Obtaining the SMS domain name
If the EPS service has been enabled for your Huawei Cloud account, after you
entered the AK/SK pair, the Agent will list all enterprise projects your account is
allowed to access. You can select the enterprise project you would like to migrate
the source server to. This enables you to isolate permissions, resources, and
finance during the migration. For details, see Migrating a Server into an
Enterprise Project.
When the information shown in the figure below is displayed, the SMS-Agent has
been started up and will automatically start reporting source server information to
SMS. You can go to the Servers page on the SMS console to view the record of
the source server.
Figure 6-4 Agent running
----End
Server Migration Service
FAQs 6 Agent Installation and Startup
Issue 70 (2025-11-05) Copyright © Huawei Cloud Computing Technologies Co., Ltd. 50

--- Page 60 ---
6.3 What Can I Do If I Fail to Download the Agent
Installation File?
Step 1 Check that your computer can access the Internet. Then, run the following
command in the cmd window to check whether Address is followed by the IP
address shown in the figure below.
nslookup sms-resource-intl-ap-southeast-3.obs.ap-southeast-3.myhuaweicloud.com
Step 2 If the IP address is not displayed, add the following record to the hosts file, and
download the package again:
100.125.100.2 sms-resource-intl-ap-southeast-3.obs.ap-
southeast-3.myhuaweicloud.com
NO TE
In Windows, the hosts file is stored in the C:\Windows\System32\drivers\etc directory and
can only be edited by the super administrator. In Linux, the hosts file is stored in the /etc
directory.
Step 3 If the IP address is displayed, check whether the domain name corresponding to
the IP address is in the hosts file. If it is, delete the record and download the
package again.
Step 4 If the download still fails after you have performed the preceding steps, you are
advised to use another computer to download the package and upload it to the
source server from there.
----End
6.4 How Do I Verify the Integrity of the Agent
Installation File?
Step 1 Sign in to the SMS console.
Step 2 In the navigation pane on the left, choose Agents. Click SHA256 File for the
Agent you need to save the file containing a hash value to the local PC.
Step 3 Generate a hash value for the Agent installation file you have downloaded.
● Windows Agent
certutil -hashfile SMS-Agent-PyN.exe SHA256
SMS-Agent-PyN.exe is the migration Agent installation file name.
Server Migration Service
FAQs 6 Agent Installation and Startup
Issue 70 (2025-11-05) Copyright © Huawei Cloud Computing Technologies Co., Ltd. 51

--- Page 61 ---
● Linux Agent
sha256sum SMS-Agent.tar.gz
Step 4 Compare the hash values obtained in Step 2 and Step 3.
● If they are consistent, the Agent installation file is complete.
● If they are inconsistent, download the Agent you need again and repeat 3 and
4 for verification.
----End
6.5 Why Wasn't My Source Server Added to the SMS
Console After I Configured the Agent?
After the Agent was installed and configured on the source server, the source
server information was not added to the SMS console. In this case, you need to
perform the following operations:
Step 1 Check whether the source server has been registered with SMS. If the source
server is registered with SMS, the message "sms agent starts up successfully" will
be displayed on the CLIs of Windows Agent (Python 2) and Linux Agent, and the
message "Upload success" will be displayed in the GUI of Windows Agent (Python
3).
Step 2 Check whether you use the correct account to sign in to the SMS console and
whether the AK/SK pair of the account is entered when you start the Agent.
Step 3 If the source server has been successfully registered with SMS, and the console
version matches the Agent version, but no records are displayed, wait for about a
minute and refresh the page.
----End
6.6 How Do I Configure Certificate Verification in the
SMS-Agent Configuration File?
You can enable or disable certificate verification for requests from SMS-Agent to
Huawei Cloud APIs. To do so, you need to configure the servercheck parameter in
the SMS-Agent configure file g-property.cfg which is located in the SMS-Agent
installation directory.
● If servercheck is set to True, certificate verification is enabled. When an API
request is sent, certificate verification is performed.
● If servercheck is set to False, certificate verification is disabled. In this case,
certificate verification is not performed when an API request is sent.
Server Migration Service
FAQs 6 Agent Installation and Startup
Issue 70 (2025-11-05) Copyright © Huawei Cloud Computing Technologies Co., Ltd. 52

--- Page 62 ---
6.7 Where Can I Find the Agent Run Logs?
The run logs of the SMS-Agent are stored in the Logs folder under the installation
directory of the SMS-Agent. For details, see Agent log files.
Table 6-1 Agent log files
File Location Description
startup.log ● Windows
C:\SMS-Agent-Py3\Logs or
C:\SMS-Agent-Py2\Logs
● Linux
../SMS-Agent/agent/Logs
NOTE
In the preceding directory, ../
indicates the directory where the
SMS-Agent is stored.
Records the Agent startup logs.
SmsAgent_
Info.log
Records the Agent run logs.
SmsAgent_
Error.log
Logs Agent errors.
 
Table 6-2 lists the log files generated during the migration and synchronization of
a Linux server and their paths.
Table 6-2 Log files generated during the migration and synchronization of a Linux
server
File Location Description
f2f_migrate_schedule.log /root/
f2f_migrate_schedule.log
Logs generated during
Linux migration and
synchronization
f2f_migrate_error.log /root/
f2f_migrate_error.log
Error logs generated
during Linux migration
and synchronization
 
Server Migration Service
FAQs 6 Agent Installation and Startup
Issue 70 (2025-11-05) Copyright © Huawei Cloud Computing Technologies Co., Ltd. 53

--- Page 63 ---
6.8 How Do I Resolve Error "SMS.5109 The application
cannot be started due to incorrect parallel
configuration" When I Start the Agent?
Symptom
When you started the Agent (Python 2) on Windows Server 2008, you received
error message "SMS.5109 The application cannot be started due to incorrect
parallel configuration."
Solution
For details, see Why Does the Agent Not Start the First Time I Launch It?
6.9 Why Does the Agent Not Start the First Time I
Launch It?
Due to the permission structure on some Windows machines, the Agent cannot be
started the first time you launch it. If this happens:
1. Right-click the Start menu.
2. Click Run and enter cmd.
3. Enter cd C:\SMS-Agent-Py2 to switch to the Agent installation directory. Run
the following command:
echo {ak} {sk} {sms_domain} | SMSAgentDeploy.exe pipe
Replace {ak}, {sk}, and {sms_domain} with the AK/SK pair and SMS domain
name required for starting the Agent.
NO TE
● You must have a valid AK/SK pair. To learn how to obtain an AK/SK pair, see How Do I
Obtain an AK/SK Pair for an Account? or How Do I Obtain an AK/SK Pair for an IAM
User?
● If message "[401:{"error_msg": " Incorrect IAM authentication in formation: xxx xxx not
exist","error_code":"APIGW.0301","request_id":"xxx"} "]" is displayed during the
execution, check whether the entered AK and SK are correct.
6.10 Why Does the Windows Agent Executable Not
Run When I Double-Click It?
Symptom
You double-clicked the Windows Agent executable to install the SMS-Agent, but
the file did not run.
Server Migration Service
FAQs 6 Agent Installation and Startup
Issue 70 (2025-11-05) Copyright © Huawei Cloud Computing Technologies Co., Ltd. 54

--- Page 64 ---
Possible Causes
The file is blocked by the system.
Solution
Right-click SMS-Agent-py*.exe and select Properties from the shortcut. In the
Security area of the General tab, select Unblock, and run the file again.
6.11 How Do I Fix Error "INTERNAL ERROR: cannot
create temporary directory!" When I Start the Agent?
Symptom
When you started the SMS-Agent-Py2, you received error message "INTERNAL
ERROR: cannot create temporary directory!"
Possible Causes
Some files will be generated in a temp directory of the C: drive when you install
SMS-Agent-Py2. This error occurs if the available space of the C: drive is
insufficient or if you do not have the permission to create a temp directory there.
Solutions
● Check how much space is available on the C: drive. If there is not enough
space, clean up the drive.
● Check whether you can create a temp directory on the C: drive. You may need
to obtain write permissions.
6.12 How Do I Troubleshoot Failures of Pasting the
AK/SK Pair When I Start the SMS-Agent (Python 2) on
Windows Server 2008?
Symptom
When you started the SMS-Agent (Python 2), you could not paste the AK/SK pair
by right-clicking in the command window.
Server Migration Service
FAQs 6 Agent Installation and Startup
Issue 70 (2025-11-05) Copyright © Huawei Cloud Computing Technologies Co., Ltd. 55

--- Page 65 ---
Prerequisites
You have obtained the AK/SK pair. For details, see How Do I Obtain an AK/SK
Pair for a Huawei Cloud Account? or How Do I Obtain an AK/SK Pair for an
IAM User?
Solution
Step 1 Log in to the source server.
Step 2 Go to the SMS-Agent installation directory C:\SMS-Agent-Py2 and double-click
agent-start.exe.
Step 3 Copy the AK, click the icon in the upper left corner of the window, choose Edit >
Paste from the displayed menu, and press Enter.
Step 4 Copy the SK, click the icon in the upper left corner of the window, choose Edit >
Paste from the displayed menu, and press Enter.
----End
6.13 How Do I Resolve Error "utf-8 codec can't decode
byte 0xce in position0: invalid continuation byte"
When I Start the Agent?
Symptom
In Linux, after you ran ./startup.sh or bash startup.sh to start the Agent, the
following message was displayed: "utf-8 codec can't decode byte 0xce in position0:
invalid continuation byte."
Server Migration Service
FAQs 6 Agent Installation and Startup
Issue 70 (2025-11-05) Copyright © Huawei Cloud Computing Technologies Co., Ltd. 56

--- Page 66 ---
Possible Causes
The character set of the source system is incorrect and is incompatible with SMS.
As a result, the Agent could not be started.
Solution
1. Log in to the source server.
2. Set the character set.
export LANG="en_US.UTF-8"
3. Restart the Agent. If the problem persists, set the character set again.
export LC_ALL="en_US.UTF-8"
export LANG="en_US.UTF-8"
Impact Scope
Setting the character set affects only the current shell and applications in the
shell. It does not affect your files or other applications.
6.14 How Do I Restart the Agent?
Windows
● Windows Agent (Python 3)
a. Right-click the SMS-Agent icon in the task tray and choose Quit from the
shortcut menu.
b. Open the C:\SMS-Agent-Py3 folder and double-click SMS-Agent.exe.
c. On the page that is displayed, enter the AK/SK pair when promoted and
click Start.
● Windows Agent (Python 2)
a. Open the C:\SMS-Agent-Py2 folder and double-click restart.bat.
b. In the CMD window that is displayed, enter the AK/SK pair and SMS
domain name when prompted.
Linux
1. Go to the directory where the SMS-Agent installation package is
decompressed and run ./restart.sh.
2. Enter the AK/SK pair and SMS domain name when prompted.
6.15 How Do I Fix Agent Startup Failures Due to
Insufficient Space in /tmp on a Linux Source Server?
Symptom
When you ran sh startup.sh to start the SMS Agent, the following message was
displayed:
Server Migration Service
FAQs 6 Agent Installation and Startup
Issue 70 (2025-11-05) Copyright © Huawei Cloud Computing Technologies Co., Ltd. 57

--- Page 67 ---
Failed to write all bytes for cffibackend.cpython-36m-x86_64-linux.gnu.so
fwrite: No space left on device
Possible Causes
When the Agent is being started, directories and files are generated in the /tmp
directory on the source server. These files will occupy about 40 MB of space. You
need to reserve more than 100 MB space for the /tmp directory.
Solution
Step 1 Log in to the source server.
Step 2 Run the df -lh command to check whether there is a volume mounted to
the /tmp directory. If there is, check the available space on that volume.
Step 3 If the available space in the /tmp directory is insufficient for the mounted volume,
perform either of the following operations:
● Delete unnecessary files or expand the capacity of the volume mounted to
the /tmp directory.
● Run export TMPDIR=/home/user/tmpdir (replace /home/user/tmpdir with a
directory that has enough available space) to change the cache directory.
----End
6.16 How Do I Fix Error "Failed to start sms agent!
disks" When I Start the Agent on a Linux Source
Server?
Symptom
When you started the Agent on a Linux source server, message "Failed to start sms
agent! disks" was displayed.
Possible Causes
Possible causes are:
1. There are multiple volume groups with the same name.
Check whether the SmsAgent_Error.log file records "Multiple VGs found with
the same name".
SMS requires that a Linux source server cannot have volume groups with the
same name, or the Agent will be unable to collect information about the
source server disks. Run the vgdisplay command to check whether there are
Server Migration Service
FAQs 6 Agent Installation and Startup
Issue 70 (2025-11-05) Copyright © Huawei Cloud Computing Technologies Co., Ltd. 58

--- Page 68 ---
volume groups with the same name, and run the lvdisplay command to view
logical volume properties, such as the host name and creation time.
2. The fdisk command cannot be found on the source server.
Run the fdisk -l command on the source server to check whether the fdisk
command exists in your path. If fdisk cannot be found, the possible cause is
that the /sbin directory is not included in PATH, or the /sbin directory is
included in PATH but does not take effect. This problem may occur after you
run the su command to switch to the root user.
Solutions
1. If there are volume groups with the same name in Linux, these volume groups
and the corresponding logical volumes cannot be mounted or read.
You can detach the involved disks from the source server and attach them to
another server. Then check whether the data on the disks needs to be
migrated.
– If the data needs to be migrated, run the vgrename command to rename
each of these volume groups, and attach the disks back to the source
server. Then restart the SMS-Agent.
– If the data does not need to be migrated, restart the SMS Agent. After
the migration is complete, attach the disks back to the source server.
2. Run the source /etc/profile command and restart the SMS Agent.
6.17 How Do I Fix Error "Failed to obtain information
about disk %s" When I Start the Agent on a Linux
Source Server?
Symptom
When you started the Agent on a Linux source server, you received message
"Failed to obtain information about disk %s. Cause: unknown physical volume!"
Possible Causes
The source server uses LVM, and there are unknown physical volumes on the
server. The Agent cannot collect the information about these volumes.
You can run the pvs command on the source server to check the details about its
physical volumes.
Server Migration Service
FAQs 6 Agent Installation and Startup
Issue 70 (2025-11-05) Copyright © Huawei Cloud Computing Technologies Co., Ltd. 59

--- Page 69 ---
Solutions
Step 1 Contact technical support of the source platform to restore the source server.
Step 2 After the source server is restored, run the pvs command to check if there are still
any unknown physical volumes on the server.
If there are no unknown physical volumes, restart the Agent.
----End
6.18 How Do I Choose When the System Asks Whether
to Disable the Google Services Detected on My Source
Server on Google Cloud?
Description
When I started the Agent on the Linux source server running on Google Cloud, the
system asked me whether to disable the detected Google services.
Background
Some Google services depend on Google Cloud. After the source server is migrated
to Huawei Cloud, Google services cannot run properly. As a result, after the
migration, the target server may fail to be launched or other services may fail to
be started. Before the migration, read Description of Disabling Google Services
and make evaluations based on service requirements.
NO TE
● Disabling these services does not affect the source server. It only affects the
configuration of startup services on the target server.
● If your services depend on Google services, contact Huawei Cloud technical support
before the migration.
● If you choose to disable these Google services, enter y. During the target
server configuration, the Agent will disable these services on the target server.
● If you choose not to disable Google services, enter n and change the value of
disableplatformservice to False in the .../SMS-Agent/agent/config/g-
property.cfg file in the SMS-Agent installation directory. After the migration,
all service settings are retained, and the target server or some services may
fail to be started.
What Happens If You Choose to Disable Google Services
● Servers with startup services in the /etc/systemd/system directory, such as
those running Ubuntu, CentOS 8, or CentOS 9
Server Migration Service
FAQs 6 Agent Installation and Startup
Issue 70 (2025-11-05) Copyright © Huawei Cloud Computing Technologies Co., Ltd. 60

--- Page 70 ---
If you choose to disable the Google services, the Agent will only delete the
soft links related to these services in the /etc/systemd/system directory. The
service files pointed by the soft links are not affected.
NO TE
Deleting the soft links of a service prevents the service from starting automatically at
startup but does not affect the actual files of the service.
● Servers with startup services in the /etc/init directory, such as those running
CentOS 6
If you choose to disable the Google services, the Agent will check the
configuration files whose names start with google in the /etc/init directory,
move these configuration files to /etc/backup_googleconf, and compress the
folder into package google_conf_bak.tar.gz for backup.
6.19 What Do I Do If a Source Server's Name I Modified
on the SMS Console Is Overwritten After the SMS-
Agent Is Restarted?
Symptom
You had changed the source server's name on the SMS console, but the name was
changed back to the original one after SMS-Agent was restarted.
Figure 6-5 Changing the name for a source server on the SMS console
Possible Causes
The migration task is in the Pending target configuration state, and the source
server is in Verifying state at the background. In this case, when the SMS-Agent is
restarted on the source server, the source server information will be updated and
verified again.
Server Migration Service
FAQs 6 Agent Installation and Startup
Issue 70 (2025-11-05) Copyright © Huawei Cloud Computing Technologies Co., Ltd. 61

--- Page 71 ---
Solution
To ensure that the source server's name remains unchanged after the SMS-Agent
is restarted, you need to change the source server's name after you configure the
target server. After the target server configuration is complete, it signals the end
of the pre-migration checks, and the source server moves to the next state. From
this point forward, even if the SMS-Agent is restarted, the source server's
information will no longer be updated.
6.20 How Do I Fix the Error "DLL load failed" When I
Try to Start the SMS-Agent on a Windows Source
Server?
Symptom
The SMS-Agent.exe program could not start on the Windows source server, and
the following error message was displayed: "Failed to execute script
'pyi_rth_pkgres' due to unhandled exception: DLL load failed while importing
pyexpat."
Possible Causes
SMS-Agent.exe is an application packaged using Python. It relies on certain OS
components of the source server. This error happens if the SMS-Agent in Python 3
installed on the source server cannot find the underlying dynamic link library
(DLL) file during the startup.
Solution
Use the SMS-Agent in Python 2 for migration. This version has better
compatibility.
1. Sign in to the SMS console. On the Agents page, select Windows and
download the Windows Agent (Python 2) version to the source server.
2. Log in to the source server as user Administrator and double-click the SMS-
Agent-Py2.exe file.
Server Migration Service
FAQs 6 Agent Installation and Startup
Issue 70 (2025-11-05) Copyright © Huawei Cloud Computing Technologies Co., Ltd. 62

--- Page 72 ---
3. In the installation wizard, click Install. After the installation is complete, click
Finish. The program files are automatically decompressed to the installation
directory (C:\SMS-Agent-Py2 by default).
4. Go to the SMS-Agent installation directory C:\SMS-Agent-Py2 and double-
click agent-start.exe.
5. In the displayed CLI, enter the AK/SK pair for the account that owns the
target server and the SMS domain name. Typically, the SMS-Agent starts up
without issues.
Server Migration Service
FAQs 6 Agent Installation and Startup
Issue 70 (2025-11-05) Copyright © Huawei Cloud Computing Technologies Co., Ltd. 63

--- Page 73 ---
7 Target Server Consultation
7.1 Can I Migrate Workloads to FlexusL and FlexusX
Instances, DeHs, DeCs, Kunpeng ECSs, or BMSs Using
SMS?
FlexusL and FlexusX Instances
Yes. Before the migration, purchase a FlexusL instance or purchase a FlexusX
instance. When you create a migration task, use the created FlexusL or FlexusX
instance as the target server.
DeH
Yes. Before the migration, purchase a DeH. When you configure the target server,
select the DeH that you purchased.
DeCs
Yes. Before the migration, enable a DeC and apply for an ECS. When configuring
the target server, select the ECS you requested.
Kunpeng ECSs
No
BMSs
No
7.2 What ECS Types Are Supported by SMS?
SMS migrates only x86 servers, and the target servers must use the x86
architecture. The following lists the x86-based ECS types. For more information,
see Instance Types.
Server Migration Service
FAQs 7 Target Server Consultation
Issue 70 (2025-11-05) Copyright © Huawei Cloud Computing Technologies Co., Ltd. 64

--- Page 74 ---
● General computing-basic
● General computing
● General computing-plus
● Memory-optimized
● Large-memory
● High-performance computing
● Ultra-high performance computing
● FPGA-accelerated
● AI inference-accelerated
● GPU-accelerated
7.3 What Are the Differences Between Target and
Source Servers After the Migration?
The target server settings such as OS, OS files, and parameters you configure
when you create a migration task are applied on the target server. So, there are
some differences between the source and target servers. They are listed in the
following tables (for reference purposes only and with the final interpretation by
SMS). In addition, the target server settings will change with system updates after
the migration.
Table 7-1 Items that are not changed (applicable to both Windows and Linux)
Item After Migration Remarks
OS type The target server runs
the same type of OS
as the source server.
The original OS of the target server is
overwritten.
IP address The IP addresses of
the target server are
used.
The target server uses its original public
IP address. If the private IP address of
the source server is included in the
network segment of the VPC to which
the target server belongs, the private IP
address can remain unchanged.
Username The target server uses
the same username as
the source server.
-
Password/
Certificate
The target server uses
the same username,
certificate, and
password as the
source server.
-
Server Migration Service
FAQs 7 Target Server Consultation
Issue 70 (2025-11-05) Copyright © Huawei Cloud Computing Technologies Co., Ltd. 65

--- Page 75 ---
Item After Migration Remarks
Data The target server has
the same data,
including files,
applications, and
configurations, as the
source server.
-
 
Table 7-2 Items that are changed - Windows
Item After Migration Remarks
Hostname The hostname may be
changed.
Services associated with the hostname
may be affected.
MAC address The MAC address of
the target server is
used.
A MAC address is a unique identifier
assigned to a NIC when a target server
is created.
DNS The DNS settings are
probably changed on
the target server.
● The DNS
configuration files
on the target server
are the same as
those on the source
server.
● The DNS settings of
the subnet that the
target server
belongs to affect
the DNS resolution
of the target server.
After the migration is complete, you
can modify the DNS settings of the
target server.
EIP The EIP bound to the
target server is used.
-
Disk and
partition
sizes
The disk and partition
settings from the
source server are
retained on the target
server.
If you choose to resize disks and
partitions for the target server when
you configure the migration task, the
new disk and partition settings are
applied on the target server.
Security
Identifier
(SID)
The SID of the target
server is used.
In Windows, a SID is a unique,
immutable identifier for a server in a
given domain. If the source server is
added to a domain, the SID will
become invalid on the target server.
You need to add the target server to
the domain again.
Server Migration Service
FAQs 7 Target Server Consultation
Issue 70 (2025-11-05) Copyright © Huawei Cloud Computing Technologies Co., Ltd. 66

--- Page 76 ---
Item After Migration Remarks
Registry and
BCD files
The registry and BCD
file are modified as
needed.
SMS modifies the registry and BCD files
to adapt the target server to Huawei
Cloud.
Dynamic
partitioning
The dynamic
partitioning settings
are modified.
This is for Windows servers that boot
from BIOS.
Driver file
directory
The source driver files
are replicated to the
driver directory on the
target server.
-
 
Table 7-3 Items that are changed - Linux
Item After Migration Remarks
Hostname The hostname may be
changed.
Services associated with the hostname
may be affected.
MAC address The MAC address of
the target server is
used.
A MAC address is a unique identifier
assigned to a NIC when a target server
is created.
DNS The DNS settings are
probably changed on
the target server.
● The DNS
configuration files
on the target server
are the same as
those on the source
server.
● The DNS settings of
the subnet that the
target server
belongs to affect
the DNS resolution
of the target server.
After the migration is complete, you
can modify the DNS settings of the
target server.
EIP The EIP bound to the
target server is used.
-
Disk and
partition
sizes
The disk and partition
settings from the
source server are
retained on the target
server.
If you choose to resize disks and
partitions for the target server when
you configure the migration task, the
new disk and partition settings are
applied on the target server.
Server Migration Service
FAQs 7 Target Server Consultation
Issue 70 (2025-11-05) Copyright © Huawei Cloud Computing Technologies Co., Ltd. 67

--- Page 77 ---
Item After Migration Remarks
Disk name New disk names are
generated based on
the virtualization type
of the target server.
Services are not affected.
UUIDs and
PARTUUIDs
of disks and
partitions
New UUIDs and
PARTUUIDs are
generated on the
target server.
This only applies to Linux file-level
migrations.
GRUB
configuratio
n files
GRUB configuration
files are modified
based on the boot disk
or boot partition UUID
on the target server.
● GRUB needs to be installed on
target servers that boot from the
BIOS. SMS modifies the GRUB
configuration files in the /boot/
grub directory of every target
server.
● For target servers that boot from
UEFI, SMS modifies UUID in the
GRUB configuration files located in
the /boot/efi/ and /boot/grub
directories.
initrd or
initramfs for
startup
SMS injects related
drivers into the initrd
or initramfs file.
This is to ensure that the target server
can start properly on Huawei Cloud.
X11
configuratio
n file
xorg.conf
Configuration
file /etc/X11/xorg.conf
is modified on the
target server.
This file stores the GUI and display
settings. The original file is backed up
as /etc/X11/xorg.conf.bak.
Third-party
tools
The following tools are
deleted from the target
server:
● /etc/rc.d/rc5.d/
vmware-tools
● /etc/rc.d/rc3.d/
vmware-tools
● /etc/init.d/vmware-
tools
-
SELinux
security
configuratio
ns
A new /.autorelabel
file is generated to
relabel all file systems.
This only applies to Red Hat, CentOS,
and Oracle Linux distributions.
Password
reset plug-in
Password reset plug-in
CloudRestPwdAgent is
installed in the /home
directory on the target
server.
If you do not want to install this plug-
in, change the value of
installPwdAgent in the g-
property.cfg configuration file to false
before the migration.
Server Migration Service
FAQs 7 Target Server Consultation
Issue 70 (2025-11-05) Copyright © Huawei Cloud Computing Technologies Co., Ltd. 68

--- Page 78 ---
Item After Migration Remarks
System time NTP configuration
file /etc/ntp.conf is
modified on the target
server.
The system time is changed to the
standard time of the region where the
target server is located.
MOTD The /etc/motd file is
cleared on the target
server.
By default, no startup screen message
is set on the target server.
fstab startup
items
A new fstab file is
generated based on
the UUIDs and
mounting statuses of
partitions on the target
server.
Startup records in the original /etc/
fstab file are commented out on the
target server.
Cloud-Init Cloud-Init is disabled
on the target server.
The /etc/cloud/cloud.cfg file is
deleted.
CAUTION
After the migration is complete, you need
to install and configure Cloud-Init. For
details, see Installing Cloud-Init and
Configuring Cloud-Init.
NIC settings SMS deletes some
network-related
configuration files from
the /etc/udev/rules.d/
directory, and backs up
and modifies DHCP
configuration files
based on the target
server OS.
The NIC configuration file varies with
OS.
For example:
● ifcfg-ethx: Red Hat, CentOS, SUSE,
and EulerOS
● Yaml file: Debian and Ubuntu
Google
services
Services on the source
platform, such as
Google services, are
disabled on the target
server by default.
Services from source platforms cannot
run on Huawei Cloud. If these services
are not disabled, the target server may
fail to start or the services may be
abnormal.
You can run the following command
on the source server to check whether
there are Google-related strings in the
automatic startup program:
(find /etc/systemd/system/ -name 'google*' -type l 
| grep 'service') & (find  /etc/init/  -name 'google*' 
| grep 'conf') 2>/dev/null
 
Server Migration Service
FAQs 7 Target Server Consultation
Issue 70 (2025-11-05) Copyright © Huawei Cloud Computing Technologies Co., Ltd. 69

--- Page 79 ---
7.4 What Determines the Specifications of a Target
Server?
The specifications of a target server are determined by the option you select when
you configure the target server.
● Use existing
If you select this option, the target server will have the same specifications as
the existing server that you choose.
● Create new
If you select this option, the target server will have the specifications that you
configure.
Server Migration Service
FAQs 7 Target Server Consultation
Issue 70 (2025-11-05) Copyright © Huawei Cloud Computing Technologies Co., Ltd. 70

--- Page 80 ---
7.5 How Will the Authentication of a Target Server
Change After the Migration?
The changes to the authentication of a target server are as follows:
● For a completed migration, the target server uses the same login credentials
as the source server. Any usernames, certificates, and passwords will remain
unchanged.
● For an ongoing Linux migration, the login credentials of the target server
depend on the option you choose when you configure the target server.
– If Use existing is selected, the target server uses its original login
credentials.
– If Create new is selected, a random password is generated. After the
migration is complete, the target server uses the same credentials as the
source server.
7.6 Why Is the File System Size Inconsistent Before and
After the Migration?
Symptom
● After the migration is complete, the used partition space on the target server
is different from that on the source server.
● After the migration is complete, a particular file size on the target server is
different from that on the source server.
Possible Causes
If there are sparse files on the source server, the total size of the migrated files on
the target server may be smaller than that on the source server. This is because
rsync automatically truncates sparse files during transmission. The file system
transparently converts metadata representing empty blocks into "real" blocks
filled with null bytes at runtime.
You can check whether the files are consistent before and after the migration. For
details, see Procedure.
NO TE
In a UNIX file system, when the file displacement is greater than the file length, the next
write operation will extend the file length and form a hole in the file, creating a sparse file.
This is achieved by writing brief information (metadata) representing the empty blocks to
disks instead of the actual "empty" space which makes up the block, thus consuming less
disk space. The full block size is written to disk as the actual size only when the block
contains "real" (non-empty) data.
Procedure
1. Check the size of the file on the source server and the used disk space.
The /tmp/test-data.img file is used as an example.
Server Migration Service
FAQs 7 Target Server Consultation
Issue 70 (2025-11-05) Copyright © Huawei Cloud Computing Technologies Co., Ltd. 71

--- Page 81 ---
a. Check the size of the /tmp/test-data.img file.
ll /tmp/test-data.img
b. Check the disk space occupied by /tmp/test-data.img.
du -sh /tmp/test-data.img
Figure 7-1 Checking the file size
2. After the migration is complete, check the size of the migrated file on the
target server. Figure 7-2 shows that the used disk space decreases after the
migration.
Figure 7-2 Checking target server file size
3. Run the following command on the source server and target server to obtain
the SHA256 values of the files to determine whether the files are the same.
If the SHA256 values of the files are the same, the file content is consistent.
sha256sum /tmp/test-data.img
Figure 7-3 Obtaining the sha256 value
7.7 Will an Incremental Synchronization Overwrite
Existing Data on a Launched Target Server?
Yes. Data existing on the target server will be overwritten by data synchronized
from the source server.
Reasons
● Linux file-level synchronizations depend on rsync. During a synchronization,
data changes are identified by comparing data on the source and target
servers. These changes will be synchronized to the target server, and existing
data on the target server will be overwritten or deleted.
● Linux and Windows block-level migrations are performed by block. During a
synchronization, the system identifies the differences between disk blocks on
the source and target servers. It does not compare the data on those disk
blocks. The changed disk blocks on the source server will be synchronized to
the target server, and existing data on these data blocks of the target server
will be overwritten or deleted.
Server Migration Service
FAQs 7 Target Server Consultation
Issue 70 (2025-11-05) Copyright © Huawei Cloud Computing Technologies Co., Ltd. 72

--- Page 82 ---
7.8 How Do I Create a Target Server That Meets the
SMS Requirements?
When you use SMS to migrate a server, you can prepare a target server on Huawei
Cloud to receive data from your source server.
SMS supports migration to ECSs, DeHs, and DeCs.
Target Server Requirements
1. A target server must run the same type of OS as the source server. For details,
see Can the Target Server Run a Different Type of OS from the Source
Server? Otherwise, there will be a server name conflict or other problems.
2. A target server running Windows must have at least 2 GB of memory.
3. A target server must use the same type of firmware as the source server.
Otherwise, the system will warn you the target server uses a firmware type
different from the source server, or the firmware type of the source server is
unknown. For details, see How Do I Check the Firmware Type of a Source
Server?
4. The disk requirements for a target server include:
– A target server must have at least as many disks as the source server.
Otherwise, the error "Insufficient disks on the target server" will be
reported. To resolve this error, see How Do I Resolve Error "Target
server has fewer disks than source server. Select another target
server" When I Configure the Target Server?
– Each target server disk must be at least as large as the paired source
server disk, or the migration cannot continue.
In such a case, see How Do I Resolve Error "Some disks on the target
server are smaller than those on the source server. Select another
target server" When I Configure the Target Server?
5. The required ports are enabled in the security group associated with the
target server.
– Windows: TCP ports 8899, 8900, and 22
– Linux: port 22 for file-level migration, and ports 8900 and 22 for block-
level migration
CA UTION
● For security purposes, you are advised to only allow traffic from the
source server over these ports.
● The firewall of the target server must allow traffic to these ports.
For details, see How Do I Configure Security Group Rules for Target
Servers?
Server Migration Service
FAQs 7 Target Server Consultation
Issue 70 (2025-11-05) Copyright © Huawei Cloud Computing Technologies Co., Ltd. 73

--- Page 83 ---
How to Create a Target Server
Method 1: Create a target server before the migration
Create an ECS, DeH, or DeC that meets the requirements.
When you configure the target server on the SMS console, set Server to Use
existing and select the server you created.
Method 2: Create a target server during the migration
When you configure the target server on the SMS console, set Server to Create
new.
For details, see step 7 in Configuring the Target Server.
7.9 Why Can't I See Data Disks on a Windows Target
Server After the Migration Is Complete?
Possible Causes
The SAN policy for the source server OS is Offline Shared. This means the data
disks will be offline on the target server after the migration is complete.
Solutions
● If you do not need to perform an incremental synchronization, you can fix this
issue by modifying the target server. For more information, see Solution 1 or
Solution 2.
● If you need to perform an incremental synchronization, you can fix this issue
by modifying the source server before the synchronization. For more
information, see Solution 3.
Solution 1
Step 1 Choose Start > Run.
Step 2 Enter diskmgmt.msc and press Enter to open the Disk Management window.
In the following figure, disk 1 is offline.
Server Migration Service
FAQs 7 Target Server Consultation
Issue 70 (2025-11-05) Copyright © Huawei Cloud Computing Technologies Co., Ltd. 74

--- Page 84 ---
Figure 7-4 Offline
Step 3 Right-click the offline data disk and select online from the pop-up menu.
Figure 7-5 Bringing the disk online
----End
Solution 2
Step 1 Right-click the Start menu.
Step 2 Click Run and enter cmd.
Step 3 Run diskpart to start the disk management tool.
Step 4 Run list disk to list all disks on the current server. In the following figure, disk 0 is
online and disk 1 is offline.
Server Migration Service
FAQs 7 Target Server Consultation
Issue 70 (2025-11-05) Copyright © Huawei Cloud Computing Technologies Co., Ltd. 75

--- Page 85 ---
Step 5 Run select disk 1.
Step 6 Run online disk to change the disk status from offline to online.
Step 7 If the disk is read only after it goes online, run the attribute disk clear readonly
command to remove the write protection on the disk.
----End
Solution 3
Step 1 On the source server, right-click the Start menu.
Step 2 Click Run and enter cmd.
Step 3 Run diskpart to start the disk management tool.
Step 4 Run the san command to query the current disk policy. If SAN Policy: Offline
Shared is returned, the disks will be offline by default.
Server Migration Service
FAQs 7 Target Server Consultation
Issue 70 (2025-11-05) Copyright © Huawei Cloud Computing Technologies Co., Ltd. 76

--- Page 86 ---
Step 5 Run the san policy=onlineAll command to bring disks online by default.
Step 6 On the SMS console, click Sync to start an incremental synchronization. After the
synchronization is complete, the disks on the target server will be online
automatically.
CA UTION
● After the source server is modified, you do not need to restart it.
● The modified disk policy will be synchronized to the target server, and disks on
the target server will be brought online automatically. SMS has no
requirements on disk policies. You can restore the disk policy for the source
server as needed.
----End
7.10 Why Are the Agent Plug-ins from the Source
Cloud Service Provider Retained on the Target Server
After the Migration Is Complete?
SMS migrates everything, such as disk data and service configurations, from a
source server to the target server.
If the agent plug-ins from the source cloud service provider are installed on the
disks of the source server and are configured to automatically start upon system
startup, these agent plug-ins will be migrated to the target server and still start
upon system boot.
You can delete or uninstall these plug-ins or modify related configurations on the
target server.
Server Migration Service
FAQs 7 Target Server Consultation
Issue 70 (2025-11-05) Copyright © Huawei Cloud Computing Technologies Co., Ltd. 77

--- Page 87 ---
NO TICE
SMS only ensures data consistency before and after migration. You need to modify
service configurations as needed.
7.11 After the Migration Is Complete, Will Deleting the
Target Server Configuration or Server Record Affect the
Source or Target Server?
After the migration is complete, if services are verified on the target server, and no
synchronization is required, you can delete the target server configuration and the
server record, and the source and target servers are not affected.
CA UTION
● After the target server configuration is deleted, the migration task remains in
the list, but the target server settings will be gone. Incremental synchronization
will no longer be possible. You can configure a target server to perform
migration again.
● If a server record is deleted, the migration task will be deleted from the list. To
migrate the source server, you will need to restart the Agent on the source
server, and the system will generate a server record for you.
7.12 If I Change the Password of the Source Server and
Perform an Incremental Synchronization After the Full
Migration Is Complete, Will the New Password Be
Synchronized to the Target Server?
SMS migrates the passwords of source servers to target servers during the full
migration. If you change the password of a Windows source server after the full
migration is complete, an incremental synchronization cannot be performed. For a
Linux source server, an incremental synchronization can be performed, but the
new password will not be synchronized to the target server.
Server Migration Service
FAQs 7 Target Server Consultation
Issue 70 (2025-11-05) Copyright © Huawei Cloud Computing Technologies Co., Ltd. 78

--- Page 88 ---
CA UTION
● After changing the password of the source server, you need to restart the server
to apply the change.
● For a Windows source server, after the full migration is complete, restarting the
source server or Agent will disconnect the Agent from SMS. If this happens, you
cannot perform an incremental synchronization for the source server. You will
need to delete the original migration task, create a new task, and perform a
full migration again.
● For a Linux source server, after the full migration is complete, you can perform
an incremental synchronization even if you have restarted the source server or
Agent. However, if you change the password of the source server, the new
password will not be synchronized to the target server.
After the migration is complete, if you need to reset the password of the target
server, see Resetting the Password for Logging In to an ECS on the Console.
If you cannot reset the password on the console, see Installing One-Click
Password Reset Plug-in.
If the password reset plug-in cannot be installed, see:
● Resetting the Password for Logging In to a Windows ECS Without the
Password Reset Plug-in Installed
● Resetting the Password for Logging In to a Linux ECS Without the
Password Reset Plug-in Installed
7.13 Why Is My Target Server Locked During the
Migration?
During the migration, operations on the target server may cause migration
failures. To ensure a smooth migration, the target server will be automatically
locked during the migration and unlocked after the migration. For details about
how to unlock the target server manually, see How Do I Unlock a Target Server
Manually?
7.14 How Do I Unlock a Target Server Manually?
Symptom
After the migration is complete, the target server is supposed to automatically
unlock. However, various issues might prevent it from doing so. For instance, there
may be insufficient permissions or network issues. In this case, you can unlock the
target server manually by performing the operations described in this section.
Possible Causes
The most typical reasons are:
Server Migration Service
FAQs 7 Target Server Consultation
Issue 70 (2025-11-05) Copyright © Huawei Cloud Computing Technologies Co., Ltd. 79

--- Page 89 ---
● The token is invalid or the network is faulty.
● Account permissions are insufficient.
Solution
1. Check whether the corresponding server record still exists. If the record has
not been deleted, in the Operation column, choose More > Manage Target >
Unlock Target Server to unlock the target server.
If the system displays a message indicating that you do not have the
permission to unlock the target server, use an account with the required
permission and try again.
2. If the server record has been deleted, unlock the target server using the API
Explorer.
a. Log in to the API Explorer.
b. Set the following parameters:
▪ Region: Select the region where the target server is located.
▪ Project_id: indicates the project ID, which is automatically filled after
login. You can leave it blank.
▪ server_id: Specify the ID of the server to be unlocked.
▪ unlock: Select (empty) from the drop-down list.
Figure 7-6 Unlocking a cloud server
Server Migration Service
FAQs 7 Target Server Consultation
Issue 70 (2025-11-05) Copyright © Huawei Cloud Computing Technologies Co., Ltd. 80

--- Page 90 ---
8 Target Server Configuration
8.1 How Do I Select a Target Server?
NO TE
Source servers can be migrated to pay-per-use or yearly/monthly ECSs. You can select
whichever billing mode that best suits your needs.
The selected target server must meet the requirements below. If it does not,
create an ECS that meets these requirements.
● A target server running Windows must have at least 2 GB of memory.
● A target server must have at least as many disks as the source server, and
each disk on the target server must be at least as large as the paired source
disk.
● A target server must run the same type of OS as the source server. Otherwise,
OS inconsistency will occur.
8.2 How Do I Configure Data Compression for a Linux
Block-Level Migration?
Scenario
By default, data compression is enabled for Linux block-level migrations. The
number of compression threads is automatically configured based on the resource
usage of source servers. The number of compressions threads depends on the
number of idle CPUs but is limited to 3 at most. This may cause high CPU usage.
In this case, you can modify the number of compression threads or disable data
compression on the SMS console.
Procedure
Step 1 Sign in to the SMS console.
Step 2 In the server list, locate the source server to be migrated and click Configure
Target in the Migration Stage/Status column.
Server Migration Service
FAQs 8 Target Server Configuration
Issue 70 (2025-11-05) Copyright © Huawei Cloud Computing Technologies Co., Ltd. 81

--- Page 91 ---
Step 3 On the Configure Basic Settings tab page, expand Migration Scope (Optional).
Step 4 Configure the advanced options listed in the following table.
Parameter Setting
Data Compression ● Select Yes if you want to enable data compression
during the migration. Then Compression Threads
will be available for you to configure.
● Select No if you do not want to enable data
compression during the migration.
Compression Threads Configure the maximum number of compression
threads that can be launched. If you select auto for
this option, the system determines the number
automatically. You can also enter an integer from 1 to
3.
Cache Node Size (MB) Specify the size of a single data cache node. The
value must be an integer ranging from 1 to 8. The
default value is 4.
 
CA UTION
Data compression occupies a large amount of CPU resources. If you enable this
function, you need to consider the actual resource usage of the source server to
prevent services on it from being affected. For details about the default resource
usage, see How Many Resources Will Be Used for a Linux Block-Level
Migration?
----End
Modifying Advanced Options
You can only modify the advanced migration options if a task has the target
server configured but is not started, is paused, or is waiting to execute an
incremental synchronization. After locating the task, in the Operation column,
choose More > Manage Migration Settings > Configure Advanced Options.
Then you can modify the settings of Data Compression, Compression Threads,
and Cache Node Size.
Server Migration Service
FAQs 8 Target Server Configuration
Issue 70 (2025-11-05) Copyright © Huawei Cloud Computing Technologies Co., Ltd. 82

--- Page 92 ---
8.3 How Do I Limit Resource Allocation for the Agent
in a Linux Migration?
You can limit how many CPU, memory, and disk throughput resources of the Linux
source server can be used by the SMS-Agent.
Precautions
Limiting resources for SMS-Agent requires the built-in cgroups feature on Linux. If
cgroups on the source server is broken or abnormal, the resource limits may not
be applied. If you need help, contact SMS technical support.
Prerequisites
Cgroups has been installed and enabled on the source server.
To check if it has been installed, run the following command on the source server:
mount | grep cgroup
If the cgroups (V1 or V2) mounting information is displayed, cgroups is enabled
on the source server. Otherwise, it is not.
Before setting resource limits on the SMS console, evaluate whether installing or
enabling cgroups will affect services on the source server. If source services use
cgroups, submit a service ticket to ask SMS migration experts whether the SMS
resource limits conflict with the source services.
● Cgroups V1
The example output shows that the following three mount points were
attached to the CPU, memory, and disk I/O controllers, respectively.
– /sys/fs/cgroup/CPU,CPUacct
– /sys/fs/cgroup/memory
– /sys/fs/cgroup/blkio
● Cgroups V2
Server Migration Service
FAQs 8 Target Server Configuration
Issue 70 (2025-11-05) Copyright © Huawei Cloud Computing Technologies Co., Ltd. 83

--- Page 93 ---
Cgroups V2 is mounted on /sys/fs/cgroup. Unlike V1, cgroups V2 has no
mount points attached to specific resources.
Procedure
Step 1 Sign in to the SMS console.
Step 2 In the navigation pane on the left, choose Servers.
Step 3 In the server list, locate the source server to be migrated and click Configure
Target in the Migration Stage/Status column.
Step 4 Expand Resource Limits (Optional), read the parameter description and
remarks carefully, and set CPU Limit, Memory Limit, and Disk Throughput
Limit.
Table 8-1 Parameter description
Parameter Description Remarks
CPU Limit Controls the maximum percentage
of CPUs to be used by the SMS-
Agent on the source server.
● If this parameter is left blank,
the CPU usage of the SMS-
Agent is not limited.
● 1% ≤ CPU Limit (integer) ≤
100%
● To ensure a smooth migration,
allocate at least 0.2 CPUs to the
SMS-Agent.
Formula: CPU limit (%) =
Maximum number of CPUs
allowed for SMS-Agent/Total
number of CPUs × 100%
For example:
If the source server has 4 CPUs,
and you want to allocate 0.5 CPUs
for the SMS-Agent, you can enter
13% (0.5/4 × 100%).
● The CPU limit and
disk throughput limit
may affect the
migration speed.
● When the resource
limits are applied, a
folder named
sms_mig_cgroup will
be created in /sys/fs/
cgroup on the source
server, and
parameters for
configured limits are
created here.
Server Migration Service
FAQs 8 Target Server Configuration
Issue 70 (2025-11-05) Copyright © Huawei Cloud Computing Technologies Co., Ltd. 84

--- Page 94 ---
Parameter Description Remarks
Memory Limit Controls the maximum of memory
to be used by the SMS-Agent. If
the configured limit is reached, the
SMS-Agent will be stopped or
ended.
● If this parameter is left blank,
the memory usage of the SMS-
Agent is not limited.
● 200 MB ≤ Memory Limit ≤
1,000 MB
● To ensure a successful
migration, allocate at least 200
MB of memory to the SMS-
Agent.
Disk
Throughput
Limit
Controls the maximum disk
throughput to be used by the
SMS-Agent. After the limit is set,
the disk read/write speed of the
SMS-Agent will not exceed the
limit.
● If this parameter is left blank,
the disk throughput of the
SMS-Agent is not limited.
● 10 MB/s ≤ Disk Throughput
Limit ≤1,000 MB/s
● To ensure a successful
migration, allocate at least 10
MB/s.
 
----End
Modifying Resource Limits
You can modify resource limits if a task has a target server configured but is not
started, is paused, or is waiting to execute an incremental synchronization. After
locating the task, in the Operation column, choose More > Manage Migration
Settings > Set Migration Limits. Then you can modify the resource limits.
Server Migration Service
FAQs 8 Target Server Configuration
Issue 70 (2025-11-05) Copyright © Huawei Cloud Computing Technologies Co., Ltd. 85

--- Page 95 ---
Viewing Resource Usage
You can run the top or iotop command on the source server to view the resource
usage during the migration. It is normal for the resource usage of SMS-Agent to
slightly exceed the configured limits.
8.4 How Do I Set the Number of Concurrent Processes
for a Linux File-Level Migration?
Overview
For a Linux file-level migration, you can configure the SMS-Agent to launch 1 to 4
concurrent processes for file migration and synchronization. The actual number
depends on the source server's performance and the number of disks and
partitions.
CA UTION
● Enabling concurrency consumes source server resources, particularly disk I/O,
bandwidth, and CPU resources. To prevent the services on the source server
from being affected, before enabling this function, you can evaluate the
impacts on source services or set resource limits for the SMS-Agent.
● If the migration bandwidth from the source server to the target server is less
than 300 Mbit/s, you are advised not to enable this function.
Calculating How Many Concurrent Processes Can Be Launched
To determine how many concurrent processes the SMS-Agent can launch during a
Linux file-level migration, use the following formula:
Max. concurrent processes = Min. (Disks, Network bandwidth/Disk read or write
performance, 4)
where
Disks is the number of disks to be migrated on the source server.
Network bandwidth is the measured network bandwidth between the source
server and the target server. You can calculate the bandwidth by referring to How
Do I Test the Network Between the Source and Target Servers Using iPerf?
Disk read or write performance is the lower value between the average disk read
speed of the source server and the average disk write speed of the target server.
Consider that the migration involves four disks, the network bandwidth is 1,000
Mbit/s, the average read speed of the source server is 500 Mbit/s, and the average
write speed of the target server is 300 Mbit/s. We need to divide the network
bandwidth by the average write speed of the target server (1,000 Mbit/s/300
Mbit/s ≈ 3). That makes the three values for the formula, respectively, 4, 3 and 4,
which means there can be 3 concurrent processes for this migration.
Server Migration Service
FAQs 8 Target Server Configuration
Issue 70 (2025-11-05) Copyright © Huawei Cloud Computing Technologies Co., Ltd. 86

--- Page 96 ---
Setting the Maximum Number of Concurrent Processes
On the Configure Basic Settings page, expand Migration Settings (Optional),
set Migration Method to Linux file-level, and set Enable Concurrency to
Manual. Then you can define how many processes can be launched to execute the
full migration and incremental synchronization.
8.5 How Do I Fix Error "SMS.0601 ECS creation failed?"
Symptom
During the migration, the error "SMS. 0601 ECS creation failed. Cause: xxx" was
reported.
Possible Causes
There are many causes for target server creation failures.
● The account balance is insufficient.
● The quota is insufficient.
● The requested AZ is unavailable.
Solutions
● Solution for insufficient quota
Check whether the relevant quotas have been exhausted. If they have,
increase the quotas or delete unnecessary resources to release the quotas.
Server Migration Service
FAQs 8 Target Server Configuration
Issue 70 (2025-11-05) Copyright © Huawei Cloud Computing Technologies Co., Ltd. 87

--- Page 97 ---
● Solution for AZ unavailability
Delete the target server configuration. Select another AZ when you create a
task again.
8.6 Why Can't I Save the Migration Configuration as a
Template?
Symptom
After you completed the migration configuration, you clicked Save as Template to
save the configuration as a template for future use, but the message "Failed to
save the configuration" was displayed.
Possible Causes
The image used to create the target server is a private image and has been
deleted. SMS cannot identify the information about this private image.
Solution
Go to the ECS console and reinstall or change the OS of the target server.
If you want to change the firmware type of the target server from BIOS to UEFI,
create a private image by following the instructions provided in How Do I Resolve
Error "Inconsistent firmware type. Source: UEFI, Target: BIOS" When I Create
a Migration Task?
8.7 How Do I Resolve Error "Inconsistent firmware
type. Source: UEFI, Target: BIOS" When I Create a
Migration Task?
Symptom
When you created a migration task for a UEFI-booted source server, you selected a
BIOS-booted target server, and the system reported this error.
Possible Causes
The target server uses a different boot mode from the source server. In this case,
the target server cannot be launched after the migration. You must select a target
server created from an image with UEFI configured.
Server Migration Service
FAQs 8 Target Server Configuration
Issue 70 (2025-11-05) Copyright © Huawei Cloud Computing Technologies Co., Ltd. 88

--- Page 98 ---
NO TE
SMS requires that the target server OS uses the same type of firmware as the source server
OS.
● If the source server uses BIOS, Huawei Cloud will automatically provide a public image
with BIOS configured for you to create the target server. You can also use a private
image configured with BIOS to create the target server.
● If the source server uses UEFI, you need to use an image with UEFI configured to create
the target server.
Solution Using the Console
Step 1 Obtain an image file with UEFI configured and upload the image file to your OBS
bucket. If you already have such an image file stored in your bucket, go to 2.
Step 2 Use the image file to create a private image.
1. Sign in to the IMS console.
2. On the Image Management Service page, click Create Image.
3. Set Type to Import Image and Image Type to System disk image.
4. Select the image file uploaded to your OBS bucket.
5. Set Boot Mode to UEFI.
Step 3 Use the private image created in Step 2 to create an ECS as the target server.
For details, see Creating a Windows System Disk Image from an External
Image File or Creating a Linux System Disk Image from an External Image
File.
----End
Solution Using APIs
If changing the boot mode specified in an image through the console is not
supported in the current region, you can call the API described here to change the
value of hw_firmware_type to uefi.
Step 1 Call the API with the URI of PATCH /v2/cloudimages/{Image_id}.
For details about how to call the API, see Updating Image Information.
[
    {
        "op": "add",
        "path": "/hw_firmware_type",
        "value": "uefi"
    }
]
Step 2 Use the updated image to create an ECS as the target server.
----End
Server Migration Service
FAQs 8 Target Server Configuration
Issue 70 (2025-11-05) Copyright © Huawei Cloud Computing Technologies Co., Ltd. 89

--- Page 99 ---
8.8 How Do I Uninstall VMware Tools from the Target
Server After Migration?
VMware Tools is a common system optimization component in VMware
virtualization environments. You can follow the instructions below to uninstall
VMware Tools from the target server after migration.
NO TICE
● Before uninstalling VMware Tools, back up important data to prevent
important files from being deleted by mistake.
● After the uninstallation is complete, you are advised to restart the system for
all changes to take effect.
Windows
● Use the default uninstallation program.
Locate the VMware Tools installation path. The default installation path is
C:\Program Files (x86)\VMware\VMware Tools. Locate and double-click
VMwareToolsUninstaller.exe in the installation path.
If the default uninstallation program cannot be run, you can manually
uninstall VMware Tools through the registry.
● Manually uninstall VMware Tools through the registry.
a. Press Windows+R to open the Run dialog box.
b. Enter regedit and press Enter to open the registry editor.
c. Navigate to the registry path HKEY_LOCAL_MACHINE\SOFTWARE
\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall.
d. In the Uninstall folder, find the subkey with the InstallLocation value
pointing to the VMware Tools installation path. Record the subkey name,
which is usually the installation UUID of VMware Tools.
e. Open Command Prompt or PowerShell as an administrator. In the CLI,
enter the following command and replace <product_code> with the
actual UUID found in the registry.
msiexec /x {<product_code>} /qn
For example, if the UUID is {0C6F1C4F-5B5A-4B1A-9B9B-0C6F1C4F5B5A},
enter the following command:
Server Migration Service
FAQs 8 Target Server Configuration
Issue 70 (2025-11-05) Copyright © Huawei Cloud Computing Technologies Co., Ltd. 90

--- Page 100 ---
msiexec /x {0C6F1C4F-5B5A-4B1A-9B9B-0C6F1C4F5B5A} /qn
f. After the uninstallation is complete, restart the server to stop all related
services and processes.
g. After the restart, delete the VMware Tools folder and its residual files in
the VMware Tools installation path (C:\Program Files (x86)\VMware
\VMware Tools by default).
Linux
● Use the official uninstallation script.
a. Log in to the target server as the root user, open the terminal, and run
the following command to search for the vmware-uninstall-tools.pl
uninstallation script globally:
sudo find / -name 'vmware-uninstall-tools.pl'
b. Run the following command to switch to the directory where the
uninstallation script is stored. In this example, /usr/bin is used. Replace it
with the actual directory.
cd /usr/bin
c. Run the uninstallation script.
sudo ./vmware-uninstall-tools.pl
● Use the package manager for uninstallation.
If you have installed VMware Tools using the distribution's package manager
(such as apt, yum, or dnf), you can run the following command as the root
user to uninstall it based on the OS type:
– For Debian-based systems (such as Ubuntu), run the following command:
sudo apt-get remove --purge open-vm-tools
– For RPM-based systems (such as CentOS, Fedora, and RHEL), run the
following command:
sudo yum remove open-vm-tools
– For other newer distributions (such as Fedora 22 and later), run the
following command:
sudo dnf remove open-vm-tools
Server Migration Service
FAQs 8 Target Server Configuration
Issue 70 (2025-11-05) Copyright © Huawei Cloud Computing Technologies Co., Ltd. 91

--- Page 101 ---
9 Target Server Launch
9.1 How Do I Optimize a Windows Target Server After
the Migration Is Complete?
Scenarios
After the migration is complete, you need to manually install drivers on the target
server (ECS) to solve compatibility issues.
Procedure
1. Sign in to the console.
2. Under Compute, click Elastic Cloud Server.
3. In the ECS list, view the flavor of the target ECS.
ECS flavors are named in the "AB.C.D" format, for example, m2.8xlarge.8.
A specifies the ECS type. B specifies the type ID. C specifies the flavor size. D
specifies the ratio of memory to vCPUs expressed in a digit. For details about
ECS flavors, see ECS Types.
– If B of the target ECS is 1, for example, s1.small.2, the ECS uses Xen
virtualization, and you will need to install PV drivers.
– If B of your target ECS is not 1, for example, s2.small.3, the ECS uses KVM
virtualization, and you will need to install VirtIO drivers.
4. Check whether the PV drivers or VirtIO drivers software package exists on the
target ECS based on the virtualization type queried in 3.
– If it does, go to 7.
– If it does not, go to 5.
5. Download the PV drivers or VirtIO drivers package to the source server based
on the virtualization type queried in 3. For more information, see Obtaining
Required Software Packages.
6. Synchronize the PV driver or VirtIO drivers software package from the source
server to the target ECS, and then go to 7.
Server Migration Service
FAQs 9 Target Server Launch
Issue 70 (2025-11-05) Copyright © Huawei Cloud Computing Technologies Co., Ltd. 92

--- Page 102 ---
7. Install the required drivers on the target ECS based on the target ECS
virtualization type obtained in 3.
a. If the target ECS uses KVM virtualization, you need to install the VirtIO
drivers. For details, see Installing VirtIO Drivers.
b. If the target ECS uses Xen virtualization, you need to install PV drivers.
For details, see Installing PV Drivers.
9.2 After a Windows Server Is Migrated, Why Is the
Used Space of C: Drive Increased?
Symptom
After a Windows server was migrated to Huawei Cloud, the used space of C: drive
increased at least 1 GB.
Possible Causes
This is a normal because the size of the paging file, used for virtual memory, tends
to be larger after the migration is complete.
1. Log in to the source server.
2. Choose Start > Control Panel > Folder Options.
The Folder Options dialog box is displayed.
3. Click the View tab. In the Advanced settings area, perform the following
operations:
– Deselect Hide protected operating system files (Recommended).
– Select Show hidden files, folders, and drives and click Apply.
Server Migration Service
FAQs 9 Target Server Launch
Issue 70 (2025-11-05) Copyright © Huawei Cloud Computing Technologies Co., Ltd. 93

--- Page 103 ---
4. Log in to the target server and repeat 2 and 3.
5. Compare the size of the virtual memory file pagefile.sys in the Local Disk
(C:) on the source and target servers.
The pagefile.sys file on the target server is larger than that on the source
server.
The size difference of pagefile.sys on the two servers should account for the
difference in used space.
6. On the target server, click Start.
7. Choose Control Panel > System > Advanced system settings.
The System Properties dialog box is displayed.
8. Click the Advanced tab, click Settings in the Performance area.
The Performance Options page is displayed.
9. Click the Advanced tab, click Change in the Virtual memory area.
The Virtual Memory is displayed.
You can see that the target server uses Automatically manage paging file
size for all drives. The size of virtual memory file pagefile.sys on the target
server is equal to the size of file Installed Memory (RAM) on the server.
If the size of file Installed Memory (RAM) on the target server is different
from that on the source server, the used space of C: drive on the target server
is inconsistent with that on the source server.
Server Migration Service
FAQs 9 Target Server Launch
Issue 70 (2025-11-05) Copyright © Huawei Cloud Computing Technologies Co., Ltd. 94

--- Page 104 ---
9.3 How Do I Uninstall the SMS-Agent from the Source
and Target Servers After the Migration Is Complete?
Windows
● Solution 1
a. Log in to the server where the SMS-Agent is to be uninstalled.
b. Choose Start > All Programs.
c. In the All Programs panel, click the SMS-Agent folder.
d. Click Uninstall in the SMS-Agent file.
e. In the SMS-Agent-1.0.0 Uninstall dialog box, click Yes.
● Solution 2
a. Log in to the server where the SMS-Agent is to be uninstalled.
b. Click Start, and then select Computer.
c. Go to the C:\Program Files (x86)\SMS-Agent directory.
d. Double-click Uninstall.exe.
e. In the SMS-Agent-1.0.0 Uninstall dialog box, click Yes.
Linux
1. Log in to the server where SMS-Agent is to be uninstalled as user root.
2. Go to the SMS-Agent installation directory.
3. Stop the SMS-Agent.
./shutdown.sh
4. Go to the upper-level directory.
cd ..
5. Delete the SMS-Agent installation directory.
rm -rf SMS-Agent
9.4 Why Can't a Windows Target Server Access the
Internet After the Migration Is Complete?
Symptom
After a migration was completed, the Windows target server could not access the
Internet and the message "SMS.5603: The target server running Windows cannot
access the Internet" was displayed.
Possible Causes
The possible causes are as follows:
Server Migration Service
FAQs 9 Target Server Launch
Issue 70 (2025-11-05) Copyright © Huawei Cloud Computing Technologies Co., Ltd. 95

--- Page 105 ---
● There are abnormal network adapter drivers on the target server.
● The network configuration of the target server is incorrect.
Solutions
● Solution for abnormal network adapter drivers
a. Locate the abnormal network device using the device manager. Use the
Search automatically for updated driver software option to update its
driver. Then restart the target server.
b. If the fault persists, disable the driver and enable it, and restart the target
server.
c. If the fault persists, find another ECS that is in the same AZ as the target
server and can access the Internet. Then, detach a data disk from the
target server and attach this disk to the ECS you find.
i. On the temporary ECS, download the VMTools installation package
to the disk you have attached but do not install VMTools.
ii. Attach the data disk back to the target server. Then, log in to the
target server and install VMTools.
iii. Restart the target server.
● Solution for incorrect network configuration
a. Open the cmd window, run ipconfig to view the private IP address of the
target server. Check whether the IP address is the same as that displayed
on the ECS console. If they are different, a static IP address may be set for
the target server. In this case, change the IP address acquisition mode to
DHCP.
b. If the EIP of the target server can be pinged, but the domain name you
want to access cannot be pinged, see Configuring DNS.
9.5 Why Is the System Recovery Options Window
Displayed When the Target Server Is Started?
Symptom
After the migration was complete, the target server started, and an error message
beginning with SMS.5605 was displayed, indicating that the System Recovery
Options window had appeared.
Possible Causes
Something is wrong with the key startup files.
Solution
Run BCDBoot to resolve the problem.
a. Stop the target server, create a snapshot for its system disk, and detach the disk.
Server Migration Service
FAQs 9 Target Server Launch
Issue 70 (2025-11-05) Copyright © Huawei Cloud Computing Technologies Co., Ltd. 96

--- Page 106 ---
b. Purchase a temporary pay-per-use Windows server with 1 vCPU, 2 GB memory,
and 40 GB system disk. The temporary server must be in the same region and AZ
as the target server.
c. Attach the system disk of the target server to the temporary server as a data
disk.
d. Run cmd as administrator on the temporary server. Run the following
command:
bcdboot e:\windows /s d:
NO TE
In the preceding command, e:\windows indicates the path of the system disk on the target
server, and d: indicates the path of the boot disk on the target server.
You can run bcdboot /? to view the help information.
e. After the command is executed, detach the disk from the temporary server and
attach the disk back to the target server. Refresh the page for several times, and
start the target server.
f. If the system still cannot be started, use the created snapshot for rollback. If the
problem persists, contact technical support.
9.6 How Do I Fix a GRUB Error Because an XFS Volume
Is Mounted to the /boot Partition?
Symptom
On a source server running CentOS 7.1, an XFS file system is mounted to the /
boot partition. After the source server was migrated to Huawei Cloud, the
corresponding target server failed to be launched.
Server Migration Service
FAQs 9 Target Server Launch
Issue 70 (2025-11-05) Copyright © Huawei Cloud Computing Technologies Co., Ltd. 97

--- Page 107 ---
Possible Causes
The XFS file system is mounted to the /boot partition, causing a GRUB error.
Solutions
● Solution 1
Detach the system disk from the target server, and attach it to another ECS
running CentOS, for example, CentOS 7.6 or higher. After the system disk is
attached, mount the XFS file system and unmount the file system. Then
detach the disk and attach it back to the original server.
● Solution 2
Edit the GRUB installation script SMS-Agent/agent/linux/resources/shell/
install_grub.sh on the source server, locate the install_grub2 function, and
add the two lines of code in the red box in the following figure. Then restart
the Agent.
Figure 9-1 Editing the GRUB installation script file
Server Migration Service
FAQs 9 Target Server Launch
Issue 70 (2025-11-05) Copyright © Huawei Cloud Computing Technologies Co., Ltd. 98

--- Page 108 ---
9.7 How Do I Troubleshoot a MySQL Startup Failure on
the Target Server After the Migration?
Symptom
After the migration, the MySQL service on the target server could not start up or
immediately exited after being started.
Possible Causes
The MySQL service on the source server is not stopped after the migration. As a
result, the related files on the target server do not match with those on the source
server.
Solution
Stop the MySQL service on the source service, perform a synchronization, and try
again.
9.8 How Do I Resolve Error "SELinux targeted" When I
Start a Linux Target Server After the Migration Is
Complete?
Symptom
When you started a Linux target server after the migration succeeded, message
"SELinux targeted" was displayed.
Server Migration Service
FAQs 9 Target Server Launch
Issue 70 (2025-11-05) Copyright © Huawei Cloud Computing Technologies Co., Ltd. 99

--- Page 109 ---
Possible Causes
The SELinux configuration is incorrect.
Solution
Step 1 Find another ECS that is in the same AZ as the target server and can access the
Internet. Detach the system disk from the target server and attach the disk to the
ECS.
Step 2 Mount the related disk partitions.
Step 3 Locate the SELinux configuration file in the disk and set SELinux to Disabled.
CA UTION
Do not modify the SELinux configuration file of the temporary ECS.
Step 4 Mount the system disk and related partitions back to the target server and restart
the target server.
----End
9.9 Why Is the Usable Memory (RAM) Less Than the
Total Installed Memory on a Target Server Running 64-
bit Windows?
Symptom
On a target server running 64-bit Windows, the usable memory (RAM) is much
less than the installed memory. For example, the system may report that there is
only 2 GB of usable memory on a target server with 32 GB of memory installed.
Possible Causes
The maximum memory is set for the target server.
Server Migration Service
FAQs 9 Target Server Launch
Issue 70 (2025-11-05) Copyright © Huawei Cloud Computing Technologies Co., Ltd. 100

--- Page 110 ---
Solution
Step 1 Press Win and R on the keyboard to open the Run window. Enter msconfig and
click OK. The System Configuration window is displayed.
Step 2 Click the Boot tab and click Advanced options.
Step 3 Check whether Maximum memory is selected. If it is, deselect it and click OK.
Step 4 Click OK to close the system configuration window and restart the target server.
----End
9.10 How Do I Fix BSOD Errors When I Start a Windows
Target Server After the Migration?
Symptom
After the migration, you started and logged in to the Windows target server.
However, the blue screen of death (BSOD) happened and the system restarted
automatically.
Possible Causes
This issue may be caused by antivirus software.
Solution
Step 1 Start the target server in safe mode. If the server starts, go to 2.
Step 2 Check whether any antivirus software such as Sophos or Kaspersky is installed.
If any antivirus software is installed, there are two methods to fix the issue.
● Method 1
a. Create an ECS in the same region and AZ as the target server. Detach the
system disk from the target server and attach the disk to the ECS. Search
for and delete all antivirus software-related installation directories,
registries, and startup items.
b. Attach the disk back to target server, restart the system several times to
check that BSOD does not occur.
● Method 2
a. Uninstall the antivirus software on the source server and perform an
incremental synchronization.
NO TE
If you cannot uninstall some antivirus software, contact their providers.
Server Migration Service
FAQs 9 Target Server Launch
Issue 70 (2025-11-05) Copyright © Huawei Cloud Computing Technologies Co., Ltd. 101

--- Page 111 ---
b. After the synchronization is complete, restart the target server several
times to ensure there is no BSOD.
----End
9.11 How Do I Fix Startup Failures of a Windows Target
Server After the Migration?
Symptom
After the migration, the Windows target server could not be started, even in safe
mode.
Possible Causes
The KVM driver or KVM registry is missing.
Solutions
● Solution 1
a. Create a temporary ECS in the same region and AZ as the target server.
Detach the system disk from the target server and attach it to the
temporary ECS.
b. Check for the KVM driver.
▪ Check whether files viostor.sys and vioscsi.sys are in the Windows
\System32\drivers directory of the disk.
▪ Check whether files viostor.cat and vioscsi.cat are in the Windows
\System32\CatRoot\{F750E6C3-38EE-11D1-85E5-00C04FC295EE}
directory of the disk.
▪ Check whether files viostor.inf and vioscsi.inf are in the Windows
\INF directory of the disk.
If any of the preceding files is missing, install the VirtIO drivers on
the temporary ECS. Copy the desired file to the corresponding
directory on the system disk of the target server.
CA UTION
The .sys, .cat, and .inf files are used in pairs. You need to copy a file
pair, not just a single file.
c. Check the registry.
i. Open the Registry Editor and click HKEY_LOCAL_MACHINE in the
navigation pane on the left.
ii. On the menu bar, choose File > Local Hive, locate registry
C:\Windows\System32\config\SYSTEM, and change its name from
SYSTEM to p2v.
Server Migration Service
FAQs 9 Target Server Launch
Issue 70 (2025-11-05) Copyright © Huawei Cloud Computing Technologies Co., Ltd. 102

--- Page 112 ---
iii. Open the registry and check whether entries p2v/ControlSet001/
services/viostor and p2v/ControlSet001/services/vioscsi are there.
If they are not, manually add them to the registry by referring to the
registry of the temporary ECS.
d. Stop the temporary ECS, and attach the disk as the system disk to the
target server. Then restart the target server.
● Solution 2
Install the VirtIO drivers on the source server and then perform a
synchronization to the target server.
CA UTION
After the VirtIO drivers are installed, do not restart the source server, or the
synchronization will fail.
9.12 What Configuration Items Do I Need to Modify for
the Target Server After the Migration Is Complete?
Background
When you use SMS to migrate a source server, the target server configurations will
be automatically modified based on your settings in the migration task. For details
about the items modified, see What Are the Differences Between the Target
and Source Servers After the Migration? You also need to modify the
configurations of the target server based on service requirements after the
migration. These auto or manual modifications are made to ensure that the target
server can run normally and your services match your business processes and
security standards. Here we list some configuration items you may need to modify
based on service requirements.
CA UTION
The items listed here need to be modified after the migration and service cutover
are complete.
Modifying Network Configurations (Recommended)
To ensure compatibility with Huawei Cloud, SMS modifies the network
configurations of target servers. After the service cutover is complete, you can
modify the network configuration files about NICs, DNS, SSH, and other items
based on service requirements.
Clearing Residual SMS Installation Packages (Recommended)
During a migration, SMS migrates all data on the source server to the target
server, including the SMS migration software. After the migration is complete, you
are advised to delete the SMS software from the target server.
Server Migration Service
FAQs 9 Target Server Launch
Issue 70 (2025-11-05) Copyright © Huawei Cloud Computing Technologies Co., Ltd. 103

--- Page 113 ---
Modifying Security Group and Policy Settings (Recommended)
● During a migration, the security group of the target server needs to allow
traffic from the source server over certain ports based on the OS type and
migration method. Ports 8899, 8900, and 22 are required for a Windows
block-level migration, ports 8900 and 22 are required for a Linux block-level
migration, and port 22 is required for a Linux file-level migration. After the
migration is complete, it is essential for you to review and adjust the security
group settings as necessary. It is best to disable high-risk ports.
● During the migration, it is necessary to disable the firewall or security
software. Once the migration is complete, you need to reconfigure the
security protection policy.
Configuring Software Sources (Optional)
SMS does not automatically modify software sources for target servers, such as
yum, apt, and zypper repositories. After the migration is complete, you can
configure proper software sources based on service requirements.
Clearing Components and Services from Source Platforms (Optional)
After a server is migrated from another cloud platform, there may be leftover
components or services from the source platform, for example, Alibaba's Cloud
Shield or platform services. You can determine whether to uninstall these
components or services as required.
Installing Huawei Cloud Password Reset Plug-in (Optional)
To use the password reset function on the ECS console, you can install the Huawei
Cloud password reset plug-in to reset the password with a few clicks. For more
information, see:
● Installing the One-Click Password Reset Plug-In (Linux).
● Installing the One-Click Password Reset Plug-in (Windows)
Server Migration Service
FAQs 9 Target Server Launch
Issue 70 (2025-11-05) Copyright © Huawei Cloud Computing Technologies Co., Ltd. 104

--- Page 114 ---
10 Data Consistency
10.1 Can the Target Server Run a Different Type of OS
from the Source Server?
The OS types of target and source servers must be the same, but the OS versions
can be different.
For example, if the source server runs Windows Server 2008, the target server can
run Windows Server 2012; if the source server runs Ubuntu, the target server can
run CentOS.
10.2 How Do I Verify Data Consistency Between the
Source and Target Servers?
SMS gives you the capability to verify data consistency before and after the
migration. You can enable verification when you configure the target server or
initiate an incremental synchronization. Note that consistency verification
cannot be performed for servers with Btrfs file systems.
Notes
● Before enabling the verification option, you are advised to stop services (and
databases if any) on the source server. If they are not stopped, data on the
source server keeps changing, which will affect the consistency.
NO TE
It is normal for some directories on the source and target servers to have slight
differences. For instance, there are directories on the source server where data is
constantly changing, such as the directory where SMS-Agent was installed and
the /var/log directory where stores system logs.
● The time required for consistency verification depends on the number and size
of files to be verified. If consistency verification takes a long time during the
final incremental synchronization, the time required for service cutover will
also increase. Evaluate the impacts on your services.
Server Migration Service
FAQs 10 Data Consistency
Issue 70 (2025-11-05) Copyright © Huawei Cloud Computing Technologies Co., Ltd. 105

--- Page 115 ---
● Consistency verification occupies significant source disk I/O resources.
Evaluate the potential impacts on your source services.
● You can specify which paths should be included in the verification. If a parent
and its child paths are included, only the parent path and its contents will be
verified. The system will not re-verify the child paths.
For example, if you specify the following paths for consistency verification:
/path,/path/test
The system will verify all contents of /path and will not verify /path/test
separately.
Constraints
● Consistency verification is not recommended when you choose to resize disks
or partitions for the target server. Since paths between the source and target
servers may not align perfectly, the verification results may be inaccurate.
● It is not applicable to verification of cross-file system files or shared folders.
● To prevent your services on the source server from being affected, a
maximum of 1 million files can be verified in a single directory.
● To prevent excessive memory usage, only paths that are shorter than 1024
bytes are verified.
● Windows paths with non-ASCII characters (like Chinese or Japanese) cannot
be verified and will be skipped during the process.
Enabling Data Consistency Verification When You Configure the Target
Server
If you enable consistency verification when you configure the target server, data
consistency will be verified after the full replication is complete. For details, see
Configuring a Target Server.
Enabling Data Consistency Verification When You Initiate an Incremental
Synchronization
Step 1 Open the Sync Incremental Data page by referring to Synchronizing
Incremental Data.
Step 2 Select Verify Data consistency. This is a quick verification, and only the file size
and modification time will be compared.
Server Migration Service
FAQs 10 Data Consistency
Issue 70 (2025-11-05) Copyright © Huawei Cloud Computing Technologies Co., Ltd. 106

--- Page 116 ---
Figure 10-1 Enabling data consistency verification
Configure the verification policy based on the following table and your actual
requirements.
Parameter Description
Enable Hash
Verification
If this option is enabled, the system will generate and
compare hash values for each file to be verified. Hash
verification is recommended when individual files are large
and important. Enabling this option will increase CPU and
disk I/O overheads for the source server and extend the
verification time.
CAUTION
● Hash values cannot be calculated for files in use, so these files
will be skipped during the verification.
● Enabling this option requires you to specify the verification
scope, and only files in the specified scope will be verified.
Server Migration Service
FAQs 10 Data Consistency
Issue 70 (2025-11-05) Copyright © Huawei Cloud Computing Technologies Co., Ltd. 107

--- Page 117 ---
Parameter Description
Verification Scope ● Under Exclude paths, enter the paths you want to
exclude from the verification. A maximum of 30 paths
can be entered. Use commas (,) to separate the paths.
For example, /root/data,/var. Leaving it empty will
initiate a full verification.
● Under Include paths, enter the paths you want to verify.
NOTICE
● If the entered paths are incorrect or empty, 0 will be displayed
for them in the verification results.
● The more data you need to verify, the longer the verification
will take. It is wise to narrow the verification scope to only key
paths.
● The following paths will be excluded from consistency
verification by default:
– Linux:  /bin, /boot, /dev, /home, /etc, /lib, /media, /proc, /
sbin, /selinux, /sys, /usr, /var, /run, and /tmp
– Windows: top-level directories of partitions, for example, C:\
and O:\
If you want to verify some of the excluded paths, see Modifying
the Default Excluded Paths.
Verify
Inconsistencies
This option can only be enabled after at least one
consistency verification is complete. If this option is
enabled, the system verifies only the files were found to be
inconsistent during the last verification.
 
Step 3 Click OK to synchronize incremental data and verify consistency. After the
synchronization and verification are complete, you can view the verification results
by referring to Viewing Verification Results.
----End
Modifying the Default Excluded Paths
Step 1 Log in to the source server.
Step 2 Open the g-property.cfg configuration file of the SMS-Agent.
● Linux: .../SMS-Agent/agent/config/g-property.cfg
● Windows: C:\SMS-Agent-Py*\config\g-property.cfg
Step 3 Modify the [consistency_check] configuration item to fit your requirements. Use
commas (,) to separate paths and do not end with a comma. The following is an
example:
● Linux: list_dir_illegal_linux = /bin,/boot,/dev,/home,/etc,/lib,...
● Windows: list_dir_illegal_windows = C:\SMS-Agent-Py3,C:\SMS-Agent-Py2,...
Step 4 Save the configuration file.
----End
Server Migration Service
FAQs 10 Data Consistency
Issue 70 (2025-11-05) Copyright © Huawei Cloud Computing Technologies Co., Ltd. 108

--- Page 118 ---
Skipping Consistency Verification
If you want to skip consistency verification after the incremental synchronization
starts, perform the following steps:
Step 1 In the server list, click the server name. The task details show up on the right.
Step 2 On the Task Progress tab, locate the Verify data consistency subtask and click
Skip Verification under the progress bar. In this displayed window, click OK.
Figure 10-2 Skipping consistency verification
NO TICE
Consistency verification can be skipped only when the progress is between 5% and
95%.
----End
Viewing Verification Results
After the verification is complete, go to the task details page and click the
Consistency Verification tab to view the verification results.
Figure 10-3 Viewing verification results
If 0 is displayed in the Files Verified column, it means the specified directory
could not be found or is empty.
Server Migration Service
FAQs 10 Data Consistency
Issue 70 (2025-11-05) Copyright © Huawei Cloud Computing Technologies Co., Ltd. 109

--- Page 119 ---
All files verified to be inconsistent are recorded in the log file sms_cmp_result.log
in the SMS-Agent installation directory (*/SmsAgent/agent/Logs/ on Linux and
C://SMS-Agent-Py*/Logs on Windows) on the source server.
Estimating Verification Time
The following table lists the verification time tested on servers where only the
migration process runs but is for reference only.
OS Specificati
ons
Disk
Performanc
e
Verification Time (per 100 GB)
Windows 2 vCPUs
and 4 GB
of memory
5,000
IOPS/150
MB/s
About 17 minutes
Linux 2 vCPUs
and 4 GB
of memory
5,000
IOPS/150
MB/s
About 13 minutes
 
10.3 How Do I Display the OS Name of a Target Server
on the ECS Console?
Symptom
On the ECS console, you found that the OS name of your target server was
different from the actual OS name of the server.
NO TE
This is a normal event resulting from a limitation of the ECS console.
Possible Causes
The ECS console displays the image name of an ECS, not the OS name. The two
names may be different. When you configure the target server:
● If you choose to automatically create an ECS as the target server, an SMS-
defined image name will be displayed for the new ECS on the ECS console,
such as LinuxServer or WindowsServer.
● If you choose to use an existing ECS as the target server, the image name of
the existing ECS is displayed on the ECS console.
Solution
To display the actual OS name of your target server on the ECS console, perform
the following steps:
Step 1 Obtain an image file based on the source server OS.
Server Migration Service
FAQs 10 Data Consistency
Issue 70 (2025-11-05) Copyright © Huawei Cloud Computing Technologies Co., Ltd. 110

--- Page 120 ---
Step 2 Upload the image file to an OBS bucket.
Step 3 Use the image file to create a private image.
1. Sign in to the console and choose Compute > Image Management Service.
2. On the Image Management Service page, click Create Image.
3. Set Type to Import Image and Image Type to System disk image.
4. Select the image file uploaded to your OBS bucket.
5. Select ECS system disk image for Function and x86 for Architecture. Set
Boot Mode to the actual boot mode of the source server.
You can see the boot mode of the source server on the SMS console. For more
information, see Checking the Firmware Type of a Source Server.
6. Set OS to the source server OS. If the source server OS is not an available
option, select Other from the drop-down list.
7. Set System Disk based on the system disk of the source server. If the source
system disk is smaller than 40 GB, set System Disk to 40 GB.
8. Set Name to the source server OS. The name you specified here will be
displayed on the ECS console.
9. Select an enterprise project for the target server. If no other enterprise
projects are available, select Default.
Server Migration Service
FAQs 10 Data Consistency
Issue 70 (2025-11-05) Copyright © Huawei Cloud Computing Technologies Co., Ltd. 111

--- Page 121 ---
Step 4 Confirm the configuration details, select I have read and agree to the Statement
of Commitment to Image Creation and Image Disclaimer, and click Next. On
the Resource Details page that is displayed, click Submit. Wait for the image
creation to complete.
Step 5 If you have an ECS suitable as a target server, use this image to change the OS of
the ECS. If you have no suitable ECS available, use this image to create one.
Step 6 When configuring the target server on the SMS console, select the one you
prepared above. For details, see Configuring a Target Server.
----End
Checking the Firmware Type of a Source Server
After the Agent is installed and started on the source server, it reports source
server details to SMS. On the SMS console, you can click the source server name
on the Servers page and on the displayed page, review the firmware type of the
source server.
Server Migration Service
FAQs 10 Data Consistency
Issue 70 (2025-11-05) Copyright © Huawei Cloud Computing Technologies Co., Ltd. 112

--- Page 122 ---
10.4 Why Is Consistency Verification Not Supported for
Red Hat Enterprise Linux CoreOS?
Red Hat Enterprise Linux CoreOS (RHCOS) utilizes bind mounts for specific
directories like /etc and /var as part of its unique mounting mechanism. This
design results in a root directory structure that differs from traditional operating
systems.
SMS does not support the special root directory setup, and therefore cannot check
data consistency for RHCOS.
Server Migration Service
FAQs 10 Data Consistency
Issue 70 (2025-11-05) Copyright © Huawei Cloud Computing Technologies Co., Ltd. 113

--- Page 123 ---
11 Credentials
11.1 How Do I Obtain an AK/SK Pair for a Huawei
Cloud Account?
An access key comprises an access key ID (AK) and secret access key (SK). It is
used as long-term identity credentials to sign your requests for Huawei Cloud
APIs. AK is used together with SK to sign requests cryptographically, ensuring that
the requests are secret, complete, and correct.
You need to provide an AK/SK pair when using SMS. To learn how to obtain an
AK/SK pair for your Huawei Cloud account, see Access Keys.
CA UTION
During the migration, do not delete the AK/SK pair, or the migration will fail.
11.2 How Do I Obtain an AK/SK Pair for an IAM User?
Scenarios
You need to provide an AK/SK pair when using SMS. To safeguard the resources in
your account on Huawei Cloud, you are advised to create an IAM user, grant
permissions to the user, create an AK/SK pair for the user, and use the user for
migration.
Procedure
Step 1 Create a user group and assign permissions to it.
● If the IAM user to be added to this group needs all SMS permissions, attach
system-defined policies SMS FullAccess, OBS OperateAccess, ECS FullAccess,
VPC FullAccess, and EVS FullAccess to the group. EVS KMSAccess must be
attached if disk encryption is required.
Server Migration Service
FAQs 11 Credentials
Issue 70 (2025-11-05) Copyright © Huawei Cloud Computing Technologies Co., Ltd. 114

--- Page 124 ---
● If the IAM user only needs specific SMS permissions, create custom policies
and attach these policies to the user group. For details, see SMS Custom
Policies.
NO TE
Compared with system-defined policies, custom policies provide more fine-grained and
secure permissions control.
Step 2 Create an IAM user.
Step 3 Grant permissions to the IAM user.
Add the IAM user to the group created in step 1.
Step 4 Sign in as the IAM user.
Step 5 Create an AK/SK pair of the IAM user. For details, see Access Keys.
----End
11.3 Can I Use an AK/SK Pair of a Federated User
(Virtual IAM User) for Authentication During the SMS-
Agent Startup?
SMS does not support authentication using AK/SK pairs of federated users (virtual
users) during the SMS-Agent startup.
11.4 How Do I Obtain the SMS Domain Name Required
for Starting the SMS-Agent?
Scenarios
When starting the Agent, you need to enter the SMS domain name, so the Agent
can obtain the latest configuration files.
Server Migration Service
FAQs 11 Credentials
Issue 70 (2025-11-05) Copyright © Huawei Cloud Computing Technologies Co., Ltd. 115

--- Page 125 ---
Procedure
Step 1 Sign in to the SMS console.
Step 2 In the upper left corner of the page, select the region you are migrating to.
Step 3 Click Service List. Under Migration, choose Server Migration Service.
Step 4 In the navigation pane on the left, choose Agents.
Step 5 Select the Linux or Windows card, and you can see the SMS domain name, as
shown in Figure 11-1.
Server Migration Service
FAQs 11 Credentials
Issue 70 (2025-11-05) Copyright © Huawei Cloud Computing Technologies Co., Ltd. 116

--- Page 126 ---
Figure 11-1 Obtaining the SMS domain name
----End
11.5 Can I Use a Temporary AK/SK Pair for Migration?
No. Temporary AK/SK pairs are valid for a short period of time and may become
invalid before the migration completes. To ensure a successful migration, use a
permanent AK/SK pair. For more information about how to obtain such an AK/SK
pair for your Huawei Cloud account, see Access Keys.
Server Migration Service
FAQs 11 Credentials
Issue 70 (2025-11-05) Copyright © Huawei Cloud Computing Technologies Co., Ltd. 117

--- Page 127 ---
12 Migration Network
12.1 How Do I Set Up a Secure Migration Network for
Using SMS?
Background
To use SMS, you need to install the SMS-Agent on the source server to be
migrated. During the migration, the source server must continuously communicate
with SMS and the paired target server.
Figure 12-1 SMS networking
Server Migration Service
FAQs 12 Migration Network
Issue 70 (2025-11-05) Copyright © Huawei Cloud Computing Technologies Co., Ltd. 118

--- Page 128 ---
Connecting the Source Server to Huawei Cloud API Gateway
● The Agent installed on the source server must communicate with Huawei
Cloud services IAM, ECS, EVS, IMS, VPC, SMS, OBS, and DNS during the
migration. You must ensure that the Agent can call the APIs of these services
for the region you are migrating to.
– IAM and SMS are global-level services. The Agent needs to access their
endpoints iam.myhuaweicloud.com and sms.ap-
southeast-3.myhuaweicloud.com.
– ECS, EVS, IMS, VPC, and DNS are region-level services. The Agent needs
to access their endpoints for the region you are migrating to.
– The Agent needs to access the OBS endpoint obs.cn-
north-1.myhuaweicloud.com and the OBS endpoint for the region you
are migrating to.
Table 12-1 lists the endpoints of the involved services when you migrate
to the region CN South-Guangzhou.
Table 12-1 Addresses of involved services and buckets
Service/Bucket Endpoint/Bucket Address Remarks
IAM iam.myhuaweicloud.com Endpoints of
involved
global-level
services
SMS sms.ap-
southeast-3.myhuaweicloud.com
OBS obs.cn-north-1.myhuaweicloud.com
ECS ecs.cn-south-1.myhuaweicloud.com Endpoints of
involved
region-level
services for
CN South-
Guangzhou
EVS evs.cn-south-1.myhuaweicloud.com
VPC vpc.cn-south-1.myhuaweicloud.com
IMS ims.cn-south-1.myhuaweicloud.com
OBS obs.cn-south-1.myhuaweicloud.com
DNS dns.cn-south-1.myhuaweicloud.com
sms-resource-
intl-ap-
southeast-3
sms-resource-intl-ap-
southeast-3.obs.ap-
southeast-3.myhuaweicloud.com
Addresses of
the OBS
buckets to
be accessed
by the SMS-
Agent
sms-agent-
config-inter
sms-agent-config-inter.obs.ap-
southeast-3.myhuaweicloud.com
 
Server Migration Service
FAQs 12 Migration Network
Issue 70 (2025-11-05) Copyright © Huawei Cloud Computing Technologies Co., Ltd. 119

--- Page 129 ---
NO TE
Retain the default values for sms-resource-intl-ap-southeast-3 and sms-agent-
config-inter. The URLs of other dependent services depend on the target region.
SMS uses domain names such as bbs.huaweicloud.com,
support.huaweicloud.com, and console.huaweicloud.com to provide migration
and consulting services.
● If the DNS server addresses are not configured on the source server, you need
to map each endpoint to its IP address in the local hosts file (C:\Windows
\System32\drivers\etc\hosts for Windows and /etc/hosts for Linux).
The IP addresses can be obtained by pinging the endpoints, as shown in
Figure 12-2.
Figure 12-2 Pinging an endpoint
Connecting the Source Server to the Target Server
● If you want to migrate over the Internet, purchase and configure an EIP for
the target server.
● If you want to migrate over a private network, purchase and configure a
Direct Connect or VPN connection from your source environment to Huawei
Cloud.
Opening Required Ports on the Target Server
● If the target server runs Windows, open inbound ports 8899, 8900, and 22 in
the security group of the target server. If the target server runs Linux, open
inbound ports 8900 and 22.
NO TE
● For security purposes, you are advised to only allow traffic from the source server
over these ports.
● The firewall of the target server must allow traffic to these ports.
● If a network ACL is configured for the subnet where the target server is
located, you also need to open the required inbound ports in the network
ACL.
For details about how to configure security group rules, see How Do I Configure
Security Group Rules for Target Servers?
12.2 What Are the Network Requirements for Existing
Target Servers?
SMS enables you to migrate to existing servers on the cloud. The existing servers
must:
● Meet the specifications requirements described in How Do I Select a Target
Server?
Server Migration Service
FAQs 12 Migration Network
Issue 70 (2025-11-05) Copyright © Huawei Cloud Computing Technologies Co., Ltd. 120

--- Page 130 ---
● Be accessible from the paired source servers through EIPs, VPN, or private
lines.
● Enable the migration ports in their security groups.
– Windows: TCP ports 8899, 8900, and 22
– Linux: port 22 for file-level migration, and ports 8900 and 22 for block-
level migration
For details about how to configure security group rules, see How Do I
Configure Security Group Rules for Target Servers?
CA UTION
If you indeed use the ECS as the target server, do not perform any operations on
the ECS during the migration, such as stopping or restarting the ECS, attaching or
detaching a disk, or changing the password, or the migration will fail.
12.3 How Do I Configure Security Group Rules for
Target Servers?
1. Sign in to the console.
2. Click 
  in the upper left corner and select the desired region and project.
3. Under Compute, click Elastic Cloud Server.
4. In the ECS list, click the name of the target ECS.
The page providing details about the ECS is displayed.
5. Click the Security Groups tab and view security group rules.
6. Click Manage Rule.
The Summary page of the security group is displayed.
7. On the Inbound Rules tab, click Add Rule to configure an inbound rule.
– If the ECS runs Windows, configure three rules: one for port 8899, one for
port 8900, and one for port 22. For each, set the protocol to TCP.
Figure 12-3 Adding inbound rules
Server Migration Service
FAQs 12 Migration Network
Issue 70 (2025-11-05) Copyright © Huawei Cloud Computing Technologies Co., Ltd. 121

--- Page 131 ---
– If the ECS runs Linux, configure two rules: one for port 8900 and one for
port 22. For each, set the protocol to TCP.
NO TE
Port 22 is required for a Linux file-level migration.
Ports 8900 and 22 are required for a Linux block-level migration.
Figure 12-4 Adding inbound rules
– For all the rules, set Source to the IP address range containing the IP
addresses that you want to allow to access the ECS over the Internet.
CA UTION
● If you migrate over the Internet, only allow traffic from the public IP
address of the source server over the preceding ports. If you migrate
over a private network, only allow traffic from the private IP address
of the source server over the preceding ports.
If you retain the default value 0.0.0.0/0 for Source IP Address, it
indicates that all IP addresses can access the ECS.
● The firewall of the ECS must allow traffic to these ports.
8. Click OK.
12.4 How Do I Restore the Connection Between the
Agent and SMS?
Symptom
During the migration, the error message "SMS.6603 The connection to SMS was
lost" was displayed, and the migration task was in the Disconnected status. As a
result, most operations could not be performed.
Server Migration Service
FAQs 12 Migration Network
Issue 70 (2025-11-05) Copyright © Huawei Cloud Computing Technologies Co., Ltd. 122

--- Page 132 ---
Figure 12-5 Disconnection
Possible Causes
● The Agent on the source server is not running.
● The Agent is disconnected from SMS. This can happen if no operations are
performed on the Agent for a long time (30 days by default, but this can be
changed using the heartmonitorday parameter in the config/g-property.cfg
file).
● The network connection between the Agent and SMS is abnormal.
● The SMS-Agent-Py3 or SMS-Agent-Py2 process exits. This can happen if you
have been logged out of or have exited the source server automatically.
● The AK/SK authentication fails. This can happen if the system time in the
source server is more than 15 minutes ahead of or behind the local standard
time because, for example, the NTP server on the source server is incorrectly
configured.
Windows Server 2019, Windows Server 2016, Windows Server 2012,
Windows 10, and Windows 8.1
Step 1 Log in to the source server, find the Agent icon in the lower right corner, and
check whether the Agent is running properly.
● If the Agent has exited, restart the Agent.
● If the Agent is running properly, go to Step 2.
Step 2 On the Agent GUI, check whether the Start button can be clicked.
● If it can, the Agent has proactively disconnected from SMS. Click Start to
reconnect it.
● If it cannot, go to Step 3.
Server Migration Service
FAQs 12 Migration Network
Issue 70 (2025-11-05) Copyright © Huawei Cloud Computing Technologies Co., Ltd. 123

--- Page 133 ---
Step 3 In the CLI, run telnet sms.ap-southeast-3.myhuaweicloud.com 443 to check the
connection between the source server and SMS.
● If the connection is unavailable, check whether the DNS and firewall of the
source server are correctly configured.
● If the connection is available and data is being transmitted, check whether the
outbound bandwidth of the source server is lower than 10 Mbit/s. If it is, the
data transmission may be using up all the bandwidth, which can cause the
connection between the Agent and SMS to time out. In this case, increase the
outbound bandwidth of the source server to more than 10 Mbit/s, and then
continue the migration.
Step 4 Wait for about a minute and sign in to the console.
Step 5 Click Service List. Under Migration, choose Server Migration Service.
The SMS console is displayed.
Step 6 In the navigation pane on the left, choose Servers.
In the Status column, view the connection status of the source server.
----End
Windows Server 2008 and Windows 7
Step 1 Log in to the source server and check whether the SMSAgentDeploy.exe process
is running properly.
Server Migration Service
FAQs 12 Migration Network
Issue 70 (2025-11-05) Copyright © Huawei Cloud Computing Technologies Co., Ltd. 124

--- Page 134 ---
● If the process does not exist, restart the Agent and go to 2.
WARNING
Restarting the Agent indicates that you need to repeat the migration.
● If the process exists, go to 2.
Step 2 In the CLI, run telnet sms.ap-southeast-3.myhuaweicloud.com 443 to check the
connection between the source server and SMS.
● If the connection is unavailable, check whether the DNS and firewall of the
source server are correctly configured.
● If the connection is available and data is being transmitted, check whether the
outbound bandwidth of the source server is lower than 10 Mbit/s. If it is, the
data transmission may be using up all the bandwidth, which can cause the
connection between the Agent and SMS to time out. In this case, increase the
outbound bandwidth of the source server to more than 10 Mbit/s, and then
continue the migration.
Step 3 Wait for about a minute and sign in to the console.
Step 4 Click Service List. Under Migration, choose Server Migration Service.
The SMS console is displayed.
Step 5 In the navigation pane on the left, choose Servers.
In the Status column, view the connection status of the source server.
----End
Linux
Step 1 Use PuTTY or an SSH client to log in to the source server.
Step 2 Run ps -ef | grep -v grep | grep linuxmain to check whether the Agent is running
properly.
● If the linuxmain process is not running, restart the Agent.
● If the linuxmain process is running, go to 3.
Step 3 In the CLI, run telnet sms.ap-southeast-3.myhuaweicloud.com 443 to check the
connection between the source server and SMS.
● If the connection is unavailable, check whether the DNS and firewall of the
source server are correctly configured.
● If the connection is available and data is being transmitted, check whether the
outbound bandwidth of the source server is lower than 10 Mbit/s. If it is, the
Server Migration Service
FAQs 12 Migration Network
Issue 70 (2025-11-05) Copyright © Huawei Cloud Computing Technologies Co., Ltd. 125

--- Page 135 ---
data transmission may be using up all the bandwidth, which can cause the
connection between the Agent and SMS to time out. In this case, increase the
outbound bandwidth of the source server to more than 10 Mbit/s, and then
continue the migration.
Step 4 Wait for about a minute and sign in to the console.
Step 5 Click Service List. Under Migration, choose Server Migration Service.
The SMS console is displayed.
Step 6 In the navigation pane on the left, choose Servers.
In the Status column, view the connection status of the source server.
----End
12.5 Why the Migration Progress Is Suspended or
Slow?
Symptom
During the migration, the progress bar changes slowly or does not change.
Possible Causes
This problem may be caused by multiple factors, such as the network bandwidth,
the number of small files on the source server, and the difference comparison
during incremental synchronization.
Solutions
● Check the bandwidths of the source and target servers. Allocate sufficient
bandwidth for the migration process without affecting services.
● Check whether there are a large number of small files on the source server. If
there are, delete as many unnecessary files as possible.
● During a Linux file-level migration, if the synchronization progress stays at 6%
for a long time, please wait patiently. The migration process is comparing and
synchronizing the differences between the source and target servers.
● Check the migration status on the SMS console. If it is Connected, wait
patiently. If it is Disconnected, see How Do I Restore the Connection
Between the Agent and SMS?
Server Migration Service
FAQs 12 Migration Network
Issue 70 (2025-11-05) Copyright © Huawei Cloud Computing Technologies Co., Ltd. 126

--- Page 136 ---
12.6 Does a Source Server Need Internet Access If It
Can Communicates with the Target Server Through a
Direct Connect, VPN, or VPC Peering Connection?
The Direct Connect, VPN, or VPC peering connection between the source and
target servers is used only for data transmission. Control traffic between the
source server and SMS must go through the Internet, so the source server must
have Internet access.
NO TE
If the source server cannot access the Internet, you can configure a proxy server for the
source server.
The following figure shows how SMS works.
● Control flow: the interaction process between the source server and SMS
The interactions include:
Step 2: The Agent registers itself with SMS and reports the information about
the source server to SMS. Then, SMS evaluates migration feasibility of the
source server.
Step 4: The Agent receives and executes the migration commands sent by
SMS.
● Data flow: the process of migrating data on the source server
The data migration includes:
Server Migration Service
FAQs 12 Migration Network
Issue 70 (2025-11-05) Copyright © Huawei Cloud Computing Technologies Co., Ltd. 127

--- Page 137 ---
Step 5: SMS migrates the system disk of the source server.
Step 6: SMS migrates the data disks of the source server.
12.7 How Do I Configure a Source Server to Access
Huawei Cloud Through a Proxy?
Scenarios
Each source server must continuously communicate with SMS over the Internet. If
the source server cannot access the Internet, you can configure a proxy for it.
NO TICE
The IP address and port number in this section are used as examples only.
Preparations
● Prepare a proxy server.
NO TE
The proxy server and the source server must be able to communicate with each other
over the intranet.
● Obtain the Squid installation package.
Step 1: Configure the Proxy Server
● Installing and configuring Squid on Linux
a. Run the following command on the proxy server to install Squid:
yum -y install squid
b. Run the following command to back up the Squid configuration file:
cp -a /etc/squid/squid.conf /etc/squid/squid.conf.bak
c. Use the text editor to modify the squid.conf configuration file and save
the modification.
vi /etc/squid/squid.conf
i. Configure Squid as a proxy for the network segment where the
source server is located. Replace 192.168.0.0/16 with the private IP
address of the server that needs to access the proxy server. Generally,
it is set to the private network segment of the source server. You can
also set it to 0.0.0.0/0 to allow access from all servers.
acl localnet src 192.168.0.0/16 
ii. Add the following configuration items:
cache_mem 64 MB
maximum_object_size 4 MB
Server Migration Service
FAQs 12 Migration Network
Issue 70 (2025-11-05) Copyright © Huawei Cloud Computing Technologies Co., Ltd. 128

--- Page 138 ---
cache_dir ufs /var/spool/squid 100 16 256
access_log /var/log/squid/access.log
iii. (Optional) Check that http_port is set to the Squid port in the
configuration file. The default value is 3128. You can change it if
necessary.
d. Start Squid.
systemctl start squid
e. Check the Squid status.
systemctl status squid
f. (Optional) Configure Squid to automatically start upon system startup.
systemctl enable squid
● Installing and configuring Squid on Windows
a. On the server you prepared, access https://squid.diladele.com. Locate
Console APP, download the installation program, and install it.
b. After the installation is complete, go to the Squid installation directory
and modify the squid.conf file in the etc/squid folder.
i. Configure Squid as a proxy for the network segment where the
source server is located. Replace 192.168.0.0/16 with the private IP
address of the server that needs to access the proxy server. Generally,
it is set to the private network segment of the source server. You can
also set it to 0.0.0.0/0 to allow access from all servers.
ii. (Optional) Check that http_port is set to the Squid port in the
configuration file. The default value is 3128. You can change it if
necessary.
c. Right-click the Squid icon on the taskbar in the lower right corner and
choose Exit from the shortcut menu.
d. Double-click the Squid Server Tray icon on the desktop to start Squid.
Right-click the Squid icon on the taskbar in the lower right corner and
choose Start Squid Service from the shortcut menu.
e. Run the following command in the CLI window to check whether Squid is
running:
netstat -ano | findstr 3128
Server Migration Service
FAQs 12 Migration Network
Issue 70 (2025-11-05) Copyright © Huawei Cloud Computing Technologies Co., Ltd. 129

--- Page 139 ---
Step 2. Install the Agent on the Source Server
● Linux
a. Run the following command on the source server to download the Agent:
curl -x http://<proxy-server-private-IP-address>:<proxy-port> -O https://sms-resource-intl-ap-
southeast-3.obs.ap-southeast-3.myhuaweicloud.com/SMS-Agent.tar.gz
b. Decompress the installation package.
tar -zxvf SMS-Agent.tar.gz
c. Use the text editor to modify the auth.cfg file in the SMS-Agent/agent/
config directory and save the modification.
vim SMS-Agent/agent/config/auth.cfg
NO TE
● enable indicates whether to use a proxy. If it is set to true, a proxy is used.
● proxy_addr indicates the private IP address of the proxy server, not the IP
address of the target server.
● proxy_port indicates the port specified for Squid.
d. Go to the SMS-Agent installation directory and run the startup.sh script
to start the SMS-Agent. When prompted, enter the AK/SK pair of your
target Huawei Cloud account and the SMS domain name.
When the following information is displayed, the SMS-Agent has been
started up and will automatically start reporting source server
information to SMS.
● Windows
a. Download and install the Agent on the source server.
▪ If the source server runs Windows Server 2019, Windows Server
2016, Windows Server 2012, Windows 10, or Windows 8.1, run the
following command in PowerShell on the source server to download
the Agent:
Invoke-WebRequest -Proxy http://<proxy-server-private-IP-address>:<proxy-port> -Uri
https://sms-resource-intl-ap-southeast-3.obs.ap-southeast-3.myhuaweicloud.com/SMS-
Agent-Py3.exe -OutFile C:\\SMS-Agent-Py3.exe -UseBasicParsing
▪ If the source server runs Windows Server 2008 or Windows 7,
download the Agent (Python 2) from the proxy server, upload the
Agent package to the source server, and install the Agent. For details,
see Installing the SMS-Agent on Windows.
Server Migration Service
FAQs 12 Migration Network
Issue 70 (2025-11-05) Copyright © Huawei Cloud Computing Technologies Co., Ltd. 130

--- Page 140 ---
b. Start the Agent.
▪ If you use the SMS-Agent (Python 3), on the SMS-Agent GUI, enter
the AK/SK pair of the target Huawei Cloud account and the SMS
domain name, select Use proxy, enter the private IP address and
port of the proxy server, and click Start. In this example, no
username and password are required for using the proxy.
▪ If you use the Agent (Python 2), go to the Agent installation
directory, for example, C:\SMS-Agent-Py2\config, modify the
auth.cfg file based on the following figure, and save the
modification.
NO TE
● enable indicates whether to use a proxy. If it is set to true, a proxy is
used.
● proxy_addr indicates the private IP address of the proxy server, not the
IP address of the target server.
● proxy_port indicates the port specified for Squid.
Double-click agent-start.exe in the installation directory (for
example, C:\SMS-Agent-Py2) to open the SMS-Agent CLI. Enter the
AK/SK pair of the target Huawei Cloud account and the SMS domain
name to start the Agent.
12.8 Can I Release or Change the Target Server EIP
During the Migration?
No.
If you choose to migrate over the Internet, the Agent on the source server records
the target server EIP when the migration starts, and uses that EIP for data
transmission during the migration. Releasing or changing the EIP during the
migration will cause the migration to fail.
You can release or modify the EIP only after the migration is complete and no
data synchronization is required.
12.9 How Do I Measure the Network Performance
Before the Migration?
Background
Poor network performance may prolong the migration or cause migration failures.
SMS can help you measure the network performance before the migration.
Server Migration Service
FAQs 12 Migration Network
Issue 70 (2025-11-05) Copyright © Huawei Cloud Computing Technologies Co., Ltd. 131

--- Page 141 ---
CA UTION
● It takes 4 to 5 minutes to complete the measurement. To accurately measure
the network performance, the migration rate limits you configure are not
applied during the measurement, and more network resources may be used.
You are advised to evaluate the actual resource usage on the source server to
ensure that your services run properly.
● You must make sure that inbound ICMP traffic is allowed in the security group
of the target server.
Procedure
You can measure the network performance when:
● You create a migration task.
On the Configure Basic Settings tab page, expand Migration Settings
(Optional), set Measure Network Performance to Yes. During the full
migration, SMS will generate a subtask called Measure the network
performance.
Figure 12-6 Determining whether to measure the network performance.
Figure 12-7 The subtask for measuring the network performance
● An error was reported during the subtask for migrating data, synchronizing
data, or modifying configuration, or such a subtask was paused.
You can choose More > Manage Migration Settings > Measure Network
Performance in the Operation column.
Measurement Results
During the network performance measurement, the system will check whether the
source server can connect to the target server and related cloud services, such as
Server Migration Service
FAQs 12 Migration Network
Issue 70 (2025-11-05) Copyright © Huawei Cloud Computing Technologies Co., Ltd. 132

--- Page 142 ---
IMS, ECS, EVS, and VPC, using their domain names In addition, it measures four
core network metrics: packet loss rate, jitter, network latency, and bandwidth, as
well as two factors that indirectly affect network performance: memory usage and
CPU usage. The measurement results are displayed in green, orange, and red,
which indicate good, medium, and poor respectively. After the measurement is
complete, SMS will display how well your network is performing and estimate
how long the migration will take.
NO TE
● The evaluation result represents only the network performance during the test.
● The migration duration is estimated when the migration rate limits are not applied and
is for reference only. In addition to the migration network, the migration duration is
affected by many other factors, such as the number of small files on the source server,
network fluctuation, disk read/write speed, and network traffic limit. A more reliable
indicator is the remaining migration time displayed in the task list.
12.10 Can I Set a Rate Limit for a Migration?
Yes. To ensure your source services are not affected by the migration, you can limit
the migration bandwidth by referring to section Setting a Migration Rate.
12.11 How Do I Configure Automatic Recovery?
Background
Previously, if the network between the source and target servers was disconnected,
the migration task would fail, and you would have to manually restart it. Now,
you can use the SMS-Agent to restart the migration task automatically once
network connectivity is restored.
Precautions
● Automatic recovery can be triggered by errors SMS.0807, SMS.1807,
SMS.2802, SMS.3802, SMS.2805, and SMS.2806.
● You can control the maximum number of attempts to restart a failed
migration task. After that, the automatic recovery program automatically
exits, and you need to manually restart the migration task on the SMS
console after the network is restored.
Server Migration Service
FAQs 12 Migration Network
Issue 70 (2025-11-05) Copyright © Huawei Cloud Computing Technologies Co., Ltd. 133

--- Page 143 ---
Configuration Parameters
To use automatic recovery, you need to configure the following parameters:
● auto_start_interval_seconds: The interval for executing the automatic
recovery program, in seconds. For example, if you want to let this feature try
to restart a failed migration task every half an hour, set this parameter to
1800 (the number of seconds in half an hour).
● auto_start_max_retry_times: The maximum number of times that the
automatic recovery program can be executed before exiting.
● auto_start_each_addition_seconds: The increment of the interval after each
execution of the automatic recovery task program, in seconds. For example, if
auto_start_each_addition_seconds is set to 10 and
auto_start_interval_seconds is set to 3600, the execution interval of the
automatic recovery program increases by 10 seconds each time, incrementing
to 3610 seconds, 3620 seconds, and so on.
Configuration File Path
The path of the configuration file depends on the source server OS.
● Linux: .../SMS-Agent/agent/config/g-property.cfg
● Windows:
– Windows Agent (Python 3): C:\SMS-Agent-Py3\config\g-property.cfg
– Windows Agent (Python 2): C:\SMS-Agent-Py2\config\g-property.cfg
Server Migration Service
FAQs 12 Migration Network
Issue 70 (2025-11-05) Copyright © Huawei Cloud Computing Technologies Co., Ltd. 134

--- Page 144 ---
13 Migration Duration
13.1 How Long Does a Migration Take?
1. Pre-migration evaluation
Test the TCP speed from a source server to the target server. For details, see
How Do I Test the Network Bandwidth Between the Source and Target
Servers Using iPerf?
where
– T: the required migration time, in hours
– C: the total data volume of the source server, in GB
– S: the TCP speed (in Mbit/s) from the source server to the target ECS,
that is, the TCP speed obtained in Step 4.2
– U: the network usage, which is related to network quality (jitter, delay,
and packet loss). The value is usually between 50% and 80%.
Assume that the total data volume of the source server is 100 GB, the TCP
speed tested by iPerf is 100 Mbit/s, and the network usage is 70%. The
migration duration is calculated as follows:
Migration time T = 100 (GB) × 1,000 × 8/100 (Mbit/s)/3,600/70% ≈ 3.17
hours
You can refer to Table 13-1 to view the time required for migrating source
servers with different volumes of data and the TCP speeds assuming that the
network usage U is 70%.
Server Migration Service
FAQs 13 Migration Duration
Issue 70 (2025-11-05) Copyright © Huawei Cloud Computing Technologies Co., Ltd. 135

--- Page 145 ---
Table 13-1 Estimated migration duration
Total Data
Volume on
Source Server
(C) (GB)
TCP Speed
(S) (Mbit/s)
Migration Time (T) (Hour)
NOTE
For migration time T, if the unit is hour,
two digits are retained after the decimal
point. If the unit is minute, the value is
an integer.
10 GB 0.5 Mbit/s SMS is not recommended.
NOTE
If a small bandwidth is used to migrate a
large amount of data, the migration may be
interrupted due to high network latency.
1 Mbit/s SMS is not recommended.
5 Mbit/s 6.35 hours
10 Mbit/s 3.17 hours
100 Mbit/s 0.32 hours (about 19 minutes)
500 Mbit/s 0.06 hours (about 4 minutes)
1,000 Mbit/s 0.03 hours (about 2 minutes)
30 GB 0.5 Mbit/s SMS is not recommended.
1 Mbit/s SMS is not recommended.
5 Mbit/s 19.04 hours
10 Mbit/s 9.52 hours
100 Mbit/s 0.95 hours (about 57 minutes)
500 Mbit/s 0.19 hours (about 11 minutes)
1,000 Mbit/s 0.10 hours (about 6 minutes)
50 GB 0.5 Mbit/s SMS is not recommended.
1 Mbit/s SMS is not recommended.
5 Mbit/s SMS is not recommended.
10 Mbit/s 15.87 hours
100 Mbit/s 1.59 hours
500 Mbit/s 0.32 hours (about 19 minutes)
1,000 Mbit/s 0.16 hours (about 10 minutes)
100 GB 0.5 Mbit/s SMS is not recommended.
1 Mbit/s
5 Mbit/s
Server Migration Service
FAQs 13 Migration Duration
Issue 70 (2025-11-05) Copyright © Huawei Cloud Computing Technologies Co., Ltd. 136

--- Page 146 ---
Total Data
Volume on
Source Server
(C) (GB)
TCP Speed
(S) (Mbit/s)
Migration Time (T) (Hour)
NOTE
For migration time T, if the unit is hour,
two digits are retained after the decimal
point. If the unit is minute, the value is
an integer.
10 Mbit/s
100 Mbit/s 3.17 hours
500 Mbit/s 0.63 hours (about 38 minutes)
1,000 Mbit/s 0.32 hours (about 19 minutes)
500 GB 0.5 Mbit/s SMS is not recommended.
1 Mbit/s
5 Mbit/s
10 Mbit/s
100 Mbit/s 15.87 hours
500 Mbit/s 3.17 hours
1,000 Mbit/s 1.59 hours
1 TB 0.5 Mbit/s SMS is not recommended.
1 Mbit/s
5 Mbit/s
10 Mbit/s
100 Mbit/s
500 Mbit/s 6.50 hours
1,000 Mbit/s 3.25 hours
Greater than 1
TB
- SMS is not recommended.
 
2. Evaluation during migration (remaining time)
T = C × 1000 × 8 × (80% – P)/60%/S/3600
– T: the time required, in hours
– C: the total data volume of the source server
– P: the transmission progress. P can be viewed on the SMS console. If P is
larger than 80%, the data transmission is complete and you do not need
to evaluate the remaining time.
Server Migration Service
FAQs 13 Migration Duration
Issue 70 (2025-11-05) Copyright © Huawei Cloud Computing Technologies Co., Ltd. 137

--- Page 147 ---
– S: the migration speed in Mbit/s. S cannot be tested accurately with iPerf.
To obtain the accurate migration speed:
▪ Windows: Choose Windows Task Manager > Performance >
Resource Monitor to view the migration speed S for Windows OSs.
▪ Linux: You are advised to use the sar tool or use /proc/net/dev to
monitor the NIC speed.
Take an example where 100 GB of data needs to be migrated (C), the
progress (P) is 70%, and the migration speed (S) is 100 Mbit/s. If we plug in
the numbers in our formula, we get:
Migration time T = 100 (GB) × 1,000 × 8 × (80% – 70%)/60%/100 (Mbit/s)/
3,600 = 0.37 hours
13.2 How Do I View the Remaining Migration Time?
The remaining migration time depends on how much data is left to migrate and
on how fast it is being migrated. Because the migration speed changes over time,
the remaining time shown on the SMS console is only an estimate. You can
perform the following operations to view the remaining migration time:
Step 1 Sign in to the SMS console.
Step 2 In the navigation pane on the left, choose Servers.
Step 3 In the server list, click the server name. The task progress details show up on the
right. You can see the estimated time left for the migration.
Server Migration Service
FAQs 13 Migration Duration
Issue 70 (2025-11-05) Copyright © Huawei Cloud Computing Technologies Co., Ltd. 138

--- Page 148 ---
----End
13.3 How Is the Migration Rate Displayed on the SMS
Console Calculated?
Metrics
Table 13-2 Related metrics
Metric Windows Block-
Level
Linux File-Level Linux Block-Level
Total
data
Total used space of
all partitions to be
migrated. You can
right-click a partition
and choose
Properties from the
shortcut menu. On
the General tab, you
see the partition
usage.
Total used space of all
partitions to be
migrated. You can run
df -TH to view the
used and available
space on each
partition.
Total size of all
partitions to be
migrated. You can
run fdisk -lu to
view the size of
each partition.
Migrated
data
Total size of all
migrated data blocks
that are located in
the used partition
space.
Total size of all
migrated files.
Total size of all
migrated data
blocks in the
partition.
Elapsed
time
Time elapsed after a migration starts.
Remainin
g time
Remaining time = (Total data – Migrated data)/Migration rate
Server Migration Service
FAQs 13 Migration Duration
Issue 70 (2025-11-05) Copyright © Huawei Cloud Computing Technologies Co., Ltd. 139

--- Page 149 ---
Metric Windows Block-
Level
Linux File-Level Linux Block-Level
Migration
rate
Calculated using the
amount of data
migrated over the
last 5 seconds. For
example, if 200 MB of
data was migrated
over the last 5
seconds, the
migration rate is 320
Mbit/s (200 MB ×
8/5s). The migration
rate is different from
the NIC throughput
because the data is
compressed before
being transmitted
through the NIC. For
details, see Windows
Block-Level
Migration.
Actual migration
speed, which is the
NIC rate of the target
server.
Calculated using
the amount of
data migrated
over the last 5
seconds. For
example, if 200 MB
of data was
migrated over the
last 5 seconds, the
migration rate is
320 Mbit/s (200
MB × 8/5s). The
migration rate is
different from the
NIC throughput
because the data is
compressed before
being transmitted
through the NIC.
For details, see
Linux Block-Level
Migration.
 
Windows Block-Level Migration
There are two types of Windows block-level migration rates. One is the rate
displayed on the SMS console, which is the average migration rate over the last 5
seconds. The other is the actual NIC throughput for the migration process, which is
less than what is displayed on the console because the data is compressed before
being transmitted through the NIC.
● Migration rate displayed on the SMS console (before compression)
The migration rate displayed on the console is the actual amount of data
migrated per second, which is the data transmission rate before compression.
It is the average amount of data migrated over the last 5 seconds. For
example, if 200 MB of data was transmitted over the last 5 seconds, and the
amount of data after compression is 50 MB, the rate displayed on the console
is 320 Mbit/s (200 MB × 8/5s), but the NIC throughput for the migration
process is 80 Mbit/s (50 MB × 8/5s).
● NIC throughput (after compression)
During a Windows block-level migration, the Agent compresses data before
transmitting it to the target server. The Agent on the target server
decompresses the data and writes the data to disks. The NIC throughput is
the network bandwidth used for the migration. You can view this rate in the
task managers on the source server and target server. However, you can view
this rate only after the target server is unlocked. The following uses Windows
Server 2012 as an example.
Server Migration Service
FAQs 13 Migration Duration
Issue 70 (2025-11-05) Copyright © Huawei Cloud Computing Technologies Co., Ltd. 140

--- Page 150 ---
CA UTION
● You can view the network bandwidth occupied by the migration process in
the task manager. Use the migration rate displayed on the SMS console to
estimate how long the migration will take.
● The NIC throughput of the source server also includes the bandwidth
occupied by applications running on the source server. A more reliable
metric is the migration rate of the migration process. The rate displayed in
the task manager is the compressed data transmission rate.
● A Windows block-level migration rate is more stable because it is not
affected by the number or size of files to be migrated.
Linux File-Level Migration
During a Linux file-level migration, data is not compressed, so the migration rate
displayed on the console and the NIC throughput should match.
However, there is an exception. A Linux file-level migration is inefficient when
transferring small files. When migrating a large number of small files, the network
bandwidth cannot be fully utilized. In such a scenario, the migration rate is far
lower than the available network bandwidth.
Linux Block-Level Migration
During a Linux file-level migration, data is not compressed, so the migration rate
displayed on the console and the NIC throughput should match.
Server Migration Service
FAQs 13 Migration Duration
Issue 70 (2025-11-05) Copyright © Huawei Cloud Computing Technologies Co., Ltd. 141

--- Page 151 ---
13.4 How Do I Speed Up Migration?
● Improve your network speed. You can test the network performance from the
source server to the target server on Huawei Cloud. For details, see How Do I
Test the Network Bandwidth Between the Source and Target Servers
Using iPerf? If the network speed is less than 500 kbit/s, check the following
items:
– If the source server is in a data center, check the bandwidth, switches,
routers, security devices (such as firewalls), network lines, and network
protocols between the source server and the Internet. If there are any
issues, contact network engineers. It is recommended that the network
speed from the source server to Huawei Cloud over the Internet be at
least 10 Mbit/s.
– Check the outbound bandwidth of the source server and the inbound
bandwidth of the target server. Increase the smaller bandwidth or both
as needed. For the influence of bandwidth on migration duration, see
Table 13-1.
– Check that the OS settings of the source and target servers. In Windows,
you can run perfmon to invoke Performance Monitor to monitor the
network. In Linux, you are advised to use the sar tool to monitor the
network and use /proc/net/dev to monitor the NIC speed. If the network
is slow, the OS configuration may be incorrect. Note that your OS services
and processes cannot limit the NIC speed.
● Delete any files you no longer need from the source server before migration.
● Check the I/O read and write performance and CPU performance of the
source server. In Windows, you can run perfmon to invoke Performance
Monitor to monitor the CPU and I/O read and write performance. In Linux,
you can use top or ps to monitor the CPU, and use iostat or iotop to monitor
the I/O performance. If the I/O and CPU performance of your source server is
poor, you are advised to increase the I/O and CPU resources or reduce the
workloads on the source server.
13.5 Why Does the Migration Speed Fluctuate?
During the migration, operations such as module initializations, backups, and
deletions are performed. It is difficult to accurately estimate how long these
operations will take. Speed fluctuation is a normal phenomenon.
13.6 How Do I Test the Network Bandwidth Between
the Source and Target Servers Using iPerf?
Prerequisites
Ensure that the network between the source and target server is connected, and
the port used for the iPerf test is allowed by a security group rule configured for
the target server on Huawei Cloud. For how to configure a security group rule, see
How Do I Configure Security Group Rules for Target Servers?
Server Migration Service
FAQs 13 Migration Duration
Issue 70 (2025-11-05) Copyright © Huawei Cloud Computing Technologies Co., Ltd. 142

--- Page 152 ---
This test must be performed before the migration, and workloads running on the
source server must have little impact on the network, or the test results will be
inaccurate.
Procedure
Step 1 Download iPerf based on the source server OS.
Step 2 Extract the iPerf installation package into directories on the source and target
servers. You can also use another ECS in the same region as the target server. On a
Windows server, the iPerf installation package looks like follows.
Step 3 On the target server, run iPerf in server mode using the CLI. The following uses
Windows as an example.
1. Switch to the directory with the iPerf executable:
cd /d <path>
In this command, <path> is where you extracted iPerf on the target server in
Step 2.
2. Run iPerf in server mode:
iperf3 -p <port> -s
In this command, <port> is the port the iPerf server listens on. It is
recommended that port 8900 be used for Windows and port 22 for Linux
since the two ports are configured as data transmission ports. You can also
use another port for testing, but ensure that this TCP or UDP port is allowed
in security group rules configured for the target server.
For details about more parameters, run the iperf -h command.
For example, if port 8900 is used for Windows and Server listening on 8900
is displayed in the command output, iPerf is running.
Step 4 On the source server, run iPerf in client mode using the CLI. Test the TCP
bandwidth, UDP jitter, packet loss rate, and bandwidth. The following uses
Windows as an example.
1. Switch to the directory with the iPerf executable:
cd /d <path>
In this command, path is where you extracted iPerf on the source server in
Step 2.
Server Migration Service
FAQs 13 Migration Duration
Issue 70 (2025-11-05) Copyright © Huawei Cloud Computing Technologies Co., Ltd. 143

--- Page 153 ---
2. Test the TCP bandwidth using iPerf:
iperf3 -c <target-IP-address> -p <port> -t <time>
In the preceding command, -c is used to run iPerf in client mode.
– <target-IP-address> is the IP address of the target server (iPerf server).
– <port> is the port used for connecting to the target server, that is, the
iPerf listening port in Step 3.2.
– <time> is the total test time. The default unit is second.
Wait for the iPerf client to connect to the iPerf server and the bandwidth test
to complete, and then check the results. The following figure uses port 8900
on Windows as an example.
3. Test the UDP jitter, packet loss rate, and bandwidth.
iperf3 -c <target-IP-address> -p <port> -u -t <time>
-u is used to measure the UDP jitter, packet loss rate, and bandwidth.
– <target-IP-address> is the IP address of the target server (iPerf server).
– <port> is the port used for connecting to the target server, that is, the
iPerf listening port in Step 3.2.
– <time> is the total test time. The default unit is second.
Wait for the iPerf client is connected to the iPerf server and the test is
complete, and check the result. The following figure uses port 8900 on
Windows as an example.
Server Migration Service
FAQs 13 Migration Duration
Issue 70 (2025-11-05) Copyright © Huawei Cloud Computing Technologies Co., Ltd. 144

--- Page 154 ---
4. Run the following command to measure the network latency:
ping <target-IP-address>
<target-IP-address> is the IP address of the target server (iPerf server).
Ensure the ICMP packets are allowed to pass through by the security group
rules of the VPC that the target server belongs to.
Step 5 View all testing options. Alternatively, you can obtain the help information about
iPerf on its official website.
iperf3 -h
----End
13.7 Why Isn't the Increased Bandwidth Being Used
During the Migration?
The bandwidth being used will be limited by one of the three bottlenecks:
● The newly increased bandwidth of the source server
● The inbound bandwidth of the target server. For details, see What Are
Inbound Bandwidth and Outbound Bandwidth?
● The migration rate limit you configured on the SMS console. For details, see
Setting a Migration Rate.
CA UTION
As long as there is no other bottleneck, the newly increased bandwidth takes
effect after 5 to 10 minutes.
Server Migration Service
FAQs 13 Migration Duration
Issue 70 (2025-11-05) Copyright © Huawei Cloud Computing Technologies Co., Ltd. 145

--- Page 155 ---
13.8 Is the Migration Speed Determined by the Source
Bandwidth or the Target Bandwidth?
The migration speed is limited by either the outbound bandwidth of the source
server or the inbound bandwidth of the target server, whichever is smaller.
13.9 Why Does the Migration Stay at a Stage for a
Long Time?
A migration may stay at the Continuous Synchronization, Full Replication, or
Target Launch stage for a long time. For details about how to get migration logs,
see Where Can I Find the Agent Run Logs?
● Scenario 1: Continuous Synchronization
Continuous synchronization is a new feature of SMS. It automatically
synchronizes incremental data from a source server to the target server. If you
set Enable Continuous Synchronization to Yes when you configure the
migration settings, after the full replication is complete, the migration enters
the Continuous Synchronization stage.
To complete the migration, you need to manually launch the target server, or
the migration remains in the Continuous Synchronization stage. The
migration is complete only after the target server is launched.
● Scenario 2: Full Replication
During the full replication, the migration progress is suspended for a long time if
the data volume is large but the migration speed is too slow. You can verify the
causes by viewing the Agent run logs.
If information similar to the following is displayed, the migration is normal.
Server Migration Service
FAQs 13 Migration Duration
Issue 70 (2025-11-05) Copyright © Huawei Cloud Computing Technologies Co., Ltd. 146

--- Page 156 ---
Parameter Description
speed The migration rate
task progress The migration progress
total size The amount of data to be migrated
replicate size The amount of data migrated
 
NO TE
If the migration rate is not 0 and the amount of migrated data keeps increasing, the
migration runs normally.
● Scenario 3: Target Launch
– After you launch the target server, the task progress bar stays at 0% for a
long time.
After you launch the target server, the system performs an incremental
data synchronization. The incremental data volume determines how
much time is required for the synchronization. The synchronization
progress may remain unchanged for a long time if there is too much
incremental data on the source server.
To check whether data is being synchronized, view the latest
sms_Info.log file. If no error logs are generated during the target server
launch, the migration goes smoothly.
– After you launch the target server, the task progress bar remains
unchanged for a long time.
You can pause the task and start it again. Wait for about 10 minutes and
check whether the progress bar changes.
13.10 What Factors Affect the Migration Speed?
The following table lists the factors that may affect the migration speed and
duration.
OS Factor Description
- CPU or memory
usage
The migration occupies some memory and
CPU resources of the source server. The
usage varies depending on the source
conditions. Before the migration, ensure
that both the CPU usage and memory
usage of the source server are not higher
than 75%, and the available memory is at
least 520 MB.
Server Migration Service
FAQs 13 Migration Duration
Issue 70 (2025-11-05) Copyright © Huawei Cloud Computing Technologies Co., Ltd. 147

--- Page 157 ---
OS Factor Description
Network bandwidth The network latency between the source
and target servers must not be too high.
The migration speed depends on the
source bandwidth and the target
bandwidth, whichever is smaller. For
details about the network requirements,
see How Do I Set Up a Secure Migration
Network for Using SMS?
Windows Disk fragments SMS supports only block-level migration
for Windows servers. Only valid blocks are
migrated. A large number of disk
fragments will be generated on disks in
daily use. It takes time to identify valid
blocks among these fragments.
Linux ● Large files
● Too many small
files
For a file-level Linux migration, the
migration speed will be affected if
● There are files larger than 2 GB.
● There are a large number of small files,
such as, those smaller than 20 KB.
 
The following table lists the factors that may affect the synchronization duration.
OS Factor Description
- ● Too much new
data on the
source server
● Too much
changed data
on the source
server
During an incremental synchronization, if a
large amount of data is newly generated or
changed on the source server, the
synchronization takes a long time.
Windows Too many file
fragments
During a synchronization, if a large number
of file fragments are generated on the
source server, the synchronization takes a
long time.
Linux Large sparse files During a synchronization, the system scans
but does not migrate sparse files. If there
are large sparse files on the source server,
the synchronization takes a long time.
 
Server Migration Service
FAQs 13 Migration Duration
Issue 70 (2025-11-05) Copyright © Huawei Cloud Computing Technologies Co., Ltd. 148

--- Page 158 ---
13.11 Why Is the Linux Block-Level Migration Very
Slow?
Symptom
During a Linux block-level migration, you found that the actual migration rate was
far lower than the bandwidth limit you configured.
Possible Causes
The possible causes are as follows:
● A small amount of data is stored in disk blocks.
● A large number of sparse files are stored in source disks.
In a Linux block-level migration, data is compressed before being transmitted. If
the disk blocks to be migrated store a small amount of data or are empty, the
data compression rate is high, for example, 100 MB of data is compressed to 5
MB. Though the displayed migration rate is very low, the migration is performance
quickly, and the network connection and the bandwidth are normal.
Server Migration Service
FAQs 13 Migration Duration
Issue 70 (2025-11-05) Copyright © Huawei Cloud Computing Technologies Co., Ltd. 149

--- Page 159 ---
14 Disk Management
14.1 Why Was a 40-GB EVS Disk Added to the Target
Server During the Migration?
SMS creates and attaches a 40-GB EVS disk to each target server temporarily
during the migration. These EVS disks are billed on a pay-per-use basis. After the
migration is complete, these EVS disks will be released. Do not delete these EVS
disks or change their billing mode to yearly/monthly before the migration is
complete, or the migration will fail.
14.2 Why Can't I Attach the Original System Disk Back
to a Target Server?
Symptom
A migration failed, and you found that the target server still used the temporary
system disk whose name started with SMS and its original system back could not
be attached back.
Possible Causes
The temporary system disk was not detached. You need to manually detach the
temporary disk.
Solution
This section uses Linux as an example to describe how to detach the temporary
system disk and attach the original one back to the target server.
The Agent Was Not Uninstalled from the Source Server
1. Switch to the SMS-Agent directory on the source server, run ./agent-cli, enter
connect, and press Enter to connect the source server to SMS.
Server Migration Service
FAQs 14 Disk Management
Issue 70 (2025-11-05) Copyright © Huawei Cloud Computing Technologies Co., Ltd. 150

--- Page 160 ---
2. Run clear in the CLI.
After about a minute, the temporary disk on the target server will be
detached and deleted, and the original system disk will be attached back.
The Agent Was Uninstalled from the Source Server
1. Log in to the ECS console, locate the target server, and detach the temporary
system disk. For details, see Detaching an EVS Disk from a Running ECS.
2. Log in to the API Explorer.
3. Set the following parameters:
– Region: Select the target region.
– Project_id: indicates the project ID, which is automatically filled after
login. You can leave it blank.
– server_id: indicates the ID of the server to which the system disk is to be
attached.
– device: indicates the disk mount point.
▪ For Xen ECSs, device is mandatory. Set device to /dev/sda.
▪ For KVM ECSs, set device to dev/vda.
– volumeId: indicates the ID of the disk to be attached. The value is in
UUID format.
Figure 14-1 Attaching disks
Server Migration Service
FAQs 14 Disk Management
Issue 70 (2025-11-05) Copyright © Huawei Cloud Computing Technologies Co., Ltd. 151

--- Page 161 ---
14.3 How Do I Resize Partitions and Disks When I
Migrate a Windows Source Server?
Scenarios
You need to manually resize partitions and disks if:
● The system disk of a source server is larger than 1 TB.
● A file system on the source server is not supported by SMS.
● There are partitions that do not need to be migrated or there are other
resizing requirements.
Scenario 1
The source system disk is 1.1 TB, with 100 GB allocated for the system and boot
partitions and 1,024 GB for drive D. You can prepare a 100-GB disk and a 1,024-
GB disk on the target server for receiving data from the source system disk.
The procedure is as follows:
1. Go to the Agent configuration directory on the source server.
– Windows Agent (Python 3)
C:\SMS-Agent-Py3\config
– Windows Agent (Python 2)
C:\SMS-Agent-Py2\config
2. Modify the disk.cfg file as follows and save it.
[vol_mount_modify]
D = 2
E = 3
F = 4
...
NO TE
● D = 2 indicates that data in drive D will be migrated to the second disk on the
target server.
● If there are multiple partitions on the source server, and you want to migrate them
to different disks on the target server, modify the disk.cfg file in the same way,
such as D=2, E=3, F=4.
3. Go to the SMS console, and delete the migration task for this source server.
4. Restart the Agent installed on the source server. Go back to the SMS console
to check that the disk information has been changed in the source server
details.
CA UTION
This method cannot be used to locate the system and boot partitions to different
disks because they can only be migrated to the first disk on the target server.
Server Migration Service
FAQs 14 Disk Management
Issue 70 (2025-11-05) Copyright © Huawei Cloud Computing Technologies Co., Ltd. 152

--- Page 162 ---
Scenario 2
Drive D on the source server use the FAT32 file system, but the file system is not
supported by SMS. You can exclude this partition from migration using the
configuration file.
The procedure is as follows:
1. Go to the Agent configuration directory on the source server.
– Windows Agent (Python 3)
C:\SMS-Agent-Py3\config
– Windows Agent (Python 2)
C:\SMS-Agent-Py2\config
2. Modify the disk.cfg file as follows and save it.
[vol_mount_modify]
D = -1
NO TE
D = -1 indicates that drive D will not be migrated.
3. Go to the SMS console, and delete the migration task for this source server.
4. Restart the Agent. Go back to the SMS console to check that the disk D's
information has disappeared from the source server details.
Scenario 3
The source server has one system disk (the first disk) and two data disks (disk D
and disk E). You want to migrate the two data disks to the same disk on the
target server.
The procedure is as follows:
1. Go to the Agent configuration directory on the source server.
– Windows Agent (Python 3)
C:\SMS-Agent-Py3\config
– Windows Agent (Python 2)
C:\SMS-Agent-Py2\config
2. Modify the disk.cfg file as follows and save it.
[vol_mount_modify]
E = 2
NO TE
E = 2 indicates that data in disk E will be migrated to the second disk on the target
server.
3. Go to the SMS console, and delete the migration task for this source server.
4. Restart the Agent. Go back to the SMS console to check whether in the source
server details, there is only one data disk which consists of partition D and
partition E.
Server Migration Service
FAQs 14 Disk Management
Issue 70 (2025-11-05) Copyright © Huawei Cloud Computing Technologies Co., Ltd. 153

--- Page 163 ---
14.4 How Do I Shrink the Disk Partitions on a Windows
Source Server?
Symptom
When you use SMS to migrate a source server running Windows, the disks on the
target server should be at least the size recommended on the Source
Management page. Otherwise, the migration may fail. If you want to use an
existing server as the target server and the server's disks are too small, you can
shrink the source server disks to be no larger than the target server disks.
Possible Causes
For a migration to be successful, each target server disk must be at least 1 GB
larger than the paired source server disk. If they are not, you need to either scale
up the target server disk or shrink the source server disk. On a Windows server,
you can shrink disk partitions of the source server using the Windows Disk
Management tool.
Procedure
1. Choose Start, enter diskmgmt.msc in the search box.
The Disk Management tool is displayed.
2. Right-click the partition of the disk you want to shrink and choose Shrink
Volume.
The Shrink Volume dialog box is displayed.
3. Enter the amount you wish to shrink the partition by in the Enter the
amount of space to shrink in MB text box.
Server Migration Service
FAQs 14 Disk Management
Issue 70 (2025-11-05) Copyright © Huawei Cloud Computing Technologies Co., Ltd. 154

--- Page 164 ---
4. Click Shrink.
The new space available is displayed as unallocated space, as shown in Figure
14-2.
Figure 14-2 Disk partition after shrink
5. Sign in to the console.
6. Click Service List. Under Migration, choose Server Migration Service.
The SMS console is displayed.
7. In the navigation pane on the left, choose Servers.
The server list is displayed.
8. Locate the server record to be deleted, and in the Operation column, choose
More > Delete.
You can also select the server record and choose More > Delete in the upper
left corner of the server list.
9. In the displayed Delete Server dialog box, click OK.
10. Report the information about the source server to SMS again.
– If the Agent has been uninstalled from the source server, install the Agent
again. For details, see Installing the SMS-Agent on Windows.
– If the Agent has been installed on your source server, restart the Agent to
report the source server information to SMS.
Server Migration Service
FAQs 14 Disk Management
Issue 70 (2025-11-05) Copyright © Huawei Cloud Computing Technologies Co., Ltd. 155

--- Page 165 ---
14.5 How Do I Exclude a Partition from Migration in
Windows?
Procedure
Step 1 Go to the Agent configuration directory on the source server.
● Windows Agent (Python 3)
C:\SMS-Agent-Py3\config
● Windows Agent (Python 2)
C:\SMS-Agent-Py2\config
Step 2 Modify the disk.cfg file as follows and save it.
[vol_mount_modify]
D = -1
NO TE
D = -1 indicates that disk D will not be migrated.
Step 3 Restart the Agent. Go back to the SMS console to check that the disk D's
information has disappeared from the source server details. If drive D is still
displayed in the source server details, delete the source server record on the SMS
console and register the source server with SMS again.
NO TE
This method is only suitable for exclusion before the migration because restarting the Agent
during the migration will cause a migration failure.
----End
14.6 How Do I Resolve Error "Target server has fewer
disks than source server. Select another target server"
When I Configure the Target Server?
Symptom
When you clicked Next: Confirm after you select an existing ECS as the target
server, the message "Target server has fewer disks than source server. Select
another target server" was displayed.
Server Migration Service
FAQs 14 Disk Management
Issue 70 (2025-11-05) Copyright © Huawei Cloud Computing Technologies Co., Ltd. 156

--- Page 166 ---
Possible Causes
When configuring the target server, SMS checks whether the target server has the
same number of disks as the source server. The number of disks on the target
server is less than that on the source server because some disks on the target
server may have been deleted or detached.
Solution
Step 1 On the SMS console, in the navigation pane, choose Servers.
Step 2 Locate the source server and choose More > Delete Target Configuration.
Step 3 Attach disks to the target server to ensure that the target server has at least as
many disks as the source server.
Step 4 Go back to SMS console, locate the source server in the server list, and click
Configure in the Target column. Configure a target server and perform the
migration again.
----End
14.7 What Are the Disk Requirements for Source and
Target Servers?
Note that:
● SMS imposes a disk limit on source servers due to ECS constraints. While an
ECS supports up to 24 disks, SMS reserves one slot for a temporary disk
during migration. This means that a source server can have a maximum of 23
disks.
● If you do not need to adjust disk and partition settings for a source server
when you migrate it, make sure that:
– The target server has at least as many disks as the source server.
– Each disk on the target server is at least as large as its corresponding disk
on the source server.
● If you need to adjust disk and partition settings for a source server when you
migrate it, make sure that:
– The target server has at least the number of disks you specify during the
adjustment.
– Each disk on the target server has at least the space you specify during
the adjustment.
For details about resizing rules, see Resizing disks and partitions.
Server Migration Service
FAQs 14 Disk Management
Issue 70 (2025-11-05) Copyright © Huawei Cloud Computing Technologies Co., Ltd. 157

--- Page 167 ---
14.8 How Can I Migrate a Source Server with a Large
System Disk?
Windows
● If the system disk of the source server is too large, and the total size of the
system and boot partitions is greater than 1 TB, SMS cannot migrate the
source server.
● If the system disk of the source server is larger than 1 TB, but the total size of
the system and boot partitions is less than 1 TB, you can modify the Agent
configuration file to perform the migration successfully.
Assume that the source system disk is 1.1 TB, with 100 GB for the system and
boot partitions and 1,024 GB for drive D. You can prepare a 100-GB disk and a
1,024-GB disk on the target server for receiving data from the source system
disk.
CA UTION
The system and boot partitions on the source server can only be migrated to
the first disk on the target server.
You can view the total size of the two partitions using Disk Management in
Windows.
Procedure
a. Go to the Agent configuration directory on the source server.
▪ Agent (Python 3)
C:\SMS-Agent-Py3\config
▪ Agent (Python 2)
C:\SMS-Agent-Py2\config
b. Modify the disk.cfg file as follows and save it.
[vol_mount_modify]
D = 2
E = 3
...
NO TE
1. D = 2 indicates that data in drive D will be migrated to the second disk on the
target server.
2. If there are multiple partitions on the source server, and you want to migrate
them to different disks on the target server, modify the disk.cfg file in the
same way, such as D=2, E=3, F=4.
c. Restart the Agent. You will see that the partition locations have been
changed.
Server Migration Service
FAQs 14 Disk Management
Issue 70 (2025-11-05) Copyright © Huawei Cloud Computing Technologies Co., Ltd. 158

--- Page 168 ---
Linux
You can perform a file-level migration and resize disks and partitions. For details,
see Resizing disks and partitions. If this method does not work, contact technical
support.
14.9 How Do I Resolve Error "Some disks on the target
server are smaller than those on the source server.
Select another target server" When I Configure the
Target Server?
Symptom
When you clicked Next: Confirm after you select an existing ECS as the target
server, the message "Some disks on the target server are smaller than those on
the source server. Select another target server" was displayed.
Possible Causes
SMS has the following requirements for a target server:
● The target server must have at least as many disks as the source server.
● Every disk on the target server must be at least as large as the paired disk on
the source server.
The ECS you selected fails to meet the second requirement.
Solution
Step 1 On the ECS console, locate any target server disks that are smaller than their pairs
on the source server and expand the disk capacity.
You can expand the target server disks based on the recommended disk sizes on
the Configure Target page of the SMS console.
If the capacity requirement can be met by adjusting the disk mounting sequence,
perform the following steps:
1. Go to the ECS console and stop the target server.
2. Detach all of the disks from the target server.
3. Attach these disks back to the target server based on the recommended disk
sequence displayed on the Configure Target page of the SMS console.
Step 2 Switch to the SMS console and select the target server you just configured.
----End
Server Migration Service
FAQs 14 Disk Management
Issue 70 (2025-11-05) Copyright © Huawei Cloud Computing Technologies Co., Ltd. 159

--- Page 169 ---
14.10 Can SMS Migrate Local Disks on a Source Server?
SMS cannot migrate local disks on source servers. You are advised to replace the
local disks with EVS disks.
14.11 When I Migrate a Windows Source Server from
Alibaba Cloud, Why Do I Need to Choose a Target Disk
at Least 1 GB Larger than the Paired GPT Source Disk?
Scenario
You wanted to migrate a Windows server from Alibaba Cloud. The server had a
40-GB GPT disk, and the disk only had a single partition. When you configured the
target server, you chose a 40-GB disk as the disk pair, and the system displayed
the message "Some disks on the target server are smaller than those on the
source server. Select another target server." The size recommended for this target
server disk is 41 GB.
Possible Causes
When a disk is formatted using GPT, an MSR partition is automatically generated.
This partition is invisible to users and can only be viewed using DiskPart.
On Alibaba Cloud, an MSR partition occupies 15 MB.
On Huawei Cloud, an MSR partition occupies 128 MB.
When a GPT disk is migrated from Alibaba Cloud to Huawei Cloud, 113 MB more
space needs to be reserved for the MSR partition. In addition, EVS requires that
disk capacity be expanded in increments of 1 GB. Therefore, the paired target
server disk must be at least 1 GB larger than the source GPT disk.
Solutions
● Solution 1
Expand the capacity of the target server disk to be at least the size
recommended by the system.
● Solution 2
Shrink the source disk partition.
14.12 Why Can't I Specify Whether to Migrate a
Physical Volume When I Resize Disk Partitions in
Linux?
● Case 1: For a physical volume, Migrate is set to No and cannot be modified
because it is grayed out.
Server Migration Service
FAQs 14 Disk Management
Issue 70 (2025-11-05) Copyright © Huawei Cloud Computing Technologies Co., Ltd. 160

--- Page 170 ---
If none of the logical volumes in a volume group are migrated, their physical
volumes are not migrated by default. If you want to change the settings,
select Yes for Migrate All Volume Groups and try again.
● Case 2: For a logical volume, Migrate is set to Yes and cannot be modified
because it is grayed out.
If there are physical volumes that do not need to be migrated, increase the
total size of the other physical volumes or decrease the total size of logical
volumes, to ensure that the total size of physical volumes is larger than that
of logical volumes.
For details, see What Are the Rules for Resizing Volume Groups, Disks, and
Partitions?
Figure 14-3 Increasing the total size of the other physical volumes
Server Migration Service
FAQs 14 Disk Management
Issue 70 (2025-11-05) Copyright © Huawei Cloud Computing Technologies Co., Ltd. 161

--- Page 171 ---
Figure 14-4 Decreasing the size of a logical volume or excluding a logical
volume from migration
● Case 3: In a Linux block-level migration, you can choose to migrate either all
or none of the volume groups.
For a block-level migration of a Linux server using LVM, physical volumes and
logical volumes cannot be resized.
14.13 Why Can't I Specify Whether to Migrate a
Logical Volume When I Resize Disk Partitions in Linux?
● Case 1: Logical volumes without mount points are migrated by default.
● Case 2: For a logical volume, Migrate is set to No and cannot be modified
because it is grayed out.
To migrate this logical volume, increase the volume group size to ensure that
it is larger than the total logical volume size.
For details, see What Are the Rules for Resizing Volume Groups, Disks, and
Partitions?
Figure 14-5 Increasing the total size of physical volumes
● Case 3: In a Linux block-level migration, you can choose to migrate either all
or none of the volume groups.
Server Migration Service
FAQs 14 Disk Management
Issue 70 (2025-11-05) Copyright © Huawei Cloud Computing Technologies Co., Ltd. 162

--- Page 172 ---
For a block-level migration of a Linux server using LVM, physical volumes and
logical volumes cannot be resized.
14.14 What Are the Rules for Resizing Volume Groups,
Disks, and Partitions?
Table 14-1 Rules for resizing disks and partitions in Windows
Item Minimum Size Maximum Size
Disk ● System disk, the larger
value between:
– Total partition size
after resizing
– 40 GB
● Data disk, the larger
value between:
– Total partition size
after resizing
– 10 GB
● System disk: 1,024 GB
● Data disk: 32,768 GB
Disk partition The smaller value between:
● Used space + 1 GB
● Size before resizing
Disk size after resizing – Total
size of the other partitions on
the disk
 
Table 14-2 Rules for resizing volumes, disks, and partitions in Linux
Scenari
o
Item Minimum Size Maximum Size
LVM Logical
volume (LV)
The smaller value
between:
● Used space + 1 GB
● Size before resizing
Volume group (VG) size
after resizing – Size of
the other LVs in the VG
Physical disk The larger value between:
● 10 GB
● Total size of LVs in the
VG – Total size of the
other PVs in the VG
32,768 GB
Physical
partition
The larger value between:
● 1 GB
● Total size of LVs in the
VG – Total size of the
other PVs in the VG
Disk size after resizing –
Total size of the other
partitions on the disk
Server Migration Service
FAQs 14 Disk Management
Issue 70 (2025-11-05) Copyright © Huawei Cloud Computing Technologies Co., Ltd. 163

--- Page 173 ---
Scenari
o
Item Minimum Size Maximum Size
Non-
LVM
Disk ● System disk, the larger
value between:
– Total partition size
after resizing
– 40 GB
● Data disk: 10 GB
● System disk: 1,024
GB
● Data disk: 32,768 GB
Partition The smaller value
between:
● Used space + 1 GB
● Size before resizing
Disk size after resizing –
Total size of the other
partitions on the disk
 
14.15 How Do I Migrate a Server with a System Disk
Larger Than 1 TB?
Background
SMS is restricted by an IMS limitation on the system disk size. When you use an
image to create an ECS, the system disk cannot be larger than 1 TB. If the system
disk of the source server to be migrated is larger than 1 TB, the migration can only
be performed when certain conditions are met and the disk is resized.
Linux File-Level Migration
If the source system disk is larger than 1 TB but the disk usage is low (less than I
TB of space used), you can resize the system disk and system partition of the
target server before migration.
Step 1 Install the SMS-Agent on the source server. For more information, see Installing
the SMS-Agent.
Step 2 Start the SMS-Agent. After the Agent is started, configure the target server.
When you configure the basic settings, select Yes for Partition Resize to resize the
disks and partitions for the target server.
Server Migration Service
FAQs 14 Disk Management
Issue 70 (2025-11-05) Copyright © Huawei Cloud Computing Technologies Co., Ltd. 164

--- Page 174 ---
Step 3 In the Resize Partition window, set a new size for the system disk and partition as
needed.
Step 4 Click Next: Configure Target to complete the migration configuration and start
the migration.
----End
Windows Migration
See How Do I Resize Partitions and Disks on a Target Server Running
Windows Before the Migration?
14.16 How Do I Manually Detach the Temporary
System Disk from My Target Server and Re-attach the
Original System Disk?
The solution described here works for ECSs. It does not work for FlexusL instances
because FlexusL does not allow you to detach or attach disks. If your target server
is a FlexusL instance, submit a service ticket to get technical support.
Symptom
After you deleted a failed or suspended migration task from the SMS console, the
target server was still using the temporary system disk whose name starts with
SMS, and its original system disk could not be re-attached.
Possible Causes
If a migration task fails or is suspended, the system will not automatically detach
the temporary system disk and re-attach the original system disk. If you want to
restore this server to its original condition, you need to perform this step manually.
Solution
Step 1 Detach the temporary system disk.
Server Migration Service
FAQs 14 Disk Management
Issue 70 (2025-11-05) Copyright © Huawei Cloud Computing Technologies Co., Ltd. 165

--- Page 175 ---
1. Sign in to the ECS console.
2. In the server list, locate this server and click its name.
3. Click the Disks tab, locate disk SMS-Temp_Disk_Deleted-after-migration,
and click Detach.
4. Click Yes.
Step 2 Detach the original system disk.
NO TE
The original system disk is attached as a data disk. You need to detach it and attach it as a
system disk.
1. Detach the original system disk from the target server by referring to step 1.
2. Switch to the EVS console. In the disk list, locate the disk you detached and
click the disk name.
Check whether the disk has changed from a Data disk to a Bootable disk. If
it has, go to the next step.
Server Migration Service
FAQs 14 Disk Management
Issue 70 (2025-11-05) Copyright © Huawei Cloud Computing Technologies Co., Ltd. 166

--- Page 176 ---
Step 3 Re-attach the original system disk.
Re-attach the disk you detached in step 2 as a system disk to the target server. For
details, see Calling APIs.
----End
14.17 Why Is the Amount of Migrated Data Less Than
the Total Amount of Data to Be Migrated After the
Migration Is Complete?
Symptom
After the migration was complete, the amount of migrated data was less than the
total amount of data scanned on the source server.
Possible Causes
The Agent collects how much data to be migrated on the source server using the
df-TH command. The amount of migrated data displayed on the console is the
combined size of all the migrated files.
If these two amounts are different, the possible causes are as follows:
● Possible cause 1: Some files were deleted from the source server, but the
processes using these files still exist.
Server Migration Service
FAQs 14 Disk Management
Issue 70 (2025-11-05) Copyright © Huawei Cloud Computing Technologies Co., Ltd. 167

--- Page 177 ---
The rm command or other software is often used to delete files. If a file is
used by a running process when the file is deleted, the file will still be
accessible to this process and will continue to occupy disk space.
a. On the source server, run df -TH to check whether the used disk space is
the same as the total amount of migrated data.
b. In the root directory of the source server, run du -sh * to check the usage
of disk directories.
In the above figures, df reports a larger data volume than du.
c. Run the following command on the source server:
lsof -n / |grep deleted
If information similar to the following is displayed, some files were
deleted but are still in use by some running processes.
▪ If the migration task can be finished and the target server can be
launched, the data not migrated has no effects on the target server,
and this problem can be ignored.
▪ (Optional) On the source server, run lsof -n / |grep deleted and stop
all the processes returned.
▪ (Optional) Restart the source server at a right time to stop the
processes.
Server Migration Service
FAQs 14 Disk Management
Issue 70 (2025-11-05) Copyright © Huawei Cloud Computing Technologies Co., Ltd. 168

--- Page 178 ---
● Possible cause 2: Some directories were excluded from migration.
In Linux, the Agent does not migrate files in the following directories by
default:
/proc/*
/sys/*
/lost+found/*
/var/lib/ntp/proc/*
But these directories are counted in the total volume of source data scanned
by the Agent.
In the root directory of the source server, run du -sh * to check how much
space is occupied by directories that were not migrated, such as /
proc/*, /sys/*, /lost+found/*, and /var/lib/ntp/proc/*.
If the total size of these excluded directories equals to the size of data not
migrated, the migration is successful, and this problem can be ignored.
● Possible cause 3: There were data changes on the source server during
the migration.
When a migration starts, the Agent runs the df -TH command to obtain
information about directories where each partition is mounted and traverses
these directories to calculate the amount of data to be migrated.
Data that has been migrated is not affected by changes to the source data.
However, if data that has not been migrated changes, the most current
version is what migrated.
The amount of data displayed on the SMS console is collected from the
source server during the first scan. During the migration, if a large amount of
data is changed on the source server, for example, a large amount of data is
deleted before being migrated, the amount of data migrated may be less than
the total amount of data scanned for the first time.
You can run df -TH on the source and target servers for comparison.
● Possible cause 4: A large number of sparse files existed on the source
server.
Sparse files are scanned but ignored during the migration. This may lead to
the amount of migrated data less than the total amount of data calculated
during the first scan.
NO TE
There are many ways to generate sparse files in Linux, such as running the dd
command.
14.18 How Do I Detach the Temporary System Disk
from My Target Server and Re-attach the Original
System Disk using SMS-Agent?
Windows
Step 1 Go to the Agent installation directory on the source server.
Server Migration Service
FAQs 14 Disk Management
Issue 70 (2025-11-05) Copyright © Huawei Cloud Computing Technologies Co., Ltd. 169

--- Page 179 ---
● Windows Agent (Python 3): C:\SMS-Agent-Py3\script
● Windows Agent (Python 2): C:\SMS-Agent-Py2\script
Step 2 Double-click the rollback.bat script in the script directory.
Step 3 Enter the AK/SK pair and other parameters as prompted.
● AK/SK (Access Key ID/Secret Access Key): indicates the AK/SK pair of your
target cloud account. For details about how to obtain them, see How Do I
Obtain an Access Key (AK/SK)?
● region_id: indicates the ID of the region where the target server is located, for
example, ap-southeast-3 for AP-Singapore.
● target_server_id: specifies the ID of the target server.
● system_disk_id: specifies the ID of the original system disk on the target
server.
● migration_disk_id: specifies the ID of the temporary system disk (containing
agent image) created in the migration task.
● task_id: specifies the ID of the migration task. If you do not know the
migration task ID, open the ...\config\rollback.cfg file in the Agent
installation directory and change the value of enable_check_task to false.
Then you do not need to enter the migration task ID. Then, run the
rollback.bat script again.
Step 4 Wait for the script execution to complete.
----End
Linux
Step 1 Go to the Agent installation directory .../SMS-Agent on the source server.
Step 2 Run the ./rollback.sh command to run the rollback script.
Step 3 Enter the AK/SK pair and other parameters as prompted.
Server Migration Service
FAQs 14 Disk Management
Issue 70 (2025-11-05) Copyright © Huawei Cloud Computing Technologies Co., Ltd. 170

--- Page 180 ---
● AK/SK (Access Key ID/Secret Access Key): indicates the AK/SK pair of your
target cloud account. For details about how to obtain them, see How Do I
Obtain an Access Key (AK/SK)?
● region_id: indicates the ID of the region where the target server is located, for
example, ap-southeast-3 for AP-Singapore.
● target_server_id: specifies the ID of the target server.
● system_disk_id: specifies the ID of the original system disk on the target
server.
● migration_disk_id: specifies the ID of the temporary system disk (containing
agent image) created in the migration task.
● task_id: specifies the ID of the migration task. If you do not know the
migration task ID, open the .../SMS-Agent/agent/configconfig/rollback.cfg
file in the Agent installation directory and change the value of
enable_check_task to false. Then you do not need to enter the migration
task ID. Then, run the rollback.bat script again.
Step 4 Wait for the script execution to complete.
----End
14.19 What Do I Do If Some Disks Are Not Attached to
the Target Server After the Migration Is Complete?
Symptom
After the migration was complete, some disks were not attached to the target
server.
Possible Causes
During the migration, SMS collects the disk attachment information from the
source server and configures disks for the target server accordingly. SMS only
migrates disks that are attached, used, and running migratable file systems to the
target server. These disks will be attached to the target server, while other disks
will not.
Solution
Manually attach the disks to the target server by referring to Attaching a Disk to
an ECS.
Server Migration Service
FAQs 14 Disk Management
Issue 70 (2025-11-05) Copyright © Huawei Cloud Computing Technologies Co., Ltd. 171

--- Page 181 ---
15 Migration or Synchronization
Failures
15.1 After the Migration Is Complete, How Do I
Replicate Any New Data from the Source Server to the
Target Server?
To replicate the incremental data from a source server to a launched target server,
click Sync in the Operation column to start an incremental replication. When the
migration status changes to Continuous sync, click Launch Target. When the
migration status changes to Completed, the incremental data has been replicated
to the target server.
15.2 What Do I Do If the SMS-Agent Exits Suddenly
and Disconnects a Windows Source Server from the
SMS Console During a Migration?
Symptom
During the migration, the Windows source server was suddenly disconnected from
the SMS console. It was found that the SMS-Agent program exited the source
server.
Possible Causes
The SMS-Agent program may exit if the Customer Experience Improvement
Program on the source server is turned on.
1. Check the disconnection time in the SMS-Agent migration logs stored in
C:\SMS-Agent-Py3\SmsAgent_Info.log.
Server Migration Service
FAQs 15 Migration or Synchronization Failures
Issue 70 (2025-11-05) Copyright © Huawei Cloud Computing Technologies Co., Ltd. 172

--- Page 182 ---
2. On the source server, open Event Viewer > Windows Logs > System.
3. In the system logs, check the log generated at the SMS-Agent disconnection
time. The log says that the source server was automatically restarted due to a
user logout notification for the Customer Experience Improvement Program.
Solution
Turn off the Customer Experience Improvement Program.
Step 1 On the source server, open the Run window, enter gpedit.msc, and click OK.
Step 2 In the navigation tree, choose Computer Configuration > Administrative
Templates > System > Internet Communication Management > Internet
Communication settings, and locate Turn off Windows Customer Experience
Improvement Program.
Server Migration Service
FAQs 15 Migration or Synchronization Failures
Issue 70 (2025-11-05) Copyright © Huawei Cloud Computing Technologies Co., Ltd. 173

--- Page 183 ---
Step 3 Double-click Turn off Windows Customer Experience Improvement Program. In
the displayed window, select Enabled and click OK.
Step 4 Open Computer Management. Choose System Tools > Task Scheduler Library >
Microsoft > Windows > Customer Experience Improvement Program, and
disable all tasks.
Server Migration Service
FAQs 15 Migration or Synchronization Failures
Issue 70 (2025-11-05) Copyright © Huawei Cloud Computing Technologies Co., Ltd. 174

--- Page 184 ---
Step 5 Choose System Tools > Task Scheduler Library > Microsoft > Windows >
Application Experience, and disable all tasks.
Step 6 Delete the migration task on the SMS console, create a task for the source server
again, and start the migration task.
----End
Server Migration Service
FAQs 15 Migration or Synchronization Failures
Issue 70 (2025-11-05) Copyright © Huawei Cloud Computing Technologies Co., Ltd. 175

--- Page 185 ---
15.3 How Do I Fix Error SMS.3805 When a Migration
Drill Fails?
Symptom
The migration drill failed, and the error message "SMS.3805 Connection to port 22
of target server timed out" was displayed.
Possible Causes
A migration drill checks the overall migration process in advance to ensure smooth
operations across both the data and service planes. It also verifies network
stability and connectivity. The results help identify and resolve potential issues
early, significantly improving the success rate of one-time migrations.
This error typically occurs when the source and target servers are disconnected
during migration. Specifically, the source server is unable to connect to the target
server over port 22 for data transfer due to a timeout, which manifests as an
OpenSSH "connect timeout" error.
Solution
Step 1 Test the network connectivity between the source and target servers.
● If the source server runs Windows, run the following Telnet command on the
source server:
telnet <target-server-IP-address> <port 22>
For example, if the target server's IP address is 192.168.1.x, run the following
command:
telnet 192.168.1.x 22
If the connection cannot be set up, the network is disconnected. In this case,
perform 2 to check the network settings, firewall settings, and SMS-Agent
version.
● If the source server runs Linux, run the following SSH command on the source
server:
ssh -p <port> <username>@<target-server-IP-address>
For example, if the target server's IP address is 192.168.1.x, run the following
command:
ssh -p 22 root@192.168.1.x
If the error message "Connection refused" is displayed or the connection
times out, the network is disconnected. In this case, perform 2 to check the
network settings, firewall settings, and SMS-Agent version.
Step 2 Check the network settings, firewall settings, and SMS-Agent version.
● Check whether the network between the source server and the target server
is correctly configured.
Check whether the target server's IP address has changed and confirm the
migration task uses the right target server.
Server Migration Service
FAQs 15 Migration or Synchronization Failures
Issue 70 (2025-11-05) Copyright © Huawei Cloud Computing Technologies Co., Ltd. 176

--- Page 186 ---
To ensure a successful migration, the target server must be accessible from
the source server. For details about how to configure the network, see
Network Configurations for Different Migration Scenarios.
● Check whether the connection from the source server to the target server is
blocked by any firewalls, security groups, ACL rules, or security software.
Check the firewall, ACL, and security group settings of the source and target
servers. Confirm that the source server can access the target server over the
required ports (ports 22, 8899, and 8900 for Windows migration; port 22 for
Linux file-level migration; and ports 22 and 8900 for Linux block-level
migration). Then, perform the migration drill again.
Check whether security software on the source server blocks the connection. If
so, disable the software and try again.
● Check the SMS-Agent version.
On the Servers page of the SMS console, click the source server name. On the
displayed page, open the Source Info tab and view the SMS-Agent version.
The SMS-Agent version must be 25.5.0 or later. If the SMS-Agent version does
not meet this requirement, download and install the latest SMS-Agent on
the source server and create a migration task again.
----End
Server Migration Service
FAQs 15 Migration or Synchronization Failures
Issue 70 (2025-11-05) Copyright © Huawei Cloud Computing Technologies Co., Ltd. 177

--- Page 187 ---
16 Error Codes and Solutions
16.1 SMS.0202 AK/SK Authentication Failed. Ensure
that the AK and SK Are Correct
Symptom
When you started the Agent, the error "SMS.0202 AK/SK authentication failed.
Ensure that the AK and SK are correct" was reported.
Possible Causes
Possible causes are:
● The entered AK or SK is incorrect.
● The AK/SK pair has been deleted or disabled.
● The programmatic access method is not enabled for the Huawei Cloud
account you used for migration.
Solutions
● The entered AK or SK is incorrect.
Check whether the entered AK/SK pair of the Huawei Cloud account is
correct, especially whether any spaces or characters are missed during the
copy. Enter the AK/SK pair for authentication again.
● The AK/SK pair has been deleted or disabled.
Choose My Credentials > Access Keys to check whether the AK is in the list.
– If it is not, use an AK/SK pair in the list for authentication or create an
AK/SK pair.
– If it is, check whether it is disabled. If the AK/SK pair is disabled, enable it.
● The programmatic access method is not enabled for the Huawei Cloud
account you used for migration.
a. Sign in to the console.
Server Migration Service
FAQs 16 Error Codes and Solutions
Issue 70 (2025-11-05) Copyright © Huawei Cloud Computing Technologies Co., Ltd. 178

--- Page 188 ---
b. Click the username in the upper right corner and choose Identity and
Access Management.
c. In the navigation pane on the left, choose Users and click the username
you used for migration.
d. In the basic information area, check whether Programmatic access is
selected for Access Type.
e. If it is not, click 
 , select Programmatic access, and click Yes.
16.2 SMS.0203 Connection from Source Server to API
Gateway Timed Out
Symptom
When you started the Agent, the error "SMS.0203 Connection from source server
to API Gateway timed out" was reported.
Possible Causes
The source server did not have Internet access, so it could not communicate with
SMS, IAM, ECS, EVS, IMS, VPC, or EPS. To solve this issue, you need to check the
source network.
Solution
Step 1 Log in to the source server.
Step 2 Run the following command on the source server:
curl -v https://iam.myhuaweicloud.com:443
curl -v https://sms.ap-southeast-3.myhuaweicloud.com:443
Check whether the source server can access ECS, EVS, IMS, and VPC using the
commands for the region you are migrating to.
Server Migration Service
FAQs 16 Error Codes and Solutions
Issue 70 (2025-11-05) Copyright © Huawei Cloud Computing Technologies Co., Ltd. 179

--- Page 189 ---
Command Remarks
● curl -v https://ecs. <region-
code>.myhuaweicloud.com:443
● curl -v https://evs. <region-
code>.myhuaweicloud.com:443
● curl -v https://ims. <region-
code>.myhuaweicloud.com:443
● curl -v https://vpc. <region-
code>.myhuaweicloud.com:443
Replace <region-code> with the
ID of the region you are
migrating to. For details, see
Obtaining Region
Information.
 
If the source server runs Windows and curl is not available on it, you can also use
a browser to access the preceding domain names. If the information shown in the
following figure is displayed, the access is successful.
Step 3 Check if the curl operation is successful. If it is, the information shown in the
following figure is returned, and the source server can access the SMS domain
name. Then restart the Agent on the source server.
If the curl operation fails, for example, the operation times out, check the network
and firewall settings of the source server and rectify network issues if any. Then
confirm the source server can access the preceding domain names.
----End
Server Migration Service
FAQs 16 Error Codes and Solutions
Issue 70 (2025-11-05) Copyright © Huawei Cloud Computing Technologies Co., Ltd. 180

--- Page 190 ---
16.3 SMS.0204 Insufficient Permissions. Obtain the
Required Fine-grained Permissions
Symptom
During the migration, you received the error message "SMS.0204 Insufficient
permissions. Cause: xxx. Obtain the required fine-grained permissions."
Possible Causes
Using SMS requires that you have permissions for SMS, ECS, VPC, IMS and EVS, or
the migration will fail.
Solution
Obtain the required permissions and try again. For details, see Creating a User
and Granting Permissions.
16.4 SMS.0205 Incorrect System Time or Time Zone on
Source Server
Symptom
When you started the Agent, you received the error message "SMS.0205 Incorrect
system time or time zone on source server."
Possible Causes
Possible causes are:
● The system time of the source server is consistent with the local standard
time.
● The time zone in the source server is configured incorrectly.
Solution
Check whether the system time of the source server is consistent with the
standard time of the time zone where the source server is located. If the time zone
is incorrectly configured, change the time zone for the source server by referring to
Changing the Time Zone for an ECS. Change the system time to the local
standard time, and enter the AK/SK pair for authentication again.
CA UTION
If services on the source server depend on the system time, check whether the
time can be changed to avoid impact on services.
Server Migration Service
FAQs 16 Error Codes and Solutions
Issue 70 (2025-11-05) Copyright © Huawei Cloud Computing Technologies Co., Ltd. 181

--- Page 191 ---
16.5 SMS.0206 Only x86 Servers Can Be Migrated
Symptom
When you started the Agent, you got the error message "Only x86 servers can be
migrated."
Possible Causes
SMS can only migrate x86 servers. Servers running on Arm or other architectures
are not supported.
16.6 SMS.0208 Failed to Send Your Service Statement
Confirmation to SMS
Symptom
When you tried to start the Agent, the error message " SMS.0208 Failed to send
your service statement confirmation to SMS" was reported.
Possible Causes
The source server could not access the SMS domain name. To solve this issue, you
need to check the source network.
Solution
Step 1 Log in to the source server.
Step 2 Run the following command on the source server:
curl -v https://sms.ap-southeast-3.myhuaweicloud.com:443
If the source server runs Windows and curl is not available on it, you can also use
a browser to access the preceding domain names. If the information shown in the
following figure is displayed, the access is successful.
Server Migration Service
FAQs 16 Error Codes and Solutions
Issue 70 (2025-11-05) Copyright © Huawei Cloud Computing Technologies Co., Ltd. 182

--- Page 192 ---
Step 3 Check if the curl operation is successful. If it is, the information shown in the
following figure is returned, and the source server can access the SMS domain
name. Then restart the Agent on the source server.
If the curl operation fails, for example, the operation times out, check the network
and firewall settings of the source server and rectify network issues if any. Then
confirm the source server can access the preceding domain name.
----End
16.7 SMS.0210 Failed to Create File on Target Server
Symptom
During the migration, the error message "SMS.0210 Failed to create file %s on
target server" was displayed on the SMS console.
Possible Causes
The network between the source server and the target server is abnormal.
Solution
Check whether the source server can access the target servers over port 22. If it
cannot, rectify the fault by referring to Solutions for Error SMS.3802.
16.8 SMS.0212 Agent Restarted
Symptom
During a Windows migration, the migration task was abnormal, and the error
message "SMS.0212 Agent restarted" was displayed.
Possible Causes
Possible causes include:
● The SMS-Agent program was manually restarted on the source server.
Server Migration Service
FAQs 16 Error Codes and Solutions
Issue 70 (2025-11-05) Copyright © Huawei Cloud Computing Technologies Co., Ltd. 183

--- Page 193 ---
● After the source system account was deregistered, the SMS-Agent program
exited and then was started again.
Solutions
● Solution 1
a. In the server list on the SMS console, locate the server record and choose
More > Delete Target Configuration in the Operation column.
b. Configure a target server and start the migration again.
● Solution 2
a. In the server list on the SMS console, locate the server record and choose
More > Delete in the Operation column. Then delete the server record.
b. Log in to the source server, stop the SMS-Agent program, and run it
again.
CA UTION
If the SMS-Agent exits due to account deregistration, you are advised to
use the SMS-Agent (Python 2) as a system service to perform the
migration.
▪ Windows Agent (Python 3): Double-click SMS-Agent.exe in the
SMS-Agent-Py3 directory to restart the SMS-Agent.
▪ Windows Agent (Python 2): Double-click restart.bat in the SMS-
Agent-Py2 directory to restart the SMS-Agent.
c. Enter the AK/SK pair for the Huawei Cloud account that you are
migrating to and the SMS domain name.
d. After the SMS-Agent is started, go to the SMS console and configure a
target server again.
16.9 SMS.0219 Failed to Obtain Temporary Credential
from Configuration File
Symptom
The migration task was abnormal, and the error message "SMS.0219 Failed to
obtain temporary credential from configuration file" was displayed.
Possible Causes
This migration task was created by an MgC migration workflow, where the
associated MgC Agent was connected to MgC through federated authentication. In
this setup, the MgC Agent is authenticated using a temporary Huawei Cloud
access key. If the temporary access key expires, the migration task will fail.
Server Migration Service
FAQs 16 Error Codes and Solutions
Issue 70 (2025-11-05) Copyright © Huawei Cloud Computing Technologies Co., Ltd. 184

--- Page 194 ---
Solution
Go to the MgC Agent console and check whether the temporary Huawei Cloud
access key has expired. If the temporary access key has expired, re-generate a
temporary one by referring to Configuring a Temporary Access Key for Huawei
Cloud. Then switch to the SMS console, locate the migration task and click Start
in the Operation column to continue the migration.
16.10 SMS.0303 Unable to Access Domain Name
Symptom
When you started the migration, the error message "SMS.0303 Unable to access
domain name %s" was displayed on the SMS console.
Possible Causes
For a successful migration, the source server must access all required domain
names. If any domain name fails to be connected, this error message is displayed.
The possible causes are as follows:
● The network is abnormal, for example, the connection times out or the
network is disconnected or inaccessible.
● The access is blocked by the firewall.
● Security alarms are generated on the source server, or the source server EIP is
unbound or frozen.
● The access is blocked by the security group of the source server.
Solutions
● Ping another domain name.
– If the ping operation succeeds, the network is normal.
– If the ping operation fails, the network is abnormal. Check the local
network.
● Check the firewall settings of the source server.
● If the access is blocked, allow the access and continue the migration.
● Check whether security alarms are generated on the source server, or the
source server EIP is unbound or frozen.
– If the EIP is unbound, you can bind it back or use a private network for
migration.
– If the EIP is frozen, contact ECS or EIP technical support.
● Check whether the required outbound ports are allowed in the security group
of the source server.
– If there are no outbound rules for the protocols and ports shown in
Figure 16-1, add rules for them.
– If there are outbound rules for the ports but Action is set to Deny,
change the actions to Allow.
Server Migration Service
FAQs 16 Error Codes and Solutions
Issue 70 (2025-11-05) Copyright © Huawei Cloud Computing Technologies Co., Ltd. 185

--- Page 195 ---
– If there are outbound rules for allowing the ports but the destination IP
addresses are not 0.0.0.0/0, change them to 0.0.0.0/0.
Figure 16-1 Outbound rules
16.11 SMS.0304 SSL/TLS Authentication Failed
Symptom
When the SMS-Agent was started, any of the following messages was returned:
● Linux: SMS.0304 Network request TLS/SSL authentication failed.
● Windows (Python 2): SMS.0304 Network request TLS/SSL authentication
failed.
● Windows (Python 3): SMS.0304 Network request TLS/SSL authentication
failed.
Possible Causes
If the TLS/SSL authentication fails when you start the SMS-Agent, the CA
certificate verification fails. A CA certificate is issued by an authoritative
organization to verify the server identity and ensure data transmission security.
After the SMS-Agent is started, it attempts to remotely access SMS over the
network and verifies the CA certificate. If the verification fails, the error message is
displayed.
Solution
Step 1 Log in to the source server.
Step 2 Open the g-property.cfg configuration file of the SMS-Agent. The path of the
configuration file is:
● Linux: .../SMS-Agent/agent/config/g-property.cfg
● Windows:
– Windows Agent (Python 3): C:\SMS-Agent-Py3\config\g-property.cfg
– Windows Agent (Python 2): C:\SMS-Agent-Py2\config\g-property.cfg
Step 3 In the g-property.cfg configuration file, change servercheck = True to
servercheck = False.
Step 4 Save the configuration file and restart the SMS-Agent.
----End
Server Migration Service
FAQs 16 Error Codes and Solutions
Issue 70 (2025-11-05) Copyright © Huawei Cloud Computing Technologies Co., Ltd. 186

--- Page 196 ---
16.12 SMS.0410 Failed to Obtain NIC Information
Symptom
When you started the Agent on a Linux server, one of the following messages was
displayed:
● SMS.0410: Failed to obtain NicName information of source server.
● SMS.0410: Failed to obtain IPAddress information of source server.
Possible Causes
If the source server has multiple NICs, the SMS-Agent may fail to obtain the
default gateway information of the source server. As a result, the correct NIC
name, MAC address, and IP address cannot be obtained.
Solutions
● Solution for error "SMS.0410: Failed to obtain NicName information of source
server"
a. View the routing table.
#route -n
The following table describes the parameters.
Parameter Description
Destination The destination IP address. The gateway
corresponding to 0.0.0.0 is the default gateway.
Gateway The gateway IP address.
Iface The network interface.
 
As shown in the preceding figure, if the source server has multiple default
gateways, the SMS-Agent may fail to obtain the default gateway
information. In this case, proceed with the subsequent steps.
b. Check the network configuration.
#ifconfig -a
Server Migration Service
FAQs 16 Error Codes and Solutions
Issue 70 (2025-11-05) Copyright © Huawei Cloud Computing Technologies Co., Ltd. 187

--- Page 197 ---
NO TE
● The leftmost column lists NICs, such as eth x, ensx, and enp0sx.
● inet is the IP address of a NIC.
● ether is the MAC address of a NIC.
c. Modify network.dev in the .../SMS-Agent/agent/config/g-property.cfg
configuration file.
You need to check which NIC of the source server is used for migration.
Then set network.dev to the name of the NIC used for migration.
Assume the NICs queried in step b include eth0, eth1, and eth2, and the
NIC used for migration is eth0. network.dev must set to be eth0.
d. After the configuration is complete, restart the SMS-Agent.
● Solution for error "SMS.0410: Failed to obtain IPAddress information of source
server"
a. Check whether the network.dev parameter in the .../SMS-Agent/agent/
config/g-property.cfg file has been configured.
▪ If it has, go to step b.
▪ If it has not, go to step 3.
Server Migration Service
FAQs 16 Error Codes and Solutions
Issue 70 (2025-11-05) Copyright © Huawei Cloud Computing Technologies Co., Ltd. 188

--- Page 198 ---
b. Check whether the NIC specified by network.dev is the one used for
migration by referring to Solution for error 1.
▪ If it is not, modify it and restart the Agent. If the problem persists, go
to step 3.
▪ If it is, go to step 3.
c. Modify network.macaddr and network.ipaddr in the .../SMS-Agent/
agent/config/g-property.cfg configuration file.
Set network.macaddr and network.ipaddr to the values of inet (IP
address) and ether (MAC address) corresponding to the correct NIC
queried in step 2 in handling error 1.
network.macaddr = xx-xx-xx-xx-xx-xx (MAC address)
network.ipaddr = xxx.xxx.xxx.xxx (IP address)
CA UTION
Both the MAC address and IP address need to be configured. The six
groups of characters in the MAC address must be separated by hyphens
(-).
d. After the configuration is complete, restart the SMS-Agent.
16.13 SMS.0412 Target Server Does Not Exist
Symptom
During the migration, the error message "SMS.0412 ECS does not exist" was
displayed on the SMS console.
Server Migration Service
FAQs 16 Error Codes and Solutions
Issue 70 (2025-11-05) Copyright © Huawei Cloud Computing Technologies Co., Ltd. 189

--- Page 199 ---
Possible Causes
Information about the target server cannot be queried during the migration. The
server may have been deleted unexpectedly.
Solution
In the server list on the SMS console, locate the server record and choose More >
Delete Target Configuration in the Operation column. Then configure a target
server again.
16.14 SMS.0515 Migration Failed. Source Disk
Information Has Changed. Delete Target Server
Configuration and Restart the Agent
Symptom
When you started the migration, you got the error message "SMS.0515 Migration
failed. Source disk information has changed. Delete target server configuration
and restart the Agent."
Possible Causes
The Agent collects information about the disks on the source server every two
hours. This error will occur if the source server disks are changed during the period
from the last collection to the start of migration. Possible disk changes include:
● Disks or partitions were attached to or detached from the source server.
● A source partition was expanded, and now the target disk space is insufficient.
● A large amount of data was written to a source partition, and now the target
partition space is insufficient.
● The file system type of the source partition was changed.
Solution
Step 1 Sign in to the console.
Step 2 In the navigation pane on the left, choose Servers.
Locate the row that contains the source server, and in the Operation column,
choose More > Delete.
Step 3 Log in to the source server and restart the Agent. The Agent automatically reports
changed source disk information to SMS.
Step 4 Configure the target server, start the full replication, and launch the target
server.
----End
Server Migration Service
FAQs 16 Error Codes and Solutions
Issue 70 (2025-11-05) Copyright © Huawei Cloud Computing Technologies Co., Ltd. 190

--- Page 200 ---
16.15 SMS.0609 An Older Version of Agent Is Detected.
Please Exit the Current Program, Uninstall the Old
Agent Completely, and Install the Newest One
Symptom
During the startup of the SMS-Agent on Linux, the Agent reported that the
migration pre-check failed and returned the message "SMS.0609 An older version
of Agent is detected. Please exit the current program, uninstall the old Agent
completely, and install the newest one."
Possible Causes
If an earlier version of the SMS-Agent is not uninstalled or completely uninstalled,
files cannot be completely replaced and the latest version cannot be installed
correctly.
Solution
1. Uninstall the earlier version of the SMS-Agent. For details, see How Do I
Uninstall the SMS-Agent from the Source and Target Servers After the
Migration Is Complete?
2. Install the latest version of the SMS-Agent. For details, see Installing the
SMS-Agent on Linux.
16.16 SMS.0805 Failed to Migrate Partition to Target
Server
Symptom
During the migration, the message "SMS.0805 Failed to migrate partition XXX to
target server XXX" was displayed.
Possible Causes
Possible causes are as follows:
● The network between the source server and the target server is disconnected.
● There is not enough space on the paired disk partition of the target server.
● The paired disk of the target server is detached.
Server Migration Service
FAQs 16 Error Codes and Solutions
Issue 70 (2025-11-05) Copyright © Huawei Cloud Computing Technologies Co., Ltd. 191

--- Page 201 ---
Solutions
● Check whether the fault is caused by a network disconnection. If it is, rectify
the network fault by referring to SMS.3802 Failed to Establish an SSH
Connection with the Target Server
● Check whether there is enough space on the target partition. If there is not
enough space, delete any unnecessary files from the partition on the target
server or the source server to release enough space, and try again.
● Check whether the paired target server disk is detached. If it is, attach the disk
to the target server. Then sign in to the SMS console, choose Servers in the
navigation pane on the left, locate the source server, and click Start in the
Operation column.
16.17 SMS.0806 Failed to Synchronize Partition to
Target Server
Symptom
During an incremental synchronization, the message "SMS.0806 Failed to
synchronize partition XXX to target server XXX" was displayed.
Possible Causes
The possible causes are as follows:
1. The network between the source server and the target server is disconnected.
2. There is not enough space on the paired disk partition of the target server.
3. The paired disk of the target server is detached.
Solutions
1. Check whether the fault is caused by a network disconnection. If it is, rectify
the network fault by referring to SMS.3802 Failed to Establish an SSH
Connection with the Target Server
2. Check whether there is enough space on the target partition. If there is not
enough space, delete any unnecessary files from the partition on the target
server or the source server to release enough space, and try again.
3. Check whether the paired target server disk is detached. If it is, attach the disk
to the target server. Then sign in to the SMS console, choose Servers in the
navigation pane on the left, locate the source server, and click Start in the
Operation column.
16.18 SMS.0807 Network Error Between Source and
Target Servers
Symptom
The migration task failed, and the message "SMS.0807 Network error between
source and target servers" was displayed on the console.
Server Migration Service
FAQs 16 Error Codes and Solutions
Issue 70 (2025-11-05) Copyright © Huawei Cloud Computing Technologies Co., Ltd. 192

--- Page 202 ---
Possible Causes
During the full replication phase, the source server establishes a connection with
the target and spawns a subprocess to transfer data. If the connection is
interrupted, the subprocess automatically attempts to reconnect. If reconnection
fails after the maximum number of retries is exceeded, this error message is
displayed. Locate and rectify the fault based on the possible causes below.
Unstable Network Connection Between the Source and Target Servers
The network connection is unstable, and the retry times exceed the upper limit. In
this case, you can configure automatic recovery and adjust the configuration
parameters (such as the maximum number of automatic recovery attempts and
the interval) based on your requirements to avoid errors caused by network
connection timeout. For details, see How Do I Configure Automatic Recovery?
After the configuration is complete, restart the migration task.
Source and Target Server Disconnected
The network is disconnected during data transfer. You can perform the following
operations to locate the fault:
Step 1 Check whether the target server is stopped.
1. Sign in to the Huawei Cloud ECS console.
2. In the ECS list, check the status of the target server.
– If the ECS is stopped, choose More > Start in the Operation column.
Then restart the migration task.
– If the ECS is running, go to the next step.
Step 2 Check whether the security group, firewall, or ACL rules of the source server are
modified during the migration.
Check whether the connection is disallowed by any security groups, firewalls, or
ACL rules on the network between the source and target servers. If it is, modify
their settings to allow the source server to access the target server. For details
about the network requirements, see How Do I Set Up a Secure Migration
Network for Using SMS? Then you can use the following method to check the
connectivity:
Use SSH or Telnet to check whether the source server can connect to the target
server. The commands are in the following format:
telnet <target-server-IP-address> <port>
ssh -p <port> <username>@<target-server-IP-address>
For example, if the target server's IP address is 192.168.0.x and port 22 is used, run
either of the following commands:
telnet 192.168.0.x 22
ssh -p 22 root@192.168.0.x
----End
Server Migration Service
FAQs 16 Error Codes and Solutions
Issue 70 (2025-11-05) Copyright © Huawei Cloud Computing Technologies Co., Ltd. 193

--- Page 203 ---
16.19 SMS.1104 Failed to Detach Disk xx
Symptom
A migration task failed, and the error message "SMS.1104 Failed to detach disk
xxx. Failure cause: xxx" was displayed.
Possible Causes
During the migration, operations such as detaching disks, creating temporary
disks, and attaching disks are performed on the target server. Detaching a disk
from the target server may fail if:
● The target server was locked or does not support disk detachment.
Disks cannot be detached from a locked ECS, a spot ECS, a FlexusL instance
(original HECS L), or a server created from an ISO image.
● The purchase order was not completed.
A disk cannot be detached if the server or disk purchase order is not
completed.
Solutions
● The target server was locked or does not support disk detachment.
– If the target server was a spot ECS or a locked ECS, delete the current
migration task, create a migration task again, and select another cloud
server that supports disk detachment.
– If the target server was a FlexusL instance (original HECS L), delete the
current migration task, use the latest Agent, and create a migration task
again.
– If the target server was created from an ISO image, delete the current
migration task. Then, use an ISO image to create a temporary ECS, use
the temporary ECS to create a system disk image, use the system disk
image to create an ECS, generate a new ECS, and use the new ECS to
create a migration task.
● The purchase order was not completed.
If the target server was billed based on a yearly/monthly basis, check whether
the server and disk purchase orders have been completed. If they are not,
wait for the orders to complete or complete the orders and try the migration
again.
16.20 SMS.1113 Failed to Reconfigure Partition Details
on the Target Server
Symptom
The target server failed to be launched, and the message "SMS.1113 Failed to
reconfigure partition details on the target server" was displayed.
Server Migration Service
FAQs 16 Error Codes and Solutions
Issue 70 (2025-11-05) Copyright © Huawei Cloud Computing Technologies Co., Ltd. 194

--- Page 204 ---
Possible Causes
When the system attempted to obtain the command, the connection timed out
due to an unstable network, and the target server could not be launched.
Solution
Ensure that the source bandwidth is sufficient. Pause the migration task and then
restart it.
16.21 SMS.1105 Disk Creation Failed
Symptom
During the creation of a target server, the message "SMS.1105 Disk creation
failed" was displayed.
Possible Causes
● Your account is in arrears.
● The EVS quotas are exhausted. To prevent unforeseen spikes in resource
usage, there are preset quotas on the EVS disk quantity, the EVS disk capacity,
and the EVS snapshot quantity. For details about EVS quotas, see Querying
EVS Resource Quotas.
Solutions
● Make sure that your account has a sufficient balance. For details, see
Renewal Rules.
● Increase the EVS disk quotas and try again. For details, see Increasing EVS
Resource Quotas.
16.22 SMS.1106 Failed to Delete Disk XX
Symptom
After the migration was complete, I received the message "SMS.1106 Failed to
delete disk XX. Cause: periodic volume cannot be deleted!"
NO TE
The migration task has been completed, and you can log in to, verify, and use the target
server. If you need to synchronize incremental data from the source server to the target
server, handle the problem using the solution below, and then perform the migration again.
Possible Causes
SMS attaches a temporary pay-per-use system disk with name starting with SMS
to the target server during the migration, and detaches and deletes the disk after
the migration is complete. If you manually change the billing mode of the disk to
Server Migration Service
FAQs 16 Error Codes and Solutions
Issue 70 (2025-11-05) Copyright © Huawei Cloud Computing Technologies Co., Ltd. 195

--- Page 205 ---
yearly/monthly during the migration, the disk cannot be automatically deleted
after the migration is complete.
Solution
Step 1 Sign in to the EVS console and locate the disk based on the disk ID displayed in
the migration failure cause.
Step 2 Contact customer service to unsubscribe from the disk.
Step 3 After the unsubscription, click Start on the migration task page to continue the
migration.
----End
16.23 SMS.1204 Failed to Create File on Source Server
Symptom
During the migration, the error message "SMS.1204 Failed to create file on source
server" was displayed on the SMS console.
Possible Causes
There is no space available for creating new files on the source server.
Solution
1. Check the usage of each disk partition on the source server using df -Th.
2. If the available space on each partition is less than 1 GB, clear up more disk
space or expand the capacity.
3. Delete the source server record from the SMS console. Restart the Agent
installed on the source server and perform the migration again.
16.24 SMS.1205 Failed to Load WMI
Symptom
When you started the Agent, the message "SMS.1205 Failed to load WMI" was
reported.
Figure 16-2 WMI loading failure
Server Migration Service
FAQs 16 Error Codes and Solutions
Issue 70 (2025-11-05) Copyright © Huawei Cloud Computing Technologies Co., Ltd. 196

--- Page 206 ---
Possible Causes
Files related to Windows Management Instrumentation (WMI) are missing or
damaged and need to be restored. In Windows, the Agent uses the WMI module
to collect source server details, such as the CPU, memory, and disk information.
CA UTION
● WMI will be stopped during the restoration. Confirm that stopping WMI will
not affect services on the source server. The restoration will also change the
files on the source server, which may involve certain risks. It is recommended
that you perform the operations on a cloned source server first.
● If the issue persists, you can create an ECS by following the instructions
provided in Creating a Windows ECS from an Image.
Restoring WMI
Step 1 Right-click This Computer in the navigation pane on the left in your file explorer
and choose Manage from the shortcut menu.
Step 2 On the Computer Management page, choose Services and Applications >
Services. Stop Windows Management Instrumentation.
Step 3 Change C:\Windows\System32\wbem\repository to C:\Windows
\System32\wbem\repository_old.
Step 4 Start Windows Management Instrumentation.
Step 5 Open the cmd window as administrator.
Step 6 Go to the C:\Windows\System32\wbem\ directory.
cd C:\Windows\System32\wbem\
Step 7 Restore WMI.
for /f %s in ('dir /b *.mof') do mofcomp %s
for /f %s in ('dir /b en-us\*.mfl') do mofcomp en-us\%s
Step 8 Restart the Agent.
----End
Server Migration Service
FAQs 16 Error Codes and Solutions
Issue 70 (2025-11-05) Copyright © Huawei Cloud Computing Technologies Co., Ltd. 197

--- Page 207 ---
16.25 SMS.1351: Mount Point /xxx Detected on the
Source Server, Which Has No Free Space. Ensure that
There Is at Least 1 MB of Space
Symptom
On a Linux source server, the Agent failed to be started, and the message
"SMS.1351: Mount point /xxx detected on the source server, which has no free
space. Ensure that there is at least 1 MB of space" was displayed.
Possible Causes
A directory used as a mount point on the source server is full.
Solution
Step 1 Run the df -TH command on the source server to identify which directory is full.
Step 2 Redistribute the data across different directories to ensure that each directory has
at least 1 MB of free space.
Step 3 Run the df -TH command again to confirm that there is a required free space in
each directory. Then restart the SMS-Agent.
----End
16.26 SMS.1352: Unknown Physical Volumes Detected
on the Source Server
Symptom
On a Linux source server, the Agent failed to be started, and the message
"SMS.1352: Unknown physical volumes detected on the source server" was
displayed.
Possible Causes
A volume group on the source server is created from two physical volumes, but
one of the physical volumes is detached.
Server Migration Service
FAQs 16 Error Codes and Solutions
Issue 70 (2025-11-05) Copyright © Huawei Cloud Computing Technologies Co., Ltd. 198

--- Page 208 ---
As shown in the following figure, the # pvs command tells that an unknown
physical volume is detected. Volume group testvg is created from two physical
volumes, but one of the physical volumes is detached.
Solution
Attach the detached physical volume back to the source server, run the # pvs
command to ensure that there are no unknown physical volumes, and then
perform the migration again.
16.27 SMS.1353: Bind Mount or Repeated Mount
Detected on /xxx of the Source Server
Symptom
On a Linux source server, the Agent failed to be started, and the message
"SMS.1353: Bind mount or repeated mount detected on /xxx of the source server"
was displayed.
Possible Causes
The source server may have repeated or bind mounts. In this case, data may be
migrated repeatedly or the disk space of the target server may be insufficient.
A repeated mount indicates that a disk or partition has multiple mount points. For
example, partition /dev/vda1 is mounted on both the root directory / and the /
home/mnt_test directory.
A bind mount indicates that a disk or partition is mounted on a directory while the
directory is mounted on another directory. For example, partition /dev/vda1 is
mounted on the root directory /, and the root directory / is mounted on the /root/
bind_test/bind_mount directory.
Repeated mounts and bind mounts have the following features:
● If the data in a directory changes, the changes will be synchronized to other
directories.
● A disk or partition is identified at several locations by the mount command.
NO TE
The disks and folders mentioned in this section are only examples. Replace them as
required.
● Possible cause 1: Repeated mounts
Server Migration Service
FAQs 16 Error Codes and Solutions
Issue 70 (2025-11-05) Copyright © Huawei Cloud Computing Technologies Co., Ltd. 199

--- Page 209 ---
Check method
a. Run mount on the source server to check whether a disk or partition is
mounted on multiple directories. In the following figure, /dev/vda1 is
mounted on both the root directory / and the /home/mnt_test directory.
b. The SMS-Agent uses df -TH to determine how much data is on the
source server. As shown in the following figure, df -TH only returns one
of the two mount directories. So the amount of data displayed on the
SMS console (which relies on df -TH) is less than the amount of data
actually migrated (data in /dev/vda1 gets migrated twice).
c. Run the ls command to check the files in the root directory / and /home/
mnt_test. If the files are the same, it indicates that a repeated mount
exists. To learn how to fix this problem, see Solution for repeated
mounts.
● Possible cause 2: Bind mounts
Check method
a. Run mount on the source server to check whether a disk or partition is
mounted on multiple directories. In the following figure, the /dev/vda1
disk is mounted on both the / and /root/bind_test/bind_mount
directories.
Server Migration Service
FAQs 16 Error Codes and Solutions
Issue 70 (2025-11-05) Copyright © Huawei Cloud Computing Technologies Co., Ltd. 200

--- Page 210 ---
b. Run df -TH on the source server. Only one mount point is returned.
c. In the /root directory on the source server, run the # du -h --max-
depth=1 ~ command to check how large the bind_test folder is.
Run the # du -h --max-depth=1 ~/bind_test command to check how
large the /root/bind_test/bind_mount folder is. As shown in the
command outputs, the subdirectory is larger than its parent directory.
This indicates a bind mount exists. To learn how to fix this problem, see
Solution for bind mounts.
Solutions
● Solution for repeated mounts
a. In the .../SMS-Agent/agent/config/g-property.cfg file in directory where
the SMS-Agent is installed on the source server, add mount points to be
excluded from migration after the tar.exclude.dir and rsync.exclude.dir
parameters.
In example 1, if /home/mnt_test/* is added to the end of tar.exclude.dir
and rsync.exclude.dir, all files in the /home/mnt_test/ directory will not
be migrated and synchronized.
Server Migration Service
FAQs 16 Error Codes and Solutions
Issue 70 (2025-11-05) Copyright © Huawei Cloud Computing Technologies Co., Ltd. 201

--- Page 211 ---
b. (Optional) If you want the target server to have the same mount points
as the source server after migration is complete, perform the following
operations:
After the migration is complete, modify the mount points in the /etc/
fstab file on the target server, as shown in the figure below. Ensure that
the disk /dev/vdb on the target server is automatically mounted to
the /mnt and /home/mnt_test directories.
c. Restart the SMS-Agent.
● Solution for bind mounts
a. In the .../SMS-Agent/agent/config/g-property.cfg file in directory where
the SMS-Agent is installed on the source server, add mount points to be
excluded from migration after the tar.exclude.dir and rsync.exclude.dir
parameters.
In example 2, if /root/bind_test/bind_mount/ is added to the end of
tar.exclude.dir and rsync.exclude.dir, all files in the /root/bind_test/
bind_mount/ directory will be excluded from migration and
synchronization.
b. (Optional) If you want the target server to have the same mount points
as the source server after migration is complete, perform the following
operations:
After the migration is complete, modify the mount points in the /etc/
fstab file on the target server, as shown in the figure below. Ensure that
partition /dev/vda1 on the target server is automatically mounted to
the /root/bind_test/bind_mount directory.
/    /root/bind_test/bind_mount  ext3  rw,bind 0 0
Server Migration Service
FAQs 16 Error Codes and Solutions
Issue 70 (2025-11-05) Copyright © Huawei Cloud Computing Technologies Co., Ltd. 202

--- Page 212 ---
NO TE
Change the mount points based on your requirements. In the command shown in
the above figure, the first item (/) is the mount directory, the second item (/root/
bind_test/bind_mount) is the mount point, and the third item (ext3) is the file
system type. Retain rw,bind 0 0.
c. Restart the SMS-Agent.
16.28 SMS.1402 SSH Client Not Installed
Symptom
When you started the Agent on a Linux source server, you received the error
"SMS.1402 SSH client not installed. Install openssh-clients package and check the
installation with ssh -V."
Possible Causes
An SSH connection must be established between the source server and the target
server. If the SSH client is not correctly installed on the source server, this message
is displayed.
Solution
Log in to the source server as user root and run the following command. If the
SSH path is not returned, reinstall the SSH client on the source server.
command -v ssh
16.29 SMS.1414 The Migration Module Stopped
Abnormally and Cannot Synchronize Data
Symptom
During continuous synchronization, the message "SMS.1414 The migration module
stops abnormally and cannot synchronize data" was displayed.
Server Migration Service
FAQs 16 Error Codes and Solutions
Issue 70 (2025-11-05) Copyright © Huawei Cloud Computing Technologies Co., Ltd. 203

--- Page 213 ---
Possible Causes
The Agent or the source server has been restarted.
NO TE
On the source server, there is a process that monitors disk changes and synchronizes the
incremental data from the source server to the target server. If the source server or the
Agent is restarted, this process is stopped, and the incremental synchronization cannot be
performed.
Solution
Delete the task and create a migration task for the source server again. To prevent
this issue from happening, take care to avoid restarting the source server or Agent
during migration.
16.30 SMS.1807 Failed to Connect to the Target Server.
Check Whether Its IP Address Is Reachable and
Confirm that Port 8900 Is Enabled
Symptom
The target server could not be accessed, and the following message was displayed:
SMS.1807 Failed to connect to the target server. Check whether its IP address is
reachable and confirm that port 8900 is enabled.
Possible Causes
For a Windows migration, ports 8900 must be enabled on the target server for
communicating with SMS and the source server. If communications cannot be
established, this error occurs. You can locate the fault by:
● Checking Whether the Source Server Can Connect to the Target Server
● Checking Whether Port 8900 Is Enabled in the Security Group of the
Target Server
● Checking Whether Port 8900 Is Allowed in the Network ACL of the Target
Server
● Checking Whether the Peagent on the Target Server Is Running Properly
Checking Whether the Source Server Can Connect to the Target Server
Step 1 Log in to the source server.
Step 2 Run telnet <target-server-IP-address> 8900.
● If the IP address is reachable, click Start on the SMS console to continue the
migration.
● If the Telnet connection fails, check the DNS, firewall, security group, and
local network settings of the source and target servers.
----End
Server Migration Service
FAQs 16 Error Codes and Solutions
Issue 70 (2025-11-05) Copyright © Huawei Cloud Computing Technologies Co., Ltd. 204

--- Page 214 ---
Checking Whether Port 8900 Is Enabled in the Security Group of the Target
Server
Step 1 Sign in to the SMS console.
Step 2 In the service list, under Compute, choose Elastic Cloud Server. In the ECS list,
click the name of the target ECS.
Step 3 On the ECS details page, click the Security Groups tab. Check whether port 8900
is opened and the source IP address is specified correctly.
If port 8900 is not open, add an inbound rule for the port. If such a rule exists but
the source IP address is not 0.0.0.0/0 or the IP address of the source server, change
it to 0.0.0.0/0.
For detailed instructions, see How Do I Configure Security Group Rules for
Target Servers?
----End
Checking Whether Port 8900 Is Allowed in the Network ACL of the Target
Server
Step 1 Sign in to the SMS console.
Step 2 Check whether the subnet of the target server is associated with a network ACL.
If a network ACL has been associated, and there is an inbound rule configured for
port 8900, change the action to Allow.
For details, see Modifying a Network ACL Rule.
----End
Checking Whether the Peagent on the Target Server Is Running Properly
After confirming the network is normal, forcibly restart the target server. Wait for
about 3 minutes and start the migration again.
16.31 SMS.1901 Agent Could Not Read Disk
Information
Symptom
When you started the SMS-Agent on a source server running Windows, the
message "SMS.1901, Agent could not read disk information" was displayed.
Server Migration Service
FAQs 16 Error Codes and Solutions
Issue 70 (2025-11-05) Copyright © Huawei Cloud Computing Technologies Co., Ltd. 205

--- Page 215 ---
Possible Causes
● The disk manager on the source server cannot be opened.
● There is faulty hardware on the source server.
Solutions
● Solution for problem 1
a. Restart the source server.
b. Open the Run dialog box, enter cmd, and click OK.
c. Enter diskmgmt.msc and press Enter.
i. If the Disk Management box can be opened, restart the SMS-Agent.
ii. If the Disk Management box cannot be opened, use solution 2.
● Solution for problem 2
Migrate the source server using IMS.
16.32 SMS.1902 Failed to Start the I/O Monitoring
Module
Symptom
When you started the Agent, you received the error message "SMS.1902 Failed to
start the I/O monitoring module."
Solution
To fix the problem, perform the following operations:
1. Uninstall the Agent and re-install it.
a. If the Agent (Python 3) is installed, enter the AK/SK pair and SMS
domain name when prompted.
b. If the Agent (Python 2) is installed, enter the AK/SK pair and SMS
domain name when prompted, as shown in Figure 16-3. If no prompt is
displayed, double-click start.bat in the installation directory and enter
the AK and SK when prompted.
Server Migration Service
FAQs 16 Error Codes and Solutions
Issue 70 (2025-11-05) Copyright © Huawei Cloud Computing Technologies Co., Ltd. 206

--- Page 216 ---
Figure 16-3 Entering the AK/SK pair and SMS domain name
2. Check whether antivirus software is installed on the source server.
a. If any antivirus or security software is installed, or the firewall is enabled,
a pop-up window may be displayed indicating the I/O monitoring driver
was blocked. Allow the system to run the I/O monitoring process.
b. If there is no pop-up warning, but the driver is blocked, you need to start
the I/O monitoring driver manually. Add C:\Windows\System32\drivers
\HwDiskMon.sys to the trusted zone of the antivirus software and
restart the Agent. If the problem persists, uninstall the antivirus software.
NO TE
Some antivirus software has persistent blocking functions and may block the
driver even if disabled.
3. Modify the configuration file to disable I/O monitoring.
If you do not need to synchronize data, you can modify the configuration file
to disable I/O monitoring.
In the Agent installation directory config, change the value of enablesync to
False in the g-property.cfg file, and then restart the Agent.
Figure 16-4 Modifying the g-property.cfg file
Server Migration Service
FAQs 16 Error Codes and Solutions
Issue 70 (2025-11-05) Copyright © Huawei Cloud Computing Technologies Co., Ltd. 207

--- Page 217 ---
16.33 SMS.1904 Failed to Create a Snapshot for the
Windows Server
Symptom
During the migration, the message "SMS.1904 Failed to create a snapshot for the
Windows server" was reported.
Possible Causes
Before data is migrated from a Windows source server, the VSS module is used to
create snapshots for the source server. These snapshots will be used to ensure that
data on the source and target servers is from the same point in time after the
migration is complete. If the VSS module on the source server is faulty, the
snapshot creation will fail.
Solution
Step 1 Go to the Agent configuration directory on the source server.
● Windows Agent (Python 3)
C:\SMS-Agent-Py3\config.
● Windows Agent (Python 2)
C:\SMS-Agent-Py2\config
Step 2 Open the g-property.cfg file and change the value of enablesnapshot to False,
as shown in Figure 16-5.
Restart the migration task. The migration task will skip snapshot creation.
Figure 16-5 Modifying the configuration parameter
Server Migration Service
FAQs 16 Error Codes and Solutions
Issue 70 (2025-11-05) Copyright © Huawei Cloud Computing Technologies Co., Ltd. 208

--- Page 218 ---
NO TE
If you skip snapshot creation, data on the target server and the source server may be from
different points in time during migration, and services on the target server may fail to be
started. If this happens, you can stop the software on the source server when no services
are running, and then perform a data synchronization to ensure that the data on the source
and target servers is from the same point in time.
----End
16.34 SMS.2802 Failed to Connect to the Target Server.
Check Whether Its IP Address Is Reachable and Port
8899 Is Enabled
Symptom
The target server could not be accessed, and the following message was displayed:
SMS.2802 Failed to connect to the target server. Check whether its IP address is
reachable and port 8899 is enabled.
Possible Causes
For a Windows migration, ports 8899 must be enabled on the target server for
communicating with SMS and the source server. If communications cannot be
established, this error occurs. You can locate the fault by:
● Checking Whether the Source Server Can Connect to the Target Server
● Checking Whether Port 8899 Is Enabled in the Security Group of the
Target Server
● Checking Whether Port 8899 Is Allowed in the Network ACL of the Target
Server
● Checking Whether the Peagent on the Target Server Is Running Properly
Checking Whether the Source Server Can Connect to the Target Server
Step 1 Log in to the source server.
Step 2 Run telnet <target-server-IP-address> 8899.
● If the IP address is reachable, click Start on the SMS console to continue the
migration.
● If the Telnet connection fails, check the DNS, firewall, security group, and
local network settings of the source and target servers.
----End
Checking Whether Port 8899 Is Enabled in the Security Group of the Target
Server
Step 1 Sign in to the SMS console.
Server Migration Service
FAQs 16 Error Codes and Solutions
Issue 70 (2025-11-05) Copyright © Huawei Cloud Computing Technologies Co., Ltd. 209

--- Page 219 ---
Step 2 In the service list, under Compute, choose Elastic Cloud Server. In the ECS list,
click the name of the target ECS.
Step 3 On the ECS details page, click the Security Groups tab. Check whether port 8899
is opened and the source IP address is specified correctly.
If port 8899 is not open, add an inbound rule for the port. If such a rule exists but
the source IP address is not 0.0.0.0/0 or the IP address of the source server, change
it to 0.0.0.0/0.
For detailed instructions, see How Do I Configure Security Group Rules for
Target Servers?
----End
Checking Whether Port 8899 Is Allowed in the Network ACL of the Target
Server
Step 1 Sign in to the console.
Step 2 Check whether the subnet of the target server is associated with a network ACL.
If a network ACL has been associated, and there is an inbound rule configured for
port 8899, change the action to Allow.
For details, see Modifying a Network ACL Rule.
----End
Checking Whether the Peagent on the Target Server Is Running Properly
After confirming the network is normal, forcibly restart the target server. Wait for
about 3 minutes and start the migration again.
16.35 SMS.3102 Failed to Modify the initrd File on the
Target Server
Symptom
When the migration task reached the Modify Linux configurations subtask, the
error message "SMS.3102: Failed to modify the initrd file on the target server" was
displayed on the SMS console.
Possible Causes
The SMS-Agent may fail to modify the initrd file on the target server due to any
of the following reasons:
Server Migration Service
FAQs 16 Error Codes and Solutions
Issue 70 (2025-11-05) Copyright © Huawei Cloud Computing Technologies Co., Ltd. 210

--- Page 220 ---
● Cause 1: The source server uses a custom kernel. It prevents the SMS-Agent
from generating or updating the initrd or initramfs image file. As a result, the
native KVM drivers required for booting the target server cannot be injected
into the kernel.
● Cause 2: The target server is stopped or frozen.
● Cause 3: The network latency fluctuates greatly between the source server
and the target server. As a result, the SMS-Agent fails to obtain data due to
timeouts.
Solutions
● For possible cause 1:
Manually generate the initrd or initramfs image file that matches the kernel
on the source server. For details, see Installing Native KVM Drivers on a
KVM ECS. Note that this risky operation may affect the source server OS.
If you are worried about the impact of this method on the source server, you
are advised to use Cloud Migration Service from Huawei Cloud. It provides
professional migration solutions and dedicated tools.
● For possible cause 2:
Access the ECS list and check the status of the target server.
– If the ECS is stopped, choose More > Start in the Operation column.
Then retry the migration task.
– If the ECS is frozen, unfreeze the ECS and retry the migration task.
● For possible cause 3:
Use SSH or Telnet to test the network connectivity between the source and
target servers. If the connection fails, check the network and firewall settings.
The commands are in the following format:
– telnet <target-server-IP-address> <port>
– ssh -p <port> <username>@<target-server-IP-address>
For example, if the target server's IP address is 192.168.0.x and port 22 is
used, run either of the following commands:
telnet 192.168.0.x 22
ssh -p 22 root@192.168.0.x
16.36 SMS.3205 Failed to Mount Partition XXX to
Directory XXX
Symptom
A Linux file-level migration failed, and you received message "SMS.3205 Failed to
mount partition /dev/vdc1 to directory /mnt/vdc1."
Possible Causes
Some file systems on the source server are not supported by SMS.
Server Migration Service
FAQs 16 Error Codes and Solutions
Issue 70 (2025-11-05) Copyright © Huawei Cloud Computing Technologies Co., Ltd. 211

--- Page 221 ---
Solution
Check the file system types on the source server. SMS supports the following file
systems:
● Linux: Ext2, Ext3, Ext4, XFS, and VFAT are supported. Btrfs and ReiserFS are
not supported.
● Windows: NTFS is supported. FAT32 file systems on non-boot partitions are
not supported.
For unsupported file systems such as ReiserFS, you can copy files to other file
systems, uninstall the unsupported file systems, and then perform the migration.
If this is not possible on the source server, you can:
● Use IMS to create a system disk image for the source server from an external
image file and use the image to create a server on Huawei Cloud. For details,
see Creating a Windows System Disk Image from an External Image File
or Creating a Linux System Disk Image from an External Image File.
● Use a public or KooGallery image to create a server and deploy your
applications on the server.
● Use the Cloud Migration Service on Huawei Cloud.
16.37 SMS.3802 Failed to Establish an SSH Connection
with the Target Server
During a migration, an SSH connection must be established between the source
server and the target server. This error message is displayed when the SSH client
reports the error "SSHException", indicating that an exception occurs during SSH
connection setup. The possible causes and solutions are:
● The currently installed SMS-Agent is not the latest version.
Go to the Agents page on the SMS console, download and install the latest
SMS-Agent, and create a migration task again.
● Security software or firewalls may block the connection from the source
server to the target server.
– Check the firewall settings of the source server and ensure that no
outbound traffic is blocked. If the traffic is blocked, enable the involved
ports and try again.
– Check whether there is security software running on the source server. If
there is, disable the security software, stop related services if necessary,
and try again.
16.38 SMS.3803 The Connection to the Port 22 of
Target Server Failed Because an Error Occurred During
the Public Key Verification on the Target Server
During a migration, an SSH connection must be established between the source
server and the target server. This error message is displayed when the SSH client
Server Migration Service
FAQs 16 Error Codes and Solutions
Issue 70 (2025-11-05) Copyright © Huawei Cloud Computing Technologies Co., Ltd. 212

--- Page 222 ---
reports error "BadHostkeyException", indicating that the public key in the
known_hosts file fails to be verified. The possible causes and solutions are:
● Security software or firewalls may block the connection from the source
server to the target server.
– Check the firewall settings of the source server and ensure that no
outbound traffic is blocked. If the traffic is blocked, enable the involved
ports and try again.
– Check whether there is security software running on the source server. If
there is, disable the security software, stop related services if necessary,
and try again.
● The IP address of the target server is changed after you configure the
target server in the migration task or the full migration is complete.
The source server cannot identify the changed IP address of the target server.
As a result, the authentication fails. You can delete the current task and
create a new one, or change the IP address of the target server back to the
original one.
● Packet loss occurs when the target server obtains ECS metadata.
In certain regions, such as AF-Johannesburg and AP-Jakarta, the target server
may fail to obtain ECS metadata. In this case, you are advised to change the
target server and perform the migration again.
● The migration is executed using a private network, and there is an IP
address conflict between the source and target servers.
The source server may fail to access the IP address of the target server if there
is an IP address conflict between them. Check and modify the network
configuration, ensure that the IP addresses do not conflict, and then try the
migration again.
16.39 SMS.3804 The Connection to the Port 22 of
Target Server Failed Due to Invalid Connection
Credential
During a migration, an SSH connection must be established between the source
server and the target server. This error message is displayed when the SSH client
reports the error "AuthenticationException" indicating that the identity
authentication fails. Check whether the target server runs Windows and uses a key
for login. If it does, use another cloud server as the target server and then try
again.
NO TICE
Such Windows servers cannot be used as target servers for migration.
Server Migration Service
FAQs 16 Error Codes and Solutions
Issue 70 (2025-11-05) Copyright © Huawei Cloud Computing Technologies Co., Ltd. 213

--- Page 223 ---
16.40 SMS.3805 The Connection to the Port 22 of
Target Server Timed Out
During a migration, an SSH connection must be established between the source
server and the target server. This error message is displayed when OpenSSH
reports the error "connect timeout", indicating that the SSH connection times out.
As a result, the source server cannot connect to the IP address of the target server.
The possible causes and solutions are:
● Check whether the security groups, firewalls, and ACL rules allow the
source server to access the target server with the IP address.
Check whether the connection is disallowed by any security groups, firewalls,
or ACL rules on the network between the source and target servers. If it is,
modify their settings to allow the source server to access the target server
and retry the migration task.
● Check the network connectivity between the source and target servers. If
a private network is used, check whether the source and target servers
are in the same network range.
Use SSH or Telnet to test the network connectivity between the source and
target servers. If the connection fails, check the network and firewall settings.
The commands are in the following format:
– telnet <target-server-IP-address> <port>
– ssh -p <port> <username>@<target-server-IP-address>
By default, SMS connects to the target server using port 22. If the target
server is configured to use a custom SSH port, replace <port> in the
command with the actual port.
For example, if the target server IP address is 192.168.0.x, you can run the
following command on the source server as the root user to test connectivity
to port 22:
telnet 192.168.0.x 22
ssh -p 22 root@192.168.0.x
● Check whether the target server is stopped.
a. Sign in to the console.
b. On the Elastic Cloud Server page, check the ECS (target server) status. If
the ECS is stopped, choose More > Start in the Operation column.
16.41 SMS.3806 The Connection to the Port 22 of
Target Server Was Rejected
During a migration, an SSH connection must be established between the source
server and the target server. This message is displayed when OpenSSH reports the
error "connect refused", which means the connection to the target server's IP
address is rejected. The possible causes and solutions are:
● Check whether the security groups, firewalls, and ACL rules allow the
source server to access the target server with the IP address.
Server Migration Service
FAQs 16 Error Codes and Solutions
Issue 70 (2025-11-05) Copyright © Huawei Cloud Computing Technologies Co., Ltd. 214

--- Page 224 ---
Check whether the connection is disallowed by any security groups, firewalls,
or ACL rules on the network between the source and target servers. If it is,
modify their settings to allow the source server to access the target server
and retry the migration task.
● Check the network connectivity between the source and target servers. If
a private network is used, check whether the source and target servers
are in the same network range.
Use SSH or Telnet to test the network connectivity between the source and
target servers. If the connection fails, check the network and firewall settings.
The commands are in the following format:
– telnet <target-server-IP-address> <port>
– ssh -p <port> <username>@<target-server-IP-address>
By default, SMS connects to the target server using port 22. If the target
server is configured to use a custom SSH port, replace <port> in the
command with the actual port.
For example, if the target server IP address is 192.168.0.x, you can run the
following command on the source server as the root user to test connectivity
to port 22:
telnet 192.168.0.x 22
ssh -p 22 root@192.168.0.x
16.42 SMS.5102 Agent Startup Failed Because the
noexec Permission Is Unavailable on /tmp in Linux
Symptom
When you ran sh startup.sh to start the Agent, the following message was
reported: "SMS.5102 Agent startup failed because the noexec permission is
unavailable on /tmp in Linux."
Possible Causes
There is a block device mounted to the /tmp directory, but the exec permission
was not assigned or the noexec permission was assigned during the mounting.
Solution
Step 1 Log in to the source server.
Step 2 Run mount -l | grep /tmp. If information similar to the following is displayed, the
noexec permission is assigned:
/dev/vdb1 on /tmp type ext4 (rw, noexec, relatime, data=ordered)
Step 3 Remount the block device to the /tmp directory. Do not assign the noexec
permission during the mounting. Alternatively, run mount -o remount exec /tmp
to assign the exec permission.
Step 4 Run mount -l | grep /tmp again. If information similar to the following is
displayed, the exec permission is assigned. Then restart the Agent.
Server Migration Service
FAQs 16 Error Codes and Solutions
Issue 70 (2025-11-05) Copyright © Huawei Cloud Computing Technologies Co., Ltd. 215

--- Page 225 ---
/dev/vdb1 on /tmp type ext4 (rw, relatime, data=ordered)
----End
16.43 SMS.5105 Agent Startup Failed. Insufficient
Permissions to Add Files to or Delete Files from xxx
Symptom
When you started the Agent on a Linux source server, you received the error
"SMS.5105 Agent startup failed. Insufficient permissions to add files to or delete
files from xxx."
Possible Causes
The root directory on the source server is set to be unmodifiable. Files cannot be
added to or modified in the root directory.
Log in to the source server and run the following command to check the attributes
of the root directory:
lsattr -d /root
If the root directory has the i attribute, files cannot be added to or modified in the
root directory.
Solution
1. Run the following command to remove the unmodifiable attribute from the
root directory:
chattr -i /root
2. Run the following command to check the attribute is removed from the root
directory:
lsattr -d /root
3. Restart the SMS-Agent.
16.44 SMS.5108 Failed to Execute df -TH
Symptom
When you started the Linux Agent by running the startup.sh script, error
"SMS.5108 Failed to execute df -TH" was reported.
Server Migration Service
FAQs 16 Error Codes and Solutions
Issue 70 (2025-11-05) Copyright © Huawei Cloud Computing Technologies Co., Ltd. 216

--- Page 226 ---
Possible Causes
After you run df -TH and echo $? on the source server, if the command output is
not 0, the command execution failed.
In this case, it is possible that a mounted device is offline or does not exist.
Solution
Unmount the device. Run df -TH and echo $? and check whether the output is 0.
16.45 SMS.5112: Agent Main Program linuxmain Could
Not Run
Symptom
The Agent failed to be started on Linux, and the error message "Error. SMS.5112
Agent main program linuxmain could not run" was displayed.
Possible Causes
The source system does not support the linuxmain program.
Solution
Check whether the source server OS is supported by SMS. Learn more about
Supported Linux OSs.
● If the source server OS is not supported, the server cannot be migrated by
SMS.
● If the source server OS is supported, contact Huawei Cloud technical support.
16.46 SMS.5113 Check %s on Linux Timed Out
Symptom
The Agent failed to be started on Linux, and the error message "Error. SMS.5113
Check %s on Linux timed out" was displayed.
Possible Causes
The execution of some commands takes a long time in the migration feasibility
check stage. You can resolve the issue based on the specific check item.
Solution
Step 1 Go to the ...SMS-Agent/agent/linux/resources/shell directory and run the
precheck script. xxx indicates the check item for which the error is reported.
./pre_check.sh check_<xxx>
Server Migration Service
FAQs 16 Error Codes and Solutions
Issue 70 (2025-11-05) Copyright © Huawei Cloud Computing Technologies Co., Ltd. 217

--- Page 227 ---
Step 2 Perform operations based on the running time and result.
● If the running time is less than 30 seconds and no error is reported, run the
Agent again.
● If the running time is longer than 30 seconds and no error is reported, edit
the pre_check.sh file and add the involved check item to the end of
exclude_items to exclude the check item. Then run the Agent again.
● If no response or error is returned for a long time, some commands for the
check item experience errors. For example, df -TH for check item
check_df_result may hang if there are unresponsive external storage devices.
You need to check each command involved in the check item based on the
instructions below.
a. Open the pre_check.sh file and search for check_xxx. xxx indicates the
check item for which the error is reported.
b. Manually run the commands involved in the check item one by one to
locate the command that causes the error.
c. Rectify the command issue and run the Agent again.
----End
16.47 SMS.6303 The Installed Agent Is of an Earlier
Version. Download the Latest Version
Symptom
When the Agent tried to register the source server with SMS, the error message
"SMS.6306 The installed Agent is of an earlier version. Download the latest
version" was reported.
Possible Causes
The version of the Agent installed on the source server is too early. You need to
download and install the latest Agent.
Solution
1. Uninstall the earlier version of the SMS-Agent. For details, see How Do I
Uninstall the SMS-Agent from the Source and Target Servers After the
Migration Is Complete?
2. Install the latest version of the SMS-Agent. For details, see Installing the
SMS-Agent on Linux.
16.48 SMS.6509 Incompatible File System of the Source
Server
Symptom
After the migration feasibility check was complete, you received error message
"SMS.6509 Incompatible file system of the source server."
Server Migration Service
FAQs 16 Error Codes and Solutions
Issue 70 (2025-11-05) Copyright © Huawei Cloud Computing Technologies Co., Ltd. 218

--- Page 228 ---
Possible Causes
There are unsupported file systems on the source server.
Solution
Check the file system types on the source server. SMS supports the following file
systems:
● Linux: Ext2, Ext3, Ext4, XFS, and VFAT are supported. Btrfs and ReiserFS are
not supported.
● Windows: NTFS is supported. FAT32 file systems on non-boot partitions are
not supported.
For unsupported file systems such as ReiserFS, you can copy files to other file
systems, uninstall the unsupported file systems, and then perform the migration.
If this is not possible on the source server, you can:
● Use IMS to create a system disk image for the source server from an external
image file and use the image to create a server on Huawei Cloud. For details,
see Creating a Windows System Disk Image from an External Image File
or Creating a Linux System Disk Image from an External Image File.
● Use a public or KooGallery image to create a server and deploy your
applications on the server.
● Use the Cloud Migration Service on Huawei Cloud.
16.49 SMS.6511 The Source Server Lacks Driver Files
Symptom
After you started the Agent, the source server did not pass the migration
feasibility check, and you received error message "SMS.6511 Source server lacks
driver files" on the SMS console.
Possible Causes
After the Agent is started, it will verify the driver files on the source server. If any
necessary driver files are missing, the preceding error is reported.
The following files are necessary:
* C:\Windows\system32\DRIVERS\atapi.sys
* C:\Windows\system32\DRIVERS\pciidex.sys
* C:\Windows\system32\DRIVERS\intelide.sys
Solution
Check whether the preceding files are there on the source server. If any of them
are missing, use the driver repair tool to repair the files or copy the files from
another server.
Server Migration Service
FAQs 16 Error Codes and Solutions
Issue 70 (2025-11-05) Copyright © Huawei Cloud Computing Technologies Co., Ltd. 219

--- Page 229 ---
16.50 SMS.6517 rsync Not Installed on the Source
Server
SMS does not provide rsync installation packages or guides. rsync is a common
tool in Linux. Most Linux distributions have rsync preinstalled. If rsync is
unavailable on the source server, you can install it according to official instructions
of each Linux distribution.
Symptom
When you tried to start the Agent installed on a Linux source server, the "rsync
not installed on the source server" message was reported, as shown in Figure
16-6. To resolve this issue, install rsync and restart the Agent.
Figure 16-6 Error message
Possible Causes
Linux migration depends on rsync. If rsync is missing from the source server, the
Agent cannot start up.
Solutions
The operations depend on the source server OS.
CentOS or Red Hat Enterprise Linux
1. Use PuTTY or another SSH client to log in to the source server as user root.
2. Check whether rsync is available in the yum repository.
yum search rsync
– If it is, go to 3.
– If it is not and the source server runs CentOS 8, update the yum
repository.
mv /etc/yum.repos.d /etc/yum.repos.d.huawei.bak
mkdir /etc/yum.repos.d
vi /etc/yum.repos.d/CentOS-Base.repo (Enter the following information,
and save the changes and exit.)
[BaseOS]
name=CentOS-$releasever - Base
baseurl=https://repo.huaweicloud.com/centos-vault/$contentdir/$releasever/BaseOS/
$basearch/os/
gpgcheck=1
Server Migration Service
FAQs 16 Error Codes and Solutions
Issue 70 (2025-11-05) Copyright © Huawei Cloud Computing Technologies Co., Ltd. 220

--- Page 230 ---
enabled=1
gpgkey=file:///etc/pki/rpm-gpg/RPM-GPG-KEY-centosofficial
yum clean all
yum makecache
3. Install rsync.
yum install rsync
4. Enter y and press Enter.
5. Query rsync details.
rsync --version
If the information shown in the figure below is displayed, rsync has been
installed:
6. Start the Agent.
./startup.sh
7. Read the displayed information carefully, enter y, and press Enter.
Figure 16-7 Confirmation
8. Enter the AK/SK pair for the Huawei Cloud account that you migrate to.
When the information shown in the figure below is displayed, the SMS-Agent
has been started up and will automatically start reporting source server
information to SMS.
Server Migration Service
FAQs 16 Error Codes and Solutions
Issue 70 (2025-11-05) Copyright © Huawei Cloud Computing Technologies Co., Ltd. 221

--- Page 231 ---
SUSE
1. Use PuTTY or another SSH client to log in to the source server as user root.
2. Install rsync.
zypper install rsync
3. Enter y and press Enter.
4. Query rsync details.
rsync --version
If the information shown in the figure below is displayed, rsync has been
installed:
5. Start the Agent.
./startup.sh
6. Read the displayed information carefully, enter y, and press Enter.
Figure 16-8 Confirmation
7. Enter the AK/SK pair for the Huawei Cloud account that you migrate to.
Server Migration Service
FAQs 16 Error Codes and Solutions
Issue 70 (2025-11-05) Copyright © Huawei Cloud Computing Technologies Co., Ltd. 222

--- Page 232 ---
When the information shown in the figure below is displayed, the SMS-Agent
has been started up and will automatically start reporting source server
information to SMS.
Ubuntu
1. Use PuTTY or another SSH client to log in to the source server as user root.
2. Install rsync.
apt-get install rsync
3. Query rsync details.
rsync --version
If the information shown in the figure below is displayed, rsync has been
installed:
4. Start the Agent.
./startup.sh
5. Read the displayed information carefully, enter y, and press Enter.
6. Enter the AK/SK pair for the Huawei Cloud account that you migrate to.
When the information shown in the figure below is displayed, the SMS-Agent
has been started up and will automatically start reporting source server
information to SMS.
Server Migration Service
FAQs 16 Error Codes and Solutions
Issue 70 (2025-11-05) Copyright © Huawei Cloud Computing Technologies Co., Ltd. 223

--- Page 233 ---
16.51 SMS.6526 Insufficient Quota
Symptom
The error SMS.6526 was reported during the startup or running of the SMS-Agent.
The error message might be:
● SMS.6526 Insufficient quota.
● SMS.6526 Insufficient quota. Your account is frozen and resources cannot be
used.
● SMS.6526 Insufficient quota. Your account is suspended and resources cannot
be used.
● SMS.6526 Insufficient quota. Your account is restricted and resources cannot
be used.
Possible Causes
Throughout the operations of the SMS-Agent, any interaction with Huawei Cloud
services (such as EPS, IAM, and ECS) may trigger the SMS.6526 error. This occurs
because Huawei Cloud performs account status validation. If your account is
suspended, in arrears, restricted, or uses up resource quotas, the involved cloud
service returns a response containing relevant details. The SMS-Agent interprets
this response and reports the SMS.6526 error accordingly.
Solution
You can rectify the fault based on the error message.
Error
Message
Handling Method
Insufficient
quota.
View the total and used quotas of the cloud services. If
necessary, apply for a higher quota. For details, see Quotas.
Your account
is frozen.
For details about the reasons why your account is frozen and
how to unfreeze your account, see In What Circumstances Will
Huawei Cloud Services Be Frozen?
Your account
is suspended.
What Can I Do If I Have an Outstanding Amount?
Your account
is restricted.
In What Circumstances Will Huawei Cloud Services Be
Restricted?
 
Server Migration Service
FAQs 16 Error Codes and Solutions
Issue 70 (2025-11-05) Copyright © Huawei Cloud Computing Technologies Co., Ltd. 224

--- Page 234 ---
16.52 SMS.6528 Complete Real-name Authentication
to Invoke SMS APIs
Symptom
When the SMS-Agent tried to register the source server with SMS, the following
error message was displayed: SMS.6528 Complete real-name authentication to
invoke SMS APIs.
Possible Causes
Before using SMS, you need to complete real-name authentication.
Solution
Complete real-name authentication and try again.
16.53 SMS.6533 VSS Not Installed on the Source Server
Symptom
After the Agent was started on a Windows source server, the source server did not
pass the migration feasibility check, and the error message "SMS.6533 VSS not
installed on the source server" was displayed on the SMS console.
Possible Causes
The possible causes are as follows:
1. The VSS service is not installed on the source server.
2. The VSS service is disabled on the source server.
Solution
1. Open the  Task Manager and check whether the VSS service is there.
If it is, go to 2.
If it is not, go to 3.
Server Migration Service
FAQs 16 Error Codes and Solutions
Issue 70 (2025-11-05) Copyright © Huawei Cloud Computing Technologies Co., Ltd. 225

--- Page 235 ---
Figure 16-9 Checking whether VSS exists
2. Modify the configuration file to skip snapshot creation.
Open the \config\g-property.cfg file in the Agent installation directory and
change the value of enablesnapshot to False. The migration task will skip
snapshot creation.
NO TICE
Skipping snapshot creation may cause data time difference between the
target server and the source server after the migration is complete, and your
services may fail to start on the target server. To ensure data consistency, you
are advised to pause services running on the source server during off-peak
hours and then perform an incremental synchronization.
Server Migration Service
FAQs 16 Error Codes and Solutions
Issue 70 (2025-11-05) Copyright © Huawei Cloud Computing Technologies Co., Ltd. 226

--- Page 236 ---
Figure 16-10 Modifying the g-property.cfg file
3. Check VSS status. If its status is Stopped, right-click the service and choose
Open Services from the shortcut menu. Locate and right-click Volume
Shadow Copy, and choose Properties from the shortcut menu. On the
displayed Volume Shadow Copy Properties window, change the Startup
type to Manual. Click OK.
Figure 16-11 Changing the startup mode of VSS
4. Go back to the Task Manager window, locate and right-click VSS, and choose
Start from the shortcut menu.
Server Migration Service
FAQs 16 Error Codes and Solutions
Issue 70 (2025-11-05) Copyright © Huawei Cloud Computing Technologies Co., Ltd. 227

--- Page 237 ---
Figure 16-12 Starting VSS
5. Sign in to the SMS console, locate the server record, and in the Operation
column, choose More > Delete.
After the deletion is complete, restart the Agent.
16.54 SMS.6537 SMS Cannot Migrate System Disks
Larger Than 1 TB
Symptom
After the Agent was started, the following error message was displayed on the
SMS console: SMS.6537 SMS cannot migrate system disks greater than 1 TB.
Possible Causes
SMS is restricted by an IMS limitation on the system disk size. When you use an
image to create an ECS, the system disk cannot be larger than 1 TB.
Solution
Resize the system disk by referring to How Do I Migrate a Server with a System
Disk Larger Than 1 TB? Then, perform the migration.
Server Migration Service
FAQs 16 Error Codes and Solutions
Issue 70 (2025-11-05) Copyright © Huawei Cloud Computing Technologies Co., Ltd. 228

--- Page 238 ---
16.55 SMS.6564 Component i386-pc Not Found on
Source Server. For Solution, See SMS API Reference
Symptom
When you started the Agent installed on a Linux source server, you received error
message "SMS.6564: Component i386-pc not found on source server. For solution,
see SMS API Reference."
Possible Causes
Huawei Cloud requires that component i386-pc be available on servers booted in
BIOS mode for installing GRUB. The error message indicates that the source server
is started in BIOS mode but does not have GRUB component i386-pc. In this case,
during the target server configuration by the Agent, GRUB will fail to be installed.
As a result, this error is reported during the configuration.
NO TE
The i386-pc component is located in the /usr/lib/grub/ directory.
Solution
Step 1 Check whether the source server is booted to BIOS.
#[ -d /sys/firmware/efi ] && echo UEFI || echo BIOS
● If the output is bios, the server is booted to BIOS.
● If the output is uefi, the server is booted to UEFI.
Step 2 Check whether the i386-pc folder is in the /usr/lib/grub/ directory.
#ls /usr/lib/grub
● If the i386-pc folder is not there, go to step 3.
● If the  i386-pc folder is there, check whether the i386-pc folder is empty.
#ls /usr/lib/grub/i386-pc
Step 3 On the source cloud platform or Huawei Cloud, use a public image to create a
temporary server that runs the same OS as the source server.
Step 4 Log in to the temporary server and transfer the i386-pc folder in the /usr/lib/
grub/ directory on the temporary server to the /usr/lib/grub/ directory on the
source server. If there is an empty i386-pc folder on the source server, overwrite it.
You can use Secure Copy (SCP) or rsync to transfer the folder. The following
command uses SCP as an example:
#scp -r /usr/lib/grub/i386-pc   Username@xx.xx.xx.xx:/usr/lib/grub/
Server Migration Service
FAQs 16 Error Codes and Solutions
Issue 70 (2025-11-05) Copyright © Huawei Cloud Computing Technologies Co., Ltd. 229

--- Page 239 ---
CA UTION
● Replace Username with the username of the source server.
● Replace xx.xx.xx.xx with the IP address of the source server.
● Modify the security group of the source server to allow access from the
temporary server.
Step 5 Log in to the source server, check that the i386-pc folder is in the /usr/lib/grub/
directory, and restart the Agent.
----End
16.56 SMS.6563 File initrd or initramfs of the xxxx
Version Not Found Under /boot Directory. For solution,
see SMS API Reference
Symptom
When you started the Agent installed on a Linux source server, you received error
message "SMS.6563: File initrd or initramfs of the xxxx version not found under /
boot directory. For solution, see SMS API Reference."
Possible Causes
The source server does not have the initrd or initramfs image file. Servers on
some cloud platforms use custom kernels. The servers can be started without the
initrd or initramfs image file. However, servers on Huawei Cloud cannot be
started without the initrd or initramfs image file.
NO TE
The functions of Initrd and Initramfs are basically the same. They both provide the drivers
required for starting the kernel.
Different OSs use different image files. For example, Ubuntu uses Initrd and the filename
format is initrd.img-xxx, and some CentOS distributions use Initramfs and the filename
format is initramfs-xxx.img.
Solution
The following operations will generate an image file that matches the kernel file
on the source server. This may affect the OS on the source server.
Server Migration Service
FAQs 16 Error Codes and Solutions
Issue 70 (2025-11-05) Copyright © Huawei Cloud Computing Technologies Co., Ltd. 230

--- Page 240 ---
OS Configuration Reference
CentOS and
EulerOS
The following uses CentOS 7.0
as an example:
1. In the /etc/dracut.conf file,
add VirtIO drivers to
add_drivers, including
virtio_blk, virtio_scsi,
virtio_net, virtio_pci,
virtio_ring, and virtio.
Separate driver names with
spaces.
2. Save and exit the /etc/
dracut.conf file and run the
dracut -f command to
generate initrd again.
CentOS and EulerOS
Ubuntu and
Debian
1. In the /etc/initramfs-tools/
modules file, add VirtIO
drivers, including virtio_blk,
virtio_scsi, virtio_net,
virtio_pci, virtio_ring, and
virtio. Separate driver names
with spaces.
2. Save and exit the /etc/
initramfs-tools/modules
file and run the update-
initramfs -u command to
generate initrd again.
Ubuntu and Debian
SUSE and
openSUSE
If the OS version is earlier than
SUSE 12 SP1 or openSUSE 13:
1. In the /etc/sysconfig/kernel
file, add VirtIO drivers to
INITRD_MODULES="".
VirtIO drivers include
virtio_blk, virtio_scsi,
virtio_net, virtio_pci,
virtio_ring, and virtio.
Separate driver names with
spaces.
2. Run the mkinitrd command
to generate initrd again.
SUSE and openSUSE
(Earlier than SUSE 12
SP1 or openSUSE 13)
Server Migration Service
FAQs 16 Error Codes and Solutions
Issue 70 (2025-11-05) Copyright © Huawei Cloud Computing Technologies Co., Ltd. 231

--- Page 241 ---
OS Configuration Reference
If the OS version is SUSE 12
SP1:
1. In the /etc/dracut.conf file,
add VirtIO drivers to
add_drivers, including
virtio_blk, virtio_scsi,
virtio_net, virtio_pci,
virtio_ring, and virtio.
Separate driver names with
spaces.
2. Run the dracut -f command
to generate initrd again.
SUSE and openSUSE
(SUSE 12 SP1)
If the OS version is later than
SUSE 12 SP1 or openSUSE 13:
1. In the /etc/dracut.conf file,
add VirtIO drivers to
add_drivers, including
virtio_blk, virtio_scsi,
virtio_net, virtio_pci,
virtio_ring, and virtio.
Separate driver names with
spaces.
2. Save and exit the /etc/
dracut.conf file and run the
dracut -f command to
generate initrd again.
SUSE and openSUSE
(Later than SUSE 12 SP1
or openSUSE 13)
 
16.57 SMS.6616 The Current OS Does Not Support
Block-level Migration/SMS.6617 The Current Kernel
Version Does Not Support Block-level Migration
Symptom
When the SMS-Agent started to register the source server with SMS, either of the
following messages was displayed:
● SMS.6616 The current OS does not support block-level migration.
● SMS.6617 The current kernel version does not support block-level migration.
Possible Causes
The OS or kernel version of the source server was not supported for SMS block-
level migration. For details, see Linux OSs and kernel versions available for
block-level migration.
Server Migration Service
FAQs 16 Error Codes and Solutions
Issue 70 (2025-11-05) Copyright © Huawei Cloud Computing Technologies Co., Ltd. 232

--- Page 242 ---
Solution
● Check if the OS or version of the source server is listed in Linux OSs available
for file-level migration. If it is, use the file-level migration method.
16.58 SMS.9007 Migration Task Paused. Rate Limit Not
Applied. Rate Exceeded Limit Multiple Times
Symptom
During the migration of a Linux server, the message "SMS.9007 Migration task
paused. Rate limit not applied. Rate exceeded limit multiple times." was displayed.
Possible Causes
The configured rate limit was not applied due to the following reasons:
● There were traffic limiting rules on the NIC of the source server.
● Traffic Control (TC) was missing or abnormal on the source server.
● Class Based Queuing (CBQ) was missing on the source server.
● The source server did not have the route command.
Solutions
● Check whether the source server has rate limiting rules (including but not
limited to those for NICs) and evaluate whether deleting the existing rules
will affect services. To view the NIC rate limiting rule, perform the following
steps:
Log in to the source server as the root user and run the following command
to display the configurations of all NICs:
ifconfig
Run the following command to display the traffic control rules of a specific
NIC. eth0 is used in the following example.
tc qdisc show dev eth0
– If deleting existing rules affects services, go to the SMS console, delete
the migration rate limit you configured and start the migration task. For
details, see Setting a Migration Rate.
– If deleting existing rules does not affect services, run the following
command to delete the rules. eth0 is used in the following example.
Then click Start on the SMS console to continue the migration.
tc qdisc del dev eth0 root
● Run the following commands on the source server to check whether the
required commands and modules are available:
tc -V                Check whether TC is available.
route                Check whether the route command is available.
Run the lsmod | grep sch_cbq  Check whether CBQ is available.
If any command or module is missing, rectify the fault and run the following
command to delete related log files. Then click Start on the SMS console to
continue the migration.
rm -f /SMS-Agent/agent/Logs/handleRecord.log
Server Migration Service
FAQs 16 Error Codes and Solutions
Issue 70 (2025-11-05) Copyright © Huawei Cloud Computing Technologies Co., Ltd. 233