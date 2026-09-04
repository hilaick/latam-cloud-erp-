# eip-usermanual-pdf.pdf

Extracted from: docs/pdf-resources-kit/eip-usermanual-pdf.pdf
Pages: 107

--- Page 1 ---
Elastic IP
User Guide
Issue 01
Date 2026-08-21
HUAWEI TECHNOLOGIES CO., LTD.

--- Page 2 ---
 
 
Copyright © Huawei Technologies Co., Ltd. 2026. All rights reserved.
No part of this document may be reproduced or transmitted in any form or by any means without prior
written consent of Huawei Technologies Co., Ltd.
 
Trademarks and Permissions
 and other Huawei trademarks are trademarks of Huawei Technologies Co., Ltd.
All other trademarks and trade names mentioned in this document are the property of their respective
holders.
 
Notice
The purchased products, services and features are stipulated by the contract made between Huawei and
the customer. All or part of the products, services and features described in this document may not be
within the purchase scope or the usage scope. Unless otherwise specified in the contract, all statements,
information, and recommendations in this document are provided "AS IS" without warranties, guarantees
or representations of any kind, either express or implied.
The information in this document is subject to change without notice. Every effort has been made in the
preparation of this document to ensure accuracy of the contents, but all statements, information, and
recommendations in this document do not constitute a warranty of any kind, express or implied.
  
 
 
 
 
 
Huawei Technologies Co., Ltd.
Address: Huawei Industrial Base
Bantian, Longgang
Shenzhen 518129
People's Republic of China
Website: https://www.huawei.com
Email: support@huawei.com
Issue 01 (2026-08-21) Copyright © Huawei Technologies Co., Ltd. i

--- Page 3 ---
 
 
Security Declaration
 
Vulnerability
Huawei's regulations on product vulnerability management are subject to the Vul. Response Process. For
details about this process, visit the following web page:
https://www.huawei.com/en/psirt/vul-response-process
For vulnerability information, enterprise customers can visit the following web page:
https://securitybulletin.huawei.com/enterprise/en/security-advisory
 
 
 
 
Issue 01 (2026-08-21) Copyright © Huawei Technologies Co., Ltd. ii

--- Page 4 ---
Contents
1 Elastic IP User Guide...............................................................................................................1
1.1 Permissions Management.................................................................................................................................................... 1
1.1.1 Using IAM Roles or Policies to Grant Access to EIP................................................................................................. 1
1.1.2 Using IAM Identity Policies to Grant Access to EIP..................................................................................................4
1.2 Elastic IP..................................................................................................................................................................................... 6
1.2.1 EIP Overview..........................................................................................................................................................................6
1.2.2 Assigning an EIP................................................................................................................................................................... 9
1.2.3 Modifying an EIP Bandwidth......................................................................................................................................... 15
1.2.4 Binding or Unbinding an EIP......................................................................................................................................... 18
1.2.5 Releasing or Unsubscribing From an EIP.................................................................................................................. 21
1.2.6 Exporting EIP Information.............................................................................................................................................. 23
1.2.7 Managing EIP Tags........................................................................................................................................................... 23
1.2.8 Managing Idle EIPs........................................................................................................................................................... 24
1.2.9 EIP Configuration Examples...........................................................................................................................................25
1.2.9.1 Changing an EIP for an Instance.............................................................................................................................. 25
1.2.9.2 Binding an EIP to the Extended Network Interface of an ECS to Enable Internet Access....................28
1.3 IPv6 EIP.....................................................................................................................................................................................33
1.3.1 IPv6 EIP Overview............................................................................................................................................................. 33
1.3.2 Enabling or Disabling IPv6 EIP......................................................................................................................................38
1.4 EIP Billing................................................................................................................................................................................. 39
1.4.1 Changing EIP Billing Mode.............................................................................................................................................40
1.4.2 Renewing a Yearly/Monthly EIP................................................................................................................................... 41
1.4.3 Viewing the EIP Billing Information............................................................................................................................ 42
1.5 EIP Pool.................................................................................................................................................................................... 42
1.5.1 EIP Pool Overview............................................................................................................................................................. 42
1.5.2 Purchasing an EIP Pool.................................................................................................................................................... 43
1.5.3 Managing EIP Pools.......................................................................................................................................................... 45
1.6 Shared Bandwidth................................................................................................................................................................ 46
1.6.1 Shared Bandwidth Overview......................................................................................................................................... 46
1.6.2 Assigning a Shared Bandwidth..................................................................................................................................... 48
1.6.3 Adding EIPs to or Removing EIPs from a Shared Bandwidth.............................................................................53
1.6.4 Modifying a Shared Bandwidth.................................................................................................................................... 54
1.6.5 Deleting or Unsubscribing from a Shared Bandwidth..........................................................................................56
Elastic IP
User Guide Contents
Issue 01 (2026-08-21) Copyright © Huawei Technologies Co., Ltd. iii

--- Page 5 ---
1.6.6 Exporting Shared Bandwidths....................................................................................................................................... 57
1.6.7 QoS......................................................................................................................................................................................... 57
1.7 Resource Package................................................................................................................................................................. 59
1.7.1 Resource Package Overview.......................................................................................................................................... 59
1.7.2 Shared Data Package....................................................................................................................................................... 60
1.7.2.1 Buying a Shared Data Package................................................................................................................................. 60
1.7.2.2 Viewing the Usage Details and Configuring Remaining Usage Alerts........................................................61
1.8 Cloud Eye Monitoring..........................................................................................................................................................62
1.8.1 Monitoring EIPs.................................................................................................................................................................. 62
1.8.2 Monitoring Metrics........................................................................................................................................................... 64
1.8.3 EIP Events That Can Be Monitored..............................................................................................................................66
1.9 Managing EIP Quotas......................................................................................................................................................... 70
2 Global Elastic IP User Guide............................................................................................... 73
2.1 Global EIPs.............................................................................................................................................................................. 73
2.1.1 Global EIP Overview......................................................................................................................................................... 73
2.1.2 Assigning a Global EIP..................................................................................................................................................... 75
2.1.3 Binding a Global EIP to an Instance........................................................................................................................... 80
2.1.4 Unbinding a Global EIP from an Instance................................................................................................................ 81
2.1.5 Releasing a Global EIP..................................................................................................................................................... 82
2.1.6 Modifying the Global Connection Bandwidth of a Global EIP.......................................................................... 82
2.1.7 Modifying the Global Internet Bandwidth of a Global EIP.................................................................................83
2.1.8 Viewing Details About a Global EIP............................................................................................................................84
2.1.9 Exporting Global EIPs.......................................................................................................................................................84
2.2 Global Internet Gateways.................................................................................................................................................. 84
2.2.1 Global Internet Gateway Overview.............................................................................................................................84
2.2.2 Creating a Global Internet Gateway...........................................................................................................................86
2.2.3 Binding a Global Internet Gateway to a Global EIP..............................................................................................87
2.2.4 Unbinding a Global Internet Gateway from a Global EIP...................................................................................88
2.2.5 Managing a Global Internet Gateway........................................................................................................................88
2.3 Global Internet Bandwidths.............................................................................................................................................. 89
2.3.1 Global Internet Bandwidth Overview.........................................................................................................................89
2.3.2 Buying a Global Internet Bandwidth.......................................................................................................................... 91
2.3.3 Adding Global EIPs to a Global Internet Bandwidth.............................................................................................94
2.3.4 Modifying a Global Internet Bandwidth....................................................................................................................95
2.3.5 Managing a Global Internet Bandwidth....................................................................................................................96
2.4 Cloud Eye Monitoring..........................................................................................................................................................97
2.4.1 Monitoring Global EIPs....................................................................................................................................................97
2.4.2 Monitoring Metrics........................................................................................................................................................... 98
2.5 Managing Global EIP Quotas.........................................................................................................................................101
Elastic IP
User Guide Contents
Issue 01 (2026-08-21) Copyright © Huawei Technologies Co., Ltd. iv

--- Page 6 ---
1 Elastic IP User Guide
1.1 Permissions Management
1.1.1 Using IAM Roles or Policies to Grant Access to EIP
The role/policy-based authorization provided by Identity and Access
Management (IAM) lets you control access to EIP. With IAM, you can:
● Create IAM users for personnel based on your enterprise's organizational
structure. Each IAM user has their own identity credentials for accessing EIP
resources.
● Grant users only the permissions required to perform a given task based on
their job responsibilities.
● Entrust a HUAWEI ID or a cloud service to perform efficient O&M on your EIP
resources.
If your HUAWEI ID meets your permissions requirements, you can skip this section.
Figure 1-1 shows the process of role/policy-based authorization.
Prerequisites
Before granting permissions to user groups, learn about Role/Policy-based
Authorization for EIP. To grant permissions for other services, learn about all
system-defined permissions supported by IAM.
Elastic IP
User Guide 1 Elastic IP User Guide
Issue 01 (2026-08-21) Copyright © Huawei Technologies Co., Ltd. 1

--- Page 7 ---
Process Flow
Figure 1-1 Process for granting EIP permissions
1. On the IAM console, create a user group and grant it permissions.
Create a user group on the IAM console and assign the EIP ReadOnlyAccess
permissions to the group.
2. Create an IAM user and add it to the created user group.
Create a user on the IAM console and add the user to the group created in 1.
3. Log in as the IAM user and verify permissions.
In the authorized region, perform the following operations:
– Choose Service List > Elastic IP. Then click Buy EIP on the EIP console. If
a message appears indicating that you have insufficient permissions to
perform the operation, the EIP ReadOnlyAccess policy is in effect.
– Choose another service from Service List. If a message appears indicating
that you have insufficient permissions to access the service, the EIP
ReadOnlyAccess policy is in effect.
Example Custom Policies
You can create custom policies to supplement the system-defined policies of EIP.
For details about actions supported in custom policies, see Permissions Policies
and Supported Actions.
To create a custom policy, choose either visual editor or JSON.
Elastic IP
User Guide 1 Elastic IP User Guide
Issue 01 (2026-08-21) Copyright © Huawei Technologies Co., Ltd. 2

--- Page 8 ---
● Visual editor: Select cloud services, actions, resources, and request conditions.
This does not require knowledge of policy grammar.
● JSON: Create a JSON policy or edit an existing one.
For details, see Creating a Custom Policy. The following lists examples of
common EIP custom policies.
● Example 1: Grant permission to assign and view EIPs.
{ 
    "Version": "1.1", 
    "Statement": [ 
        { 
            "Effect": "Allow", 
            "Action": [ 
                "vpc:publicIps:create", 
                "vpc:publicIps:list" 
             ] 
        } 
    ] 
}
● Example 2: Grant permission to deny EIP deletion.
A policy with only "Deny" permissions must be used together with other
policies. If the permissions granted to an IAM user contain both "Allow" and
"Deny", the "Deny" permissions take precedence over the "Allow" permissions.
Assume that you want to grant the permissions of the EIP FullAccess policy
to a user but want to prevent them from releasing EIPs. You can create a
custom policy for denying EIP release, and attach both policies to the user. As
an explicit deny in any policy overrides any allows, the user can perform all
operations on EIPs except releasing them. Example policy denying EIP release:
{ 
      "Version": "1.1", 
      "Statement": [ 
            { 
          "Effect": "Deny", 
                  "Action": [ 
                        "vpc:publicIps:delete" 
                  ] 
            } 
      ] 
}
● Example 3: Create a custom policy containing multiple actions.
A custom policy can contain the actions of one or multiple services that are of
the same type (global or project-level). Example policy containing multiple
actions:
{
    "Version": "1.1",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "vpc:publicIps:update",
                "vpc:publicIps:create"
            ]
        },
        {
            "Effect": "Deny",
            "Action": [
                "vpc:publicIps:delete"
            ]
        }
    ]
}
Elastic IP
User Guide 1 Elastic IP User Guide
Issue 01 (2026-08-21) Copyright © Huawei Technologies Co., Ltd. 3

--- Page 9 ---
1.1.2 Using IAM Identity Policies to Grant Access to EIP
System-defined permissions in identity policy-based authorization provided by
Identity and Access Management (IAM) let you control access to EIP. With IAM,
you can:
● Create IAM users or user groups for personnel based on your enterprise's
organizational structure. Each IAM user has their own identity credentials for
accessing EIP resources.
● Grant users only the permissions required to perform a given task based on
their job responsibilities.
● Entrust a HUAWEI ID or a cloud service to perform efficient O&M on your EIP
resources.
If your HUAWEI ID meets your permissions requirements, you can skip this section.
Figure 1-2 shows the process flow of identity policy-based authorization.
Prerequisites
Before granting permissions, learn about all system-defined permissions for EIP.
To grant permissions for other services, learn about all system-defined
permissions supported by IAM.
Process Flow
Figure 1-2 Process for granting EIP permissions
1. On the IAM console, create an IAM user or create a user group.
Log in to the IAM console to create an IAM user or user group.
2. Attach a system-defined identity policy to the user or user group.
Assign the permissions defined in the system-defined identity policy
EIPReadOnlyAccessPolicy to the user or group, or attach the system-defined
identity policy to it.
Elastic IP
User Guide 1 Elastic IP User Guide
Issue 01 (2026-08-21) Copyright © Huawei Technologies Co., Ltd. 4

--- Page 10 ---
3. Log in using the IAM user and verify permissions.
In the authorized region, perform the following operations:
– Choose Service List > Elastic IP. Then click Buy EIP on the EIP console. If
a message appears indicating that you have insufficient permissions to
perform the operation, the EIPReadOnlyAccessPolicy policy is in effect.
– Choose another service from Service List. If a message appears indicating
that you have insufficient permissions to access the service, the
EIPReadOnlyAccessPolicy policy is in effect.
Example Custom Policies
You can create custom identity policies to supplement the system-defined identity
policies of EIP. You can add actions in custom identity policies as needed. For
details about supported actions, see Permissions Policies and Supported Actions.
To create a custom identity policy, choose either visual editor or JSON.
● Visual editor: Select cloud services, actions, resources, and request conditions.
You do not need to have knowledge of the policy grammar.
● JSON: Create a JSON policy or edit an existing one.
For details, see Creating a Custom Identity Policy and Attaching It to a
Principal.
When creating a custom identity policy, use the Resource element to specify the
resources the identity policy applies to and use the Condition element (service-
specific condition keys) to control when the identity policy is in effect. For details
about the supported resource types and condition keys, see . The following
provides example custom identity policies for EIP.
● Example 1: Grant permissions to assign and release EIPs.
A custom policy can contain the actions of one or multiple services. Example
policy containing multiple actions:
{
    "Version": "5.0",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "eip:publicIps:create"
            ],
            "Resource": [
                "VPC:*:*:publicip:*"
            ]
        },
       {
            "Effect": "Allow",
            "Action": [
                "eip:publicIps:delete"
            ],
            "Resource": [
                "VPC:*:*:publicip:*"
            ]
        }
    ]
}
● Example 2: Grant permissions to release a specific EIP
For operations on resources with IDs, such as querying details, updating, and
deleting resources, you can grant permissions based on the resource in a
Elastic IP
User Guide 1 Elastic IP User Guide
Issue 01 (2026-08-21) Copyright © Huawei Technologies Co., Ltd. 5

--- Page 11 ---
policy. Operations that are not granted with permissions will be rejected by
default. The following policy allows users to release only the EIP with a
specific ID.
{
    "Version": "5.0",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "eip:publicIps:delete"
            ],
            "Resource": [
                "VPC:*:*:publicip:46901873-cfa2-4bfa-b458-225a6e027425"
            ]
        }
    ]
}
● Example 3: Grant permissions to release only EIPs that meet specific
conditions
You can grant permissions based on specified conditions in a policy.
Operations that are not granted with permissions will be rejected by default.
The following policy allows users to release only EIPs in a specific enterprise
project.
{
    "Version": "5.0",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "eip:publicIps:delete"
            ],
            "Resource": [
                "VPC:*:*:publicip:*"
            ],
            "Condition": {
                "StringEquals": {
                    "g:EnterpriseProjectId": "a152091c-0b16-4a37-b871-93546ee98de4"
                }
            }
        }
    ]
}
1.2 Elastic IP
1.2.1 EIP Overview
EIP
The Elastic IP (EIP) service enables your cloud resources to communicate with the
Internet using static public IP addresses and scalable bandwidths. If a resource has
an EIP bound, it can directly access the Internet. If a resource only has a private IP
address, it cannot directly access the Internet.
EIPs can be bound to or unbound from ECSs, BMSs, virtual IP addresses, NAT
gateways, or load balancers.
Each EIP can be bound to only one cloud resource at a time and both must be in
the same region.
Elastic IP
User Guide 1 Elastic IP User Guide
Issue 01 (2026-08-21) Copyright © Huawei Technologies Co., Ltd. 6

--- Page 12 ---
You can use public NAT gateways to enable ECSs in the VPC to share an EIP to
access the Internet or provide services accessible from the Internet. For details, see
Using a Public NAT Gateway to Enable Servers to Share One or More EIPs to
Access the Internet.
Pay-per-use EIPs can be transferred across accounts. However, you need to submit
a service ticket. For details about how to submit a service ticket, see Submitting a
Service Ticket.
NO TE
● Only EIPs in the same region can be transferred across accounts.
● An EIP to be transferred must meet the following requirements:
● The EIP is billed on a pay-per-use basis.
● Yearly/Monthly EIPs cannot be transferred across accounts. If an EIP is billed on a
yearly/monthly basis, you can change its billing mode to pay-per-use and then
apply for a cross-account EIP transfer.
For details, see Yearly/Monthly to Pay-Per-Use.
● The EIP must be in the Unbound status.
Figure 1-3 Connecting to the Internet using an EIP
EIP Quotas
You can log in to the console to query your EIP quotas.
If you want to increase your quota, see How Do I Apply for a Higher Quota?
● Your request for a larger quota will only be approved if your account has valid
orders and you are continuously using cloud resources. If you have released
resources immediately after subscribing to them multiple times, your request
for quota increase will be declined.
● If you have increased the EIP quota but you have not used the quota for a
long time, Huawei Cloud will reduce the quota to the default value.
Elastic IP
User Guide 1 Elastic IP User Guide
Issue 01 (2026-08-21) Copyright © Huawei Technologies Co., Ltd. 7

--- Page 13 ---
Constraints
● If a yearly/monthly EIP is not renewed after it expires, or if the arrears of a
pay-per-use EIP are not paid in a timely manner, the EIP may be released and
cannot be recovered.
● If the used EIP bandwidth exceeds the specified size or is attacked (usually by
a DDoS attack), the EIP will be blocked but can still be bound or unbound.
● An EIP cannot be shared across accounts. Each account can only use and
manage its own EIP dedicated bandwidths and shared bandwidths.
● The maximum bandwidth of a yearly/monthly EIP or a pay-per-use EIP billed
by bandwidth cannot exceed 2,000 Mbit/s. The maximum bandwidth of a
pay-per-use EIP billed by traffic cannot exceed 300 Mbit/s. The maximum
bandwidth of a shared bandwidth cannot exceed 2,000 Mbit/s.
● Constraints on binding or unbinding an EIP to or from an instance:
– An EIP can be bound to only one cloud resource at a time, and the EIP
and the resource must be in the same region.
– An EIP that has already been bound to a cloud resource cannot be bound
to another resource without first being unbound from the current
resource.
● The EIP remains unchanged:
– No matter you start or stop the ECS.
– When you modify its billing mode or bandwidth size.
Binding an EIP to an Instance
Figure 1-4 Process for binding an EIP to an instance
Table 1-1 Description of the process for binding an EIP to an instance
No. Step Description
1 Assigning an EIP You can assign an EIP and bind it to a cloud
resource to allow the resource to access the
Internet.
2 Binding an EIP to
an Instance
● The procedure for binding an EIP varies
depending on the instance it is bound to.
● The EIP and the instance it is bound to must be
in the same region.
 
EIP Billing
EIPs can be billed on a yearly/monthly or pay-per-use basis. The billing options
and billing items vary depending on the billing mode. For details, see Billing.
Elastic IP
User Guide 1 Elastic IP User Guide
Issue 01 (2026-08-21) Copyright © Huawei Technologies Co., Ltd. 8

--- Page 14 ---
NO TE
From April 1, 2026 (the date varies by region and is subject to the console notification),
pay-per-use EIPs billed by traffic have the following constraints:
● A single EIP supports a peak bandwidth of up to 300 Mbit/s.
● The total peak bandwidth of all pay-per-use EIPs billed by traffic of an account in the
same region cannot exceed 5 Gbit/s.
If your service requires a higher or guaranteed peak bandwidth, use pay-per-use EIPs billed
by bandwidth.
You can also change the billing mode later if it no longer meets your needs. For
details, see Changing the EIP Billing Mode.
Related Operations
Binding or Unbinding an EIP: After an EIP is assigned, you can bind it to a cloud
resource such as an ECS for Internet access.
Adding EIPs to or Removing EIPs from a Shared Bandwidth: After a shared
bandwidth is assigned, you can add multiple pay-per-use EIPs to it so that all EIPs
share the same bandwidth. Then, your network operation costs will be lowered
and your system O&M as well as resource statistics will be simplified.
1.2.2 Assigning an EIP
Scenarios
You can assign an EIP and bind it to cloud resources to allow them to access the
Internet. This section describes how to assign a new or specific EIP.
Assigning an EIP
You can assign an EIP by referring to Assigning an EIP Using the Console or
Assigning a Specific EIP Using an API.
Assigning an EIP Using the Console
An EIP assigned on the console is allocated randomly by default.
● If you assign a new EIP within 24 hours after releasing an EIP, the released EIP
will be assigned first.
● Other users can assign the released EIP through the API 24 hours after it is
released.
The procedure is as follows:
1. Go to the Buy EIP page.
2. Configure parameters as prompted.
Elastic IP
User Guide 1 Elastic IP User Guide
Issue 01 (2026-08-21) Copyright © Huawei Technologies Co., Ltd. 9

--- Page 15 ---
Figure 1-5 Assigning an EIP
Table 1-2 Parameter descriptions
Item Paramet
er
Description Example
Value
Basic
Configur
ation
Billing
Mode
The following options are available:
● Yearly/Monthly: You pay upfront for
the amount of time you expect to
use the instance. You need to make
sure you have a valid payment
method configured first.
● Pay-per-use: You can start using the
EIP first and then pay as you go. You
are billed based on the EIP usage
duration (by bandwidth) or used
traffic (by traffic).
Pay-per-
use
Elastic IP
User Guide 1 Elastic IP User Guide
Issue 01 (2026-08-21) Copyright © Huawei Technologies Co., Ltd. 10

--- Page 16 ---
Item Paramet
er
Description Example
Value
Basic
Configur
ation
Region Resources in different regions cannot
communicate with each other over
internal networks. For low network
latency and quick resource access, select
the region nearest to where your
services will be accessed. The region
selected for the EIP is its geographical
location.
NOTE
● The geographical location of an EIP
purchased in CN North-Ulanqab1 or CN
East-Qingdao is Beijing.
● The geographical location of an EIP
purchased in CN East2 is Shanghai.
CN-Hong
Kong
Bandwid
th
Details
EIP Type ● Dynamic BGP: Dynamic BGP
provides automatic failover and
chooses the optimal connection
when a network connection fails.
● Static BGP: Static BGP offers more
routing control and protects against
route flapping, but an optimal
connection cannot be selected in real
time when a network connection
fails.
● Premium Dynamic BGP: Premium
dynamic BGP chooses high-quality
Internet connections to key
destinations. By interconnecting with
multiple mainstream carriers, the
connections are established between
Hong Kong (China) and the Chinese
mainland over the Internet.
● EIP Pool: This parameter is available
only when you set Billing Mode to
Pay-per-use. An EIP pool helps you
manage a large number of EIPs and
assigns EIPs with dynamic BGP
routing, ensuring network stability
and optimal user experience. For
details about the EIP pool, see EIP
Pool Overview.
For details, see What Are the
Differences Between Static BGP and
Dynamic BGP?
Dynamic
BGP
Elastic IP
User Guide 1 Elastic IP User Guide
Issue 01 (2026-08-21) Copyright © Huawei Technologies Co., Ltd. 11

--- Page 17 ---
Item Paramet
er
Description Example
Value
Bandwid
th
Details
EIP Pool Select your purchased EIP pool.
This parameter is available only when
Billing Mode is set to Pay-per-use and
EIP Type set to EIP Pool.
eipPool-
test
Bandwid
th
Details
Billed By How the EIP bandwidth will be billed.
This parameter is available only when
you set Billing Mode to Pay-per-use.
● Bandwidth: You specify a maximum
bandwidth and pay for the amount
of time you use the bandwidth. This
is suitable for scenarios with heavy or
stable traffic.
● Traffic: You specify a maximum
bandwidth and pay for the total
outbound traffic you use. This is
suitable for scenarios with light or
sharply fluctuating traffic.
● Shared Bandwidth: The bandwidth
can be shared by multiple EIPs and is
suitable for scenarios with staggered
traffic.
Bandwidt
h
Bandwid
th
Details
Bandwid
th
(Mbit/s)
The bandwidth size in Mbit/s. 100
Bandwid
th
Details
Bandwid
th Name
The name of the bandwidth. The name:
● Can contain 1 to 64 characters.
● Can contain letters, digits,
underscores (_), hyphens (-), and
periods (.).
bandwidth
Security
Services
DDoS
Protectio
n
Cloud Native Anti-DDoS Basic
Cloud Native Anti-DDoS Basic provides
up to a certain amount (for example,
less than 5 Gbit/s) of DDoS mitigation
capacity for free. The actual thresholds
are displayed on the console.
If the threshold is exceeded, the EIP will
be blocked.
-
EIP
Details
EIP
Name
(Optiona
l)
The name of the EIP. The name:
● Can contain 1 to 64 characters.
● Can contain letters, digits,
underscores (_), hyphens (-), and
periods (.).
eip-test
Elastic IP
User Guide 1 Elastic IP User Guide
Issue 01 (2026-08-21) Copyright © Huawei Technologies Co., Ltd. 12

--- Page 18 ---
Item Paramet
er
Description Example
Value
EIP
Details
Enterpris
e Project
The enterprise project that the EIP
belongs to.
An enterprise project facilitates project-
level management and grouping of
cloud resources and users. The default
project is default.
For details about creating and
managing enterprise projects, see the
Enterprise Management User Guide.
default
EIP
Details
IPv6 EIP
(Optiona
l)
After the IPv6 EIP function is enabled,
you will obtain both an IPv4 EIP and its
corresponding IPv6 EIP. External IPv6
addresses can access cloud resources
through this IPv6 EIP.
NOTE
Currently, IPv6 EIP function is available only
in certain regions. You can check the regions
on the console.
Enable
EIP
Details
Tag Tags help you quickly identify, organize,
and search for your EIPs.
For more information about tags, see
Managing EIP Tags.
NOTE
If your organization has created a tag policy
for EIPs, you need to add tags for EIPs based
on the tag policy. If a tag does not comply
with the tag policy, the EIP assignment may
fail. Contact the organization administrator
to learn details about the tag policy.
● Key:
Ipv4_ke
y1
● Value:
3005ei
p
Monitori
ng
Monitori
ng
Basic monitoring is enabled by default.
You can use the management console
or APIs provided by Cloud Eye to query
the metrics and alarms generated for
the EIP and bandwidth.
-
Purchas
e Details
Required
Duration
The duration for which the EIP will be
used. The duration must be specified if
Billing Mode is set to Yearly/Monthly.
1 month
Purchas
e Details
Auto-
renew
Whether to select Auto-renew. You can
select it if Billing Mode is set to Yearly/
Monthly. The auto-renewal period is
determined by the required duration.
● Monthly subscription: The
subscription is renewed every month.
● Yearly subscription: The subscription
is renewed every year.
-
Elastic IP
User Guide 1 Elastic IP User Guide
Issue 01 (2026-08-21) Copyright © Huawei Technologies Co., Ltd. 13

--- Page 19 ---
Item Paramet
er
Description Example
Value
Purchas
e Details
Quantity The number of EIPs you want to assign.
The quantity must be specified if Billing
Mode is set to Pay-per-use.
1
 
NO TE
● If you are buying an EIP billed on a pay-per-use basis and you want to use a
shared bandwidth, you can only select an existing shared bandwidth from the
Bandwidth Name drop-down list. If there is no shared bandwidth, create one first.
● A dedicated bandwidth cannot be changed to a shared bandwidth and vice versa.
However, you can purchase a shared bandwidth for pay-per-use EIPs.
● Add an EIP to a shared bandwidth and then the EIP will use the shared
bandwidth.
● Remove the EIP from the shared bandwidth and then the EIP will use the
dedicated bandwidth.
3. Click Next.
4. On the confirmation page:
– If you select Pay-per-use for Billing Mode, click Submit.
– If you select Yearly/Monthly for Billing Mode, click Pay Now.
On the payment page, confirm the order information, and click Pay.
If you click Buy Shared Bandwidth when you buy an EIP, you also need to pay for
the bandwidth.
Assigning a Specific EIP Using an API
If you want to retrieve an EIP that you have released within seven days (inclusive)
or assign a specific EIP, you can use the API.
You can set the value of ip_address to the one that you want to assign. For
details, see Elastic IP API Reference.
● If the EIP has been assigned to another user, you will fail to assign your
required EIP.
● APIs cannot be used to assign the yearly/monthly EIP that you have released
or assign a specific yearly/monthly EIP.
● The management console does not support assigning a specific EIP.
Why Can't I Find My Purchased EIP on the Management Console?
You can perform the following operations to locate an EIP if you cannot find it on
the management console.
EIPs Not in the Current Region
1. Log in to the management console.
Elastic IP
User Guide 1 Elastic IP User Guide
Issue 01 (2026-08-21) Copyright © Huawei Technologies Co., Ltd. 14

--- Page 20 ---
EIPs Not in the Current Region
● Method 1:
a. Go to the EIP list page.
b. In the upper left corner of the console, select the region that the EIP to
be queried belongs to.
c. In the EIP list, view your EIPs.
● Method 2:
a. Go to the My Resources page.
b. On the My Resources page, set search criteria to quickly find the target
EIP.
▪ Service: Virtual Private Cloud (VPC)
▪ Resource Type: EIPs
▪ Region: Retain the default value All or select the region that the EIP
to be queried belongs to.
For example, if you select All for Region, all of your EIPs will be
displayed.
EIPs Were Released
Yearly/Monthly EIPs will be released when they expire and have not been
renewed.
● If you want to assign a new EIP and bind it to your resources such as an ECS,
see Assigning an EIP Using the Console.
● If you want to retrieve an EIP that you released, see Assigning a Specific EIP
Using an API.
Related Operations
Binding or Unbinding an EIP: After an EIP is assigned, you can bind it to cloud
resources such as ECSs for Internet access.
Adding EIPs to or Removing EIPs from a Shared Bandwidth: After a shared
bandwidth is assigned, you can add multiple pay-per-use EIPs to it so that all EIPs
share the same bandwidth. This reduces network operations costs and simplifies
system O&M statistics.
Viewing the EIP Billing Information: After an EIP is used, you can view its bills.
1.2.3 Modifying an EIP Bandwidth
Scenarios
No matter which billing mode is used, if your EIP is not added to a shared
bandwidth, it uses a dedicated bandwidth. A dedicated bandwidth can control how
much data can be transferred using a single EIP.
This section describes how to increase or decrease the dedicated bandwidth size.
Changing bandwidth size does not change the EIPs.
Elastic IP
User Guide 1 Elastic IP User Guide
Issue 01 (2026-08-21) Copyright © Huawei Technologies Co., Ltd. 15

--- Page 21 ---
When you change the bandwidth size, the bandwidth price and effective time
depend on the billing mode, which applies to both dedicated and shared
bandwidths. For details, see Table 1-3.
NO TE
Decreasing bandwidths may cause packet loss.
If the maximum bandwidth cannot meet your service requirements, you can submit a
service ticket to request a higher quota.
Table 1-3 Impact on billing after bandwidth size change
Billing
Mode
Billed
By
Change Impact
Yearly/
Monthly
Bandwi
dth
Increase
bandwidth
The change will take effect immediately.
The increased bandwidth will be billed
accordingly.
Yearly/
Monthly
Bandwi
dth
Decrease
bandwidth
upon
renewal
The change will not take effect
immediately.
You need to select a new bandwidth size
and a renewal duration. The change will
take effect in the first billing cycle after a
successful renewal.
● The order can be unsubscribed before
the bandwidth takes effect.
● The bandwidth cannot be modified in
the current billing cycle.
Yearly/
Monthly
Bandwi
dth
Decrease
bandwidth
immediately
The change will take effect immediately.
Pay-per-
use
Bandwi
dth
Increase or
decrease the
bandwidth
The change will take effect immediately.
CAUTION
The pay-per-use (billed by bandwidth) billing
mode is based on the fixed bandwidth you
purchased. If the actual bandwidth used
exceeds the purchased one, no extra charges
will apply, but the network quality may be
affected. You are advised to plan the
bandwidth based on actual service
requirements.
Pay-per-
use
Traffic Increase or
decrease the
bandwidth
The change will take effect immediately.
The bandwidth size you set is only used to
limit the maximum data transfer rate.
 
Procedure
1. Go to the EIP list page.
Elastic IP
User Guide 1 Elastic IP User Guide
Issue 01 (2026-08-21) Copyright © Huawei Technologies Co., Ltd. 16

--- Page 22 ---
2. Locate the target EIP and choose More > Modify Bandwidth in the
Operation column.
– If it is a pay-per-use EIP, the Modify Bandwidth page is displayed.
– If it is a yearly/monthly EIP, select either of the following method to
increase or decrease the bandwidth and click Continue.
▪ Increase bandwidth
▪ Decrease bandwidth immediately
▪ Decrease bandwidth
3. Modify the bandwidth parameters as prompted.
Figure 1-6 Modifying the bandwidth of a pay-per-use EIP
Elastic IP
User Guide 1 Elastic IP User Guide
Issue 01 (2026-08-21) Copyright © Huawei Technologies Co., Ltd. 17

--- Page 23 ---
Figure 1-7 Modifying the bandwidth of a yearly/monthly EIP
4. Confirm the configuration, select "I acknowledge the price change and agree
to proceed" and click Submit.
You can also select multiple EIPs and click Modify Bandwidth above the EIP list to
modify bandwidths in batches. Only dedicated bandwidths billed on a pay-per-use
basis can be modified in batches.
Helpful Links
● How Do I Change the EIP Billing Option from Bandwidth to Traffic or
from Traffic to Bandwidth?
● Can I Increase My Bandwidth Billed on Yearly/Monthly Basis and Then
Decrease It?
1.2.4 Binding or Unbinding an EIP
Scenarios
After EIPs are assigned, you can bind them to resources such as ECSs, BMSs,
virtual IP addresses, NAT gateways, and load balancers to allow them to
communicate with the Internet.
If your instance no longer requires an EIP, you can unbind the EIP from it. To bind
an EIP to a new instance, you need to first unbind it from the current one.
If you do not release the pay-per-use EIP after unbinding it, the EIP will be billed.
For details, see Releasing or Unsubscribing From an EIP.
NO TE
An EIP and its bound cloud resource can use different billing modes.
Elastic IP
User Guide 1 Elastic IP User Guide
Issue 01 (2026-08-21) Copyright © Huawei Technologies Co., Ltd. 18

--- Page 24 ---
Constraints
Binding an EIP
● An EIP can only be bound to an instance from its same region.
● An EIP can only be bound to an instance from its same account.
● An EIP cannot be bound to a frozen instance.
Unbinding an EIP
● An EIP cannot be unbound if its server is suspected of violations and the EIP is
frozen by the national supervision department.
● Your account will be frozen if it is in arrears and you cannot perform any
operations on pay-per-use resources in the retention period. After you top up
your account, you will be billed for expenditures generated by the pay-per-use
EIPs. You can view the expenditures on the Overview page of the Billing
Center.
Binding an EIP to an Instance
You can bind EIPs to resources such as ECSs, BMSs, virtual IP addresses, NAT
gateways, and load balancers to allow them to communicate with the Internet.
You can bind an EIP to an instance by calling the API. For details, see Binding an
EIP.
You can also bind an EIP to an instance on the console.
Binding an EIP to an ECS, BMS, or Virtual IP Address
1. Go to the EIP list page.
2. Locate the row that contains the EIP to be bound and click Bind in the
Operation column.
3. Select the instance.
4. Click OK.
NO TE
To bind an instance to an EIP:
● If the instance is an ECS:
● The ECS must be in the running or stopped status.
● The ECS and the EIP to be bound must be in the same region.
● The ECS has no EIP bound to it.
● If the instance is a virtual IP address:
● The virtual IP address and the EIP to be bound must be in the same region.
● The virtual IP address must be in the available or assigned status.
● If the instance is a BMS:
The BMS and the EIP to be bound must be in the same region.
Binding an EIP to a NAT Gateway
If you want to bind a NAT gateway to an EIP, the NAT gateway must be in the
same region as that of the EIP. After an EIP is bound to a NAT gateway, ECSs
Elastic IP
User Guide 1 Elastic IP User Guide
Issue 01 (2026-08-21) Copyright © Huawei Technologies Co., Ltd. 19

--- Page 25 ---
associated with this gateway can share the EIP to access the Internet or provide
services accessible from the Internet.
You can bind an EIP to a NAT gateway by configuring SNAT and DNAT rules for
the gateway. For details, see Using a Public NAT Gateway to Enable Servers to
Share One or More EIPs to Access the Internet and Using a Public NAT
Gateway to Enable Servers to Be Accessed by the Internet.
Binding an EIP to a Load Balancer
If you want to bind a load balancer to an EIP, the load balancer must be in the
same region as that of the EIP. Then, the load balancer can receive requests over
the Internet. For details, see Binding or Unbinding an IPv4 EIP.
Unbinding an EIP from an Instance
If an EIP is no longer required, you can unbind it from your instance.
You can use APIs to unbind EIPs from instances:
● Unbinding an EIP
● Unbinding EIPs in Batches
You can also unbind an EIP from an instance on the console.
Unbinding an EIP from an ECS, BMS, or Virtual IP Address
Unbinding a single EIP
1. Go to the EIP list page.
2. On the displayed page, locate the row that contains the target EIP, and click
Unbind in the Operation column.
A confirmation dialog box is displayed.
3. Confirm the information and click OK.
In the EIP list, the target EIP has no associated instance.
Unbinding multiple EIPs at a time
1. Go to the EIP list page.
2. On the displayed page, select the EIPs to be unbound.
3. In the upper left corner of the EIP list, click Unbind.
A confirmation dialog box is displayed.
4. Confirm the information and click OK.
In the EIP list, the target EIPs have no associated instances.
Unbinding an EIP from a NAT Gateway
You can unbind an EIP from a NAT gateway by deleting the SNAT and DNAT rules.
For details, see Deleting a DNAT Rule and Deleting an SNAT Rule.
Elastic IP
User Guide 1 Elastic IP User Guide
Issue 01 (2026-08-21) Copyright © Huawei Technologies Co., Ltd. 20

--- Page 26 ---
Unbinding an EIP from a Load Balancer
You can unbind an EIP from a load balancer on the ELB console. For details, see
Binding or Unbinding an IPv4 EIP.
NO TE
If a pay-per-use EIP is unbound from an instance, the EIP will be billed to keep it allocated
to your account unless it is released.
If an EIP billed by bandwidth is unbound from an instance, the bandwidth will continue to
be billed.
If you have any questions about the billing, see Why Am I Still Being Billed After My EIP
Has Been Unbound or Released?
No Instance Available for EIP Binding
There are no instances available when you want to bind an instance to an EIP.
● You have instances, but an EIP cannot be bound to any of them.
– An EIP can only be bound to an instance from its same region.
– An EIP can only be bound to an instance from its same account.
– An EIP cannot be bound to a frozen instance.
● There are no instances.
Create an ECS, create a BMS, or assign a virtual IP address.
1.2.5 Releasing or Unsubscribing From an EIP
Scenarios
If an EIP is no longer required, you can unbind it from your instance and release it
if it is a pay-per-use EIP or unsubscribe from it if it is a yearly/monthly EIP. If you
do not release a pay-per-use EIP in a timely manner after unbinding it, the EIP
continues to be billed for the reservation price. This section describes how to
release or unsubscribe from an EIP.
Constraints
● An EIP that has been bound to an instance cannot be released or
unsubscribed from.
● Yearly/Monthly EIPs can only be unsubscribed from.
If you no longer need a yearly/monthly resource, but the subscription has not
yet expired, you can unsubscribe from it. Depending on what coupons were
used for the purchase, Huawei Cloud may issue you a refund. For details
about unsubscription rules, see Unsubscriptions.
● An EIP cannot be released or unsubscribed if its server is suspected of
violations and the EIP is frozen by the national supervision department.
● The system preferentially assigns EIPs to you from the ones you released or
unsubscribed from, if any. However, if any of these EIPs is already assigned to
another user, it cannot be re-assigned to you.
For details, see Assigning a Specific EIP Using an API.
Elastic IP
User Guide 1 Elastic IP User Guide
Issue 01 (2026-08-21) Copyright © Huawei Technologies Co., Ltd. 21

--- Page 27 ---
Releasing a Pay-per-Use EIP
You can release a pay-per-use EIP on the console or by calling an API.
Releasing a Pay-per-Use EIP on the Console
1. Go to the EIP list page.
2. In the EIP list, locate the row that contains the EIP and choose More >
Release in the Operation column.
A confirmation dialog box is displayed.
3. Confirm the information and click OK.
You can find that the EIP is not in the EIP list.
You can also select multiple EIPs and choose More > Release above the list to
release EIPs. Only pay-per-use EIPs can be released in batches.
API
You can release a pay-per-use EIP by calling the API. For details, see Releasing an
EIP.
Unsubscribing From a Yearly/Monthly EIP
You can unsubscribe from a yearly/monthly EIP on the console or by calling an
API.
Unsubscribing from a Yearly/monthly EIP on the Console
1. Go to the EIP list page.
2. In the EIP list, locate the target EIP, and choose More > Unsubscribe in the
Operation column. The page for unsubscribing from resources is displayed.
3. Confirm the information and click Confirm. A confirmation dialog box is
displayed.
4. Confirm the information and click OK.
You can find that the EIP is not in the EIP list.
You can also select multiple EIPs and choose More > Unsubscribe above the list
to release EIPs. Only yearly/monthly EIPs can be unsubscribed from in batches.
API
To unsubscribe from a yearly/monthly EIP, refer to Unsubscribing from Yearly/
Monthly Resources.
Scenarios Where EIPs Cannot Be Released or Unsubscribed from
● An EIP has been bound to an instance.
Only EIPs that have no instances bound can be released or unsubscribed from.
To release or unsubscribe from an EIP that has been bound to an instance,
unbind it first. For details, see Binding or Unbinding an EIP.
● Yearly/Monthly EIPs
Elastic IP
User Guide 1 Elastic IP User Guide
Issue 01 (2026-08-21) Copyright © Huawei Technologies Co., Ltd. 22

--- Page 28 ---
Yearly/Monthly EIPs cannot be released. If you no longer need them, you can
unsubscribe them.
● Frozen EIPs
An EIP cannot be released or unsubscribed if its server is suspected of
violations and the EIP is frozen by the national supervision department. For
details, see Why My EIPs Are Frozen? How Do I Unfreeze My EIPs?
1.2.6 Exporting EIP Information
Scenarios
The information of all EIPs under your account can be exported in an Excel file to
a local directory. The file records the IDs, statuses, types, bandwidth names, and
bandwidth sizes of EIPs.
Procedure
1. Go to the EIP list page.
2. On the EIP list page, select one or more EIPs and click Export in the upper left
corner.
The system will automatically export all EIPs to an Excel file and download
the file to a local directory.
1.2.7 Managing EIP Tags
Scenarios
You can add tags to EIPs to help identify and manage them more easily. You can
add a tag to an EIP when assigning the EIP. Alternatively, you can add a tag to an
assigned EIP on the EIP details page. A maximum of 20 tags can be added to each
EIP.
If your organization has created a tag policy for EIP, you need to add tags for EIP
based on the tag policy. If a tag does not comply with the tagging rules, the EIP
may fail to be created or the tag may fail to be added. Contact the organization
administrator to learn more about the tag policy.
NO TE
The Organizations service is in open beta test (OBT). To use organization rules, apply for
OBT.
A tag consists of a key and value pair. Table 1-4 lists the tag key and value
requirements.
Elastic IP
User Guide 1 Elastic IP User Guide
Issue 01 (2026-08-21) Copyright © Huawei Technologies Co., Ltd. 23

--- Page 29 ---
Table 1-4 EIP tag requirements
Parame
ter
Requirement Example Value
Key ● For each resource, each tag key must be
unique, and each tag key can only have one
tag value.
● Cannot be left blank.
● Can contain a maximum of 128 characters.
● Cannot start or end with a space.
Ipv4_key1
Value ● Can be left blank.
● Can contain a maximum of 255 characters.
● Cannot start or end with a space.
eip-01
 
Searching for EIPs by Tags
Searching for EIPs by tag key and value on the EIP list page
1. Go to the EIP list page.
2. In the search box above the EIP list, click anywhere in the box to set filters.
Select the tag key and then the value as required. The system filters resources
based on the tag you select.
Adding, Deleting, Modifying, and Viewing Tags
1. Go to the EIP list page.
2. In the EIP list, click the target EIP.
The EIP details page is displayed.
3. Click the Tags tab and then click Edit Tag in the upper left corner above the
tag list.
The Edit Tag page is displayed.
4. Perform the following operations on the tags as required:
– Adding a tag: Click 
 , enter a tag key and value, and click OK.
– Modifying a tag: Click 
  next to the target tag key or value to delete the
original value, enter a new value, and click OK.
– Deleting a tag: Click Delete next to the target tag and click OK.
1.2.8 Managing Idle EIPs
Scenarios
Idle EIPs are those that are not in use. Identifying idle EIPs helps you better
manage costs. This section describes how to manage idle EIPs.
You can view EIPs that are not bound to any cloud resource in the idle EIP list. You
can also release or bind idle EIPs based on service requirements.
Elastic IP
User Guide 1 Elastic IP User Guide
Issue 01 (2026-08-21) Copyright © Huawei Technologies Co., Ltd. 24

--- Page 30 ---
Viewing Idle EIPs
1. Go to the EIP list page.
2. Click Idle EIPs above the EIP list to go to the idle EIP list.
3. In the idle EIP list, view the idle EIPs.
Managing Idle EIPs
You can perform the following operations on idle EIPs as required.
Table 1-5 Operations supported on idle EIPs
Operation Description
Releasing or
unsubscribin
g from an
idle EIP
If an idle EIP is no longer required, you can release or
unsubscribe from it.
● Releasing an idle EIP billed on a pay-per-use basis
1. In the idle EIP list, locate the target idle EIP and click
Release in the Operation column.
2. In the displayed dialog box, click OK.
● Unsubscribing from an idle EIP billed on a yearly/monthly
basis
1. In the idle EIP list, locate the target idle EIP and click
Unsubscribe in the Operation column.
The page for unsubscribing from resources is displayed.
2. Confirm the resource and refund information and click
Confirm. A confirmation dialog box is displayed.
3. Confirm the information and click OK.
For more information about releasing or unsubscribing from an
EIP, see Releasing or Unsubscribing From an EIP.
Binding an
idle EIP to a
cloud
resource
1. In the idle EIP list, locate the target idle EIP and click Bind in
the Operation column.
2. In the displayed dialog box, click OK.
For more information about binding an EIP to a cloud resource,
see Binding or Unbinding an EIP.
 
1.2.9 EIP Configuration Examples
1.2.9.1 Changing an EIP for an Instance
Scenarios
If you want to change an EIP for an ECS, a load balancer, a NAT gateway, or other
cloud resources, you need to unbind the current EIP from the cloud resource first.
Then, you can bind a new EIP to the cloud resource to enable Internet access for
it.
Elastic IP
User Guide 1 Elastic IP User Guide
Issue 01 (2026-08-21) Copyright © Huawei Technologies Co., Ltd. 25

--- Page 31 ---
Changing an EIP for a Cloud Resource
Figure 1-8 Process description
Table 1-6 Process description
No. Procedure Description
1 Unbind an EIP After an EIP is unbound from a cloud resource, the
cloud resource can have a new EIP bound for
Internet access.
2 Assign a new EIP If you already have an EIP that you require, skip this
step.
3 Bind a new EIP After a cloud resource has a new EIP bound, it can
access the Internet using the new EIP.
4 Release the EIP
that has been
unbound
● If an unbound EIP still needs to be used, skip this
step.
● If an unbound EIP is no longer required, you can
release it. If you do not release an unbound EIP,
it will continue to be billed.
 
Scenario 1: Unbinding an EIP from an ECS and Binding a New EIP to the ECS
1. Unbind an EIP.
a. Go to the EIP list page.
b. On the displayed page, locate the row that contains the target EIP, and
click Unbind in the Operation column.
A confirmation dialog box is displayed.
c. Confirm the information and click OK.
In the EIP list, the target EIP has no associated instance.
2. Assign an EIP.
NO TE
If you already have an EIP that you require, skip this step.
a. Go to the EIP list page.
b. On the displayed page, click Buy EIP.
c. Configure parameters as prompted.
d. Click Next.
3. Bind the new EIP to the ECS.
a. Go to the EIP list page.
b. On the EIPs page, locate the target EIP, and click Bind in the Operation
column.
Elastic IP
User Guide 1 Elastic IP User Guide
Issue 01 (2026-08-21) Copyright © Huawei Technologies Co., Ltd. 26

--- Page 32 ---
c. Select the desired ECS.
d. Click OK.
4. Release the EIP that is unbound.
NO TE
If an unbound EIP is no longer required, you can release it. If you do not release an
unbound EIP, it will continue to be billed.
a. Go to the EIP list page.
b. In the EIP list, locate the row that contains the EIP and choose More >
Release in the Operation column.
A confirmation dialog box is displayed.
c. Confirm the information and click OK.
You can find that the EIP is not in the EIP list.
Scenario 2: Unbinding an EIP from a Load Balancer and Binding a New EIP
to the Load Balancer
1. Assign an EIP by referring to 2.
NO TE
If you already have an EIP that you require, skip this step.
2. Unbind an EIP from a load balancer and bind the new EIP to the load
balancer.
a. Go to the load balancer list page.
b. On the displayed page, locate the row that contains the load balancer
and click More in the Operation column.
i. Unbinding an IPv4 EIP
1) Click Unbind IPv4 EIP.
2) In the displayed dialog box, confirm the IPv4 EIP that you want
to unbind and click OK.
ii. Binding an IPv4 EIP
1) Click Bind IPv4 EIP.
2) In the Bind IPv4 EIP dialog box, select the EIP you want to bind
to the load balancer and click OK.
3. Release the EIP that was replaced. For details, see 4.
NO TE
If an unbound EIP is no longer required, you can release it. If you do not release an
unbound EIP, it will continue to be billed.
Scenario 3: Unbinding an EIP from a NAT Gateway and Binding a New EIP to
the NAT Gateway
1. Assign an EIP by referring to 2.
NO TE
If you already have an EIP that you require, skip this step.
Elastic IP
User Guide 1 Elastic IP User Guide
Issue 01 (2026-08-21) Copyright © Huawei Technologies Co., Ltd. 27

--- Page 33 ---
2. Modify an SNAT rule.
For details, see Modifying an SNAT Rule. In the EIP list, select the new EIP
and deselect the existing EIP.
3. Modify a DNAT rule.
For details, see Modifying a DNAT Rule. Select the newly assigned EIP.
4. Release the EIP that was replaced. For details, see 4.
NO TE
If an unbound EIP is no longer required, you can release it. If you do not release an
unbound EIP, it will continue to be billed.
1.2.9.2 Binding an EIP to the Extended Network Interface of an ECS to
Enable Internet Access
Scenarios
As shown in Figure 1-9, the ECS has two network interfaces, one primary network
interface and one extended network interface. You can bind an EIP to the
extended network interface of the ECS and configure policy-based routes to
ensure that the ECS can access the Internet through the EIP.
This section uses a Linux ECS as an example.
CA UTION
● After the configuration, the ECS will access the Internet through the EIP bound
to the extended network interface instead of the EIP bound to the primary
network interface. The ECS will not be able to communicate with the Internet
through the primary network interface, and the original network connection
will be interrupted. Exercise caution when performing this operation.
● Before performing the following operations, you need to configure policy-based
routes for the ECS with multiple network interfaces to ensure that the primary
and extended network interfaces of the ECS can communicate with external
networks. For details, see Configuring Policy-based Routes for an ECS with
Multiple Network Interfaces.
Elastic IP
User Guide 1 Elastic IP User Guide
Issue 01 (2026-08-21) Copyright © Huawei Technologies Co., Ltd. 28

--- Page 34 ---
Figure 1-9 Accessing the Internet through the EIP bound to the extended network
interface
Step 1: Create Cloud Resources and Attach an Extended Network Interface
1. Create a VPC and two subnets in the VPC.
In this example, the primary and extended network interfaces of the ECS are
in different subnets.
For details, see Creating a VPC and Subnet.
2. Create an ECS in the VPC subnet.
For details, see Purchasing an ECS in Custom Config Mode.
3. Create a network interface and attach it to the ECS as an extended network
interface.
When creating a network interface, select a different subnet from where the
primary network interface is created. For details, see Creating a Network
Interface.
Attach the network interface to the ECS. For details, see Attaching a
Network Interface to a Cloud Server.
4. Assign an EIP and bind it to the extended network interface of the ECS.
For details, see Assigning an EIP.
Bind the EIP to the extended network interface of the ECS. For details, see
Binding an EIP to a Network Interface.
Step 2: Obtain the ECS Network Information
Before configuring policy-based routes for the extended network interface, you
need to obtain the network information in Table 1-7.
Elastic IP
User Guide 1 Elastic IP User Guide
Issue 01 (2026-08-21) Copyright © Huawei Technologies Co., Ltd. 29

--- Page 35 ---
Table 1-7 Required ECS network information
Item Primary Network
Interface
Extended Network Interface
Private IP address of
the network
interface
192.168.11.42 192.168.17.191
Subnet gateway
address
192.168.11.1 192.168.17.1
 
1. Obtain the private IP addresses of the ECS's network interfaces.
a. Go to the ECS list page.
b. In the ECS list, locate the target ECS and click its name.
The Summary tab page of the ECS is displayed.
c. Click the Network Interfaces tab and view the private IP addresses of
the primary and extended network interfaces of the ECS.
2. Obtain the gateway address of the subnet.
a. Go to the ECS list page.
b. In the ECS list, locate the target ECS and click its name.
The Summary tab page of the ECS is displayed.
c. In the ECS Information area, click the VPC name.
The Virtual Private Cloud page is displayed.
d. In the VPC list and click the number in the Subnets column.
The Subnets page is displayed.
e. In the subnet list, click the subnet name.
The Summary page is displayed.
f. In the Gateway and DNS Information area, view the gateway address of
the subnet.
Figure 1-10 Viewing the gateway address of the subnet
Step 3: Configure Policy-based Routes for the Extended Network Interface
1. ECS Remotely log in to the ECS.
For details, see How Do I Log In to My ECS?
2. Run the following command to query the route information of the network
interface:
Elastic IP
User Guide 1 Elastic IP User Guide
Issue 01 (2026-08-21) Copyright © Huawei Technologies Co., Ltd. 30

--- Page 36 ---
route -n
The following figure is displayed. In this figure:
– The destination of the route for the primary network interface is
192.168.11.0/24.
– The destination of the route for the extended network interface is
192.168.17.0/24.
3. Run the following command to query the network interface names of the
ECS:
ifconfig
The following figure is displayed. Search for the network interface name
based on the network interface address. In this figure:
– 192.168.11.42 is the IP address of the primary network interface, and the
network interface name is eth0.
– 192.168.17.191 is the IP address of the extended network interface, and
the network interface name is eth1.
4. Configure the default route for the ECS so that it can access the Internet
through the extended network interface.
a. Run the following command to delete the default route of the primary
network interface:
route del -net 0.0.0.0 gw <subnet-gateway-IP-address> dev <network
interface-name>
Elastic IP
User Guide 1 Elastic IP User Guide
Issue 01 (2026-08-21) Copyright © Huawei Technologies Co., Ltd. 31

--- Page 37 ---
The parameters are described as follows:
▪ 0.0.0.0: destination IP address, indicating that multiple IP addresses
are matched. Do not change the value.
▪ Subnet gateway IP address: Enter the subnet gateway address of the
primary network interface collected in section Table 1-7.
▪ Network interface name: Enter the name of the primary network
interface obtained in 3.
Example command:
route del -net 0.0.0.0 gw 192.168.11.1 dev eth0
CA UTION
This operation will interrupt the ECS traffic. Ensure that services will not
be affected before deleting the default route of the primary network
interface.
b. Run the following command to configure the default route for the
extended network interface:
route add default gw Subnet-gateway-IP-address
The parameters are described as follows:
Subnet gateway IP address: Enter the subnet gateway address of the
extended network interface collected in section Table 1-7.
Example command:
route add default gw 192.168.17.1
5. Verify network connectivity.
Run the following command to check whether the ECS can access the
Internet:
ping Public-IP-address-or-domain-name
Example command:
ping support.huaweicloud.com
If information similar to the following is displayed, the ECS can communicate
with the Internet.
[root@ecs-a01 ~]# ping support.huaweicloud.com
PING hcdnw.cbg-notzj.c.cdnhwc2.com (203.193.226.103) 56(84) bytes of data.
64 bytes from 203.193.226.103 (203.193.226.103): icmp_seq=1 ttl=51 time=2.17 ms
64 bytes from 203.193.226.103 (203.193.226.103): icmp_seq=2 ttl=51 time=2.13 ms
64 bytes from 203.193.226.103 (203.193.226.103): icmp_seq=3 ttl=51 time=2.10 ms
64 bytes from 203.193.226.103 (203.193.226.103): icmp_seq=4 ttl=51 time=2.09 ms
...
--- hcdnw.cbg-notzj.c.cdnhwc2.com ping statistics ---
4 packets transmitted, 4 received, 0% packet loss, time 3004ms
rtt min/avg/max/mdev = 2.092/2.119/2.165/0.063 ms
CA UTION
The routes configured above are temporary. They take effect immediately but
are lost after a cloud server restart.
Elastic IP
User Guide 1 Elastic IP User Guide
Issue 01 (2026-08-21) Copyright © Huawei Technologies Co., Ltd. 32

--- Page 38 ---
1.3 IPv6 EIP
1.3.1 IPv6 EIP Overview
Overview
Both IPv4 and IPv6 EIPs are available. You can map an existing IPv4 EIP to an IPv6
EIP.
After the IPv6 EIP function is enabled, you will obtain both an IPv4 EIP and its
corresponding IPv6 EIP. External IPv6 addresses can access cloud resources through
this IPv6 EIP.
IPv4 EIPs are billed. IPv6 EIPs are currently free, but will be billed at a later date
(price yet to be determined).
Application Scenarios of IPv4/IPv6 Dual Stack
If your ECS supports IPv6, you can use the IPv4/IPv6 dual stack. For details about
application scenarios and resource planning, see Table 1-8.
The ECS flavors that support IPv6 vary depending on regions and AZs. Check
whether an ECS flavor supports IPv6 after you select a region and AZ on the
management console.
Figure 1-11 Checking whether an ECS flavor supports IPv6
If the value of IPv6 is Yes for an ECS flavor, the flavor supports IPv6.
NO TE
AZ and Flavor determine whether IPv6 is supported.
After you select an AZ, if IPv6 is not displayed or the value of IPv6 is No of a flavor in the
flavor list, IPv6 is not supported by the flavor.
Elastic IP
User Guide 1 Elastic IP User Guide
Issue 01 (2026-08-21) Copyright © Huawei Technologies Co., Ltd. 33

--- Page 39 ---
Table 1-8 Application scenarios of IPv4/IPv6 dual stack
Appli
cable
Scena
rio
Description Requirement IPv4
or
IPv6
Subne
t
ECS
Privat
e IPv4
comm
unicat
ion
Your
applications
on an ECS
need to
communica
te with
other
systems
(such as
databases)
through
private
networks
using IPv4
addresses.
● The ECS has no EIP bound. IPv4
CIDR
block
Private IPv4
address: used
for private
IPv4
communicatio
ns.
Public
IPv4
comm
unicat
ion
Your
applications
on an ECS
need to
communica
te with
other
systems
(such as
databases)
through
public IPv4
addresses.
● The ECS has an EIP bound. IPv4
CIDR
block
● Private
IPv4
address:
used for
private IPv4
communica
tions.
● Public IPv4
address:
used for
public IPv4
communica
tions.
Elastic IP
User Guide 1 Elastic IP User Guide
Issue 01 (2026-08-21) Copyright © Huawei Technologies Co., Ltd. 34

--- Page 40 ---
Appli
cable
Scena
rio
Description Requirement IPv4
or
IPv6
Subne
t
ECS
Privat
e IPv6
comm
unicat
ion
Your
applications
on an ECS
need to
communica
te with
other
systems
(such as
databases)
through
private IPv6
addresses.
● The VPC subnet has IPv6
enabled.
● The network has been
configured for the ECS as
follows:
– Flavor: Any ECS flavor
that supports the IPv6
network. For details, see
Elastic Cloud Server
User Guide.
– VPC and subnet: IPv6-
enabled subnet and VPC
– Self-assigned IPv6
address: Selected.
– Shared bandwidth: Not
configured.
● IPv
4
CID
R
blo
ck
● IPv
6
CID
R
blo
ck
● Private
IPv4
address +
IPv4 EIP:
Bind an
IPv4 EIP to
the ECS to
allow public
IPv4
communica
tions.
● Private
IPv4
address: Do
not bind
any IPv4
EIP to the
ECS and
use the
private IPv4
address for
private IPv4
communica
tions.
● IPv6
address: Do
not add the
IPv6
address to
a shared
bandwidth.
Use the
IPv6
address for
private IPv6
communica
tions.
Elastic IP
User Guide 1 Elastic IP User Guide
Issue 01 (2026-08-21) Copyright © Huawei Technologies Co., Ltd. 35

--- Page 41 ---
Appli
cable
Scena
rio
Description Requirement IPv4
or
IPv6
Subne
t
ECS
Public
IPv6
comm
unicat
ion
An IPv6
network is
required for
the ECS to
access the
IPv6 service
on the
Internet.
● The VPC subnet has IPv6
enabled.
● The network has been
configured for the ECS as
follows:
– Flavor: Any ECS flavor
that supports the IPv6
network. For details
about the ECS flavors
that support the IPv6
network, see Elastic
Cloud Server User
Guide.
– VPC and subnet: IPv6-
enabled subnet and VPC
– Self-assigned IPv6
address: Selected.
– Shared bandwidth:
Selected a shared
bandwidth.
NOTE
For details, see Setting Up an
IPv6 Network.
● IPv
4
CID
R
blo
ck
● IPv
6
CID
R
blo
ck
● Private
IPv4
address +
IPv4 EIP:
Bind an
IPv4 EIP to
the ECS to
allow public
IPv4
communica
tions.
● Private
IPv4
address: Do
not bind
any IPv4
EIP to the
ECS and
use the
private IPv4
address for
private IPv4
communica
tions.
● IPv6
address +
shared
bandwidth:
Allow both
private IPv6
communica
tions and
public IPv6
communica
tions.
 
For details, see IPv4 and IPv6 Dual-Stack Network.
Application Scenarios of IPv6 EIP
If you want an ECS to provide IPv6 services but the ECS does not support IPv6
networks or you do not want to build an IPv6 network, you can use IPv6 EIP to
quickly address your requirements. For details about application scenarios and
resource planning, see Table 1-9.
Elastic IP
User Guide 1 Elastic IP User Guide
Issue 01 (2026-08-21) Copyright © Huawei Technologies Co., Ltd. 36

--- Page 42 ---
Table 1-9 Application scenarios and resource planning of an IPv6 EIP network
(with IPv6 EIP enabled)
Applic
able
Scenar
io
Description Requirement IPv4 or
IPv6
Subnet
ECS
Public
IPv6
comm
unicati
on
You want to
allow an ECS to
provide IPv6
services for
clients on the
Internet without
setting up an
IPv6 network.
● The ECS
has an EIP
bound.
● IPv6 EIP
has been
enabled.
IPv4
CIDR
block
● Private IPv4
address: used for
private IPv4
communications.
● IPv4 EIP (with IPv6
EIP enabled): used
for public network
communications
through IPv4 and
IPv6 addresses.
 
Elastic IP
User Guide 1 Elastic IP User Guide
Issue 01 (2026-08-21) Copyright © Huawei Technologies Co., Ltd. 37

--- Page 43 ---
Application Scenarios and Resource Planning of IPv6 Networks
Figure 1-12 Application scenarios and resource planning of IPv6 networks
1.3.2 Enabling or Disabling IPv6 EIP
Scenarios
If your applications deployed on an ECS need to provide services through IPv6
addresses but the ECS does not support IPv6 networks and you do not want to
build an IPv6 network either, you can use the IPv6 EIP function to quickly meet
your requirements.
Enabling IPv6 EIP
● Method 1:
Assign an EIP with IPv6 EIP enabled by referring to section Assigning an EIP.
After the IPv6 EIP function is enabled, you will obtain both an IPv4 EIP and an
IPv6 EIP. External IPv6 addresses can access cloud resources through this IPv6
EIP.
Elastic IP
User Guide 1 Elastic IP User Guide
Issue 01 (2026-08-21) Copyright © Huawei Technologies Co., Ltd. 38

--- Page 44 ---
● Method 2:
If you want an IPv6 EIP in addition to an existing IPv4 EIP, locate the row that
contains the target IPv4 EIP, click More in the Operation column, and select
Enable IPv6 EIP. Then, a corresponding IPv6 EIP will be assigned.
After the IPv6 EIP function is enabled, you will obtain both an IPv4 EIP and an
IPv6 EIP. External IPv6 addresses can access cloud resources through this IPv6
EIP.
NO TE
● Only dynamic BGP EIPs support the IPv6 EIP function.
● There is no adverse impact on the cloud resources bound with existing IPv4 EIPs.
Configuring Security Groups
After the IPv6 EIP function is enabled, you need to configure security group rules
to allow traffic to and from 198.19.0.0/16. For details about the security group
rules, see Table 1-10. IPv6 EIP uses NAT64 to convert the source IP address in the
inbound direction to an IPv4 address in the IP address range 198.19.0.0/16. The
source port can be a random one, the destination IP address is the private IPv4
address of your local server, and the destination port remains unchanged.
For details, see Virtual Private Cloud User Guide.
Table 1-10 Security group rules
Direction Protocol Source/Destination
Inbound All
NOTE
Configure as required.
Source: 198.19.0.0/16
Outboun
d
All Destination: 198.19.0.0/16
 
Disabling IPv6 EIP (Releasing an IPv6 EIP)
If you do not need an IPv6 EIP anymore, do as follows:
1. Configure security group rules to deny traffic to and from 198.19.0.0/16.
2. In the EIP list, locate the row that contains its corresponding IPv4 EIP, click
More in the Operation column, and click Disable IPv6 EIP. Then, the IPv6 EIP
will also be released.
You will only have the IPv4 EIP.
1.4 EIP Billing
Elastic IP
User Guide 1 Elastic IP User Guide
Issue 01 (2026-08-21) Copyright © Huawei Technologies Co., Ltd. 39

--- Page 45 ---
1.4.1 Changing EIP Billing Mode
Scenarios
The EIP service provides multiple billing modes for you to select. You can change
your EIP billing mode during the EIP usage period if necessary.
NO TE
Changing the billing mode does not change EIPs or interrupt their use.
Table 1-11 describes the details of changing EIP billing modes.
Table 1-11 EIP billing mode change description
Change Description
From yearly/monthly to pay-
per-use
● An EIP billed on a yearly/monthly basis can be
directly changed to be billed by bandwidth on
a pay-per-use basis immediately or upon
expiration.
● An EIP billed on a yearly/monthly basis
cannot be directly changed to be billed by
traffic on a pay-per-use basis. To change this:
1. Change the EIP to be billed by bandwidth
on a pay-per-use basis.
2. Change the EIP to be billed by traffic on a
pay-per-use basis.
The new billing mode takes effect only after the
yearly/monthly subscription expires, if you want
to change the EIP to be billed by bandwidth on a
pay-per-use basis upon expiration. The new
billing mode takes effect immediately, if you
want to change the EIP to be billed by
bandwidth on a pay-per-use basis immediately.
From pay-per-use to yearly/
monthly
● An EIP that is billed by bandwidth on a pay-
per-use basis can be directly changed to be
billed on a yearly/monthly basis.
● An EIP that is billed by traffic on a pay-per-
use basis cannot be directly changed to be
billed on a yearly/monthly basis. To change
this:
1. Change the EIP to be billed by bandwidth
on a pay-per-use basis.
2. Change the EIP to be billed on a yearly/
monthly basis.
The new billing mode takes effect immediately.
Elastic IP
User Guide 1 Elastic IP User Guide
Issue 01 (2026-08-21) Copyright © Huawei Technologies Co., Ltd. 40

--- Page 46 ---
Change Description
● From billing by traffic
(pay-per-use) to billing
by bandwidth (pay-per-
use)
● From billing by
bandwidth (pay-per-use)
to billing by traffic (pay-
per-use)
● An EIP billed by traffic on a pay-per-use basis
can be directly changed to be billed by
bandwidth on a pay-per-use basis.
● An EIP billed by bandwidth on a pay-per-use
basis can be directly changed to be billed by
traffic on a pay-per-use basis.
The new billing mode takes effect immediately.
 
Related Operations
The operation guides are as follows:
● Yearly/Monthly to Pay-Per-Use
● Pay-per-Use to Yearly/Monthly
● Pay-per-Use EIPs: Billing Change Between By Traffic and By Bandwidth
1.4.2 Renewing a Yearly/Monthly EIP
Scenarios
You can renew a yearly/monthly EIP to extend its expiration date.
If your yearly/monthly resource is expired and is not renewed, the resource enters
the grace period. If you do not renew the yearly/monthly resource within the grace
period, the resource enters a retention period after the grace period has expired.
You cannot perform any operations on yearly/monthly resources that are in the
grace or retention period. For example, you cannot change your bandwidth if it is
in the grace period or retention period.
This section describes how to renew an EIP. Renewing EIPs does not change EIPs.
Procedure
1. Go to the EIP list page.
2. In the EIP list, renew a single EIP or multiple EIPs.
– Renewing a single EIP:
Locate the row that contains the EIP, and choose More > Renew in the
Operation column.
– Renewing multiple EIPs at once:
i. Select the EIPs in the EIP list and click Renew in the upper left corner
of the list.
ii. In the displayed dialog box, confirm the information and click Yes.
3. On the Renew page, configure the following parameters:
– Renewal Duration: Select a renewal period as required.
– Renewal Date: The new renewal date may result in slightly different
subscription lengths for different resources.
Elastic IP
User Guide 1 Elastic IP User Guide
Issue 01 (2026-08-21) Copyright © Huawei Technologies Co., Ltd. 41

--- Page 47 ---
4. Click Pay.
1.4.3 Viewing the EIP Billing Information
Scenarios
This section describes how to view the billing details of EIPs and their bandwidths.
To view the bandwidth usage, see Monitoring EIPs.
Procedure
1. Log in to the management console.
2. In the upper right corner of the page, choose Billing > Bills.
Figure 1-13 Bills
3. In the navigation pane on the left, choose Billing > Transactions and
Detailed Bills.
4. Click Transaction Bills and select the billing cycle to be viewed.
5. In the transaction bill list, locate the row that contains the target transaction
bill and click Details in the Operation column.
6. View details of the transaction bill.
1.5 EIP Pool
1.5.1 EIP Pool Overview
An EIP pool helps you manage a large number of EIPs and assigns EIPs with
dynamic BGP routing, ensuring network stability and optimal user experience. The
price of an EIP pool is subject to that displayed on the EIP pool console.
Notes and Constraints
● The billing mode of an EIP from an EIP pool cannot be changed to yearly/
monthly.
Elastic IP
User Guide 1 Elastic IP User Guide
Issue 01 (2026-08-21) Copyright © Huawei Technologies Co., Ltd. 42

--- Page 48 ---
EIP Pool Billing
EIP pools are billed on a yearly/monthly basis. A yearly/monthly EIP pool is billed
based on your purchased duration and the EIP quota you have specified. If your
EIP is allocated from an EIP pool, you only need to pay for the bandwidth
associated with the EIP.
You can renew a yearly/monthly EIP pool on the console anytime before it is
automatically released.
1.5.2 Purchasing an EIP Pool
Scenarios
EIP pools can only be billed on a yearly/monthly basis. The price of an EIP pool is
subject to that displayed on the EIP pool console. You can purchase multiple EIP
pools.
EIPs allocated from EIP pools do not occupy your EIP quota.
If your EIP is allocated from an EIP pool, you only need to pay for the bandwidth
associated with the EIP.
Procedure
1. In the upper right corner, click Buy EIP Pool.
2. Set the parameters as prompted.
Table 1-12 Parameter description
Item Parameter Description Example Value
Basic
Config
uration
Billing Mode The billing mode of the EIP
pool. EIP pools are billed on
a yearly/monthly basis.
Yearly/Monthly
Basic
Config
uration
Region Regions are geographic
areas that are physically
isolated from each other.
The networks inside different
regions are not connected to
each other, so resources
cannot be shared across
different regions. For lower
network latency and faster
access to your resources,
select the region nearest to
your target users.
-
EIP
Pool
EIP Type Dynamic BGP Pool Dynamic BGP
Pool
Elastic IP
User Guide 1 Elastic IP User Guide
Issue 01 (2026-08-21) Copyright © Huawei Technologies Co., Ltd. 43

--- Page 49 ---
Item Parameter Description Example Value
EIP
Pool
EIP Quota The number of EIPs in the
EIP pool.
An EIP pool assigns EIPs with
dynamic BGP routing,
ensuring network stability
and optimal user experience.
You can assign EIPs within
the EIP quota configured for
the EIP pool.
50
Basic
Inform
ation
Name The name of the EIP pool.
The name is 1–36 characters
long and can contain only
letters, digits, underscores
(_), hyphens (-), and periods
(.).
eipPool-test
Basic
Inform
ation
Description
(Optional)
Supplementary information
about the EIP pool. This
parameter is optional.
The description can contain
a maximum of 255
characters and cannot
contain angle brackets (<>).
-
Basic
Inform
ation
Required
Duration
Required duration of the EIP
pool.
3 months
Basic
Inform
ation
Auto-renew Whether to select Auto-
renew. You can select it if
the Billing Mode is set to
Yearly/Monthly. The auto-
renewal period is
determined by the purchase
duration.
● Monthly subscription: The
subscription is renewed
every month.
● Yearly subscription: The
subscription is renewed
each year.
-
 
3. Click Next.
Follow-up Operations
● Allocating EIPs from a specified EIP pool: If you need to buy pay-per-use EIPs,
you can select a purchased EIP pool and allocate EIPs from that pool as
needed. For details, see Assigning an EIP.
Elastic IP
User Guide 1 Elastic IP User Guide
Issue 01 (2026-08-21) Copyright © Huawei Technologies Co., Ltd. 44

--- Page 50 ---
– EIPs must be billed on a pay-per-use basis.
– EIPs and the EIP pool from which they are allocated must be in the same
region and must be of the same type.
– If your EIP is allocated from an EIP pool, you only need to pay for the
bandwidth associated with the EIP.
● ListPublicipPool: Use the API to query EIP pools.
1.5.3 Managing EIP Pools
Scenarios
You can perform the following operations to manage your EIP pools:
● Modifying the Quota of EIPs in an EIP Pool
● Renewing an EIP Pool
● Unsubscribing From an EIP Pool
Modifying the Quota of EIPs in an EIP Pool
1. Go to the EIP pool list page.
2. Locate the row that contains the EIP pool to be modified and click Modify in
the Operation column. On the displayed Modify EIP Pool page, modify the
EIP quota.
You can decrease or increase the quota as required. The change is applied
immediately.
– Decreasing the EIP quota in an EIP pool
Specify the EIP quota that is lower than the current quota of the EIP pool,
confirm the change, and click Submit.
– Increasing the EIP quota in an EIP pool
i. Specify the EIP quota that is greater than the current quota of the
EIP pool, confirm the change, and click Pay Now.
ii. On the payment page, select a payment method and click Pay.
Renewing an EIP Pool
1. Go to the EIP pool list page.
2. Locate the EIP pool to be renewed and click Renew in the Operation column.
3. On the Renew page, set the renewal duration.
4. Set Renewal Date.
The new renewal date may extend the subscription based on the current
subscription. You can check the renewal information in the table on the
Renew page.
5. On the payment page, confirm the order information and click Confirm.
Unsubscribing From an EIP Pool
1. Go to the EIP pool list page.
Elastic IP
User Guide 1 Elastic IP User Guide
Issue 01 (2026-08-21) Copyright © Huawei Technologies Co., Ltd. 45

--- Page 51 ---
2. Locate the EIP pool you want to unsubscribe from and click Unsubscribe in
the Operation column.
3. On the Unsubscribe from Resource page, click Confirm.
Follow-up Operations
To use the API to query EIP pools, refer to Querying EIP Pools.
1.6 Shared Bandwidth
1.6.1 Shared Bandwidth Overview
A shared bandwidth can be shared by multiple EIPs and controls the data transfer
rate on these EIPs in a centralized manner. All ECSs and load balancers that have
EIPs bound in the same region can share a bandwidth.
When you host a large number of applications on the cloud, if each EIP uses a
bandwidth, a lot of bandwidths are required, which significantly increases
bandwidth costs. If all EIPs share the same bandwidth, you can lower bandwidth
costs and easily perform system O&M.
NO TE
After QoS is enabled, you can configure the bandwidth limits for each EIP that uses the
shared bandwidth.
Advantages
● Lowered Bandwidth Costs
Region-level bandwidth sharing and multiplexing reduce bandwidth usage
and O&M costs.
● Flexible Operations
You can add pay-per-use EIPs (except for 5_gray EIPs of dedicated load
balancers) to or remove them from a shared bandwidth regardless of the type
of instances that they are bound to.
● Flexible Billing Modes
The yearly/monthly and pay-per-use billing modes are provided.
Methods of Using a Shared Bandwidth
You can use the shared bandwidth in either of the two ways shown in the
following table.
Elastic IP
User Guide 1 Elastic IP User Guide
Issue 01 (2026-08-21) Copyright © Huawei Technologies Co., Ltd. 46

--- Page 52 ---
Table 1-13 Methods of using a shared bandwidth
Description Step
Method 1: Assign a shared bandwidth and
add your pay-per-use EIPs to the bandwidth.
1. Assigning a Shared
Bandwidth
2. Adding EIPs to or
Removing EIPs from a
Shared Bandwidth
Method 2: Assign a shared bandwidth, set
Billed By to Shared Bandwidth and select
the shared bandwidth when you assign pay-
per-use EIPs.
1. Assigning a Shared
Bandwidth
2. Assigning an EIP
 
QoS
With QoS enabled, you can configure bandwidth limits for each EIP that uses the
shared bandwidth. The bandwidth of each EIP is guaranteed and will not affect
the other EIPs that use the same shared bandwidth, improving the shared
bandwidth utilization. The minimum bandwidth of the EIP that uses a shared
bandwidth can be configured when the shared bandwidth is congested. The
maximum bandwidth of the EIP that uses a shared bandwidth can be reached only
when the shared bandwidth is not used by any other EIP. The maximum
bandwidth cannot exceed the shared bandwidth.
This function supports both IPv4 and IPv6 EIPs. QoS can be enabled only when the
shared bandwidth is greater than or equal to 50 Mbit/s. For details about QoS, see
QoS.
QoS applies to the following scenarios:
● After you migrate services to the cloud, you want to allocate bandwidth to
each department in a unified manner, implementing proper allocation of
bandwidth resources.
● The peak hours of multiple services are different, and you want to limit the
bandwidth of all EIPs that use the same shared bandwidth to ensure efficient
use of bandwidth resources.
● If some services are attacked and occupy too much bandwidth, you need to
limit the bandwidth to prevent other services from being affected.
Shared Bandwidth Quotas
● Each account can have a maximum of 5 shared bandwidths. If you need more
shared bandwidths, submit a service ticket to request a quota increase.
● A maximum of 20 EIPs that are billed on a pay-per-use basis can be added to
a shared bandwidth. If you want to add more EIPs to a shared bandwidth,
submit a service ticket to request a quota increase.
● If you want to increase a pay-per-use shared bandwidth that is greater than 1
Gbit/s, the minimum increase is 500 Mbit/s.
Elastic IP
User Guide 1 Elastic IP User Guide
Issue 01 (2026-08-21) Copyright © Huawei Technologies Co., Ltd. 47

--- Page 53 ---
Notes and Constraints
● A shared bandwidth can only be used by resources from its same account.
● The minimum size of a shared bandwidth that can be purchased is 5 Mbit/s.
You can only add pay-per-use EIPs to a shared bandwidth.
● If a yearly/monthly shared bandwidth is deleted upon expiration, EIPs sharing
the bandwidth will be removed from the bandwidth and be billed based on
the mode before they are added to the shared bandwidth.
NO TE
● A dedicated bandwidth cannot be changed to a shared bandwidth and vice versa.
However, you can purchase a shared bandwidth for pay-per-use EIPs.
● Add an EIP to a shared bandwidth and then the EIP will use the shared bandwidth.
● Remove the EIP from the shared bandwidth and then the EIP will use the dedicated
bandwidth.
● If you want to submit a service ticket, refer to Submitting a Service Ticket.
Related Operations
● Adding EIPs to or Removing EIPs from a Shared Bandwidth: After a shared
bandwidth is assigned, you can add multiple pay-per-use EIPs to it so that all
EIPs share the same bandwidth.
● Modifying a Shared Bandwidth: You can change the size of the shared
bandwidth you have assigned.
1.6.2 Assigning a Shared Bandwidth
Scenarios
When you host a large number of applications on the cloud, if each EIP uses a
dedicated bandwidth, a lot of bandwidths are required, which incurs high costs. If
all EIPs share the same bandwidth, your network operation costs will be lowered
and your system O&M as well as resource statistics will be simplified.
A shared bandwidth can be used only after being assigned.
Procedure
You can assign a shared bandwidth on the console or by calling an API.
Procedure (on the Console)
1. Go to the Buy Shared Bandwidth page.
2. Configure parameters as prompted.
Elastic IP
User Guide 1 Elastic IP User Guide
Issue 01 (2026-08-21) Copyright © Huawei Technologies Co., Ltd. 48

--- Page 54 ---
Table 1-14 Description
Mo
dul
e
Parameter Description Example Value
Bas
ic
Co
nfi
gur
ati
on
Region Regions are geographic areas that are
physically isolated from each other.
The networks inside different regions
are not connected to each other, so
resources cannot be shared across
different regions. For lower network
latency and faster access to your
resources, select the region nearest to
you.
CN-Hong Kong
Bas
ic
Co
nfi
gur
ati
on
Billing
Mode
A shared bandwidth can be billed on
a yearly/monthly or pay-per-use
basis.
● Yearly/Monthly: You pay for the
bandwidth by year or month
before using it. No other charges
apply during the validity period of
the bandwidth.
● Pay-per-use: You pay for the
bandwidth based on the amount
of time you use the bandwidth.
Yearly/Monthly
Bas
ic
Co
nfi
gur
ati
on
Name The name of the shared bandwidth. Bandwidth-001
Bas
ic
Co
nfi
gur
ati
on
Enterprise
Project
The enterprise project that the shared
bandwidth belongs to.
An enterprise project facilitates
project-level management and
grouping of cloud resources and
users. The name of the default
project is default.
default
Elastic IP
User Guide 1 Elastic IP User Guide
Issue 01 (2026-08-21) Copyright © Huawei Technologies Co., Ltd. 49

--- Page 55 ---
Mo
dul
e
Parameter Description Example Value
Ba
nd
wid
th
Det
ails
Bandwidth
Type
Select a type of the shared bandwidth
based on your EIP type.
Dynamic BGP and static BGP EIPs can
be added to a standard shared
bandwidth.
Only premium dynamic BGP EIPs can
be added to a premium BGP shared
bandwidth.
NOTE
In the CN-Hong Kong region, only
dynamic BGP EIPs can be added to
standard shared bandwidths.
Standard
Elastic IP
User Guide 1 Elastic IP User Guide
Issue 01 (2026-08-21) Copyright © Huawei Technologies Co., Ltd. 50

--- Page 56 ---
Mo
dul
e
Parameter Description Example Value
Ba
nd
wid
th
Det
ails
Billed By The billing method for the shared
bandwidth.
You can specify a shared bandwidth
to be billed by bandwidth, more
traffic (outbound or inbound), or
95th percentile bandwidth
(enhanced).
NOTE
● 95th percentile bandwidth (enhanced)
or more traffic (outbound or inbound)
can be selected only when Billing
Mode is set to Pay-per-use.
● Only customers with a level of V4 or
higher can use the enhanced 95th
percentile bandwidth billing. Enhanced
95th percentile bandwidth billing is
based on average monthly bandwidth
usage excluding peak traffic values.
The charges will be deducted from
your account balance on a monthly
basis. You can specify the guaranteed
minimum bandwidth by setting the
bandwidth size and the minimum
bandwidth percentage. If the monthly
peak bandwidth is less than or equal
to the guaranteed minimum
bandwidth, you will be billed based on
the guaranteed minimum bandwidth.
If the monthly peak bandwidth is
greater than the guaranteed minimum
bandwidth, you will be billed based on
the monthly peak bandwidth.
● If the enhanced 95th percentile
bandwidth billing is used, the
minimum shared bandwidth is 300
Mbit/s.
For more information, see 95th
Percentile Bandwidth Billing
(Enhanced).
Bandwidth
Ba
nd
wid
th
Det
ails
Bandwidth
(Mbit/s)
The bandwidth size in Mbit/s. The
minimum value is 5 Mbit/s.
10
Elastic IP
User Guide 1 Elastic IP User Guide
Issue 01 (2026-08-21) Copyright © Huawei Technologies Co., Ltd. 51

--- Page 57 ---
Mo
dul
e
Parameter Description Example Value
Ba
nd
wid
th
Det
ails
QoS After QoS is enabled, you can
configure the bandwidth limits for
each EIP that uses the shared
bandwidth. This makes sure each EIP
gets enough bandwidth and uses it
better. Configuring bandwidth limits
for EIPs is free of charge. For details,
see QoS.
N/A
Re
qui
red
Du
rati
on
Required
Duration
The duration for which the purchased
shared bandwidth will be used. The
duration must be specified if the
Billing Mode is set to Yearly/
Monthly.
2 months
Re
qui
red
Du
rati
on
Auto-
renew
Whether to select Auto-renew. You
can select it if the Billing Mode is set
to Yearly/Monthly. The auto-renewal
period is determined by the required
duration.
● Monthly subscription: The
subscription is renewed every
month.
● Yearly subscription: The
subscription is renewed each year.
N/A
 
3. Click Next.
4. Confirm the configuration.
– If you set Billing Mode to Pay-per-Use, click Submit.
– If you set Billing Mode to Yearly/Monthly, click Pay Now.
On the payment page, confirm the order information and click Confirm.
API
● You can call the API to assign a shared bandwidth by referring to Assigning a
Shared Bandwidth.
● You can call the API to assign shared bandwidths in batches by referring to
Assigning Multiple Shared Bandwidths.
Related Operations
● Adding EIPs to or Removing EIPs from a Shared Bandwidth: After a shared
bandwidth is assigned, you can add multiple pay-per-use EIPs to it so that all
EIPs share the same bandwidth.
● Modifying a Shared Bandwidth: You can change the size of the shared
bandwidth you have assigned.
Elastic IP
User Guide 1 Elastic IP User Guide
Issue 01 (2026-08-21) Copyright © Huawei Technologies Co., Ltd. 52

--- Page 58 ---
● Viewing Bills of a Specific Resource: After a shared bandwidth is used, you
can view its bills.
1.6.3 Adding EIPs to or Removing EIPs from a Shared
Bandwidth
Scenarios
You can add EIPs to a shared bandwidth as required to share the bandwidth and
reduce public network bandwidth costs. You can also remove EIPs from a shared
bandwidth.
You can add multiple EIPs to a shared bandwidth at the same time.
● Adding EIPs to a Shared Bandwidth on the Console
● Removing EIPs from a Shared Bandwidth on the Console
Constraints
● To add an EIP to a shared bandwidth, the EIP must use the pay-per-use
billing, be in the same region, and be of the same type as the shared
bandwidth.
To add a yearly/monthly EIP to a shared bandwidth, you need to first change
its billing mode to pay-per-use.
● After an EIP is added to a shared bandwidth:
– The cloud service instance bound to the EIP uses the shared bandwidth.
– The original peak bandwidth of the EIP becomes invalid, and the EIP uses
the peak bandwidth of the shared bandwidth.
– The original billing mode of the EIP becomes invalid, and the EIP traffic
or bandwidth is no longer billed.
– The EIP reservation price is irrelevant to whether the EIP is added to a
shared bandwidth.
Procedure
You can add EIPs to a shared bandwidth on the console or by calling an API.
Adding EIPs to a Shared Bandwidth on the Console
1. Go to the shared bandwidth list page.
2. In the shared bandwidth list, locate the target shared bandwidth that you
want to add EIPs to. In the Operation column, choose Add Public IP Address.
3. On the Add Public IP Address page, click EIP or IPv6 Address and select the
EIPs or IPv6 addresses to be added.
You can add an EIP to a shared bandwidth even if it is already added to
another shared bandwidth. Adding an EIP to a new shared bandwidth
automatically removes it from the original one.
Elastic IP
User Guide 1 Elastic IP User Guide
Issue 01 (2026-08-21) Copyright © Huawei Technologies Co., Ltd. 53

--- Page 59 ---
NO TE
After an EIP is added to a shared bandwidth, its dedicated bandwidth becomes invalid
and the EIP starts using the shared bandwidth. The EIP's dedicated bandwidth is then
deleted and no longer billed.
4. Click OK.
API
You can call the API to add EIPs to a shared bandwidth. For details, see Adding an
EIP to a Shared Bandwidth.
Procedure
You can remove EIPs from a shared bandwidth on the console or by calling an API.
Removing EIPs from a Shared Bandwidth on the Console
1. Go to the shared bandwidth list page.
2. In the shared bandwidth list, locate the row that contains the bandwidth from
which EIPs are to be removed, choose More > Remove Public IP Address in
the Operation column.
3. On the Remove Public IP Address page, click EIP or IPv6 Address and select
the EIPs or IPv6 addresses to be removed.
4. Configure the EIP bandwidth after the EIP is removed. You can modify the EIP
billing mode and bandwidth size.
5. Click OK.
NO TE
An EIP remains unchanged after it is removed from a shared bandwidth. The EIP
bandwidth is billed based on its billing mode before the EIP is added to the shared
bandwidth.
API
To remove an EIP from a shared bandwidth, refer to Removing an EIP from a
Shared Bandwidth.
Helpful Links
What Are the Differences Between a Dedicated Bandwidth and a Shared
Bandwidth? Can a Dedicated Bandwidth Be Changed to a Shared Bandwidth
or the Other Way Around?
1.6.4 Modifying a Shared Bandwidth
Scenarios
You can modify the size of a shared bandwidth as required.
Elastic IP
User Guide 1 Elastic IP User Guide
Issue 01 (2026-08-21) Copyright © Huawei Technologies Co., Ltd. 54

--- Page 60 ---
● If a shared bandwidth is billed on a pay-per-use basis, the modification will
take effect immediately. For details, see Modifying a Shared Bandwidth
(Pay-per-Use).
● You can perform the following operations on a yearly/monthly shared
bandwidth:
– Increasing a Shared Bandwidth (Yearly/Monthly): The change will be
applied immediately and the price difference will be billed accordingly.
– Decreasing a Shared Bandwidth (Yearly/Monthly) Immediately: The
change will be applied immediately.
– Decreasing a Shared Bandwidth (Yearly/Monthly): The change will be
applied in the first billing cycle after a successful renewal.
If you want to change the billing mode of a shared bandwidth, see How Do I
Change My EIP Billing Mode from Pay-per-Use to Yearly/Monthly?
Modifying a Shared Bandwidth (Pay-per-Use)
1. Go to the shared bandwidth list page.
2. In the shared bandwidth list, locate the row that contains the shared
bandwidth you want to modify, click Modify Bandwidth in the Operation
column, and modify the bandwidth settings.
3. Confirm the configuration, select "I acknowledge the price change and agree
to proceed" and click Submit.
The modification takes effect immediately.
Increasing a Shared Bandwidth (Yearly/Monthly)
1. Go to the shared bandwidth list page.
2. In the shared bandwidth list, locate the row that contains the target shared
bandwidth, and click Modify Bandwidth in the Operation column.
3. Select Increase bandwidth and click Continue.
4. In the New Configuration area on the Modify Bandwidth page, change the
bandwidth size.
5. Select "I acknowledge the price change and agree to proceed" and click Pay
Now.
After you complete the payment, the change will be applied immediately.
Decreasing a Shared Bandwidth (Yearly/Monthly) Immediately
1. Go to the shared bandwidth list page.
2. In the shared bandwidth list, locate the target shared bandwidth, and click
Modify Bandwidth in the Operation column.
3. Select Decrease bandwidth immediately and click Continue.
4. In the New Configuration area on the Modify Bandwidth page, change the
bandwidth size.
5. Select "I acknowledge the price change and agree to proceed" and click
Submit.
After you complete the payment, the change will be applied immediately.
Elastic IP
User Guide 1 Elastic IP User Guide
Issue 01 (2026-08-21) Copyright © Huawei Technologies Co., Ltd. 55

--- Page 61 ---
Decreasing a Shared Bandwidth (Yearly/Monthly)
1. Go to the shared bandwidth list page.
2. In the shared bandwidth list, locate the row that contains the target shared
bandwidth, and click Modify Bandwidth in the Operation column.
3. Select Decrease bandwidth and click Continue.
4. In the New Configuration area on the Modify Bandwidth page, change the
bandwidth size.
5. Select "I acknowledge the price change and agree to proceed" and click Pay
Now.
After you complete the payment, the change will be applied in the first billing
cycle after the current subscription ends.
1.6.5 Deleting or Unsubscribing from a Shared Bandwidth
Scenarios
You can delete a pay-per-use shared bandwidth or unsubscribe from a yearly/
monthly shared bandwidth if it is no longer needed. This section describes how to
delete or unsubscribe from a shared bandwidth.
Notes and Constraints
If you want to delete or unsubscribe from a shared bandwidth with EIPs added,
you have to remove the EIPs from the shared bandwidth first. For details, see
Adding EIPs to or Removing EIPs from a Shared Bandwidth.
Deleting a Pay-per-Use Shared Bandwidth
1. Go to the shared bandwidth list page.
2. In the shared bandwidth list, locate the row that contains the pay-per-use
shared bandwidth you want to delete, click More in the Operation column,
and then click Delete.
3. Confirm the deletion as prompted. Click OK.
Unsubscribing from a Yearly/Monthly Shared Bandwidth
1. Go to the shared bandwidth list page.
2. In the shared bandwidth list, locate the row that contains the yearly/monthly
shared bandwidth you want to delete, choose More > Unsubscribe in the
Operation column. The unsubscription page is displayed.
3. Confirm the information and click Confirm. A confirmation dialog box is
displayed.
4. Confirm the information and click OK.
Return to the shared bandwidth list and check whether the target shared
bandwidth is unsubscribed from.
Elastic IP
User Guide 1 Elastic IP User Guide
Issue 01 (2026-08-21) Copyright © Huawei Technologies Co., Ltd. 56

--- Page 62 ---
Related Operations
● Adding EIPs to or Removing EIPs from a Shared Bandwidth: After a shared
bandwidth is assigned, you can add multiple pay-per-use EIPs to it so that all
EIPs share the same bandwidth.
● Modifying a Shared Bandwidth: You can change the size of the shared
bandwidth you have assigned.
● Viewing Bills of a Specific Resource: After a shared bandwidth is used, you
can view its bills.
1.6.6 Exporting Shared Bandwidths
Scenarios
You can export all your shared bandwidth as an Excel file to a local directory. The
Excel records the name, status, ID, type, size, and EIPs of each shared bandwidth.
Procedure
1. Go to the shared bandwidth list page.
2. On the shared bandwidth list page, select one or more shared bandwidths
and click Export in the upper left corner.
The system will automatically export information about all of your shared
bandwidths as an Excel file to a local directory.
1.6.7 QoS
Scenarios
You can enable or disable QoS as required. You can configure or cancel bandwidth
limits for each EIP using a shared bandwidth.
Constraints
● QoS can only be enabled when the shared bandwidth is at least equal to 50
Mbit/s.
● The maximum guaranteed bandwidth can be 2000 Mbit/s.
● The sum of guaranteed bandwidths that you configured for the EIPs in a
shared bandwidth cannot exceed the shared bandwidth.
● If the size of a shared bandwidth is changed, for example, its bandwidth add-
on package expires or the shared bandwidth is decreased, the guaranteed
bandwidth and the maximum bandwidth of the EIPs that use the shared
bandwidth may be affected.
● The bandwidth limit will be disabled when the bandwidth add-on package
used by the shared bandwidth expires.
Enabling QoS
● Assign a shared bandwidth by referring to Assigning a Shared Bandwidth
and select the QoS option.
Elastic IP
User Guide 1 Elastic IP User Guide
Issue 01 (2026-08-21) Copyright © Huawei Technologies Co., Ltd. 57

--- Page 63 ---
Figure 1-14 Selecting the QoS option
● In the shared bandwidth list, locate the row that contains the shared
bandwidth, click More in the Operation column, and click Enable QoS.
Figure 1-15 Enabling QoS
Disabling QoS
In the shared bandwidth list, locate the target shared bandwidth, click More in the
Operation column, and click Disable QoS.
Figure 1-16 Disabling QoS
Configuring or Canceling Bandwidth Limits
1. Go to the shared bandwidth list page.
2. In the shared bandwidth list, click the name of the target shared bandwidth.
3. On the EIPs or IPv6 Addresses tab page, configure or cancel bandwidth limits
as required.
– Configuring bandwidth limit
i. Locate the target EIP or IPv6 address and click Configure Bandwidth
Limit in the Operation column.
Figure 1-17 Configuring bandwidth limit
Elastic IP
User Guide 1 Elastic IP User Guide
Issue 01 (2026-08-21) Copyright © Huawei Technologies Co., Ltd. 58

--- Page 64 ---
ii. Set Guaranteed Bandwidth and Maximum Bandwidth.
iii. Click OK.
– Canceling bandwidth limit
i. Locate the target EIP or IPv6 address and click Cancel Bandwidth
Limit in the Operation column.
ii. Click OK.
1.7 Resource Package
1.7.1 Resource Package Overview
Resource packages are prepaid resources that you can purchase to save money. A
resource package takes effect immediately once it is purchased. It cannot be used
upon expiration and is suspended when it is used up. To continue using a resource
package, you need to purchase a new one.
For details about how to reduce costs, see Lower Network Costs.
Shared Data Package
Shared data package provides a quota for data usage. Such packages are cost-
effective and easy to use. Shared data packages take effect immediately after your
purchase. If you have subscribed to pay-per-use EIPs billed by traffic in a region
and buy a shared data package in the same region, the EIPs will use the shared
data package. After the package quota is used up or the package expires, the EIPs
will continue to be billed on a pay-per-use basis. For billing details, see Product
Pricing Details.
● Two types of packages are available: dynamic BGP and static BGP. Dynamic
BGP data packages will be used by pay-per-use EIPs (billed by traffic) of the
dynamic BGP type, and static BGP data packages will be used by pay-per-use
EIPs (billed by traffic) of the static BGP type.
● Shared data packages can be purchased yearly or monthly. Yearly packages
are more cost effective. If you have multiple shared data packages, the one
that expires first will be used first.
● If your usage exceeds your shared data package quota within its validity, you
will be billed on a pay-per-use basis for the additional traffic usage.
● If a shared data package expires, make sure your account balance is sufficient.
Your EIP will be billed on a pay-per-use basis, and EIP usage will not be
affected.
● If you want to stop using a shared data package before it expires, you can
unsubscribe from it. For details, see Cloud Service Unsubscriptions.
● After purchasing a shared data package, you can renew it to extend its
validity period. For details, see Manually Renewing Resources.
Constraints
● Shared data packages require a one-off payment and take effect immediately
after purchase. You cannot specify an effective date for your first purchase.
Elastic IP
User Guide 1 Elastic IP User Guide
Issue 01 (2026-08-21) Copyright © Huawei Technologies Co., Ltd. 59

--- Page 65 ---
● Shared data packages are billed by month or year. Once expired, remaining
package quota cannot be used anymore.
● Shared data packages can only be used by pay-per-use dedicated bandwidth
billed by traffic. Two types of shared data packages are available: dynamic
BGP (for dynamic BGP bandwidth) and static BGP (for static BGP bandwidth).
● A shared data package cannot take effect only for the bandwidth of a specific
EIP.
● A shared data package cannot be used by a shared bandwidth.
● A shared data package cannot be used by EIPs of the premium BGP type.
Related Operations
Viewing the Usage Details and Configuring Remaining Usage Alerts: View the
usage of a shared data package and configure remaining usage alerts.
1.7.2 Shared Data Package
1.7.2.1 Buying a Shared Data Package
Scenarios
This section describes how to buy a shared data package. Shared data packages
take effect immediately after your purchase. If you have subscribed to pay-per-use
EIPs billed by traffic in a region and buy a shared data package in the same
region, the EIPs will use the shared data package. After the package quota is used
up or the package expires, the EIPs will continue to be billed on a pay-per-use
basis.
If you have an order that has not been paid within the payment period, you need
to cancel or pay for the order first. Then, you can purchase a shared data package.
Procedure
1. Go to the Buy Shared Data Package page.
2. Set the parameters as prompted.
Table 1-15 Parameter descriptions
Parameter Description Example Value
Region A shared data package can only be used
by resources in its same region. Select
the region based on your requirements.
CN-Hong Kong
Elastic IP
User Guide 1 Elastic IP User Guide
Issue 01 (2026-08-21) Copyright © Huawei Technologies Co., Ltd. 60

--- Page 66 ---
Parameter Description Example Value
Type The shared data package type. Set this
parameter based on the bandwidth type
of the EIP. The following two types of
packages are available:
● Dynamic BGP: A dynamic BGP data
package can only be used by dynamic
BGP EIPs billed by traffic on a pay-
per-use basis.
● Static BGP: A static BGP data package
can only be used by static BGP EIPs
billed by traffic on a pay-per-use
basis.
Static BGP
Package
Validity
The validity period of the shared data
package. Select a validity period based
on your requirements.
1 month
Specification The size of the shared data package in
GB.
10 GB
Usage
Duration
The validity period of the shared data
package.
Default
 
3. Click Next.
4. Confirm the configurations and click Submit.
5. On the payment page, confirm the order information and click Confirm.
Related Operations
● To view the usage of a shared data package and configure remaining usage
alerts, see Viewing the Usage Details and Configuring Remaining Usage
Alerts.
● To stop using a shared data package before it expires, unsubscribe from the
shared data package. For details, see Cloud Service Unsubscriptions.
● After purchasing a shared data package, you can renew it to extend its
validity period. For details, see Manually Renewing Resources.
1.7.2.2 Viewing the Usage Details and Configuring Remaining Usage Alerts
Scenarios
Viewing the Available Amount of a Shared Data Package and Configuring
Remaining Usage Alerts are supported. After a remaining usage alert is
configured, you can receive notifications via messages and emails once the
remaining quota of a shared data package drops to a specified threshold.
This can remind you to purchase a new shared data package before the package
you are currently using is used up, preventing high traffic fees from being
generated. For example, if the size of your shared data package is 10 GB and the
Elastic IP
User Guide 1 Elastic IP User Guide
Issue 01 (2026-08-21) Copyright © Huawei Technologies Co., Ltd. 61

--- Page 67 ---
remaining usage threshold is 10%, notifications will be sent to you when the
remaining quota in your shared data package is 1 GB.
Viewing the Available Amount of a Shared Data Package
1. Go to the shared data package list page.
2. View the available, total, and usage statistics, and export deduction
details of a shared data package.
– In the Available/Total column of a shared data package, view the
remaining and total amount of the shared data package.
– Click the name of a shared data package in the Package Name column.
The resource package details page of the Billing Center is displayed.
▪ Click Usage Statistics in the Operation column to view the
deduction statistics.
▪ Click Export Deduction Details in the Operation column to export
usage details.
Configuring Remaining Usage Alerts
1. Log in to the management console.
2. Choose Billing > My Packages.
3. Click Usage Alert in the upper right corner to enable and configure the usage
alert function for the corresponding package.
4. Click OK.
1.8 Cloud Eye Monitoring
1.8.1 Monitoring EIPs
Scenario
Cloud Eye is a multi-dimensional resource monitoring service that you can use to
monitor EIP and bandwidths in real time, set alarm rules, identify resource
exceptions, and quickly respond to resource changes.
Cloud Eye is enabled automatically after an EIP is assigned. For more information
about Cloud Eye, see What Is Cloud Eye?
Setting an Alarm Rule
You can configure alarm rules on the Cloud Eye console to send you notifications
in case of exceptions.
For details about how to create alarm rules, see Creating an Alarm Rule.
Viewing Metrics
1. Log in to the Cloud Eye console.
Elastic IP
User Guide 1 Elastic IP User Guide
Issue 01 (2026-08-21) Copyright © Huawei Technologies Co., Ltd. 62

--- Page 68 ---
2. In the navigation pane, choose Cloud Service Monitoring.
On the Cloud Service Monitoring page, click Virtual Private Cloud VPC in
the Dashboard column and go to the Details page.
3. Select Elastic IPs or Bandwidths as required to view detailed data.
NO TE
If you select Elastic IPs, you can search for an EIP by IPv4 or IPv6 address to quickly
locate and view the monitoring details of the EIP.
4. On the Overview tab, perform the following operations:
a. View information under Resource Overview, Alarm Statistics, and Key
Metrics. For details, see Table 1-16.
Table 1-16 Three modules on the Overview tab
Module Description
Resource
Overview
You can view the resource data of the current cloud
service in the current dimension, including Total
Resources, Resources in Alarm, and Resources in
Alarm in the Last 7 Days.
Alarm
Statistics
You can view the total number of alarms in the last
seven days, alarms of different severities (critical, major,
minor, and informational), top 5 instances by total
alarms, and top 5 resource groups by total alarms.
Key Metrics You can view monitoring details of key metrics
recommended by the cloud service.
 
b. In the upper left corner of the Details page, select Resources to view
corresponding monitoring details or select another cloud service to switch
to its dashboard.
5. On the Resources tab, perform the following operations:
– Click Export Data to export cloud service monitoring data. For details,
see How Can I Export Monitoring Data?
– Locate an instance and click View Metric to view the instance metrics
and HTTP status codes.
– Locate an instance and choose More > Create Alarm Rule to create an
alarm rule for the instance. For details about the parameters, see Setting
an Alarm Rule.
– Locate an instance and choose More > View Alarm Rule to view the
alarm rules created for the instance.
Related Operations
You can enable batch notification policy setting as required and select existing
notification policies. For details about how to create a notification policy, see
Creating a Notification Policy.
Elastic IP
User Guide 1 Elastic IP User Guide
Issue 01 (2026-08-21) Copyright © Huawei Technologies Co., Ltd. 63

--- Page 69 ---
1.8.2 Monitoring Metrics
Overview
This section describes the namespace, list, and measurement dimensions of
metrics of EIPs and bandwidths that you can check on Cloud Eye. You can use APIs
or the Cloud Eye console to query the monitored metrics and generated alarms.
NO TE
● Cloud Eye can monitor dimensions nested to a maximum depth of four levels (levels 0
to 3). 3 is the deepest level. For example, if the monitored dimension of a metric is
resourceA_id,resourceB_id, resourceA_id indicates level 0 and resourceB_id indicates
level 1.
● If a bandwidth is increased or decreased, there is a delay of 5 to 10 minutes for the
monitoring metrics to update for the new bandwidth.
Namespace
Namespace of EIPs and bandwidths: SYS.VPC
Monitoring Metrics
Table 1-17 EIP and bandwidth metrics
ID Nam
e
Description Value
Rang
e
Un
it
Co
nve
rsio
n
Rul
e
Monitored
Object
(Dimension
)
Monitorin
g Interval
(Raw
Data)
upstrea
m_band
width
Outb
ound
Band
widt
h
Network
rate of
outbound
traffic
(Previously
called
"Upstream
Bandwidth")
≥ 0 bit/
s
100
0
(SI)
bandwidth_i
d
publicip_id
1 minute
downstr
eam_ba
ndwidth
Inbo
und
Band
widt
h
Network
rate of
inbound
traffic
(Previously
called
"Downstrea
m
Bandwidth")
≥ 0 bit/
s
100
0
(SI)
bandwidth_i
d
publicip_id
1 minute
Elastic IP
User Guide 1 Elastic IP User Guide
Issue 01 (2026-08-21) Copyright © Huawei Technologies Co., Ltd. 64

--- Page 70 ---
ID Nam
e
Description Value
Rang
e
Un
it
Co
nve
rsio
n
Rul
e
Monitored
Object
(Dimension
)
Monitorin
g Interval
(Raw
Data)
upstrea
m_band
width_u
sage
Outb
ound
Band
widt
h
Usag
e
Usage of
outbound
bandwidth
in the unit of
percent.
Outbound
bandwidth
usage =
Outbound
bandwidth/
Purchased
bandwidth
0-100 % N/A bandwidth_i
d
publicip_id
1 minute
downstr
eam_ba
ndwidth
_usage
Inbo
und
Band
widt
h
Usag
e
Usage of
inbound
bandwidth
in the unit of
percent.
Inbound
bandwidth
usage =
Inbound
bandwidth/
Purchased
bandwidth
0-100 % N/A bandwidth_i
d
publicip_id
1 minute
up_stre
am
Outb
ound
Traffi
c
Network
traffic going
out of the
cloud
platform
(Previously
called
"Upstream
Traffic")
≥ 0 Byt
e
100
0
(SI)
bandwidth_i
d
publicip_id
1 minute
down_st
ream
Inbo
und
Traffi
c
Network
traffic going
into the
cloud
platform
(Previously
called
"Downstrea
m Traffic")
≥ 0 Byt
e
100
0
(SI)
bandwidth_i
d
publicip_id
1 minute
Elastic IP
User Guide 1 Elastic IP User Guide
Issue 01 (2026-08-21) Copyright © Huawei Technologies Co., Ltd. 65

--- Page 71 ---
 
Dimensions
Key Value
publicip_id EIP ID
You can call the API Querying an EIP
to obtain the value from the response
parameters.
bandwidth_id Bandwidth ID
You can call the API Querying a
Bandwidth to obtain the value from
the response parameters.
 
1.8.3 EIP Events That Can Be Monitored
Function Description
On Cloud Eye, you can use event monitoring for data collection, query, and alarm
reporting. You can create alarm rules for both system events and custom events.
When there are specified events, you will receive alarm notifications.
Namespace
SYS.EIP
Elastic IP
User Guide 1 Elastic IP User Guide
Issue 01 (2026-08-21) Copyright © Huawei Technologies Co., Ltd. 66

--- Page 72 ---
EIP Events That Can Be Monitored
Table 1-18 EIP events
Ev
e
nt
S
o
ur
ce
N
a
m
es
p
ac
e
Even
t
Nam
e
Eve
nt
ID
Ev
e
nt
S
ev
er
it
y
Description Solutio
n
Impa
ct
EI
P
SY
S.
EI
P
EIP
band
widt
h
overf
low
EIPB
and
widt
hOv
erfl
ow
M
aj
or
The used bandwidth exceeded
the purchased one, so the
network may become slow or
packets may be lost. The event
value reflects the peak in a
monitoring period, and the value
of the EIP inbound and
outbound bandwidth is taken
from a specific point within that
period.
● egressDropBandwidth:
dropped outbound packets
(bytes)
● egressAcceptBandwidth:
accepted outbound packets
(bytes)
● egressMaxBandwidthPerSec:
peak outbound bandwidth
(byte/s)
● ingressAcceptBandwidth:
accepted inbound packets
(bytes)
● ingressMaxBandwidthPer-
Sec: peak inbound bandwidth
(byte/s)
● ingressDropBandwidth:
dropped inbound packets
(bytes)
NOTE
The EIP bandwidth overflow event
is available only in certain regions.
You can check the regions on the
console.
Check
whether
the
used EIP
bandwi
dth
keeps
increasi
ng and
whether
services
are
normal.
Increase
the
bandwi
dth if
necessa
ry.
The
netw
ork
beco
mes
slow
or
packe
ts are
lost.
Elastic IP
User Guide 1 Elastic IP User Guide
Issue 01 (2026-08-21) Copyright © Huawei Technologies Co., Ltd. 67

--- Page 73 ---
Ev
e
nt
S
o
ur
ce
N
a
m
es
p
ac
e
Even
t
Nam
e
Eve
nt
ID
Ev
e
nt
S
ev
er
it
y
Description Solutio
n
Impa
ct
Delet
e EIP
dele
teEi
p
M
in
or
The EIP was released. Check
whether
the EIP
was
released
by
mistake.
The
resou
rce
cann
ot
acces
s the
Inter
net.
EIP
block
ed
bloc
kEIP
Cr
iti
ca
l
The used bandwidth of an EIP
exceeded the threshold, so the
EIP was blocked and packets
were discarded. Such an event
may be caused by DDoS attacks.
For details about the threshold,
see CNAD Basic.
Replace
the EIP
to
prevent
services
from
being
affected
.
Locate
and
deal
with the
fault.
Servic
es
are
impa
cted.
EIP
unbl
ocke
d
unbl
ock
EIP
Cr
iti
ca
l
The EIP was unblocked. Use the
previous
EIP to
save
resource
s.
None
Start
DDo
S
traffi
c
scrub
bing
ddo
sCle
anEI
P
M
aj
or
Traffic scrubbing on the EIP was
started to prevent DDoS attacks.
Check
whether
the EIP
was
attacke
d.
Servic
es
may
be
interr
upted
.
Elastic IP
User Guide 1 Elastic IP User Guide
Issue 01 (2026-08-21) Copyright © Huawei Technologies Co., Ltd. 68

--- Page 74 ---
Ev
e
nt
S
o
ur
ce
N
a
m
es
p
ac
e
Even
t
Nam
e
Eve
nt
ID
Ev
e
nt
S
ev
er
it
y
Description Solutio
n
Impa
ct
Stop
DDo
S
traffi
c
scrub
bing
ddo
sEn
dCle
anEi
p
M
aj
or
Traffic scrubbing on the EIP to
prevent DDoS attacks was
ended.
Check
whether
the EIP
was
attacke
d.
Servic
es
may
be
interr
upted
.
Enter
prise-
class
QoS
band
widt
h
limit
excee
ded
EIPB
and
widt
hRul
eOv
erfl
ow
M
aj
or
The allocated QoS bandwidth
was exceeded, which may slow
down the network or cause
packet loss. The event value
reflects the peak in a monitoring
period, and the value of the EIP
inbound and outbound
bandwidth is taken from a
specific point within that period.
● egressDropBandwidth:
dropped outbound packets
(bytes)
● egressAcceptBandwidth:
accepted outbound packets
(bytes)
● egressMaxBandwidthPerSec:
peak outbound bandwidth
(byte/s)
● ingressAcceptBandwidth:
accepted inbound packets
(bytes)
● ingressMaxBandwidthPer-
Sec: peak inbound bandwidth
(byte/s)
● ingressDropBandwidth:
dropped inbound packets
(bytes)
Check
whether
the
used EIP
bandwi
dth
keeps
increasi
ng and
whether
services
are
normal.
Increase
the
bandwi
dth if
necessa
ry.
The
netw
ork
beco
mes
slow
or
packe
ts are
lost.
Elastic IP
User Guide 1 Elastic IP User Guide
Issue 01 (2026-08-21) Copyright © Huawei Technologies Co., Ltd. 69

--- Page 75 ---
Ev
e
nt
S
o
ur
ce
N
a
m
es
p
ac
e
Even
t
Nam
e
Eve
nt
ID
Ev
e
nt
S
ev
er
it
y
Description Solutio
n
Impa
ct
Unbo
und
EIP
Eip
Not
Bou
ndSt
atus
M
aj
or
The EIP is not bound to any
resource.
N/A When
an
EIP is
unbo
und,
you
will
be
billed
for IP
reser
vatio
n
fees
and
band
width
fees
(bille
d by
band
width
).
 
1.9 Managing EIP Quotas
What Is a Quota?
A quota limits the quantity of a resource available to users, thereby preventing
spikes in the usage of the resource. For example, an EIP quota limits the number
of EIPs that can be assigned.
You can also request for an increased quota if your existing quota cannot meet
your service requirements.
How Do I View My Quotas?
1. Log in to the management console.
2. Click 
  in the upper left corner and select the desired region and project.
3. In the upper right corner of the page, choose Resources > My Quotas.
Elastic IP
User Guide 1 Elastic IP User Guide
Issue 01 (2026-08-21) Copyright © Huawei Technologies Co., Ltd. 70

--- Page 76 ---
The Quotas page is displayed.
Figure 1-18 My Quotas
4. View the used and total quota of each type of resources on the displayed
page.
If a quota cannot meet service requirements, apply for a higher quota.
How Do I Apply for a Higher Quota?
1. Log in to the management console.
2. In the upper right corner of the page, choose Resources > My Quotas.
The Quotas page is displayed.
Figure 1-19 My Quotas
3. Click Increase Quota in the upper right corner of the page.
Elastic IP
User Guide 1 Elastic IP User Guide
Issue 01 (2026-08-21) Copyright © Huawei Technologies Co., Ltd. 71

--- Page 77 ---
Figure 1-20 Increasing quota
4. On the Create Service Ticket page, configure parameters as required.
In the Problem Description area, fill in the content and reason for
adjustment.
5. After all necessary parameters are configured, select I have read and agree
to the Ticket Service Protocol and Privacy Statement and click Submit.
Elastic IP
User Guide 1 Elastic IP User Guide
Issue 01 (2026-08-21) Copyright © Huawei Technologies Co., Ltd. 72

--- Page 78 ---
2 Global Elastic IP User Guide
2.1 Global EIPs
2.1.1 Global EIP Overview
Global EIPs provide global internet access and intranet communications for cloud
instances. You can specify a global region and a global EIP pool to assign a global
EIP, and bind the global EIP to a cloud instance (such as a load balancer or an
ECS) from any region. To enable Internet access, a global internet bandwidth must
be bound. For cloud backbone (intranet) communications, a global connection
bandwidth must be bound. To enable an ECS to communicate with the Internet
through a global EIP, you also need to bind a global internet gateway to the
global EIP.
Elastic IP
User Guide 2 Global Elastic IP User Guide
Issue 01 (2026-08-21) Copyright © Huawei Technologies Co., Ltd. 73

--- Page 79 ---
Figure 2-1 Global EIP architecture
Global EIP Quotas
If you want to increase your quota, see How Do I Apply for a Higher Quota?
● Your request for a larger quota will only be approved if your account has valid
orders and you are continuously using cloud resources. If you have released
resources immediately after subscribing to them multiple times, your request
for quota increase will be declined.
● If you have increased the global EIP quota but you have not used the quota
for a long time, Huawei Cloud will reduce the quota to the default value.
Constraints
● Global EIPs cannot be used independently. You need to bind them to cloud
instances, such as ECSs and load balancers. For details, see Binding a Global
EIP to an Instance.
● After a global EIP is bound to an instance, you need to bind a global
connection bandwidth to the global EIP. For details, see Adding Instances to
a Global Connection Bandwidth.
Binding a Global EIP to an Instance
Figure 2-2 Binding a global EIP to an instance
Elastic IP
User Guide 2 Global Elastic IP User Guide
Issue 01 (2026-08-21) Copyright © Huawei Technologies Co., Ltd. 74

--- Page 80 ---
Table 2-1 Process for binding a global EIP to an instance
No. What You Need
to Do
Description
1 Preparations ● Buy a global internet bandwidth.
A global internet bandwidth can only be shared
by global EIPs from its same city.
● Buy a global connection bandwidth.
● Create a global internet gateway.
To enable an ECS to communicate with the
Internet through a global EIP, you also need to
bind a global internet gateway to the global EIP.
The global internet gateway and the ECS must
be in the same region.
2 Assigning a
Global EIP
Assign a global EIP and select a global internet
bandwidth.
You can add the global EIP to an existing global
internet bandwidth or purchase a new global
internet bandwidth.
A global internet bandwidth can only be shared by
global EIPs from its same city.
3 Binding a Global
EIP to an Instance
To enable an ECS to communicate with the Internet
through a global EIP, you also need to bind a global
internet gateway to the global EIP.
You can select an existing global internet gateway
or create a new one.
 
Global EIP Billing
A global EIP is not billed after being purchased. If you use resources such as a
global internet bandwidth or global connection bandwidth, you will be billed for
these resources.
Related Operations
Modifying the Global Connection Bandwidth of a Global EIP: Increase or
decrease the global connection bandwidth bound to your global EIP as required.
Modifying the Global Internet Bandwidth of a Global EIP: Modify the billing
option or size of a global internet bandwidth.
2.1.2 Assigning a Global EIP
Scenarios
This section describes how to assign a global EIP. Global EIPs can be bound to
cloud instances (such as ECSs or load balancers) from any region so that these
Elastic IP
User Guide 2 Global Elastic IP User Guide
Issue 01 (2026-08-21) Copyright © Huawei Technologies Co., Ltd. 75

--- Page 81 ---
instances can access the Internet. You can specify the access point, type, and
global EIP pool based on your service requirements on Internet access.
If you want to assign a global EIP, submit a service ticket to apply for
permissions.
Procedure
1. Go to the Assign Global EIP page.
2. Configure the parameters based on Table 2-2.
Table 2-2 Description
Modul
e
Param
eter
Description Example
Value
Basic
Config
uration
Region Mandatory
For details about regions, see Selecting
a Region.
CN East-
Shanghai1
Basic
Config
uration
Access
Point
Mandatory
For low Internet latency, select an access
point that is close to the Internet client.
Shanghai
Basic
Config
uration
Type Select Global EIP or Global EIP range. Global EIP
Basic
Config
uration
Versio
n
Select IPv4 or IPv6. IPv4
Basic
Config
uration
Global
EIP
Type
Mandatory
● You can select:
– Static BGP
– Dynamic BGP
Reverse resolution is not supported
for static single-line IP addresses
(non-cloud vendor IP addresses).
● After you select a global EIP pool, the
system will allocate a global EIP to
you from the pool. Select a resource
pool close to your business to
minimize the latency.
-
Basic
Config
uration
Mask
Length
This parameter is available only when
Type is set to Global EIP range. You can
call the following API to obtain all
available mask lengths:
GET /v3/{domain_id}/global-eip-
segments/support-masks
24
Elastic IP
User Guide 2 Global Elastic IP User Guide
Issue 01 (2026-08-21) Copyright © Huawei Technologies Co., Ltd. 76

--- Page 82 ---
Modul
e
Param
eter
Description Example
Value
Global
EIP
Config
uration
Global
EIP
Name
(Optio
nal)
Optional
Enter the name of the global EIP. The
name:
● Must contain 0 to 64 characters.
● Can contain letters, digits,
underscores (_), hyphens (-), and
periods (.).
g-eip01
Global
EIP
Config
uration
Enterp
rise
Project
The enterprise project that the global
EIP belongs to.
An enterprise project facilitates project-
level management and grouping of
cloud resources and users. The default
project is default.
For details about creating and
managing enterprise projects, see the
Enterprise Management User Guide.
default
Global
EIP
Config
uration
Monito
ring
This function is free. With Cloud Eye,
you can monitor:
● Network traffic at one-minute
intervals.
● Bandwidth fluctuations and inbound
and outbound bandwidth rates.
-
Global
EIP
Config
uration
Quanti
ty
This parameter is available only when
Type is set to Global EIP. Number of
global EIPs to be assigned.
3
Global
EIP
Config
uration
Tag Global EIP tags, including keys and
values.
The tag key and value must meet the
requirements listed in Table 2-3.
● Key:
geip_1
● Value:
184.100.10
1.102
Global
Interne
t
Bandwi
dth
Config
uration
Global
Interne
t
Bandw
idth
Mandatory
● Assign now: Select this option if you
want to purchase a new global
internet bandwidth.
● Use existing: Select this option if you
want to add the global EIP to an
existing global internet bandwidth
for internet access.
-
Elastic IP
User Guide 2 Global Elastic IP User Guide
Issue 01 (2026-08-21) Copyright © Huawei Technologies Co., Ltd. 77

--- Page 83 ---
Modul
e
Param
eter
Description Example
Value
Global
Interne
t
Bandwi
dth
Config
uration
Billing
Mode
You can select:
● Yearly/Monthly
● Pay-per-use
Pay-per-use
Global
Interne
t
Bandwi
dth
Config
uration
Bandw
idth
Type
You can select:
● Standard
● IPv6 Static Bandwidth
Standard
Global
Interne
t
Bandwi
dth
Config
uration
Billed
By
This parameter is available only when
Billing Mode is set to Pay-per-use. You
can select:
● 95th percentile bandwidth (standard)
● 95th percentile bandwidth
(bidirectional)
95th
percentile
bandwidth
(standard)
Global
Interne
t
Bandwi
dth
Config
uration
Guara
nteed
Bandw
idth
This parameter is available only when
Billing Mode is set to Pay-per-use. The
system automatically generates the
guaranteed bandwidth percentage
based on what you select for Billed By.
0%
Global
Interne
t
Bandwi
dth
Config
uration
Bandw
idth
(Mbit/
s)
The bandwidth size in Mbit/s. 300
Global
Interne
t
Bandwi
dth
Config
uration
Requir
ed
Durati
on
The duration for which the yearly/
monthly global EIP will be used.
1 month
Elastic IP
User Guide 2 Global Elastic IP User Guide
Issue 01 (2026-08-21) Copyright © Huawei Technologies Co., Ltd. 78

--- Page 84 ---
Modul
e
Param
eter
Description Example
Value
Global
Interne
t
Bandwi
dth
Config
uration
Upon
Expirat
ion
This parameter must be specified if the
Billing Mode is set to Yearly/Monthly.
The value can be one of the following:
● Change to pay-per-use
● Auto-renew
● Enter grace period
Change to
pay-per-use
Global
Interne
t
Bandwi
dth
Config
uration
Bandw
idth
Name
Optional
Enter the name of the bandwidth. The
name:
● Must contain 0 to 64 characters.
● Can contain letters, digits,
underscores (_), hyphens (-), and
periods (.).
ibw-test
 
Table 2-3 Naming rules for global EIP tags
Parameter Requirement Example Value
Key ● Cannot be left
blank.
● Must be unique for
a global EIP.
● Can contain a
maximum of 128
characters.
● Can contain letters,
digits, underscores
(_), and hyphens (-).
Cannot start with
_sys_ or a space or
end with a space.
geip_1
Value ● Can contain a
maximum of 255
characters.
● Can contain letters,
digits, underscores
(_), periods (.),
hyphens (-), and
cannot start or end
with a space.
184.100.101.102
 
3. Click Next.
Elastic IP
User Guide 2 Global Elastic IP User Guide
Issue 01 (2026-08-21) Copyright © Huawei Technologies Co., Ltd. 79

--- Page 85 ---
4. Confirm the configurations and select "I have read and agree to the Elastic IP
Service Statement."
– If you set Billing Mode to Pay-per-use, click Submit.
– If you set Billing Mode to Yearly/Monthly, click Pay Now.
On the payment page, confirm the order information, and click Pay.
The global EIP list is displayed.
5. In the global EIP list, view the global EIP status.
If the status of the global EIP is Unbound, the EIP is assigned successfully.
Related Operations
● (Mandatory) Global EIPs cannot be used independently. You need to bind
them to cloud instances, such as ECSs and load balancers. For details, see
Binding a Global EIP to an Instance.
● (Mandatory) After a global EIP is bound to an instance, you need to bind a
global connection bandwidth to the global EIP. For details, see Adding
Instances to a Global Connection Bandwidth.
2.1.3 Binding a Global EIP to an Instance
Scenarios
This section describes how to bind a global EIP to an instance, such as an ECS or a
load balancer, to enable the instance to communicate with the Internet through
the global EIP.
NO TE
By default, a global EIP can be bound to instances in the same geographic region. To bind a
global EIP to an instance in another geographic region, submit a service ticket.
Constraints
● A global EIP can be bound to only one instance at a time.
● After a global EIP is bound to an ECS, the VPC of the ECS cannot be changed,
and no more EIP can be bound to the ECS.
● A global EIP cannot be bound to a shared load balancer.
● To bind an IPv6 global EIP to an ECS, ensure that IPv6 is enabled for the ECS
to support both IPv4 and IPv6 addresses. For details, see Enabling IPv6 for a
Network Interface.
Prerequisites
● The required instance (such as ECS or ELB) has been created.
● For an ECS, you also need to create a global internet gateway for the VPC
that the ECS belongs to.
Procedure
1. Go to the global EIP list page.
Elastic IP
User Guide 2 Global Elastic IP User Guide
Issue 01 (2026-08-21) Copyright © Huawei Technologies Co., Ltd. 80

--- Page 86 ---
2. In the global EIP list, search for or locate the target global EIP.
3. Locate the target global EIP, and click Bind Instance in the Progress column.
The page for binding an instance is displayed.
4. Select the region that the instance to be bound is located.
A global EIP can be bound to an instance in any region.
5. Select the type of the instance to be bound and then select the instance.
6. Select the global internet gateway to be bound.
The system automatically lists the global internet gateway of the VPC that
the instance belongs to, if there is one.
7. Click Next.
8. Configure Global Connection Bandwidth, Bandwidth Name, and
Bandwidth as prompted.
If there is no global connection bandwidth, click Manage Global Connection
Bandwidth to create one. For details, see Buying a Global Connection
Bandwidth.
9. Click OK.
In the global EIP list, you can see that the global EIP has an instance bound.
Related Operations
● (Mandatory) After a global EIP is bound to an instance, you need to bind a
global connection bandwidth to the global EIP. For details, see Adding
Instances to a Global Connection Bandwidth.
● You need to create a global internet gateway for the VPC of the ECS. For
details, see Creating a Global Internet Gateway.
2.1.4 Unbinding a Global EIP from an Instance
Scenarios
This section describes how to unbind a global EIP from an instance, such as a load
balancer or an ECS.
A global EIP can be bound to only one instance at a time. If you need to bind the
global EIP to another instance, unbind it from the current instance first and then
bind it to another one. For details, see Binding a Global EIP to an Instance.
Notes and Constraints
When you unbind a global EIP from an instance, the system automatically unbinds
the global connection bandwidth from the global EIP. Ensure that no service is
running on the instance. Otherwise, services will be interrupted.
Procedure
1. Go to the global EIP list page.
2. In the global EIP list, search for or locate the target global EIP.
3. Locate the row that contains the target global EIP, and click Unbind in the
Operation column.
Elastic IP
User Guide 2 Global Elastic IP User Guide
Issue 01 (2026-08-21) Copyright © Huawei Technologies Co., Ltd. 81

--- Page 87 ---
A confirmation dialog box is displayed.
4. Click OK.
In the global EIP list, you can see that the global EIP has no instance bound.
2.1.5 Releasing a Global EIP
Scenarios
This section describes how to release a global EIP.
If your global EIPs are no longer required, release them.
Notes and Constraints
If you want to release a global EIP with an instance bound, you need to unbind it
from its instance first by referring to Unbinding a Global EIP from an Instance.
Procedure
1. Go to the global EIP list page.
2. In the global EIP list, search for or locate the target global EIP.
3. In the list, search for or locate the global EIP.
4. Locate the row that contains the target global EIP, and click Release in the
Operation column.
A confirmation dialog box is displayed.
5. Confirm the information and click OK.
The released global EIP is not displayed in the global EIP list.
2.1.6 Modifying the Global Connection Bandwidth of a Global
EIP
Scenarios
This section describes how to modify the name or change the size of a global
connection bandwidth.
Your increased or decreased global connection bandwidth takes effect
immediately.
Procedure
1. Go to the global EIP list page.
2. In the global EIP list, search for or locate the target global EIP.
3. Locate the row that contains the target global EIP, and choose More > Modify
Global Connection Bandwidth in the Operation column.
The Modify Global Connection Bandwidth page is displayed.
4. Locate the target bandwidth and choose More > Modify Bandwidth in the
Operation column.
Elastic IP
User Guide 2 Global Elastic IP User Guide
Issue 01 (2026-08-21) Copyright © Huawei Technologies Co., Ltd. 82

--- Page 88 ---
5. Modify the bandwidth name and size as prompted, and click Next.
6. Confirm the modified information and click Submit.
2.1.7 Modifying the Global Internet Bandwidth of a Global EIP
Scenarios
This section describes how to modify the name, billing option, or size of a global
internet bandwidth.
Your increased or decreased global internet bandwidth takes effect immediately.
Procedure
1. Go to the global EIP list page.
2. In the global EIP list, search for or locate the target global EIP.
3. Locate the row that contains the target global EIP, and choose More > Modify
Global Internet Bandwidth in the Operation column.
The Modify Global Internet Bandwidth page is displayed.
4. Modify the global internet bandwidth parameters as required.
Table 2-4 Modifying a global internet bandwidth
Parameter Description Example Value
Global
Internet
Bandwidth
Name
(Optional)
Enter the name of the global
internet bandwidth. The name:
● Must contain 0 to 64 characters.
● Can contain letters, digits,
underscores (_), hyphens (-),
and periods (.).
ibw-test
Billed By You can specify:
95th percentile bandwidth
(standard)
95th percentile
bandwidth (standard)
Guaranteed
Bandwidth
The system automatically
generates the guaranteed
bandwidth percentage based on
what you select for Billed By.
20%
Bandwidth
(Mbit/s)
Mandatory
Select the size of the bandwidth.
The unit is Mbit/s.
100
 
5. Confirm the configurations and select Confirm Change.
6. Ensure that the configurations are correct and click Submit.
The modified bandwidth is displayed in the global internet bandwidth list.
Elastic IP
User Guide 2 Global Elastic IP User Guide
Issue 01 (2026-08-21) Copyright © Huawei Technologies Co., Ltd. 83

--- Page 89 ---
2.1.8 Viewing Details About a Global EIP
Scenarios
This section describes how to view details about a global EIP, including its status,
global internet bandwidth, and global connection bandwidth.
Procedure
1. Go to the global EIP list page.
2. Click Global EIPs or Global EIP Ranges as required. In the list, search for or
locate the global EIP.
2.1.9 Exporting Global EIPs
Scenarios
This section describes how to export all your global EIPs as an Excel file to a local
directory. The Excel records the ID, status, type, bandwidth name, and bandwidth
size of each global EIP.
Procedure
1. Go to the global EIP list page.
2. In the global EIP list, select one or more global EIPs and click Export in the
upper left corner.
The system will automatically export information about all global EIPs under your
account in the current region as an Excel file to a local directory.
2.2 Global Internet Gateways
2.2.1 Global Internet Gateway Overview
Before binding a global EIP to an ECS, you need to create a global internet
gateway to connect the VPC of the ECS to the global EIP so that the ECS can
access the Internet through the global EIP. Global internet gateways are free of
charge. This function is available only in certain regions. You can check the
regions on the console.
When you bind a global EIP to an ECS, the system automatically lists the global
internet gateway of the VPC that the ECS belongs to, if there is one.
NO TE
If a global EIP is bound to a load balancer, you do not need to create a global internet
gateway for the VPC that the load balancer belongs to.
Elastic IP
User Guide 2 Global Elastic IP User Guide
Issue 01 (2026-08-21) Copyright © Huawei Technologies Co., Ltd. 84

--- Page 90 ---
Figure 2-3 Global EIP architecture
Global Internet Gateway Quotas
Each VPC can only have one global internet gateway attached.
Notes and Constraints
After a global internet gateway is purchased, you cannot modify parameters such
as subnet and more. If you want your global internet gateway to work in another
subnet, delete it and create another global internet gateway.
Binding a Global Internet Gateway to a Global EIP
Figure 2-4 Binding a global internet gateway to a global EIP
Table 2-5 Process for binding a global internet gateway to a global EIP
No. What You Need
to Do
Description
1 Creating a Global
Internet Gateway
The global Internet gateway and the instance (for
example, ECS) to be bound are in the same VPC.
2 Binding a Global
Internet Gateway
to a Global EIP
To enable an ECS to communicate with the Internet
through a global EIP, you also need to bind a global
internet gateway to the global EIP.
 
Elastic IP
User Guide 2 Global Elastic IP User Guide
Issue 01 (2026-08-21) Copyright © Huawei Technologies Co., Ltd. 85

--- Page 91 ---
Related Operations
● Binding a Global Internet Gateway to a Global EIP: After a global EIP is
bound to an ECS, you need to bind a global internet gateway to the global
EIP so that the ECS can access the Internet through the global EIP.
● Unbinding a Global Internet Gateway from a Global EIP: When you unbind
a global EIP from an ECS, the system automatically unbinds the global
internet gateway of the VPC that ECS belongs to from the global EIP.
● Managing a Global Internet Gateway: You can modify or delete a global
internet gateway as required.
2.2.2 Creating a Global Internet Gateway
Scenarios
This section describes how to create a global internet gateway. A global internet
gateway is used to connect the VPC where an ECS resides to the global EIP of the
ECS. Global internet gateways are free of charge.
This function is available only in certain regions. You can check the regions on
the console.
Notes and Constraints
Each VPC can only have one global internet gateway attached.
Procedure
1. Go to the global internet gateway list page.
2. In the upper right corner of the page, click Create Global Internet Gateway.
The Create Global Internet Gateway page is displayed.
3. Configure the parameters based on Table 2-6.
Table 2-6 Parameter descriptions
Parameter Description Example
Value
Name Mandatory
Enter the name of the global internet
gateway. The name:
● Must contain 1 to 64 characters.
● Can contain letters, digits, underscores
(_), hyphens (-), and periods (.).
igw-89ad
Version ● IPv4: Mandatory
● IPv6: Optional
IPv4
Elastic IP
User Guide 2 Global Elastic IP User Guide
Issue 01 (2026-08-21) Copyright © Huawei Technologies Co., Ltd. 86

--- Page 92 ---
Parameter Description Example
Value
VPC Mandatory
Select the VPC of your instance (such as
ECS) that needs to communicate with the
Internet to bind the global internet
gateway.
A global internet gateway is used to work
together with the global EIP of your
instance for Internet access.
-
Subnet Mandatory
Select the subnet where you want to bind
the global internet gateway.
-
Default
Route
Optional
● If you select this option, the default
route with the destination 0.0.0.0/0 will
be automatically added to the default
route table of the selected VPC to direct
traffic to the global internet gateway.
● If you do not select this option, you need
to manually add a route to the route
table (default or custom) associated
with the VPC subnet of your ECS to
direct traffic to the global internet
gateway.
-
 
4. Click OK.
Related Operations
After a global EIP is bound to an instance, a global internet gateway is required so
that the instance can access the Internet through the global EIP. For details, see
Binding a Global Internet Gateway to a Global EIP.
2.2.3 Binding a Global Internet Gateway to a Global EIP
Scenarios
This section describes how to bind a global internet gateway to a global EIP. When
you bind a global EIP to an ECS, the system automatically lists the global internet
gateway of the VPC that the ECS belongs to, if there is one.
Prerequisites
A global internet gateway has been created for the VPC of the ECS. If there is no
global internet gateway, create one by referring to Creating a Global Internet
Gateway.
Elastic IP
User Guide 2 Global Elastic IP User Guide
Issue 01 (2026-08-21) Copyright © Huawei Technologies Co., Ltd. 87

--- Page 93 ---
Procedure
1. Go to the global EIP list page.
2. In the global EIP list, search for or locate the target global EIP.
3. Locate the target global EIP, and click Bind Instance in the Progress column.
The page for binding an instance is displayed.
4. Select the region that the instance to be bound is located.
A global EIP can be bound to an instance in any region.
5. Select the type of the instance to be bound and then select the instance.
6. Select the global internet gateway to be bound.
7. Click Next.
You can select an existing global connection bandwidth or purchase a new
one.
8. Click Finish.
2.2.4 Unbinding a Global Internet Gateway from a Global EIP
Scenarios
This section describes how to unbind a global internet gateway from a global EIP.
When you unbind a global EIP from an ECS, the system automatically unbinds the
global internet gateway of the VPC that ECS belongs to from the global EIP.
Notes and Constraints
When you unbind a global EIP from an instance, the system automatically unbinds
the global connection bandwidth from the global EIP. Ensure that no service is
running on the instance. Otherwise, services will be interrupted.
Procedure
1. Go to the global EIP list page.
2. In the global EIP list, search for or locate the target global EIP.
3. Locate the row that contains the target global EIP, and click Unbind in the
Operation column.
A confirmation dialog box is displayed.
4. Click OK.
In the global EIP list, you can see that the global EIP has no instance bound.
2.2.5 Managing a Global Internet Gateway
Scenarios
You can perform the following operations to manage your global internet
gateways:
● Modifying a Global Internet Gateway
● Deleting a Global Internet Gateway
Elastic IP
User Guide 2 Global Elastic IP User Guide
Issue 01 (2026-08-21) Copyright © Huawei Technologies Co., Ltd. 88

--- Page 94 ---
Notes and Constraints
● You cannot modify parameters such as subnet and more. If you want your
global internet gateway to work in another subnet, delete it and create
another global internet gateway.
● A global internet gateway cannot be deleted if its attached VPC has instances
(such as ECSs) with global EIPs bound. To delete such a global internet
gateway, unbind the global EIPs from the instances first by referring to
Unbinding a Global EIP from an Instance.
Modifying a Global Internet Gateway
1. Go to the global internet gateway list page.
2. In the global internet gateway list, search for or locate the target global
internet gateway.
3. Change the name of the global internet gateway.
Deleting a Global Internet Gateway
1. Go to the global internet gateway list page.
2. In the global internet gateway list, search for or locate the target global
internet gateway.
3. Locate the row that contains the target global internet gateway and click
Delete in the Operation column.
A confirmation dialog box is displayed.
4. Click OK.
2.3 Global Internet Bandwidths
2.3.1 Global Internet Bandwidth Overview
A global internet bandwidth can be shared by one or more global EIPs at the
same time, improving bandwidth utilization.
Global internet bandwidths have to work together with global EIPs for Internet
access. You can add one or more global EIPs to the same global internet
bandwidth. A global EIP and its global internet bandwidth must use the same
access point. Figure 2-5 shows the architecture.
Global EIP-A, global EIP-B, and global EIP-C are added to global internet
bandwidth-A. The global EIPs and the global internet bandwidth must have the
same access point, that is, CN East-Hangzhou in this example.
Elastic IP
User Guide 2 Global Elastic IP User Guide
Issue 01 (2026-08-21) Copyright © Huawei Technologies Co., Ltd. 89

--- Page 95 ---
Figure 2-5 Global EIP architecture
Notes and Constraints
● The global EIPs must have the same access information, including geographic
region, geographic area, access point, and type, as their global internet
bandwidth.
● A global EIP to be removed from a global internet bandwidth cannot have an
instance bound. If there is an instance, unbind the global EIP from its instance
first by referring to Unbinding a Global EIP from an Instance.
● To unbind a global EIP from an instance, ensure that there are no services
running on the instance. Otherwise, services will be interrupted.
● A global internet bandwidth to be deleted cannot have any global EIP
associated.
Adding Global EIPs to a Global Internet Bandwidth
Figure 2-6 Adding global EIPs to a global internet bandwidth
Elastic IP
User Guide 2 Global Elastic IP User Guide
Issue 01 (2026-08-21) Copyright © Huawei Technologies Co., Ltd. 90

--- Page 96 ---
Table 2-7 Process for adding global EIPs to a global internet bandwidth
No. What You Need
to Do
Description
2 Buying a Global
Internet
Bandwidth
Buy a global internet bandwidth and add global
EIPs to the global internet bandwidth. In this way,
instances with the global EIPs bound can access the
Internet.
3 Adding Global
EIPs to a Global
Internet
Bandwidth
A global internet bandwidth can only be shared by
global EIPs from its same city.
 
Related Operations
● Modifying a Global Internet Bandwidth: Modify a global internet
bandwidth as required.
● Managing a Global Internet Bandwidth: Delete a global internet bandwidth
that is no longer needed.
2.3.2 Buying a Global Internet Bandwidth
Scenarios
This section describes how to buy a global internet bandwidth.
If you want to buy a global internet bandwidth, submit a service ticket to apply
for permissions.
Procedure
1. Go to the Buy Global Internet Bandwidth page.
2. Configure the parameters based on Table 2-8.
Table 2-8 Parameter descriptions
Parameter Description Example
Value
Region Mandatory
A global internet bandwidth can only be
shared by global EIPs from its same region.
For details about regions, see Selecting a
Region.
CN-East
Access
Point
Mandatory
For low Internet latency, select an access
point that is close to the Internet client.
Shanghai
Elastic IP
User Guide 2 Global Elastic IP User Guide
Issue 01 (2026-08-21) Copyright © Huawei Technologies Co., Ltd. 91

--- Page 97 ---
Parameter Description Example
Value
Type Mandatory The types vary according to the
selected city.
You can select:
● Static BGP
● Dynamic BGP
● CU
● CM
● CT
Dynamic BGP
Billing
Mode
You can select:
● Pay-per-use
● Yearly/Monthly
The billing modes vary according to the
selected city.
Pay-per-use
Bandwidth
Type
You can select:
● Standard
● IPv6 Static Bandwidth
The bandwidth types vary according to the
selected city.
Standard
Billed By You can select:
● Bandwidth
● 95th percentile bandwidth (standard)
The billing options vary according to the
selected city.
95th percentile
bandwidth
(standard)
Guaranteed
Bandwidth
This parameter is available only when
Billing Mode is set to Pay-per-use. The
system automatically generates the
guaranteed bandwidth percentage based on
what you select for Billed By.
0%
Bandwidth
(Mbit/s)
Mandatory
Select the size of the bandwidth. The unit is
Mbit/s.
100
Global
Internet
Bandwidth
Name
Optional
Enter the name of the bandwidth. The
name:
● Must contain 0 to 64 characters.
● Can contain letters, digits, underscores
(_), hyphens (-), and periods (.).
ibw-test
Elastic IP
User Guide 2 Global Elastic IP User Guide
Issue 01 (2026-08-21) Copyright © Huawei Technologies Co., Ltd. 92

--- Page 98 ---
Parameter Description Example
Value
Enterprise
Project
The enterprise project that the global
internet bandwidth belongs to.
An enterprise project facilitates project-level
management and grouping of cloud
resources and users. The default project is
default.
For details about creating and managing
enterprise projects, see the Enterprise
Management User Guide.
default
Tag Global internet bandwidth tag, which
consists of a key and value pair.
The tag key and value must meet the
requirements listed in Table 2-9.
● Key:
geip_1.1
● Value: 10
Description Supplementary information about the
global internet bandwidth. This parameter
is optional.
-
Required
Duration
The duration for which the yearly/monthly
global internet bandwidth will be used.
1 month
Upon
Expiration
This parameter must be specified if the
Billing Mode is set to Yearly/Monthly. The
value can be one of the following:
● Change to pay-per-use
● Auto-renew
● Enter grace period
Change to pay-
per-use
 
Table 2-9 Tag naming rules
Parameter Requirement Example Value
Key ● Cannot be left
blank.
● Must be unique for
a global internet
bandwidth.
● Can contain a
maximum of 36
characters.
● Can contain letters,
digits, underscores
(_), and hyphens (-).
geip_1.1
Elastic IP
User Guide 2 Global Elastic IP User Guide
Issue 01 (2026-08-21) Copyright © Huawei Technologies Co., Ltd. 93

--- Page 99 ---
Parameter Requirement Example Value
Value ● Can contain a
maximum of 43
characters.
● Can contain letters,
digits, underscores
(_), periods (.), and
hyphens (-).
10
 
3. Click Next.
4. Confirm the configurations and select "I have read and agree to the Elastic IP
Service Statement."
– If you set Billing Mode to Pay-per-Use, click Submit.
– If you set Billing Mode to Yearly/Monthly, click Pay Now.
On the payment page, confirm the order information and click Pay.
The global internet bandwidth list page is displayed.
5. In the global internet bandwidth list, view the status of the bandwidth.
If the status of the bandwidth is Normal, the purchase is successful.
Follow-Up Procedure
If your instance with a global EIP bound needs to access the Internet, you also
need to add the global EIP to a global internet bandwidth. For details, see Adding
Global EIPs to a Global Internet Bandwidth.
2.3.3 Adding Global EIPs to a Global Internet Bandwidth
Scenarios
This section describes how to add global EIPs to a global internet bandwidth. Only
after this, the instances with the global EIPs bound can access the Internet.
Notes and Constraints
● You can add multiple global EIPs to a global internet bandwidth.
● The global EIPs must have the same access information, including geographic
region, geographic area, access point, and type, as their global internet
bandwidth.
Procedure
1. Go to the global internet bandwidth list page.
2. In the global internet bandwidth list, search for or locate the target
bandwidth.
3. You can use either of the following methods to add a global EIP to a global
internet bandwidth:
– Method 1:
Elastic IP
User Guide 2 Global Elastic IP User Guide
Issue 01 (2026-08-21) Copyright © Huawei Technologies Co., Ltd. 94

--- Page 100 ---
i. In the global internet bandwidth list, locate the row that contains the
target global internet bandwidth, and click Add Global EIP in the
Operation column.
The Add Global EIP page is displayed.
ii. Select one or more global EIPs and click OK.
In the global internet bandwidth list, the number of global EIPs of
the bandwidth increased.
– Method 2:
i. In the global internet bandwidth list, click the name of the target
global internet bandwidth.
The Basic Information tab page is displayed.
ii. Click the Global EIPs tab and then click Add.
The Add Global EIP page is displayed.
iii. Select one or more global EIPs and click OK.
The selected global EIPs are displayed on the global EIP list.
2.3.4 Modifying a Global Internet Bandwidth
Scenarios
This section describes how to modify the name, billing option, or size of a global
internet bandwidth.
Your increased or decreased global internet bandwidth takes effect immediately.
Procedure
1. Go to the global internet bandwidth list page.
2. In the global internet bandwidth list, search for or locate the target
bandwidth.
3. Locate the row that contains the target bandwidth, and click Modify
Bandwidth in the Operation column.
The Modify Global Internet Bandwidth page is displayed.
4. Modify the global internet bandwidth parameters as required.
Table 2-10 Modifying a global internet bandwidth
Parameter Description Example Value
Global
Internet
Bandwidth
Name
(Optional)
Enter the name of the global
internet bandwidth. The name:
● Must contain 0 to 64 characters.
● Can contain letters, digits,
underscores (_), hyphens (-),
and periods (.).
ibw-test
Elastic IP
User Guide 2 Global Elastic IP User Guide
Issue 01 (2026-08-21) Copyright © Huawei Technologies Co., Ltd. 95

--- Page 101 ---
Parameter Description Example Value
Billed By You can specify:
95th percentile bandwidth
(standard)
95th percentile
bandwidth (standard)
Guaranteed
Bandwidth
The system automatically
generates the guaranteed
bandwidth percentage based on
what you select for Billed By.
20%
Bandwidth
(Mbit/s)
Mandatory
Select the size of the bandwidth.
The unit is Mbit/s.
100
 
5. Confirm the configurations and select Confirm Change.
6. Ensure that the configurations are correct and click Submit.
The modified bandwidth is displayed in the global internet bandwidth list.
2.3.5 Managing a Global Internet Bandwidth
Scenarios
You can perform the following operations to manage your global internet
bandwidths:
● Viewing a Global Internet Bandwidth
● Deleting a Global Internet Bandwidth
● Exporting Global Internet Bandwidths
Notes and Constraints
A global internet bandwidth to be deleted cannot have any global EIP associated.
Viewing a Global Internet Bandwidth
1. Go to the global internet bandwidth list page.
2. In the global internet bandwidth list, search for or locate the target
bandwidth.
3. Click the name of the target global internet bandwidth.
Go to the Basic Information tab page to view more information.
Deleting a Global Internet Bandwidth
1. Go to the global internet bandwidth list page.
2. In the global internet bandwidth list, search for or locate the target
bandwidth.
3. Locate the row that contains the target bandwidth, and click Delete in the
Operation column.
Elastic IP
User Guide 2 Global Elastic IP User Guide
Issue 01 (2026-08-21) Copyright © Huawei Technologies Co., Ltd. 96

--- Page 102 ---
A confirmation dialog box is displayed.
4. Click OK.
The deleted bandwidth is not displayed in the global internet bandwidth list.
Exporting Global Internet Bandwidths
1. Go to the global internet bandwidth list page.
2. On the global internet bandwidth list page, select one or more global internet
bandwidths and click Export in the upper left corner.
The system will automatically export information about all of your global
internet bandwidths as an Excel file to a local directory.
2.4 Cloud Eye Monitoring
2.4.1 Monitoring Global EIPs
Scenario
Cloud Eye is a multi-dimensional resource monitoring service. You can use Cloud
Eye to monitor global EIPs in real time, set alarm rules and notifications, identify
resource exceptions, and quickly respond to resource changes.
Cloud Eye is enabled automatically after a global EIP is assigned. For more
information about Cloud Eye, see What Is Cloud Eye?
Setting an Alarm Rule
You can set alarm rules on the Cloud Eye console to send you notifications in case
of exceptions.
For details about how to create alarm rules, see Creating an Alarm Rule.
Viewing Metrics
1. Log in to the Cloud Eye console.
2. In the navigation pane on the left, choose Cloud Service Monitoring.
On the Cloud Service Monitoring page, click Global EIP and Bandwidth
GEIP in the Dashboard column and go to the Details page.
3. Select global EIPs or internet bandwidth as required to view detailed data
under the Resources and Overview tabs.
4. On the Overview tab, perform the following operations:
a. View information under Resource Overview, Alarm Statistics, and Key
Metrics. For details, see Table 2-11.
Elastic IP
User Guide 2 Global Elastic IP User Guide
Issue 01 (2026-08-21) Copyright © Huawei Technologies Co., Ltd. 97

--- Page 103 ---
Table 2-11 Three modules on the Overview tab
Module Description
Resource
Overview
You can view the resource data of the current cloud
service in the current dimension, including Total
Resources, Resources in Alarm, and Resources in
Alarm in the Last 7 Days.
Alarm
Statistics
You can view the total number of alarms in the last
seven days, alarms of different severities (critical, major,
minor, and informational), top 5 instances by total
alarms, and top 5 resource groups by total alarms.
Key Metrics You can view monitoring details of key metrics
recommended by the cloud service.
 
b. In the upper left corner of the Details page, select Resources to view
corresponding monitoring details or select another cloud service to switch
to its dashboard.
5. On the Resources tab, perform the following operations:
– Click Export Data to export cloud service monitoring data. For details,
see How Can I Export Monitoring Data?
– Locate an instance and click View Metric to view the instance metrics
and HTTP status codes.
– Locate an instance and choose More > Create Alarm Rule to create an
alarm rule for the instance. For details about the parameters, see Setting
an Alarm Rule.
– Locate an instance and choose More > View Alarm Rule to view the
alarm rules created for the instance.
Related Operations
You can enable batch notification policy setting as required and select existing
notification policies. For details about how to create a notification policy, see
Creating a Notification Policy.
2.4.2 Monitoring Metrics
Overview
This section describes the namespace, list, and measurement dimensions of
metrics of global EIPs and global internet bandwidths that you can check on Cloud
Eye. You can use APIs or the Cloud Eye console to query the monitored metrics
and generated alarms.
Elastic IP
User Guide 2 Global Elastic IP User Guide
Issue 01 (2026-08-21) Copyright © Huawei Technologies Co., Ltd. 98

--- Page 104 ---
NO TE
● Currently, global connection bandwidths do not support monitoring data reporting and
have no monitoring metrics.
● If a bandwidth is increased or decreased, there is a delay of 5 to 10 minutes for the
monitoring metrics to update for the new bandwidth.
● Cloud Eye can monitor dimensions nested to a maximum depth of four levels (levels 0
to 3). 3 is the deepest level. For example, if the monitored dimension of a metric is
resourceA_id,resourceB_id, resourceA_id indicates level 0 and resourceB_id indicates
level 1.
Namespace
Namespace of global EIPs and global internet bandwidths: SYS.GEIP
Monitoring Metrics
Table 2-12 Global EIP and global internet bandwidth metrics
ID Nam
e
Description Value
Rang
e
Un
it
Co
nve
rsio
n
Rul
e
Monitored
Object
(Dimension
)
Monitorin
g Interval
(Raw
Data)
upstrea
m_band
width
Outb
ound
band
widt
h
Network
rate of
outbound
traffic
(Previously
called
"Upstream
Bandwidth")
≥ 0 bit/
s
100
0
(SI)
geip_interne
t_bandwidth
_id
geip_global_
eip_id
1 minute
downstr
eam_ba
ndwidth
Inbo
und
band
widt
h
Network
rate of
inbound
traffic
(Previously
called
"Downstrea
m
Bandwidth")
≥ 0 bit/
s
100
0
(SI)
geip_interne
t_bandwidth
_id
geip_global_
eip_id
1 minute
Elastic IP
User Guide 2 Global Elastic IP User Guide
Issue 01 (2026-08-21) Copyright © Huawei Technologies Co., Ltd. 99

--- Page 105 ---
ID Nam
e
Description Value
Rang
e
Un
it
Co
nve
rsio
n
Rul
e
Monitored
Object
(Dimension
)
Monitorin
g Interval
(Raw
Data)
upstrea
m_band
width_u
sage
Outb
ound
Band
widt
h
Usag
e
Usage of
outbound
bandwidth
in the unit of
percent.
Outbound
bandwidth
usage =
Outbound
bandwidth/
Purchased
bandwidth
0-100 % N/A geip_interne
t_bandwidth
_id
geip_global_
eip_id
1 minute
downstr
eam_ba
ndwidth
_usage
Inbo
und
Band
widt
h
Usag
e
Usage of
inbound
bandwidth
in the unit of
percent.
Inbound
bandwidth
usage =
Inbound
bandwidth/
Purchased
bandwidth
0-100 % N/A geip_interne
t_bandwidth
_id
geip_global_
eip_id
1 minute
up_stre
am
Outb
ound
Traffi
c
Network
traffic going
out of the
cloud
platform
(Previously
called
"Upstream
Traffic")
≥ 0 Byt
es
100
0
(SI)
geip_interne
t_bandwidth
_id
geip_global_
eip_id
1 minute
down_st
ream
Inbo
und
Traffi
c
Network
traffic going
into the
cloud
platform
(Previously
called
"Downstrea
m Traffic")
≥ 0 Byt
es
100
0
(SI)
geip_interne
t_bandwidth
_id
geip_global_
eip_id
1 minute
Elastic IP
User Guide 2 Global Elastic IP User Guide
Issue 01 (2026-08-21) Copyright © Huawei Technologies Co., Ltd. 100

--- Page 106 ---
 
Dimensions
Key Value
geip_global_eip_id Global EIP ID
You can obtain the value on the cloud
service monitoring page of the Cloud
Eye console.
geip_internet_bandwidth_id Global internet bandwidth ID
You can obtain the value on the cloud
service monitoring page of the Cloud
Eye console.
 
2.5 Managing Global EIP Quotas
What Is a Quota?
A quota limits the quantity of a resource available to users, thereby preventing
spikes in the usage of the resource. For example, a global EIP quota limits the
number of global EIPs that can be assigned.
You can also request for an increased quota if your existing quota cannot meet
your service requirements.
How Do I Apply for a Higher Quota?
1. Log in to the management console.
2. In the upper right corner of the page, choose Resources > My Quotas.
The Quotas page is displayed.
Figure 2-7 My Quotas
3. Click Increase Quota in the upper right corner of the page.
Elastic IP
User Guide 2 Global Elastic IP User Guide
Issue 01 (2026-08-21) Copyright © Huawei Technologies Co., Ltd. 101

--- Page 107 ---
Figure 2-8 Increasing quota
4. On the Create Service Ticket page, configure parameters as required.
In the Problem Description area, fill in the content and reason for
adjustment.
5. After all necessary parameters are configured, select I have read and agree
to the Ticket Service Protocol and Privacy Statement and click Submit.
Elastic IP
User Guide 2 Global Elastic IP User Guide
Issue 01 (2026-08-21) Copyright © Huawei Technologies Co., Ltd. 102