# sms-usermanual-pdf.pdf

Extracted from: docs/pdf-resources-kit/sms-usermanual-pdf.pdf
Pages: 69

--- Page 1 ---
Server Migration Service
User Guide
Issue 33
Date 2026-08-05
HUAWEI CLOUD COMPUTING TECHNOLOGIES CO., LTD.

--- Page 2 ---
 
 
Copyright © Huawei Cloud Computing Technologies Co., Ltd. 2026. All rights reserved.
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
  
 
 
 
 
 
Issue 33 (2026-08-05) Copyright © Huawei Cloud Computing Technologies Co., Ltd. i

--- Page 3 ---
Contents
1 Permissions Management..................................................................................................... 1
1.1 Using IAM to Grant Access to SMS................................................................................................................................... 1
1.1.1 Using IAM Roles or Policies to Grant Access to SMS.............................................................................................. 1
1.1.2 Using IAM Identity Policies to Grant Access to SMS............................................................................................... 4
2 Installing the Agent on the Source Server........................................................................ 7
2.1 Installing the SMS-Agent on Windows............................................................................................................................7
2.2 Installing the SMS-Agent on Linux................................................................................................................................. 13
3 Migration Management.......................................................................................................17
3.1 Overview.................................................................................................................................................................................. 17
3.2 Configuring a Target Server.............................................................................................................................................. 19
3.3 Starting a Full Replication................................................................................................................................................. 34
3.4 Synchronizing Incremental Data..................................................................................................................................... 36
3.5 Setting a Migration Rate.................................................................................................................................................... 38
3.6 Uploading Migration Logs................................................................................................................................................. 39
3.7 Deleting Resources............................................................................................................................................................... 41
3.8 Deleting a Migration Task................................................................................................................................................. 42
4 Target Server Management................................................................................................ 43
4.1 Overview.................................................................................................................................................................................. 43
4.2 (Optional) Cloning a Target Server................................................................................................................................ 44
4.3 Launching a Target Server................................................................................................................................................. 45
4.4 Checking Server Details...................................................................................................................................................... 46
4.5 Deleting the Target Server Configuration.................................................................................................................... 47
4.6 (Optional) Deleting a Server Clone................................................................................................................................48
5 Template Management........................................................................................................49
5.1 Overview.................................................................................................................................................................................. 49
5.2 Managing a Migration Template.....................................................................................................................................49
5.3 Managing a Server Template............................................................................................................................................55
6 Viewing CTS Traces............................................................................................................... 59
6.1 SMS Operations Supported by CTS................................................................................................................................ 59
6.2 Viewing CTS Traces in the Trace List.............................................................................................................................. 62
Server Migration Service
User Guide Contents
Issue 33 (2026-08-05) Copyright © Huawei Cloud Computing Technologies Co., Ltd. ii

--- Page 4 ---
6.3 Viewing Traces....................................................................................................................................................................... 65
Server Migration Service
User Guide Contents
Issue 33 (2026-08-05) Copyright © Huawei Cloud Computing Technologies Co., Ltd. iii

--- Page 5 ---
1 Permissions Management
1.1 Using IAM to Grant Access to SMS
1.1.1 Using IAM Roles or Policies to Grant Access to SMS
System-defined permissions in role/policy-based authorization provided by IAM
let you control access to SMS. With IAM, you can:
● Create IAM users for employees based on the organizational structure of your
enterprise. Each IAM user has their own security credentials, providing access
to SMS resources.
● Grant users only the permissions required to perform a given task based on
their job responsibilities.
● Entrust an account or cloud service to perform professional and efficient O&M
on your SMS resources.
If your account does not need individual IAM users for permissions management,
you can skip this section.
Figure 1-1 shows the process flow of role/policy-based authorization.
Prerequisites
Before granting permissions to user groups, learn about Role/Policy-based
Authorization for SMS. To grant permissions for other services, learn about all
system-defined permissionssupported by IAM.
Server Migration Service
User Guide 1 Permissions Management
Issue 33 (2026-08-05) Copyright © Huawei Cloud Computing Technologies Co., Ltd. 1

--- Page 6 ---
Process Flow
Figure 1-1 Process for granting SMS permissions
1. Create a user group and assign it permissions.
You can assign system-defined policies and custom policies to the user group.
Custom policies extend and supplement system-defined policies, providing
more refined access control. Select proper authorization policies based on
service requirements.
– If the IAM users in the user group need all permissions for SMS, attach
system-defined policies to the user group. On the IAM console, create a
user group and attach the SMS FullAccess, OBS OperateAccess, ECS
FullAccess, VPC FullAccess, IMS FullAccess, EVS FullAccess, and EIP
FullAccess policies to the user group. If disk encryption is required, EVS
KMSAccess must also be attached.
– If the IAM users only need specific SMS permissions, create custom
policies and attach these policies to the user group. For details about the
content and creation method of custom policies, see Example Custom
Policies.
2. Create an IAM user and add it to the created user group.
Create an IAM user and add it to the user group created in 1.
3. Log in as the IAM user and verify permissions.
In the authorized region, perform the following operations:
– Choose Service List > Server Migration Service. In the navigation pane
on the left, click Servers. In the server list, locate the server to be
migrated, and click Configure in the Target column to configure the
Server Migration Service
User Guide 1 Permissions Management
Issue 33 (2026-08-05) Copyright © Huawei Cloud Computing Technologies Co., Ltd. 2

--- Page 7 ---
target server. If the target server can be configured, the permissions have
taken effect.
– Choose a service other than SMS and its dependents services in the
Service List. If a message appears indicating that you have insufficient
permissions to access the service, the permissions have taken effect.
Example Custom Policies
1. Custom policies can be created to supplement the system-defined policies of
SMS.
To create a custom policy, choose either visual editor or JSON.
– Visual editor: Select cloud services, actions, resources, and request
conditions. This does not require knowledge of policy syntax.
– JSON: Create a JSON policy or edit an existing one.
For details, see Creating a Custom Policy. The following lists examples of
common SMS custom policies.
● Example SMS policy that contains permissions for project-level services
{
    "Version": "1.1",
    "Statement": [
        {
            "Action": [
                "vpc:securityGroups:create",
                "vpc:securityGroupRules:create",
                "vpc:vpcs:create",
                "vpc:publicIps:create",
                "vpc:subnets:create",
                "ecs:cloudServers:create",
                "ecs:cloudServers:attach",
                "ecs:cloudServers:detachVolume",
                "ecs:cloudServers:start",
                "ecs:cloudServers:stop",
                "ecs:cloudServers:delete",
                "ecs:cloudServers:reboot",
                "ecs:cloudServers:updateMetadata",
                "ecs:serverPasswords:manage",
                "ecs:serverKeypairs:delete",
                "ecs:diskConfigs:use",
                "ecs:CloudServers:create",
                "ecs:servers:setMetadata",
                "ecs:serverVolumes:use",
                "ecs:serverKeypairs:create",
                "ecs:serverInterfaces:use",
                "ecs:serverGroups:manage",
                "ecs:securityGroups:use",
                "ecs:servers:unlock",
                "ecs:servers:rebuild",
                "ecs:servers:lock",
                "ecs:servers:reboot",
                "evs:volumes:use",
                "evs:volumes:create",
                "evs:volumes:update",
                "evs:volumes:delete",
                "evs:volumes:attach",
                "evs:volumes:detach",
                "evs:snapshots:create",
                "evs:snapshots:delete",
                "evs:snapshots:rollback",
                "kms:cmk:list",
                "kms:cmk:get",
                "kms:dek:create",
                "kms:dek:decrypt",
Server Migration Service
User Guide 1 Permissions Management
Issue 33 (2026-08-05) Copyright © Huawei Cloud Computing Technologies Co., Ltd. 3

--- Page 8 ---
                "ecs:*:get*",
                "ecs:*:list*",
                "evs:*:get*",
                "evs:*:list*",
                "vpc:*:list*",
                "vpc:*:get*",
                "ims:*:get*",
                "ims:*:list*"
            ],
            "Effect": "Allow"
        }
    ]
}
● Example SMS policy that contains permissions for global services
{
    "Version": "1.1",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                 "sms:server:registerServer",
                 "sms:server:migrationServer",
                 "sms:server:queryServer",
                 "iam:roles:listRoles",
                 "iam:agencies:listAgencies",
                 "iam:permissions:listRolesForAgency"
            ]
        }
    ]
}
1.1.2 Using IAM Identity Policies to Grant Access to SMS
System-defined permissions in identity policy-based authorization provided by
IAM let you control access to SMS. With IAM, you can:
● Create IAM users or user groups for personnel based on your enterprise's
organizational structure. Each IAM user has their own identity credentials for
accessing SMS resources.
● Grant users only the permissions required to perform a given task based on
their job responsibilities.
● Entrust a Huawei Cloud account or a cloud service to perform efficient O&M
on your SMS resources.
If your Huawei Cloud account meets your permissions requirements, you can skip
this section.
Figure 1-2 shows the process flow of identity policy-based authorization.
Prerequisites
Before granting permissions, learn about Identity Policy-based Authorization for
SMS. To grant permissions for other services, learn about all system-defined
permissions supported by IAM.
Server Migration Service
User Guide 1 Permissions Management
Issue 33 (2026-08-05) Copyright © Huawei Cloud Computing Technologies Co., Ltd. 4

--- Page 9 ---
Process Flow
Figure 1-2 Process for granting SMS permissions
1. On the IAM console, create an IAM user or create a user group.
2. Attach a system-defined policy (SMSReadOnlyPolicy as an example) to the
user or user group.
3. Log in as the IAM user and verify permissions.
In the authorized region, perform the following operations:
– Choose Service List > Server Migration Service. On the SMS console,
locate the server to be migrated and click Configure in the Target
column. If a message appears indicating insufficient permissions to
perform the operation, the SMSReadOnlyPolicy policy is in effect.
– Choose any other service in the Service List. If a message appears
indicating insufficient permissions to access the service, the
SMSReadOnlyPolicy policy is in effect.
Example Custom Policies
You can create custom identity policies to supplement the system-defined identity
policies of SMS.
To create a custom identity policy, choose either visual editor or JSON.
● Visual editor: Select cloud services, actions, resources, and request conditions.
This does not require knowledge of policy syntax.
● JSON: Create a JSON policy or edit an existing one.
For details, see Creating a Custom Identity Policy and Attaching It to a
Principal.
When creating a custom Identity policy, use the Resource element to specify the
resources the policy applies to and use the Condition element (service-specific
condition keys) to control when the policy is in effect. The following is an example
of custom identity policies for SMS.
Server Migration Service
User Guide 1 Permissions Management
Issue 33 (2026-08-05) Copyright © Huawei Cloud Computing Technologies Co., Ltd. 5

--- Page 10 ---
● Example 1: Grant permissions to query server details.
{
    "Version": "5.0",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "sms:server:get"
            ]
        }
    ]
}
● Example 2: Grant permissions to list, query, and delete migration tasks.
{
    "Version": "5.0",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "sms:server:deleteTask",
                "sms:server:getTask",
                "sms:server:listTask"
            ]
        }
    ]
}
Server Migration Service
User Guide 1 Permissions Management
Issue 33 (2026-08-05) Copyright © Huawei Cloud Computing Technologies Co., Ltd. 6

--- Page 11 ---
2 Installing the Agent on the Source
Server
2.1 Installing the SMS-Agent on Windows
Without installing the Agent on the source server, SMS cannot collect server
information or initiate a migration task. Before the migration, you must install the
Agent on the source server to be migrated. During the installation, you need to
enter the AK/SK pair of the Huawei Cloud account you are migrating to. After the
Agent is started, it automatically reports source server information to SMS. The
information is used for migration only. To learn what source server information is
collected by SMS, see What Information Does SMS Collect About Source
Servers?
NO TE
Before using SMS to migrate servers, you need to manually install and register the SMS-
Agent on each server to be migrated. If there are more than 50 servers to migrate, you can
create a batch server migration workflow on MgC to automate batch installation and
registration of the Agent.
The SMS-Agent version varies depending on the Windows version. For details, see
Table 2-1.
Table 2-1 SMS-Agent versions
OS Version SMS-Agent version Description
Windows Server 2012, Windows
Server 2016, Windows Server 2019,
Windows Server 2022, Windows
Server 2025, Windows 8.1,
Windows 10, and Windows 11
GUI-based Windows
Agent (Python 3)
Windows Agent
(Python 2) can
run on Windows
of later versions.
Windows Server 2008 and
Windows 7
CLI-based Windows
Agent (Python 2)
 
Server Migration Service
User Guide 2 Installing the Agent on the Source Server
Issue 33 (2026-08-05) Copyright © Huawei Cloud Computing Technologies Co., Ltd. 7

--- Page 12 ---
Constraints
You need to log in to the source Windows server as Administrator.
Prerequisites
● You have obtained an AK/SK pair for your Huawei Cloud account.
– If you use an IAM user for migration, obtain an AK/SK pair by referring to
How Do I Obtain an AK/SK Pair for an IAM User?
– If you use an account for migration, obtain an AK/SK pair by referring to
How Do I Obtain an AK/SK Pair for a Huawei Cloud Account?
● You have obtained the administrator permissions for the source server.
● You have confirmed that the source server OS is supported by SMS. Learn
more about supported Windows OSs.
● There is no antivirus software on the source server. Antivirus software may
prevent the Agent from starting up.
Downloading the SMS-Agent Installation File
Step 1 Sign in to the SMS console.
Step 2 In the navigation pane, choose Agents. The Agents page is displayed.
Step 3 Select the Windows card, locate the Agent that matches the source server OS,
and click the 
  icon next to Agent.
● Windows Agent (Python 3): Windows Server 2012, Windows Server 2016,
Windows Server 2019, Windows Server 2022, Windows Server 2025, Windows
8.1, Windows 10, and Windows 11
● CLI-based Windows Agent (Python 2): Windows Server 2008 and Windows 7
Step 4 Read and agree to the service agreement, and click Yes to download the Agent
installation file.
Step 5 Click 
  next to CMS File and CRL File to download them to the source server.
Server Migration Service
User Guide 2 Installing the Agent on the Source Server
Issue 33 (2026-08-05) Copyright © Huawei Cloud Computing Technologies Co., Ltd. 8

--- Page 13 ---
Step 6 Verify the integrity of the Agent installation file. For details, see How Do I Verify
the Integrity of the Agent Installation File?
----End
Installing the SMS-Agent
Select the installation method based on the OS version.
● Windows Agent (Python 3): Windows Server 2012, Windows Server 2016,
Windows Server 2019, Windows Server 2022, Windows Server 2025, Windows
8.1, Windows 10, and Windows 11
● Windows Agent (Python 2): Windows Server 2008 and Windows 7
Installing the Windows Agent (Python 3)
Step 1 Transmit the SMS-Agent-Py3.exe file to the source server.
Step 2 Log in to the source server as user Administrator and double-click the SMS-
Agent-Py3.exe file.
Step 3 Click Install and wait for the installation to complete.
Step 4 Click Finish to open the SMS-Agent GUI.
Step 5 Enter the AK/SK pair for the Huawei Cloud account that you are migrating to and
the SMS domain name. You can obtain the SMS domain name on the Agents
page of the SMS console, as shown in Figure 2-2.
Server Migration Service
User Guide 2 Installing the Agent on the Source Server
Issue 33 (2026-08-05) Copyright © Huawei Cloud Computing Technologies Co., Ltd. 9

--- Page 14 ---
Figure 2-1 Starting the Agent
Figure 2-2 Obtaining the SMS domain name
Step 6 Determine whether to use an HTTP/HTTPS proxy server for the migration.
● If you do not need to use an HTTP/HTTPS proxy, select Direct Connection.
● If you need to use an HTTP/HTTPS proxy, select Use Proxy and set parameters
such as the IP address, port number, username, and password of the proxy
server based on Table 2-2.
Table 2-2 Proxy parameter settings
Parameter Description
Proxy server IP Enter the IP address of the proxy server, not that of
the target server. The input format is https://your-
proxy-addr.com. Replace your-proxy-addr.com with
the actual proxy server address. HTTPS is
recommended.
Port Enter the proxy port opened on the proxy server.
External user name Enter a proxy username if any; otherwise, leave it
blank.
Password Enter a proxy password if any; otherwise, leave it
blank.
 
Server Migration Service
User Guide 2 Installing the Agent on the Source Server
Issue 33 (2026-08-05) Copyright © Huawei Cloud Computing Technologies Co., Ltd. 10

--- Page 15 ---
Step 7 If the EPS service has been enabled for your Huawei Cloud account, after you
entered the AK/SK pair, the Agent will list all enterprise projects your account is
allowed to access. You can select the enterprise project you would like to migrate
the source server to. This enables you to isolate permissions, resources, and
finance during the migration. For details, see Migrating a Server into an
Enterprise Project.
Step 8 Click start.
Step 9 Carefully review the Privacy Statement and click Yes if you want to continue.
When the message "Upload success. Waiting for the SMS instruction" is displayed,
the SMS-Agent has been started. You can sign in to the SMS console and perform
subsequent operations.
----End
Installing the Windows Agent (Python 2)
Step 1 Transmit the SMS-Agent-Py2.exe file to the source server.
Step 2 Log in to the source server as user Administrator and double-click the SMS-
Agent-Py2.exe file.
Step 3 Click Install and wait for the installation to complete.
Step 4 Click Finish to open the SMS-Agent CLI.
NO TE
If you need to rerun the SMS-Agent, double-click agent-start.exe in the C:\SMS-Agent-Py2
directory.
Step 5 Determine whether to use an HTTP/HTTPS proxy server for the migration. If your
source server cannot access Huawei Cloud over the Internet, you can use a proxy
server. You will need to configure the proxy server yourself. In a migration over a
private line or VPN, a proxy server is only used for registering the source server
with SMS. It is not used for data migration.
● If you do not need an HTTP/HTTPS proxy server, skip this step and go to the
next step.
● If you need to use an HTTP/HTTPS proxy, do as follows:
a. Go to the directory where the Agent was installed (typically C:\SMS-
Agent-Py2\config).
b. Edit the auth.cfg file. Do not edit the auth.cfg file unless you need to use
an HTTP/HTTPS proxy.
[proxy-config]
enable = true
proxy_addr = https://<your-proxy-address>.com
proxy_port = <proxy-port>
proxy_user =
use_password = false
Configure the parameters according to the table below.
Server Migration Service
User Guide 2 Installing the Agent on the Source Server
Issue 33 (2026-08-05) Copyright © Huawei Cloud Computing Technologies Co., Ltd. 11

--- Page 16 ---
Table 2-3 Proxy parameter settings
Parameter Description
enable To use a proxy server, set enable to true.
proxy_addr Enter the IP address of the proxy server, not
that of the target server. The proxy is used
by the source server to access SMS. Replace
your-proxy-addr.com with the IP address of
your own proxy server. Configure the
protocol based on your proxy server. HTTPS
is recommended.
proxy_port Enter the proxy port opened on the proxy
server.
proxy_user Enter the proxy username if available, for
example, root. Otherwise, leave it blank.
use_password If the proxy server has a password, set this
parameter to true. Otherwise, set it to false.
 
Step 6 When prompted, enter the AK/SK pair for the Huawei Cloud account that you are
migrating to and the SMS domain name. You can obtain the SMS domain name
on the Agents page of the SMS console, as shown in Figure 2-3.
If the EPS service has been enabled for your Huawei Cloud account, after you
entered the AK/SK pair, the Agent will list all enterprise projects your account is
allowed to access. You can select the enterprise project you would like to migrate
the source server to. This enables you to isolate permissions, resources, and
finance during the migration. For details, see Migrating a Server into an
Enterprise Project.
Figure 2-3 Obtaining the SMS domain name
After the authentication succeeds, the SMS-Agent starts to report source server
information to SMS, and the window is closed. You can go to the Servers page on
the SMS console to check the record of the source server.
----End
Troubleshooting
● SMS.0202 AK/SK Authentication Failed
● SMS.1902 Failed to Start the I/O Monitoring Module
● Why Wasn't My Source Server Added to the SMS Console After I
Configured the Agent?
Server Migration Service
User Guide 2 Installing the Agent on the Source Server
Issue 33 (2026-08-05) Copyright © Huawei Cloud Computing Technologies Co., Ltd. 12

--- Page 17 ---
Uninstalling the SMS-Agent
After the migration is complete, you can uninstall the SMS-Agent from the source
server. For details, see Uninstalling the SMS-Agent from Windows.
2.2 Installing the SMS-Agent on Linux
Scenarios
Before the migration, you must install the Agent on the source server to be
migrated. During the installation, you need to enter the AK/SK pair of the Huawei
Cloud account you are migrating to. After the Agent is started, it automatically
reports source server information to SMS. The information is used for migration
only. To learn what source server information is collected by SMS, see What
Information Does SMS Collect About Source Servers?
NO TE
Before using SMS to migrate servers, you need to manually install and register the SMS-
Agent on each server to be migrated. If there are more than 50 servers to migrate, you can
create a batch server migration workflow on MgC to automate batch installation and
registration of the Agent.
Constraints
You need to log in to the source Linux server as user root.
Prerequisites
● You have obtained an AK/SK pair for your Huawei Cloud account.
– If you use an IAM user for migration, obtain an AK/SK pair by referring to
How Do I Obtain an AK/SK Pair for an IAM User?
– If you use an account for migration, obtain an AK/SK pair by referring to
How Do I Obtain an AK/SK Pair for a Huawei Cloud Account?
● You have confirmed that the source server OS is supported by SMS. Learn
more about supported Linux OSs.
Procedure
Step 1 Sign in to the SMS console.
Step 2 In the navigation pane, choose Agents. The Agents page is displayed.
Step 3 Select the Linux card, and in the Linux Agent area, click the 
  icon next to
Agent URL to copy the Agent download command. Run the command on the
source server to download the Agent installation package.
Server Migration Service
User Guide 2 Installing the Agent on the Source Server
Issue 33 (2026-08-05) Copyright © Huawei Cloud Computing Technologies Co., Ltd. 13

--- Page 18 ---
Step 4 Copy and run the commands to download the CMS and CRL files to the Linux
source server, then verify the integrity of the Agent installation file. For details, see
How Do I Verify the Integrity of the Agent Installation File?
Step 5 Decompress the SMS-Agent software package.
tar -zxvf SMS-Agent.tar.gz
Step 6 Switch to the SMS-Agent directory on the source server.
cd SMS-Agent
Step 7 Determine whether to use an HTTP/HTTPS proxy server for the migration. If your
source server cannot access Huawei Cloud over the Internet, you can use a proxy
server. You will need to configure the proxy server yourself. In a migration over a
private line or VPN, a proxy server is only used for registering the source server
with SMS. It is not used for data migration.
● If you do not need an HTTP/HTTPS proxy server, skip this step and go to the
next step.
● If you need to use an HTTP/HTTPS proxy, do as follows:
a. Run the following command to go to the config directory:
cd SMS-Agent/agent/config
b. Open and edit the auth.cfg file. Do not edit the auth.cfg file unless you
need to use an HTTP/HTTPS proxy.
Server Migration Service
User Guide 2 Installing the Agent on the Source Server
Issue 33 (2026-08-05) Copyright © Huawei Cloud Computing Technologies Co., Ltd. 14

--- Page 19 ---
vi auth.cfg
The values shown here are for reference only.
[proxy-config]
enable = true
proxy_addr = https://<your-proxy-address>.com
proxy_port = 3128
proxy_user = root
use_password = true
Configure the parameters according to the table below.
Table 2-4 Proxy parameter settings
Parameter Description
enable To use a proxy server, set enable to true.
proxy_addr Enter the IP address of the proxy server, not
that of the target server. The proxy is used
by the source server to access SMS. Replace
your-proxy-addr.com with the IP address of
your own proxy server. Configure the
protocol based on your proxy server. HTTPS
is recommended.
proxy_port Enter the proxy port opened on the proxy
server.
proxy_user Enter the proxy username if available, for
example, root. Otherwise, leave it blank.
use_password If the proxy server has a password, set this
parameter to true. Otherwise, set it to false.
 
c. Run the following command to save the auth.cfg file and exit:
:wq
Step 8 Start the SMS-Agent.
./startup.sh
Step 9 Read the displayed information carefully, enter y, and press Enter.
Figure 2-4 Entering y
Step 10 Enter the AK/SK pair for the Huawei Cloud account that you are migrating to and
the SMS domain name. You can obtain the SMS domain name on the Agents
page of the SMS console, as shown in Figure 2-6.
Figure 2-5 Entering the AK/SK pair
Server Migration Service
User Guide 2 Installing the Agent on the Source Server
Issue 33 (2026-08-05) Copyright © Huawei Cloud Computing Technologies Co., Ltd. 15

--- Page 20 ---
Figure 2-6 Obtaining the SMS domain name
If the EPS service has been enabled for your Huawei Cloud account, after you
entered the AK/SK pair, the Agent will list all enterprise projects your account is
allowed to access. You can select the enterprise project you would like to migrate
the source server to. This enables you to isolate permissions, resources, and
finance during the migration. For details, see Migrating a Server into an
Enterprise Project.
When the information shown in the figure below is displayed, the SMS-Agent has
been started up and will automatically start reporting source server information to
SMS. You can go to the Servers page on the SMS console to check the record of
the source server.
Figure 2-7 Agent running
----End
Troubleshooting
● SMS.6517 rsync Not Installed on the Source Server
● SMS.0202 AK/SK Authentication Failed. Ensure that the AK and SK Are
Correct
● Why Wasn't My Source Server Added to the SMS Console After I
Configured the Agent?
Uninstalling the SMS-Agent
After the migration is complete, you can uninstall the SMS-Agent from the source
server. For details, see Uninstalling the SMS-Agent from Linux.
Server Migration Service
User Guide 2 Installing the Agent on the Source Server
Issue 33 (2026-08-05) Copyright © Huawei Cloud Computing Technologies Co., Ltd. 16

--- Page 21 ---
3 Migration Management
3.1 Overview
SMS provides multiple features to help you manage migration tasks.
Table 3-1 Features for migration task management
Feature Description Notes
Configur
ing a
Target
Server
Before the migration, you need
to configure a target server to
receive the data migrated from
the source server, including the
system, application, and service
data.
When you configure the target
server, you need to specify the
network, migration method,
target server settings, disk and
partition settings, disk
encryption, and other migration
settings.
You can configure the target
server only when the following
conditions are met:
● The source server is
Connected to SMS.
● The migration is in the
Migration Feasibility Check
stage.
● The migration is in the
Pending target configuration
status.
Starting
a Full
Replicat
ion
A full replication copies all data
from the source server to the
target server with a single click.
● After the full replication starts,
do not restart the source
server or the SMS-Agent, or
the migration will fail.
● During the full replication, the
target server stays locked to
prevent any operations. After
the migration is complete, it
will be automatically unlocked.
Server Migration Service
User Guide 3 Migration Management
Issue 33 (2026-08-05) Copyright © Huawei Cloud Computing Technologies Co., Ltd. 17

--- Page 22 ---
Feature Description Notes
Synchro
nizing
Increme
ntal
Data
After the full replication is
complete, you can manually
trigger incremental
synchronization to transfer
newly added or modified data
from the source server to the
target server.
You can synchronize the
incremental data from a source
server only when the migration
status is Finished.
Setting
a
Migratio
n Rate
To avoid impacting source server
workloads during peak business
hours, you can configure time-
based bandwidth limits to
restrict migration traffic.
A migration rate limit must be an
integer from 0 to 1,000. The unit
is Mbit/s.
● If you set the rate limit to 0 or
leave it empty, the migration
speed is unrestricted and will
follow the actual network
speed between the source and
target servers.
● If you set the rate limit to V1,
and the actual network speed
between the source and target
servers is V2, the migration
rate will be limited to the
lower of V1 and V2.
Uploadi
ng
Migratio
n Logs
If an exception occurs,
uploading run logs to an OBS
bucket can provide technical
support with the context needed
to help you quickly identify and
resolve the issue.
● Only the Agent 25.1.0 or later
can upload migration logs. To
view the version of the Agent
you installed on a source
server, you can click the source
server name in the server list
on the SMS console. On the
displayed page, click the Task
Info tab. In the Source Info
area, view the Agent version.
● If a proxy server is used for the
migration, you need to select
an OBS bucket in the same
region as the proxy server, or
the logs cannot be uploaded.
Deleting
Resourc
es
After the migration is complete,
if incremental data
synchronization is no longer
needed, you can delete the
cutover and synchronization
snapshots generated during the
process to stop further billing.
Once these snapshots are deleted,
incremental data synchronization
will no longer be possible.
Confirm that no additional
synchronizations are required
before performing this action.
Server Migration Service
User Guide 3 Migration Management
Issue 33 (2026-08-05) Copyright © Huawei Cloud Computing Technologies Co., Ltd. 18

--- Page 23 ---
Feature Description Notes
Deleting
a
Migratio
n Task
After confirming that the
migration is complete and the
target server can run properly,
you can delete the migration
task and its configurations to
release resources.
Before doing so, you are advised
to delete migration-related
resources to avoid unnecessary
expenses.
● To migrate the source server
again after you delete the
migration task, you can restart
the SMS-Agent on the server
to re-register it.
● Deleting a server (or migration
task) record will not delete the
associated source or target
server.
 
3.2 Configuring a Target Server
Before the migration, you need to configure a target server. The target server is
used to receive the data migrated from the source server, including the system,
application, and service data.
When you configure the target server, you need to specify the network, migration
method, target server settings, disk and partition settings, disk encryption, and
other migration settings.
Prerequisites
● You have prepared the account, required permissions, source and target
servers, and network environment. For details, see Preparing for Migration.
● You have installed and started the Agent on the source server, and the source
server is displayed in the server list on the SMS console. The source server
meets the following requirements:
– It is Connected to SMS.
– The migration is in the Migration Feasibility Check stage.
– The migration is in the Pending target configuration status.
Constraints
Before setting the target server, read the constraints and limitations of SMS. For
details, see Server Requirements and Migration Constraints.
Procedure
Item Description
Configuring Basic
Settings
Select the region, port, and network type of the target
server.
Server Migration Service
User Guide 3 Migration Management
Issue 33 (2026-08-05) Copyright © Huawei Cloud Computing Technologies Co., Ltd. 19

--- Page 24 ---
Item Description
Configuring
Specifications
Configure the specifications of the target server based
on the specifications of the source server.
There are two methods for configuring target servers.
● Use existing: Select a Huawei Cloud ECS as the
target server.
CAUTION
To ensure that the target server can start properly after
the migration is complete, its disks will be formatted, and
its registry and network settings will be updated. You are
advised to back up data before the migration.
● Create new: SMS automatically purchases a target
server based on the configured specifications.
(Optional) Setting
the Resource Limits
Set network parameters, such as the traffic limit and
overspeed threshold. Note that some parameters are
supported only on Linux servers.
Starting a Migration
Drill
Migration drills help you fully assess the feasibility and
identify potential risks of a migration task beforehand.
Configuring
Migration Parameters
Set operations after migration, for example, choose
whether to enable incremental data synchronization
after full replication and whether to verify data
consistency.
Saving the Settings
and Starting the
Migration Task
Confirm the parameter settings, save the settings, and
start the migration.
 
Configuring Basic Settings
Step 1 Sign in to the SMS console.
Step 2 In the navigation pane, click Servers.
Step 3 In the server list, locate the source server to be migrated, and click Configure
Target in the Migration Stage/Status column or choose More > Configure
Target in the Operation column.
NO TE
If the source server record is not found in the server migration list, see Why Wasn't My
Source Server Added to the SMS Console After I Configured the Agent?
Step 4 On the Configure Basic Settings page, configure parameters by referring to Table
3-2.
Server Migration Service
User Guide 3 Migration Management
Issue 33 (2026-08-05) Copyright © Huawei Cloud Computing Technologies Co., Ltd. 20

--- Page 25 ---
Table 3-2 Parameter description
Parameter Sub-
Parameter
Description
Target Region - Select the region for the target server.
Server Migration Service
User Guide 3 Migration Management
Issue 33 (2026-08-05) Copyright © Huawei Cloud Computing Technologies Co., Ltd. 21

--- Page 26 ---
Parameter Sub-
Parameter
Description
Target Port - ● By default, ports 22, 8900, and 8899 are
enabled for Windows.
● For a Linux server, port 22 is enabled by
default for file-level migration, and ports
22 and 8900 are enabled by default for
block-level migration.
NOTE
Open ports are used for the following purposes:
● Port 22: The initialization port of the
transmission link. It is used to establish the
transmission channel and can be modified in
some regions.
● Port 8899: The control port for data
transmission. It is used to transmit task control
signals. It cannot be modified.
● Port 8900: The port for block data
transmission. It cannot be modified.
Pay attention to the following security notes
for migration ports:
During a migration, SMS uses the required
ports to establish a transmission channel
between the source server and the target
server. To reduce security risks during the
migration, SMS include the following built-in
security settings:
● Agent image: used only during the
migration and automatically uninstalled
after the migration.
● SSL login: Password-based SSH login is
disabled for the target server.Only
certificate- or key-based SSH login is
allowed.
● SSH port: The default is port 22, which
can be changed in some regions.
In the security group of the target ECS, allow
only the required migration ports (22, 8899,
and 8900), and allow access only from the IP
address of the source server. Do not enable
other unnecessary ports or set the source IP
address to 0.0.0.0/0.
Server Migration Service
User Guide 3 Migration Management
Issue 33 (2026-08-05) Copyright © Huawei Cloud Computing Technologies Co., Ltd. 22

--- Page 27 ---
Parameter Sub-
Parameter
Description
CAUTION
● Strictly comply with the requirements above;
otherwise the target ECS may be accessed by
unauthorized IP addresses over unnecessary
ports, increasing the risk of being scanned,
cracked, or attacked. You are responsible for
any security risks caused by incorrect security
group rules.
● Use the latest stable version of rsync if needed,
and complete security configurations according
to the official rsync security hardening guide.
You are responsible for any security risks
resulting from using an earlier version, a
version with known vulnerabilities, or a version
not configured in accordance with official
security requirements.
Network Type Public (Default) Migration over the Internet
requires that the target server has an EIP
bound.
Private A Direct Connect connection, VPN
connection, VPC peering connection, VPC
subnet, or Cloud Connect connection must
be provisioned. The private IP address of the
target server will be used for migration.
For details about the network scenarios and
solutions for migration over a private
network, see Setting Up an SMS Migration
Network Using VPN, Direct Connect, and
Cloud Connect.
IP Version IPv4 IPv4 is used for data migration by default.
IPv6 On a dual-stack network, IPv6 can be used
for migration. For details about migration
over IPv6, see Migrating Servers over an
IPv6 Network.
CAUTION
If IPv6 is selected, you can only select an existing
server as the target end, instead of creating one.
 
----End
Configuring Specifications
There are two methods for configuring target servers.
● Use existing: Select a server created on Huawei Cloud as the target server.
Server Migration Service
User Guide 3 Migration Management
Issue 33 (2026-08-05) Copyright © Huawei Cloud Computing Technologies Co., Ltd. 23

--- Page 28 ---
CA UTION
To ensure that the target server can start properly after the migration is
complete, its disks will be formatted, and its registry and network settings will
be updated. You are advised to back up data before the migration.
● Create new: SMS automatically purchases a target server based on the
configured specifications.
For details about the requirements on target servers, see Target Server
Requirements.
Selecting an Existing Server
In the list of existing servers, select one that meets the specifications requirements
displayed in the Recommended Target row. If no existing server meets the
requirements, click Elastic Cloud Server (ECS) above the list and purchase an ECS
based on the recommended specifications. For details, see Purchasing an ECS in
Custom Config Mode. You can select a pay-per-use or yearly/monthly ECS.
Figure 3-1 Select an existing target server
Creating a Server
If you select Create new, the system automatically recommends server
specifications, including the server name, AZ, VM specifications, disk information,
EIP, VPC, subnet, and security group. You can modify these settings as needed.
Figure 3-2 Modifying server configurations
Server Migration Service
User Guide 3 Migration Management
Issue 33 (2026-08-05) Copyright © Huawei Cloud Computing Technologies Co., Ltd. 24

--- Page 29 ---
● If you select Recommend for Server Template, the system automatically
creates the AZ, instance specifications, disk type, VPC, subnet, and security
group during the migration. You can adjust the settings.
NO TE
● If Create new is selected for VPC, the system automatically creates a VPC for the
target server based on the following rules:
● If the source server's IP address is 192.168. X.X, the system creates a VPC and a
subnet that both belong to network range 192.168.0.0/16.
● If the source server's IP address is 172.16. X.X, the system creates a VPC and a
subnet that both belong to network range 172.16.0.0/12.
● If the source server's IP address is 10. X.X.X, the system creates a VPC and a
subnet that both belong to network range 10.0.0.0/8.
● If Create new is selected for Security Group, the system automatically creates a
security group for the target server and allows traffic to the target server over
certain ports:
● Windows: ports 8899, 8900, and 22
● Linux: port 22 for file-level migration
● Linux: ports 8900 and 22 for block-level migration
● If you select Custom Template for Server Template, the system
automatically sets the AZ, instance specifications, disk type, VPC, subnet, and
security group based on the template. You can adjust the settings. For details
about how to create a custom template, see Creating a Server Template.
● Configure advanced disk settings.
– Data disks must be either VBD or SCSI. VBD is the default device type for
data disks. For details about disk device types, see Device Types.
– Data disks can be created as shared disks. For details about shared disks,
see Managing Shared EVS Disks.
– For target servers newly created by the system, system and data disks can
be encrypted. For details about shared disks, see Managing Shared EVS
Disks. To enable disk encryption, you need to create an agency to
authorize EVS to access KMS. After the authorization is successful, set
KMS Encryption to one of the following values:
▪ Select an existing key
Select a key from the drop-down list. You can select one of the
following keys:
Default keys: After the KMS access permissions have been granted
to EVS, the system automatically creates a default key and names it
evs/default.
Custom keys: You can choose an existing key or create one. For
details about how to create a key, see Creating a Key.
▪ Enter a key ID
Enter the ID of a key shared from another user. Ensure that the key is
in the target region. For details, see Creating a Grant.
Server Migration Service
User Guide 3 Migration Management
Issue 33 (2026-08-05) Copyright © Huawei Cloud Computing Technologies Co., Ltd. 25

--- Page 30 ---
NO TE
● Before the migration is complete, do not disable or delete the key used, or the
migration will fail.
● The encryption attribute of a disk cannot be modified after the disk is created.
● Keys can be shared with accounts, not IAM users.
● If KMS encryption is used, you will be billed for what you use beyond the free
quota given by KMS. For details, see DEW Billing Overview.
(Optional) Setting the Resource Limits
Set the parameters according to Table 3-3.
Table 3-3 Resource limit parameters
Parameter Description
CPU Limit These options are only available for Linux migrations. For
details, see How Do I Limit Resource Allocation for the
Agent in a Linux Migration?Memory Limit
Disk Throughput
Limit
Migration Rate Limit You can limit the migration rate based on the source
bandwidth and service requirements. If you do not want
to limit the migration rate, set this parameter to 0.
Traffic limiting is unavailable if:
● The migration uses an IPv6 network.
● Traffic Control (TC) is missing from the source server.
● The TC module is available, but the Class-Based
Queuing (CBQ) or Hierarchy Token Bucket (HTB)
module is missing.
Overrate Threshold
(%)
You can regulate how much the migration rate can
exceed the configured limit. If the migration rate exceeds
the threshold multiple consecutive times, the migration
task is automatically paused.
For example, if the migration rate limit is set to 10 Mbit/s
and the overrate threshold is set to 10%, the task is
automatically paused when the migration rate exceeds
11 Mbit/s (110% of the limit) multiple times
consecutively.
CAUTION
This option is only available for Linux migrations. It will not be
available or applied if:
● The migration uses an IPv6 network.
● Traffic Control (TC) is missing from the source server.
● The TC module is available, but the Class-Based Queuing
(CBQ) or Hierarchy Token Bucket (HTB) module is missing.
● The installed SMS-Agent is earlier than 24.9.0.
 
Server Migration Service
User Guide 3 Migration Management
Issue 33 (2026-08-05) Copyright © Huawei Cloud Computing Technologies Co., Ltd. 26

--- Page 31 ---
Starting a Migration Drill
Migration drills help you fully assess the feasibility and identify potential risks of a
migration task beforehand. The system verifies if security group ports are set
correctly, domains connect normally, and necessary permissions are available. If
issues are identified, the system offers remediations to minimize risks and
disruptions during migration.
After this function is enabled, the system automatically launches a migration drill
before starting the full replication. The entire migration drill takes 5 to 15 minutes,
and pay-per-use resources incur costs during this period. For details, see Billing. A
migration drill does not transmit source data, so the fee incurred in the drill is low.
You can review the drill results in the task details. For details, see Checking the
Migration Drill Status and Report.
Configuring Migration Parameters
Set the parameters according to Table 3-4.
NO TE
The parameters for Windows and Linux servers are different. Set their parameters
accordingly.
Table 3-4 Migration settings
Parameter Sub-
Parameter
Description
Start Target
Upon
Launch
No The target server will be stopped after the
migration is complete.
Yes The target server will be started after the migration
is complete.
Migration
Method
Linux
block-level
Migration and synchronization are performed by
block. This method is efficient, but the
compatibility is poor.
Linux File-
Level
Migration and synchronization are performed by
file. This method is inefficient, but the compatibility
is excellent. File-level migration is used by default
for Linux OSs.
Windows
Block-
Level
Migration and synchronization are performed by
block. Block-level migration is used by default and
cannot be changed.
Enable
Concurrency
Automatic The SMS-Agent automatically configures the
maximum number of migration processes allowed
based on source server conditions.
Server Migration Service
User Guide 3 Migration Management
Issue 33 (2026-08-05) Copyright © Huawei Cloud Computing Technologies Co., Ltd. 27

--- Page 32 ---
Parameter Sub-
Parameter
Description
Manual You can specify the maximum number of processes
that the SMS-Agent can start concurrently for
migration and synchronization tasks, respectively.
This option is only available for Linux file-level
migrations. For more information, see How Do I
Set the Number of Concurrent Processes for a
Linux File-Level Migration?
Enable
Continuous
Synchronizat
ion
- Disabled: After full replication is complete, the
system automatically starts the target server
without synchronizing incremental data from the
source server. You need to choose More >
Synchronize in the Operation column to
synchronize incremental data to the target server.
Enabled: After full replication is complete, the
system automatically starts to synchronize
incremental data from the source end to the target
end periodically. In this case, the target server is
not started and cannot be operated. To exit this
phase, click Start Target in the Migration Stage/
Status column of the migration task to start the
target server.
Verify Data
Consistency
- Disabled: Data consistency is not verified after full
replication is complete. You can choose whether to
perform data consistency check during incremental
synchronization.
Server Migration Service
User Guide 3 Migration Management
Issue 33 (2026-08-05) Copyright © Huawei Cloud Computing Technologies Co., Ltd. 28

--- Page 33 ---
Parameter Sub-
Parameter
Description
Enabled: Data consistency is automatically verified
after full replication is performed. This is a quick
verification, and only the file size and last
modification time will be verified. You can modify
the verification policy when you launch an
incremental synchronization. Note that consistency
verification cannot be performed for servers with
Btrfs file systems. The following describes the
parameters for data consistency verification:
● Enable Hash Verification: If this option is
enabled, the system will generate and compare
hash values for each file to be verified. Hash
verification is recommended when individual
files are large and important. Enabling this
option will increase CPU and disk I/O overheads
for the source server and extend the verification
time.
CAUTION
● Hash values cannot be calculated for files in use,
so these files will be skipped during the
verification.
● Enabling this option requires you to specify the
verification scope, and only files in the specified
scope will be verified.
● Verification Scope
– Under Exclude paths, enter the paths you
want to exclude from the verification. A
maximum of 30 paths can be entered. Use
commas (,) to separate the paths. For
example, /root/data,/var. Leaving it empty
will initiate a full verification.
– Under Include paths, enter the paths you
want to verify.
Server Migration Service
User Guide 3 Migration Management
Issue 33 (2026-08-05) Copyright © Huawei Cloud Computing Technologies Co., Ltd. 29

--- Page 34 ---
Parameter Sub-
Parameter
Description
CAUTION
● If the entered paths are incorrect or empty, 0 will be
displayed for them in the verification results.
● The more data you need to verify, the longer the
verification will take. It is wise to narrow the
verification scope to only key paths.
● The following paths will be excluded from consistency
verification by default:
● Linux: /bin, /boot, /dev, /home, /etc, /lib, /
media, /proc, /sbin, /selinux, /sys, /usr, /var, /run,
and /tmp
● Windows: top-level directories of partitions, for
example, C:\ and O:\
If you need to include any of the preceding excluded
paths in the verification, refer to Modifying the
Default Excluded Paths.
Resize Disks
and
Partitions
- Disabled: The number of disks and partition size of
the target server are the same as those of the
source server.
Enabled: You can adjust the number of target disks
and partition size. For details, see Resizing Disks
and Partitions.
Transit IP
Address
- This parameter is available only for private line
migration. It is used to set the transit IP address of
the target server. For details about how to
configure the network in this scenario, see For a
Scenario Where the Source Server Has No
Internet Access and Cannot Communicate with
the Target Server.
 
Saving the Settings and Starting the Migration Task
After configuring the target server settings, review them in the summary panel
and choose whether to start the migration now or later.
● Saving the settings and starting the task immediately
a. Click Save and Start.
b. In the displayed dialog box, read the migration conditions and click OK.
Return to the migration server list. The task status becomes Running,
indicating that the migration has started.
● Saving the settings and starting the task later
a. After you confirm that the settings are correct, click Save.
b. In the displayed dialog box, read the migration conditions and click OK.
Return to the migration server list. The task status becomes To be
started, indicating that the migration is not started.
Server Migration Service
User Guide 3 Migration Management
Issue 33 (2026-08-05) Copyright © Huawei Cloud Computing Technologies Co., Ltd. 30

--- Page 35 ---
To start the migration, click Start in the Migration Stage/Status column.
Resizing Disks and Partitions
You can choose whether to migrate specific source partitions and then resize the
paired target partitions as needed.
Resizing Disks and Partitions on Windows
The restrictions on resizing Windows disks and partitions are as follows:
● The system and boot partitions on Windows cannot be resized.
● For a Windows server, you can upsize partitions, but you cannot downsize
them.
Step 1 In the Migration Settings area, enable Resize Disks and Partitions and click
Resize Disks and Partitions.
Step 2 Click Resize Disk and adjust the size of each disk as required. As shown in
Resizing disks and partitions on Windows, you can view the resized disks at the
bottom of the window.
● If the total partition size after resizing is larger than the disk size, you need to
expand the disk capacity to fit the partition size.
● If the total partition size after resizing is much smaller than the disk size, you
can downsize the disk.
Figure 3-3 Resizing disks and partitions on Windows
Step 3 Click Next: Confirm. Confirm the configurations and click OK.
CA UTION
Once disks and partitions are resized, this function cannot be undone directly. To
restore your original settings, locate the resizing task and choose More > Delete
in the Operation column, and then restart the Agent on the source server to
reconfigure your target server parameters.
----End
Server Migration Service
User Guide 3 Migration Management
Issue 33 (2026-08-05) Copyright © Huawei Cloud Computing Technologies Co., Ltd. 31

--- Page 36 ---
Resizing Disks and Partitions on Linux
The restrictions on resizing Linux disks and partitions are as follows:
● For a Linux server using LVM, you can choose whether to migrate specific
physical or logical volumes and resize the paired target volumes.
● Partition resizing is not available for Btrfs partitions on Linux.
● On a Linux system, the swap partition is migrated by default and cannot be
changed.
● You can choose to migrate all or none volume groups by using the Migrate
All Volume Groups option.
● If you choose to migrate none of the logical volumes in a volume group, their
physical volumes will not be migrated by default.
● In a Linux block-level migration, you can upsize partitions, but you cannot
downsize them.
● In a Linux file-level migration, you can upsize or downsize partitions. When
you downsize a partition, the new partition size must be at least 1 GB larger
than the used partition space. If the current size does not meet this condition,
downsizing is not possible. For details, see What Are the Rules for Resizing
Volume Groups, Disks, and Partitions?
Step 1 In the Migration Settings area, enable Resize Disks and Partitions and click
Resize Disks and Partitions.
Step 2 Configure volume groups.
● If the source server uses LVM, you can resize logical and physical volumes.
● If the source server does not use LVM, skip this step.
Figure 3-4 Configuring volume groups
Step 3 Click Next: Configure Disks.
Step 4 Click Resize Disk and adjust the size of each disk as required. As shown in
Resizing disks and partitions on Linux, you can view the resized disks at the
bottom of the window.
Server Migration Service
User Guide 3 Migration Management
Issue 33 (2026-08-05) Copyright © Huawei Cloud Computing Technologies Co., Ltd. 32

--- Page 37 ---
● If the total partition size after resizing is larger than the disk size, you need to
expand the disk capacity to fit the partition size.
● If the total partition size after resizing is much smaller than the disk size, you
can downsize the disk.
Figure 3-5 Resizing disks and partitions on Linux
Step 5 Click Next: Confirm. Confirm the configurations and click OK.
CA UTION
Once disks and partitions are resized, this function cannot be undone directly. To
restore your original settings, locate the resizing task and choose More > Delete
in the Operation column, and then restart the Agent on the source server to
reconfigure your target server parameters.
----End
Checking the Migration Drill Status and Report
If Migration Drill is enabled when you configure a migration task, you can check
the migration drill status and report.
Step 1 In the server list, click the name of the source server to expand the migration task
details.
Step 2 On the Task Progress tab, check the status and progress of the migration drill.
Server Migration Service
User Guide 3 Migration Management
Issue 33 (2026-08-05) Copyright © Huawei Cloud Computing Technologies Co., Ltd. 33

--- Page 38 ---
Step 3 In the upper part of the task details page, click View Report next to Drill Status.
In the report displayed on the right, check the drill details, check items, and check
results.
----End
Helpful Links
If an error occurs during the configuration of the target server, see Target Server
Configuration for troubleshooting.
3.3 Starting a Full Replication
A full replication replicates all data from the source server to the target server. The
replication speed depends on the outbound bandwidth of the source server or the
inbound bandwidth of the target server, whichever is smaller.
Constraints
● Before a migration is complete, do not perform operations on the OS or disks
of the target server, including but not limited to changing or reinstalling the
OS.
● Do not change the billing mode of the target server or its disks to Yearly/
Monthly during a migration.
● Make sure you have backed up any data on the target server that you need to
save and ensure that the disks can be formatted. Disks on the target server
will be formatted and re-partitioned based on the source disk settings during
the migration.
● During the migration of a Windows source server, do not restart the source
server. The restart will disconnect the source server from the SMS console. To
Server Migration Service
User Guide 3 Migration Management
Issue 33 (2026-08-05) Copyright © Huawei Cloud Computing Technologies Co., Ltd. 34

--- Page 39 ---
retry the migration, you need to delete the migration task and create a new
one.
● Do not restart the SMS-Agent during a Windows migration or a Linux block-
level migration.
● You are advised not to start the SMS-Agent during a Linux file-level migration
unless necessary, even though resumable data transfer is supported.
● During the migration, a temporary pay-per-use disk is created and attached to
the target server to ensure that the migration runs normally. Once the
migration is complete, the disk is automatically detached and deleted. If you
manually delete the migration task before it completes, you need to manually
delete the temporary disk to avoid extra expenses.
● If an error occurs during the migration, you are advised to provide migration
logs to technical support engineers so that the fault can be resolved quickly.
For details about how to get migration logs, see Where Can I Find the Agent
Run Logs?
Prerequisites
● The target server has been configured. For details, see Configuring a Target
Server.
● The source server status meets the following requirements: Migration Stage
is Full Replication, and Migration Status is Ready.
Starting Full Replication
Step 1 Sign in to the SMS console.
Step 2 In the navigation pane, click Servers.
Step 3 In the server list, locate the server to be migrated and start the migration in either
of the following ways:
● Click Start in the Migration Stage/Status or Operation column. In the
displayed Start Migration dialog box, click OK to start full replication.
● Select the source server and click Start above the server list. In the displayed
Start Migration dialog box, click OK to start full replication.
Figure 3-6 Starting a full replication
NO TE
During the full replication, the target server stays locked to prevent any operations.
After the migration is complete, it will be automatically unlocked.
Step 4 In the server list, click the name of the source server to view the migration
progress.
Step 5 Wait for the full replication to complete.
Server Migration Service
User Guide 3 Migration Management
Issue 33 (2026-08-05) Copyright © Huawei Cloud Computing Technologies Co., Ltd. 35

--- Page 40 ---
● If you set Enable Continuous Synchronization to No when you defined the
migration settings, after the full replication is complete, the system puts the
migration to a Target Launch stage and launches the target server to
complete the migration automatically.
● If you set Enable Continuous Synchronization to Yes when you defined the
migration settings, after the full replication is complete, the migration will
move on to a Continuous sync status, and any new or modified data will be
automatically synchronized from the source server to the target server. You
will need to manually launch the target server to complete the migration. For
details, see Launching a Target Server.
----End
Related Operations
● After the migration and service cutover are complete, you need to adjust the
configurations of the target server based on service requirements. For details,
see What Configuration Items Need to Be Manually Modified After a
Server Is Migrated?
● After the migration is complete, if you confirm that no additional incremental
synchronizations are required, you can delete the snapshots generated for
cutover and synchronization during the migration. For details, see Deleting
Resources. If you do not delete the resources, the system will retain the
snapshots generated for cutover and synchronization for an extended period
of time. The retained snapshots will continue to incur charges in certain
regions.
3.4 Synchronizing Incremental Data
After the target server is launched, if there are data changes on your source server,
you can synchronize the incremental data from the source server to the target
server.
The data changes on the target server will be overwritten by the data
synchronized from the source server. For details, see Will an Incremental
Synchronization Overwrite Existing Data on a Launched Target Server?
Constraints
● You can synchronize the incremental data from a source server only when the
migration status is Finished.
● During a Linux file-level migration, if the source server has a large number of
files in a single partition and has limited CPU and memory resources (for
example, 1 vCPU and 1 GB memory), rsync may fail to perform incremental
synchronization due to insufficient resources. In this case, you are advised to
perform only the initial full migration and avoid performing incremental
synchronization.
● After the full migration of a Linux server, some parameter settings in the
directories below on the target server are modified to make the target server
compatible with Huawei Cloud and ensure that the target server can start
properly. During incremental synchronization, data in these directories is not
synchronized by default to prevent parameter settings in these directories on
the target server from being overwritten or modified.
Server Migration Service
User Guide 3 Migration Management
Issue 33 (2026-08-05) Copyright © Huawei Cloud Computing Technologies Co., Ltd. 36

--- Page 41 ---
/proc/*,
/sys/*,
/lost+found/*,
/tmp/_MEI*,
/var/lib/ntp/proc/*,
/
/etc/fstab,
/etc/X11/*,
/root/initrd_bak/*,
/lib/modules/*,
/boot/grub2/x86_64-efi/*,
/boot/grub2/i386-pc/*
Synchronizing Incremental Data
Step 1 Sign in to the SMS console.
Step 2 In the navigation pane, click Servers.
Step 3 In the server list, locate the source server you want to synchronize, and click Sync
above the list, or choose More > Sync in the Operation column.
Step 4 In the Synchronize Incremental Datadialog box, carefully read the tips, enable
Verify Data Consistency if needed, and click OK. For details about this option, see
How Do I Verify Data Consistency Between the Source and Target Servers?
Step 5 Then click OK. Wait until the task status changes to Completed, which indicates
that the incremental data has been synchronized.
If data synchronization is no longer required, you can delete the cutover snapshots
and synchronization snapshots generated during the migration. For details, see
Deleting Resources.
----End
Troubleshooting
Common synchronization issues and their solutions:
● SMS.0806 Failed to Synchronize Partition to Target Server
Server Migration Service
User Guide 3 Migration Management
Issue 33 (2026-08-05) Copyright © Huawei Cloud Computing Technologies Co., Ltd. 37

--- Page 42 ---
● SMS.1414 Migration Module Stopped Abnormally and Cannot
Synchronize Data
3.5 Setting a Migration Rate
A large amount of traffic and bandwidth will be consumed during migration. To
avoid impacting source server workloads during peak business hours, you can
configure time-based bandwidth limits to restrict migration traffic.
Constraints
● The source server is Connected to SMS.
● The migration rate limit must be an integer from 0 to 1,000.
● If you set the rate limit to 0 or leave it empty, the migration speed is
unrestricted and will follow the actual network speed between the source and
target servers.
● The migration rate is bottlenecked by the migration rate limit you configure
or the actual network speed, whichever is smaller.
Requirements for Migration Speed Limiting on Linux
To limit the migration speed for a Linux source server, the tc command and cbq or
htb kernel module must be installed on the source server.
1. To check whether the tc command is installed, run the following command on
the Linux terminal. If the system returns the tc function list, the tc command
has been installed.
# tc
2. To check whether the cbq module is installed, run the following command on
the Linux terminal. If the system returns the related information, the cbq
module is loaded.
 lsmod | grep sch_cbq
3. If the cbq module does not exist, check the htb module. Run the following
command on the Linux terminal. If the system returns the related
information, the htb module is loaded.
lsmod | grep sch_htb
Setting a Migration Rate
Step 1 Sign in to the SMS console.
Step 2 In the navigation pane, click Servers.
Step 3 Locate the server for which you want to set the migration rate, and choose More
> Set Migration Rate in the Operation column.
Step 4 In the Set Migration Rate dialog box, set a period and rate limit.
Server Migration Service
User Guide 3 Migration Management
Issue 33 (2026-08-05) Copyright © Huawei Cloud Computing Technologies Co., Ltd. 38

--- Page 43 ---
Figure 3-7 Setting migration rate limits
Step 5 Click OK. If Setting migration rate... is displayed, the setting is complete. Check
whether the rate limit takes effect in the specified period.
----End
Helpful Links
For FAQs about the migration rate and duration, see:
● How Is the Migration Rate Displayed on the SMS Console Calculated?
● What Factors Affect the Migration Speed?
● Why Is the Linux Block-Level Migration Very Slow?
3.6 Uploading Migration Logs
SMS allows you to upload migration logs to a specified OBS bucket for quick
troubleshooting. You can repeatedly upload logs after the full replication is
started.
Constraints
● Only the Agent 25.1.0 or later can upload migration logs. To view the version
of the Agent you installed on a source server, you can click the source server
name in the server list on the SMS console. On the displayed page, click the
Task Info tab. In the Source Info area, view the Agent version.
● If a proxy server is used for the migration, you need to select an OBS bucket
in the same region as the proxy server, or the logs cannot be uploaded.
Important Notes
You will be billed for storing logs in OBS.
Server Migration Service
User Guide 3 Migration Management
Issue 33 (2026-08-05) Copyright © Huawei Cloud Computing Technologies Co., Ltd. 39

--- Page 44 ---
Prerequisites
You have created an OBS bucket before uploading migration logs.
Uploading Migration Logs
Step 1 Sign in to the SMS console.
Step 2 In the navigation pane, click Servers.
Step 3 Locate your server and click Upload in the Log Upload column.
Figure 3-8 Uploading logs
Step 4 In the displayed Upload Logs dialog box, select an OBS bucket for storing the
uploaded logs and click OK. Then logs will be uploaded, and Uploading will
appear in the Log Upload column.
Figure 3-9 Selecting an OBS bucket
NO TE
The log upload status can be Not ready, Ready, Uploading, Upload succeeded, or Upload
failed.
Step 5 Check whether Upload succeeded appears. If it does, the migration logs have
been successfully uploaded. After migration logs are uploaded, move the cursor to
Upload succeeded to check the name of the OBS bucket where the logs are
stored and the sharable URL.
Figure 3-10 Logs uploaded
Server Migration Service
User Guide 3 Migration Management
Issue 33 (2026-08-05) Copyright © Huawei Cloud Computing Technologies Co., Ltd. 40

--- Page 45 ---
Step 6 (Optional) Click 
  next to Share URL, and copy and paste the access URL to a
browser to check the logs.
----End
3.7 Deleting Resources
After the migration is complete, if incremental data synchronization is no longer
needed, you can delete the cutover and synchronization snapshots generated
during the process to stop further billing.
CA UTION
Once these snapshots are deleted, incremental data synchronization will no longer
be possible. Confirm that no additional synchronizations are required before
performing this action.
Deleting Resources
Step 1 Sign in to the SMS console.
Step 2 In the navigation pane, click Servers.
Step 3 Select a server whose task status is Completed and for which incremental
synchronization is no longer required. Click Delete Resources in the Migration
Stage/Status column.
Figure 3-11 Deleting resources
Step 4 In the displayed Delete Resources dialog box, enter DELETE in the text box or
click Auto Enter and then click OK.
Figure 3-12 Confirm the deletion
Server Migration Service
User Guide 3 Migration Management
Issue 33 (2026-08-05) Copyright © Huawei Cloud Computing Technologies Co., Ltd. 41

--- Page 46 ---
Step 5 After the deletion is complete, go to the EVS console to check the deletion results.
If the EVS snapshots fail to be deleted, manually delete them on the EVS console.
----End
Helpful Links
● Billing for EVS Snapshots
● What Are the Snapshots of a Target Server Used for?
● View the List of Snapshots
3.8 Deleting a Migration Task
Once the migration is complete, the target server runs properly, and incremental
synchronization is no longer required, you can delete the migration task and its
configurations to clean up your console.
Before deleting the task, you are advised to delete migration-related resources
to avoid unnecessary expenses.
CA UTION
Deleting a server migration record only deletes the record registered with SMS. It
does not delete the source or target server. To register the source server again,
restart the SMS-Agent on the source server.
Deleting a Task
Step 1 Sign in to the SMS console.
Step 2 In the navigation pane, click Servers.
Step 3 Locate the migration record you want to delete, and choose More > Delete in the
Operation column.
You can also select the record and choose More > Delete in the upper left corner
of the server list.
Step 4 Read the precautions carefully in the Delete Server dialog box. After confirming
the deletion, enter DELETE in the text box and click OK.
If the server record disappears from the server list, the deletion is successful. After
the deletion is complete, go to the EVS console to check whether the temporary
disk and synchronization snapshots generated during the migration are also
deleted. If the temporary resources fail to be deleted, manually delete them.
----End
Server Migration Service
User Guide 3 Migration Management
Issue 33 (2026-08-05) Copyright © Huawei Cloud Computing Technologies Co., Ltd. 42

--- Page 47 ---
4 Target Server Management
4.1 Overview
SMS provides multiple features to help you manage target servers.
Table 4-1 Features for target server management
Feature Description Notes
Cloning
a Target
Server
To verify whether your target
server can run properly
before launching it, you can
clone it as a new ECS in the
continuous synchronization
stage for service pre-
verification.
The cloned server must be in the
same AZ as the target server but
can be in a different VPC.
Launchin
g a
Target
Server
To stop continuous
synchronization of
incremental data from the
source server to the target
server, you can manually
launch the target server to
complete the migration.
Once the target server is
launched, the system
terminates continuous
synchronization of
incremental data.
To synchronize newly generated
incremental data, you can click Sync
in the Operation column.
Server Migration Service
User Guide 4 Target Server Management
Issue 33 (2026-08-05) Copyright © Huawei Cloud Computing Technologies Co., Ltd. 43

--- Page 48 ---
Feature Description Notes
Viewing
Server
Details
To review key metrics such as
the migration rate, amount
of migrated data, and
migration progress, you can
visit the server details page.
This page also displays the
source and target server
information, migration
status, and details of any
errors that occurred.
The source and target server
information is collected by SMS only
for data migration. To learn what
source server information is
collected by SMS, see What
Information Does SMS Collect
About Source Servers?
Deleting
the
Target
Server
Configur
ation
To update the target server
or migration settings, you
can delete the target server
configuration from the task.
Then you can re-configure
the target server.
After the target server configuration
is deleted from a migration task,
incremental data synchronization
will no longer be possible. If you
reset the target server and migrate
data again, all data on the source
server will be migrated again,
overwriting the existing data on the
target server.
Deleting
a Server
Clone
If the ECS cloned from the
target server has been tested,
you can delete the ECS to
release resources.
After you delete the ECS on the SMS
console, you can check whether the
deletion is successful on the ECS
console.
 
4.2 (Optional) Cloning a Target Server
Before launching a target server, you can clone the target server for service
testing, and only launch the target server after tests confirm there are no issues.
Constraints
The server clone must be in the same AZ as the target server, but can be in a
different VPC.
Prerequisites
The migration task is in the Continuous sync stage.
Cloning a Target Server
Step 1 Sign in to the SMS console.
Step 2 In the navigation pane, click Servers.
Step 3 Locate the target server you want to clone, choose More > Manage Target >
Clone Target in the Operation column.
Step 4 Set the parameters and click Clone Target.
Server Migration Service
User Guide 4 Target Server Management
Issue 33 (2026-08-05) Copyright © Huawei Cloud Computing Technologies Co., Ltd. 44

--- Page 49 ---
● If you select Recommended for Server Template, the system automatically
sets VPC, Subnet, Security Group, and parameters in Advanced Settings
based on the current target server configuration. You can modify these
parameters.
● If you select an existing template for Server Template, parameters VPC,
Subnet, Security Group, and those in Advanced Settings are determined by
the template. You can modify these parameters.
----End
4.3 Launching a Target Server
If you set Enable Continuous Synchronization to Yes when configuring the
migration settings, you need to manually launch the target server after the full
replication is complete. If you set Enable Continuous Synchronization to No, skip
this section as the system will automatically launch the target server after the full
replication is complete.
You can launch the target server when the migration is in the Continuous sync
status. Then continuous synchronization will be interrupted. After the target server
is launched, you can start an incremental synchronization by clicking Sync in the
Operation column.
Before launching a target server, you can clone the target server for service
testing, and only launch the target server after tests confirm there are no issues.
NO TE
The server clone must be in the same AZ as the target server, but can be in a different VPC.
Launching a Target Server
Step 1 Sign in to the SMS console.
Step 2 In the navigation pane, click Servers.
Step 3 Locate the target server you want to launch, and click Launch Target in the
Migration Stage/Status column.
Alternatively, select the server that has been replicated and continuously
synchronized, and click Launch Target above the server list.
Figure 4-1 Launch Target
Step 4 In the displayed Launch Target window, click OK.
If Finished appears in the Migration Stage/Status column, the target server has
been launched and the migration is complete.
Server Migration Service
User Guide 4 Target Server Management
Issue 33 (2026-08-05) Copyright © Huawei Cloud Computing Technologies Co., Ltd. 45

--- Page 50 ---
Figure 4-2 Completed migration
Step 5 Click the server name in the Target column to review the server details and status.
----End
4.4 Checking Server Details
After the Agent is installed and started on a source server, it automatically reports
the source server information to SMS. The information is used for migration only.
To learn what source server information is collected by SMS, see What
Information Does SMS Collect About Source Servers? You can sign in to the
SMS console to view the server information at any time. You can see source server
details, target server configurations, migration status, and error messages if any.
Checking Server Details
Step 1 Sign in to the SMS console.
Step 2 In the navigation pane, click Servers.
Step 3 In the server list, click the server name. The task details show up on the right.
You can also move the cursor to the migration stage and click View Details in the
displayed window. The task details show up on the right.
Step 4 Click the Source Info tab, and you can check the source server details, including
the basic information, migration check results, disk and partition information, and
NIC information.
Server Migration Service
User Guide 4 Target Server Management
Issue 33 (2026-08-05) Copyright © Huawei Cloud Computing Technologies Co., Ltd. 46

--- Page 51 ---
Figure 4-3 Checking server details
----End
4.5 Deleting the Target Server Configuration
If the target server configuration in a migration task is incorrect or needs to be
updated, you can delete the configuration and reconfigure the target server.
CA UTION
● After the configuration of the target server is deleted, completed migration
tasks and snapshots will be deleted. All data needs to be migrated again.
● After the target server configuration is deleted, the migration task remains in
the list, but the target server settings will be gone. Incremental synchronization
will no longer be possible. You can reconfigure the target server and perform a
full data migration from the source server again.
● Deleting the target server configuration sometimes cannot delete the
temporary SMS disks. You need to manually delete them. For details, see How
Do I Manually Detach the Temporary System Disk from My Target Server
and Re-attach the Original System Disk?
Deleting the Target Server Configuration
Step 1 Sign in to the SMS console.
Step 2 In the navigation pane, click Servers.
Step 3 Locate the server for which you want to delete the target server configuration,
and choose More > Delete Target Configuration in the Operation column.
Alternatively, select the server for which you want to delete the target server
configuration, and choose More > Delete Target Configuration above the server
list.
Server Migration Service
User Guide 4 Target Server Management
Issue 33 (2026-08-05) Copyright © Huawei Cloud Computing Technologies Co., Ltd. 47

--- Page 52 ---
Step 4 Read the precautions carefully in the Delete Target Configuration dialog box.
After confirming the deletion, enter DELETE in the text box and click OK.
In the server list, if the task status changes to Pending target configuration, the
target configuration is deleted successfully.
----End
4.6 (Optional) Deleting a Server Clone
You can delete a server clone when it is no longer needed or the service tests are
complete.
Deleting a Clone Server
Step 1 Sign in to the SMS console.
Step 2 In the navigation pane, click Servers.
Step 3 Locate the server for which you want to delete the clone, and choose More >
Manage Target > Delete Clone in the Operation column.
Step 4 In the Delete Clone dialog box, click OK. After deleting the server clone, verify the
deletion on the ECS console. The deletion is successful when the server clone no
longer appears in the ECS list.
----End
Server Migration Service
User Guide 4 Target Server Management
Issue 33 (2026-08-05) Copyright © Huawei Cloud Computing Technologies Co., Ltd. 48

--- Page 53 ---
5 Template Management
5.1 Overview
You can create two types of templates to streamline migration and target server
configuration.
Table 5-1 Templates
Template
Type
Description Operation
Migration
templates
You can create migration templates
to streamline migration and target
server configuration. The template
contains parameters such as
Network Type, Migration Rate
Limit, Enable Continuous
Synchronization, and Region/
Project.
You can modify your migration
templates at any time.
● Creating a Migration
Template
● Modifying a
Migration Template
● Deleting a Migration
Template
Server
templates
You can create a server template to
define the environment settings for
servers, such as VPC, subnet, and
security group settings.
You can modify your server
templates at any time.
● Creating a Server
Template
● Modifying a Server
Template
● Deleting a Server
Template
 
5.2 Managing a Migration Template
A migration template defines the settings for Network, Migration Rate Limit,
Enable Continuous Synchronization, Region/Project, and other migration
Server Migration Service
User Guide 5 Template Management
Issue 33 (2026-08-05) Copyright © Huawei Cloud Computing Technologies Co., Ltd. 49

--- Page 54 ---
parameters. When migrating multiple servers, you can select a template to
automatically fill in parameters, improving migration efficiency.
Templates can be modified as required. Unnecessary templates can also be
deleted. For details, see:
● Creating a Migration Template
● Modifying a Migration Template
● Deleting a Migration Template
Constraints
Custom migration parameter templates are only available on the migration target
configuration page in the legacy console.
Creating a Migration Template
Step 1 Sign in to the SMS console.
Step 2 In the navigation pane, choose Templates.
Step 3 In the upper left corner of the Migration Templates area, click Create Migration
Template.
Figure 5-1 Creating a migration template
Step 4 Set Name and Description and click OK.
Step 5 In the template list on the left of the Migration Templates area, click the created
template and click Parameter Settings to configure the template, as shown in
Figure 5-2.
Figure 5-2 Parameter settings
Table 5-2 describes the parameters.
Server Migration Service
User Guide 5 Template Management
Issue 33 (2026-08-05) Copyright © Huawei Cloud Computing Technologies Co., Ltd. 50

--- Page 55 ---
Table 5-2 Parameters
Parameter Option Description
Name - User-defined
Description - User-defined
Region/Project - Select the target region
and project you want to
migrate to.
Migration Method Block-level ● Migration and
synchronization are
performed by block.
● For Windows servers,
SMS only supports
block-level migration.
File-level Migration and
synchronization are
performed by file. This
method is inefficient, but
the compatibility is
excellent.
Network Public Migration over the
Internet requires that the
target server has an EIP
bound.
Public is the default
value.
Private You need to create a
Direct Connect or VPN
connection between the
source and the VPC
subnet you are migrating
to.
If the source and target
servers are in the same
VPC, select Private.
Migration Rate Limit - You can limit the
migration rate based on
the source bandwidth
and service
requirements. If you do
not want to limit the
migration rate, set this
parameter to 0.
Server Migration Service
User Guide 5 Template Management
Issue 33 (2026-08-05) Copyright © Huawei Cloud Computing Technologies Co., Ltd. 51

--- Page 56 ---
Parameter Option Description
Target Server Use existing When you apply this
template to a source
server migration, you can
select an existing server
as the target server. The
chosen server must meet
at least the system-
recommended
specifications.
Create new When you apply this
template to a source
server migration, you
need to configure
environment settings for
the target server, such as
VPC, subnet, and security
group.
Server Migration Service
User Guide 5 Template Management
Issue 33 (2026-08-05) Copyright © Huawei Cloud Computing Technologies Co., Ltd. 52

--- Page 57 ---
Parameter Option Description
Enable Continuous
Synchronization
- ● If you do not enable
this option, after the
full replication is
complete, SMS will
automatically launch
the target server
without synchronizing
incremental data. To
synchronize
incremental data, you
will need to click Sync
in the Operation
column.
● If you enable this
option, after the full
replication is
complete, the
migration will enter
the continuous
synchronization stage.
During this stage,
incremental data will
be periodically
synchronized from the
source server to the
target server, and you
will be unable to use
the target server since
it has not been
launched yet. To finish
this stage, you will
need to click Launch
Target in the
Operation column.
Start Target Upon
Launch
- ● If you enable this
option, the target
server will be started
after the migration is
complete.
● If you do not enable
this option, the target
server will be stopped
after the migration is
complete.
Server Migration Service
User Guide 5 Template Management
Issue 33 (2026-08-05) Copyright © Huawei Cloud Computing Technologies Co., Ltd. 53

--- Page 58 ---
Parameter Option Description
Measure Network
Performance
- ● If you enable this
option, before the full
migration starts, the
system will measure
the packet loss rate,
network jitter,
network latency,
bandwidth, memory
usage, and CPU usage
for the source server.
For details, see How
Do I Measure the
Network
Performance Before
the Migration?
● If you do not enable
this option, network
performance will not
be measured.
 
Step 6 Click OK.
Step 7 (Optional) Click the name of the created template, and click Set as Default
Template to set it as the default template, as shown in Figure 5-3.
Figure 5-3 Set as Default Template
----End
Modifying a Migration Template
Step 1 Sign in to the SMS console.
Step 2 In the navigation pane, choose Templates.
Step 3 In the template list on the left of the Migration Templates area, click the name
of the template to be modified and click Parameter Settings, as shown in Figure
5-4.
Server Migration Service
User Guide 5 Template Management
Issue 33 (2026-08-05) Copyright © Huawei Cloud Computing Technologies Co., Ltd. 54

--- Page 59 ---
Figure 5-4 Modifying template parameters
Step 4 Modify the template settings and click OK.
----End
Deleting a Migration Template
Step 1 Sign in to the SMS console.
Step 2 In the navigation pane, choose Templates.
Step 3 In the Migration Templates area, on the left, click 
  next to the name of the
template you want to delete, as shown in Figure 5-5.
Figure 5-5 Deleting a migration template
Step 4 In the displayed Delete Migration Template dialog box, click OK.
----End
5.3 Managing a Server Template
A server template defines the environment settings for servers, such as VPC,
subnet, and security group settings. When migrating multiple servers, you can
select a template to automatically fill in parameters, improving migration
efficiency.
Templates can be modified as required. Unnecessary templates can also be
deleted. For details, see:
● Creating a Server Template
● Modifying a Server Template
● Deleting a Server Template
Server Migration Service
User Guide 5 Template Management
Issue 33 (2026-08-05) Copyright © Huawei Cloud Computing Technologies Co., Ltd. 55

--- Page 60 ---
Creating a Server Template
Step 1 Sign in to the SMS console.
Step 2 In the navigation pane, choose Templates.
Step 3 In the upper right corner of the Server Templates area, click Create Server
Template.
Figure 5-6 Creating a server template
Step 4 Set template parameters according to Table 5-3.
Table 5-3 Parameters required for creating a server template
Parameter Description
Template Name User-defined
Region/Project Select a region and project where you
want to provision and manage target
servers. By default, the region is the
one set in the default migration
template, but you can change it as
needed.
AZ The parameter is set to Random by
default. You can also select another
AZ.
Disk Select a disk type as required.
Available disk types depend on the AZ.
Server Migration Service
User Guide 5 Template Management
Issue 33 (2026-08-05) Copyright © Huawei Cloud Computing Technologies Co., Ltd. 56

--- Page 61 ---
Parameter Description
VPC If you select Create new, SMS will
recommend a VPC when you use this
template to configure a target server.
You can also create or select a VPC
based on the same rules.
● If the source server's IP address is
192.168.X.X, the system creates a
VPC and a subnet that both belong
to network range 192.168.0.0/16.
● If the source server's IP address is
172.16.X.X, the system creates a
VPC and a subnet that both belong
to network range 172.16.0.0/12.
● If the source server's IP address is
10.X.X.X, the system creates a VPC
and a subnet that both belong to
network range 10.0.0.0/8.
Subnet If you select Create new, SMS will
recommend a subnet when you use
this template to configure a target
server. The subnet must be in the
same network range as the VPC.
Security Group If you select Create new, SMS will
recommend a security group when you
use this template to configure a target
server. You can also create or select a
security group that opens the
following inbound ports:
● Windows: ports 8899, 8900, and 22
● Linux: port 22 for file-level
migration, and ports 8900 and 22
for block-level migration
CAUTION
– For security purposes, you are
advised to only allow traffic from
the source server over these ports.
– The firewall of the ECS must allow
traffic to these ports.
 
Step 5 Click OK.
----End
Modifying a Server Template
Step 1 Sign in to the SMS console.
Server Migration Service
User Guide 5 Template Management
Issue 33 (2026-08-05) Copyright © Huawei Cloud Computing Technologies Co., Ltd. 57

--- Page 62 ---
Step 2 In the navigation pane, choose Templates.
Step 3 Locate the server template to be modified and click Modify in the Operation
column.
Figure 5-7 Modifying a server template
Step 4 Modify the template settings and click OK.
----End
Deleting a Server Template
Step 1 Sign in to the SMS console.
Step 2 In the navigation pane, choose Templates.
Step 3 Locate the server template to be deleted and click Delete in the Operation
column. If multiple templates need to be deleted, select them and click Delete
above the list.
Figure 5-8 Deleting server templates
Step 4 Click OK.
----End
Server Migration Service
User Guide 5 Template Management
Issue 33 (2026-08-05) Copyright © Huawei Cloud Computing Technologies Co., Ltd. 58

--- Page 63 ---
6 Viewing CTS Traces
6.1 SMS Operations Supported by CTS
Table 6-1 SMS operations recorded by CTS
Operation Resource Type Trace Name
Obtaining the Agent
configuration
information
config getConfig
Querying an SMS API
version
api getApiInfo
Listing SMS API versions api listApi
Obtaining commands
from SMS
TaskCommand getTaskCommand
Reporting command
execution results to SMS
commandResult processCommandResult
Obtaining consistency
verification results in
batches
ConsistencyCheckResult GetBatchConsistency-
CheckResult
Obtaining consistency
verification results
ConsistencyCheckResult GetConsistencyCheckRe-
sult
Uploading consistency
verification results
ConsistencyCheckResult UpdateConsistencyResult
Obtaining an SSL
certificate and private
key
CertKey getCertKey
Creating a Migration
Project
MigProject addMigProject
Server Migration Service
User Guide 6 Viewing CTS Traces
Issue 33 (2026-08-05) Copyright © Huawei Cloud Computing Technologies Co., Ltd. 59

--- Page 64 ---
Operation Resource Type Trace Name
Listing migration projects MigProject listMigProject
Querying details about a
migration project with a
specified ID
MigProject getMigProject
Changing the default
migration project
MigProject setMigProjectDefault
Deleting a migration
project
MigProject removeMigProject
Modifying a migration
project
MigProject updateMigProject
Updating network
measurement
information
Task updateNetworkCheckIn-
fo
Agreeing to the privacy
agreement
PrivacyAgreement CreatePrivacyAgreements
Checking whether a user
has agreed to the privacy
agreement
PrivacyAgreement GetPrivacyAgreement
Registering a source
server with SMS
SourceServer RegisterSourceServer
Obtaining an overview of
source servers
allSourceServer getOverview
Deleting a source server
record
SourceServer removeSource
Batch deleting source
server records
SourceServer removeSources
Updating disk
information
SourceServer updateSourceDiskInfo
Modifying information
about a source server
with a specified ID
SourceServer updateSource
Querying a source server
with a specified ID
SourceServer findSourceServerById
Updating the migration
status of a source server
SourceServerStatus updateCopyState
Listing source servers SourceServer listSourceServers
Listing failed source
servers
ErrorInform listSourceErrorInform
Server Migration Service
User Guide 6 Viewing CTS Traces
Issue 33 (2026-08-05) Copyright © Huawei Cloud Computing Technologies Co., Ltd. 60

--- Page 65 ---
Operation Resource Type Trace Name
Querying the settings of
advanced migration
options of a task
TaskConfig getTaskConfig
Configuring advanced
migration options
Task updateSpecialConfigSet-
ting
Querying the migration
rate limiting rules of a
migration task
taskSpeedLimit getSpeedLimit
Setting migration rate
limiting rules for a
migration task
taskSpeed updateSpeedLimit
Uploading migration
task logs
collectLog task-collect-log-request
Creating a migration
task
Task CreateTask
Managing a migration
task
Task updateTaskStatus
Updating a migration
task with a specified ID
Task UpdateTask
Querying the certificate
passphrase of the secure
transmission channel for
a task
taskPassPhrase getTaskPassPhrase
Deleting a migration
task with a specified ID
Task deleteTask
Deleting migration tasks
in batches
Task deleteTasks
Reporting the data
migration progress and
rate
Task updateTaskProgress-
Speed
Listing migration tasks Task getTasks
Querying a migration
task with a specified ID
Task getTask
Creating a template Template addTemplate
Deleting a template with
a specified ID
Template deleteTemplate
Listing templates Templates getTemplates
Server Migration Service
User Guide 6 Viewing CTS Traces
Issue 33 (2026-08-05) Copyright © Huawei Cloud Computing Technologies Co., Ltd. 61

--- Page 66 ---
Operation Resource Type Trace Name
Querying information
about a template with a
specified ID
Template getTemplate
Modifying template
information
Template updateTemplate
Deleting templates with
specified IDs in batches
Template deleteTemplates
Querying the target
server password in a
template with a specified
ID
TemplatePassword getTargetPassword
 
6.2 Viewing CTS Traces in the Trace List
Scenarios
After you enable CTS and the management tracker is created, CTS starts recording
operations on cloud resources. After a data tracker is created, the system starts
recording operations on data in Object Storage Service (OBS) buckets. Cloud Trace
Service (CTS) stores operation records (traces) generated in the last seven days.
This section describes how to query or export operation records of the last seven
days on the CTS console.
● Viewing Real-Time Traces in the Trace List of the New Edition
● Viewing Real-Time Traces in the Trace List of the Old Edition
Constraints
● Traces of a single account can be viewed on the CTS console. Multi-account
traces can be viewed only on the Trace List page of each account, or in the
OBS bucket or the CTS/system log stream configured for the management
tracker with the organization function enabled.
● You can only query operation records of the last seven days on the CTS
console. To store operation records for longer than seven days, you must
configure transfer to OBS or Log Tank Service (LTS) so that you can view
them in OBS buckets or LTS log groups.
● After performing operations on the cloud, you can query management traces
on the CTS console one minute later and query data traces five minutes later.
● These operation records are retained for seven days on the CTS console and
are automatically deleted upon expiration. Manual deletion is not supported.
Viewing Real-Time Traces in the Trace List of the New Edition
1. Log in to the CTS console.
Server Migration Service
User Guide 6 Viewing CTS Traces
Issue 33 (2026-08-05) Copyright © Huawei Cloud Computing Technologies Co., Ltd. 62

--- Page 67 ---
2. In the navigation pane on the left, choose Trace List.
3. On the Trace List page, use advanced search to query traces. You can
combine one or more filters.
– Trace Name: Enter a trace name.
– Trace ID: Enter a trace ID.
– Resource Name: Enter a resource name. If the cloud resource involved in
the trace does not have a resource name or the corresponding API
operation does not involve the resource name parameter, leave this field
empty.
– Resource ID: Enter a resource ID. Leave this field empty if the resource
has no resource ID or if resource creation failed.
– Trace Source: Select a cloud service name from the drop-down list.
– Resource Type: Select a resource type from the drop-down list.
– Operator: Select one or more operators from the drop-down list.
– Trace Status: Select normal, warning, or incident.
▪ normal: The operation succeeded.
▪ warning: The operation failed.
▪ incident: The operation caused a fault that is more serious than the
operation failure, for example, causing other faults.
– Enterprise Project ID: Enter an enterprise project ID.
– Access Key: Enter a temporary or permanent access key ID.
– Time range: Select Last 1 hour, Last 1 day, or Last 1 week, or specify a
custom time range within the last seven days.
4. On the Trace List page, you can also export and refresh the trace list, and
customize columns to display.
– Enter any keyword in the search box and press Enter to filter desired
traces.
– Click Export to export all traces in the query result as an .xlsx file. The file
can contain up to 5,000 records.
– Click 
  to view the latest information about traces.
– Click 
  to customize the information to be displayed in the trace list. If
Auto wrapping is enabled (
 ), excess text will move down to the
next line; otherwise, the text will be truncated. By default, this function is
disabled.
5. For details about key fields in the trace structure, see Trace Structure and
Example Traces.
6. (Optional) On the Trace List page of the new edition, click Go to Old Edition
in the upper right corner to switch to the Trace List page of the old edition.
Viewing Real-Time Traces in the Trace List of the Old Edition
1. Log in to the CTS console.
2. In the navigation pane on the left, choose Trace List.
Server Migration Service
User Guide 6 Viewing CTS Traces
Issue 33 (2026-08-05) Copyright © Huawei Cloud Computing Technologies Co., Ltd. 63

--- Page 68 ---
3. Each time you log in to the CTS console, the new edition is displayed by
default. Click Go to Old Edition in the upper right corner to switch to the
trace list of the old edition.
4. Set filters to search for your desired traces. The filters below are available.
– Trace Type, Trace Source, Resource Type, and Search By: Select a filter
from the drop-down list.
▪ If you select Resource ID for Search By, specify a resource ID.
▪ If you select Trace name for Search By, specify a trace name.
▪ If you select Resource name for Search By, specify a resource name.
– Operator: Select a user.
– Trace Status: Select All trace statuses, Normal, Warning, or Incident.
– Time range: Select Last 1 hour, Last 1 day, or Last 1 week, or specify a
custom time range within the last seven days.
5. Click Query.
6. On the Trace List page, you can also export and refresh the trace list.
– Click Export to export all traces in the query result as a CSV file. The file
can contain up to 5,000 records.
– Click 
  to view the latest information about traces.
7. Click 
  on the left of a trace to expand its details.
8. Click View Trace in the Operation column. The trace details are displayed.
Server Migration Service
User Guide 6 Viewing CTS Traces
Issue 33 (2026-08-05) Copyright © Huawei Cloud Computing Technologies Co., Ltd. 64

--- Page 69 ---
9. For details about key fields in the trace structure, see Trace Structure and
Example Traces in the CTS User Guide.
10. (Optional) On the Trace List page of the old edition, click New Edition in the
upper right corner to switch to the Trace List page of the new edition.
6.3 Viewing Traces
Scenarios
After you enable CTS, it records key operations performed on SMS. You can view
the operation records of the last seven days on the CTS console.
Procedure
1. Log in to the CTS console.
2. In the navigation pane on the left, choose Trace List.
3. In the upper right corner of the trace list, click Filter to set the search criteria.
The filters below are available.
– Trace Type, Trace Source, Resource Type, and Search By: Select a filter
from the drop-down list.
If you select Resource ID for Search By, specify a resource ID.
– Operator: Select a specific operator from the drop-down list.
– Trace Status: Select All trace statuses, Normal, Warning, or Incident.
– Time range: In the upper right corner of the page, you can query traces in
the last one hour, last one day, last one week, or within a customized
period.
4. Click Query.
5. On the right of the filter box, click Export. CTS exports a CSV file which lists
query results.
6. Click 
  on the left of the required trace to expand its details. Figure 6-1
shows an example.
Figure 6-1 Expanding trace details
7. Click View Trace in the Operation column. The trace structure details are
displayed.
Server Migration Service
User Guide 6 Viewing CTS Traces
Issue 33 (2026-08-05) Copyright © Huawei Cloud Computing Technologies Co., Ltd. 65