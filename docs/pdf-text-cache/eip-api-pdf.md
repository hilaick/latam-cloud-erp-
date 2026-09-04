# eip-api-pdf.pdf

Extracted from: docs/pdf-resources-kit/eip-api-pdf.pdf
Pages: 332

--- Page 1 ---
Elastic IP
API Reference
Issue 12
Date 2025-10-21
HUAWEI TECHNOLOGIES CO., LTD.

--- Page 2 ---
 
 
Copyright © Huawei Technologies Co., Ltd. 2025. All rights reserved.
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
  
 
 
 
 
 
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. i

--- Page 3 ---
 
 
Security Declaration
 
Vulnerability
Huawei's regulations on product vulnerability management are subject to the Vul. Response Process. For
details about this process, visit the following web page:
https://www.huawei.com/en/psirt/vul-response-process
For vulnerability information, enterprise customers can visit the following web page:
https://securitybulletin.huawei.com/enterprise/en/security-advisory
 
 
 
 
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. ii

--- Page 4 ---
Contents
1 Before You Start....................................................................................................................... 1
2 API Overview............................................................................................................................ 3
3 Calling APIs............................................................................................................................... 4
3.1 Making an API Request......................................................................................................................................................... 4
3.2 Authentication.......................................................................................................................................................................... 8
3.3 Response.....................................................................................................................................................................................9
4 APIs........................................................................................................................................... 12
4.1 Job Status................................................................................................................................................................................ 12
4.1.1 Querying Job Status..........................................................................................................................................................12
4.2 EIP.............................................................................................................................................................................................. 14
4.2.1 Changing EIP Billing Mode from Pay-per-Use to Yearly/Monthly....................................................................14
4.2.2 Assigning an EIP (Pay-per-Use)....................................................................................................................................18
4.2.3 Querying an EIP................................................................................................................................................................. 29
4.2.4 Querying EIPs......................................................................................................................................................................36
4.2.5 Updating an EIP................................................................................................................................................................. 46
4.2.6 Releasing an EIP.................................................................................................................................................................53
4.2.7 Assigning an EIP (Yearly/Monthly)..............................................................................................................................54
4.3 Batch Operations on EIPs...................................................................................................................................................69
4.3.1 Assigning EIPs in Batches............................................................................................................................................... 69
4.3.2 Releasing EIPs in Batches............................................................................................................................................... 74
4.3.3 Unbinding EIPs in Batches..............................................................................................................................................76
4.4 Bandwidth............................................................................................................................................................................... 77
4.4.1 Querying a Bandwidth.....................................................................................................................................................77
4.4.2 Querying Bandwidths.......................................................................................................................................................83
4.4.3 Updating a Bandwidth.....................................................................................................................................................92
4.4.4 Updating Bandwidths in Batches.............................................................................................................................. 100
4.5 Bandwidth (V2.0)............................................................................................................................................................... 108
4.5.1 Changing Bandwidth Billing Mode from Pay-per-Use to Yearly/Monthly.................................................. 108
4.5.2 Assigning a Shared Bandwidth...................................................................................................................................112
4.5.3 Assigning Multiple Shared Bandwidths...................................................................................................................122
4.5.4 Deleting a Shared Bandwidth.....................................................................................................................................129
4.5.5 Adding an EIP to a Shared Bandwidth.................................................................................................................... 130
Elastic IP
API Reference Contents
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. iii

--- Page 5 ---
4.5.6 Removing an EIP from a Shared Bandwidth......................................................................................................... 138
4.5.7 Updating a Yearly/Monthly Bandwidth...................................................................................................................140
4.6 Bandwidth Add-On Packages.........................................................................................................................................150
4.6.1 Querying Bandwidth Add-On Packages..................................................................................................................150
4.7 Quota......................................................................................................................................................................................152
4.7.1 Querying the Quota....................................................................................................................................................... 152
4.8 EIP Tag Management........................................................................................................................................................158
4.8.1 Adding a Tag to an EIP................................................................................................................................................. 159
4.8.2 Querying EIP Tags........................................................................................................................................................... 160
4.8.3 Deleting a Tag from an EIP ........................................................................................................................................ 162
4.8.4 Batch Adding or Deleting EIP Tags........................................................................................................................... 163
4.8.5 Querying EIPs by Tag..................................................................................................................................................... 165
4.8.6 Querying EIP Tags in a Specified Project................................................................................................................ 170
4.9 Auxiliary APIs for EIPs....................................................................................................................................................... 172
4.9.1 Querying the Number of EIPs.....................................................................................................................................172
4.9.2 Querying EIP Type...........................................................................................................................................................173
4.9.3 Querying the Number of EIPs.....................................................................................................................................174
5 API V3.....................................................................................................................................176
5.1 EIPs.......................................................................................................................................................................................... 176
5.1.1 Adding EIPs to a Shared Bandwidth in Batches................................................................................................... 176
5.1.2 Querying All EIPs.............................................................................................................................................................186
5.1.3 Querying EIP Details...................................................................................................................................................... 204
5.1.4 Updating an EIP...............................................................................................................................................................217
5.1.5 Unbinding an EIP............................................................................................................................................................ 227
5.1.6 Binding an EIP.................................................................................................................................................................. 236
5.1.7 Querying the Number of Available EIPs................................................................................................................. 246
5.2 Shared Bandwidth Types..................................................................................................................................................248
5.2.1 Querying Shared Bandwidth Types of a Specified Tenant................................................................................248
5.3 Bandwidths........................................................................................................................................................................... 252
5.3.1 Querying Bandwidths (Old APIs).............................................................................................................................. 252
5.3.2 Viewing Bandwidth Limits........................................................................................................................................... 263
5.4 Common Pools.................................................................................................................................................................... 268
5.4.1 Querying Common Pools............................................................................................................................................. 268
5.4.2 Querying EIP Pools......................................................................................................................................................... 271
5.4.3 Querying EIP Pool Details............................................................................................................................................ 277
6 Native OpenStack Neutron APIs V2.0............................................................................ 282
6.1 API Version Information................................................................................................................................................... 282
6.1.1 Querying API Versions................................................................................................................................................... 282
6.1.2 Pagination..........................................................................................................................................................................284
6.2 Floating IP Address............................................................................................................................................................ 286
6.2.1 Querying Floating IP Addresses................................................................................................................................. 287
6.2.2 Querying a Floating IP Address..................................................................................................................................293
Elastic IP
API Reference Contents
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. iv

--- Page 6 ---
6.2.3 Assigning a Floating IP Address................................................................................................................................. 295
6.2.4 Updating a Floating IP Address................................................................................................................................. 298
6.2.5 Deleting a Floating IP Address................................................................................................................................... 302
7 Application Examples.........................................................................................................303
7.1 Binding an EIP to an ECS................................................................................................................................................. 303
7.2 Unbinding an EIP from an ECS...................................................................................................................................... 305
7.3 Assigning an EIP with a Specific Shared Bandwidth.............................................................................................. 307
8 Permissions Policies and Supported Actions................................................................ 310
8.1 Introduction.......................................................................................................................................................................... 310
8.2 EIP............................................................................................................................................................................................ 311
8.3 Bandwidth............................................................................................................................................................................. 311
8.4 Bandwidth (V2)................................................................................................................................................................... 312
8.5 EIP Tags.................................................................................................................................................................................. 312
8.6 Floating IP Address (OpenStack Neutron API)........................................................................................................ 313
8.7 Precautions for API Permissions.................................................................................................................................... 313
A Appendix...............................................................................................................................314
A.1 VPC Monitoring Metrics...................................................................................................................................................314
A.2 Status Codes........................................................................................................................................................................ 316
A.3 Error Codes........................................................................................................................................................................... 317
A.4 Obtaining a Project ID......................................................................................................................................................325
Elastic IP
API Reference Contents
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. v

--- Page 7 ---
1 Before You Start
Welcome to Elastic IP API Reference. The EIP service provides independent public
IP addresses and bandwidth for Internet access.
EIPs can be bound to or unbound from ECSs, BMSs, virtual IP addresses, load
balancers, or NAT gateways. Various billing modes are provided to meet diverse
service requirements.
This document describes how to use application programming interfaces (APIs) to
perform operations on EIPs, such as creating, querying, deleting, and updating an
EIP. For details about all supported operations, see API Overview.
If you plan to access EIPs through an API, ensure that you are familiar with EIP
concepts. For details, see Service Overview in Elastic IP User Guide.
EIP supports Representational State Transfer (REST) APIs, allowing you to call APIs
using HTTPS.
For details about API calling, see Calling APIs.
Additionally, EIPs offer software development kits (SDKs) for multiple
programming languages. For details about how to use SDKs, log in at https://
developer.huaweicloud.com/intl/en-us/sdk?VPC.
EIP Endpoints
An endpoint is the request address for calling an API. Endpoints vary depending
on services and regions. Currently, EIP and VPC use same endpoints. For the
endpoints of all services, see Regions and Endpoints.
Concepts
● Account
An account is created upon successful signing up. The account has full access
permissions for all of its cloud services and resources. It can be used to reset
user passwords and grant user permissions. The account is a payment entity,
which should not be used directly to perform routine management. For
security purposes, create Identity and Access Management (IAM) users and
grant them permissions for routine management.
● User
Elastic IP
API Reference 1 Before You Start
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 1

--- Page 8 ---
An IAM user is created by an account in IAM to use cloud services. Each IAM
user has its own identity credentials (password and access keys).
API authentication requires information such as the account name, username,
and password.
● Region
Regions are divided based on geographical location and network latency.
Public services, such as Elastic Cloud Server (ECS), Elastic Volume Service
(EVS), Object Storage Service (OBS), Virtual Private Cloud (VPC), Elastic IP
(EIP), and Image Management Service (IMS), are shared within the same
region. Regions are classified into universal regions and dedicated regions. A
universal region provides universal cloud services for common tenants. A
dedicated region provides specific services for specific tenants.
For details, see Region and AZ.
● AZ
An AZ comprises of one or more physical data centers equipped with
independent ventilation, fire, water, and electricity facilities. Computing,
network, storage, and other resources in an AZ are logically divided into
multiple clusters. AZs within a region are interconnected using high-speed
optical fibers to allow you to build cross-AZ high-availability systems.
● Project
A project corresponds to a region. Default projects are defined to group and
physically isolate resources (including computing, storage, and network
resources) across regions. Users can be granted permissions in a default
project to access all resources under their accounts in the region associated
with the project. If you need more refined access control, create subprojects
under a default project and create resources in subprojects. Then you can
assign users the permissions required to access only the resources in the
specific subprojects.
Figure 1-1 Project isolation model
● Enterprise Project
Enterprise projects group and manage resources across regions. Resources in
different enterprise projects are logically isolated. An enterprise project can
contain resources of multiple regions, and resources can be added to or
removed from enterprise projects.
For details about enterprise projects and about how to obtain enterprise
project IDs, see Enterprise Management User Guide.
Elastic IP
API Reference 1 Before You Start
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 2

--- Page 9 ---
2 API Overview
APIs provided by the EIP service include native OpenStack APIs and EIP APIs.
A combination of these two types of APIs allows you to use all functions provided
by the EIP service.
EIP APIs
Table 2-1 EIP APIs
Type Description
Elastic IP APIs for assigning, querying, updating, and releasing EIPs
Bandwidth APIs for querying and updating bandwidth
Quota API for querying quota values
EIP Tag
Management
APIs for adding tags to EIPs as well as querying and deleting
EIP tags
Currently, this type of API is available only in the AP-
Singapore region.
 
Native OpenStack APIs
Table 2-2 Native OpenStack APIs
Type Description
API Version
Information
APIs for querying all available API versions and displaying the
results in pages.
Floating IP
Address
APIs for assigning, querying, updating, and releasing floating IP
addresses
Elastic IP
API Reference 2 API Overview
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 3

--- Page 10 ---
3 Calling APIs
3.1 Making an API Request
This section describes the structure of a REST API request, and uses the IAM API
for creating an IAM user as an example to demonstrate how to call an API.
Request URI
A request URI is in the following format:
{URI-scheme}://{Endpoint}/{resource-path}?{query-string}
Although a request URI is included in the request header, most programming
languages or frameworks require the request URI to be transmitted separately.
Table 3-1 URI parameter description
Parameter Description
URI-scheme Protocol used to transmit requests. All APIs use HTTPS.
Endpoint Domain name or IP address of the server bearing the REST
service. The endpoint varies between services in different
regions. It can be obtained from Regions and Endpoints.
For example, the endpoint of IAM in region CN-Hong Kong is
iam.ap-southeast-1.myhuaweicloud.com.
resource-path Access path of an API for performing a specified operation.
Obtain the path from the URI of an API. For example, the
resource-path of the API used to obtain a user token is /v3/
auth/tokens.
query-string Query parameter, which is optional. Ensure that a question
mark (?) is included before each query parameter that is in the
format of Parameter name=Parameter value. For example, ?
limit=10 indicates that a maximum of 10 data records will be
displayed.
 
Elastic IP
API Reference 3 Calling APIs
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 4

--- Page 11 ---
IAM is a global service. You can create an IAM user using the endpoint of IAM in
any region. For example, to create an IAM user in the CN-Hong Kong region,
obtain the endpoint of IAM (iam.ap-southeast-1.myhuaweicloud.com) for this
region and the resource-path (/v3.0/OS-USER/users) in the URI of the API for
creating an IAM user. Then construct the URI as follows:
https://iam.ap-southeast-1.myhuaweicloud.com/v3.0/OS-USER/users
Figure 3-1 Example URI
NO TE
To simplify the URI display in this document, each API is provided only with a resource-
path and a request method. The URI-scheme of all APIs is HTTPS, and the endpoints of all
APIs in the same region are identical.
Request Methods
The HTTP protocol defines the following request methods that can be used to
send a request to the server.
Table 3-2 HTTP methods
Method Description
GET Requests the server to return specified resources.
PUT Requests the server to update specified resources.
POST Requests the server to add resources or perform special
operations.
DELETE Requests the server to delete specified resources, for
example, an object.
HEAD Same as GET except that the server must return only
the response header.
PATCH Requests the server to update partial content of a
specified resource.
If the resource does not exist, a new resource will be
created.
 
For example, in the case of the API for creating an IAM user, the request method
is POST. An example request is as follows:
POST https://iam.ap-southeast-1.myhuaweicloud.com/v3.0/OS-USER/users
Elastic IP
API Reference 3 Calling APIs
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 5

--- Page 12 ---
Request Header
You can also add additional header fields to a request, such as the fields required
by a specified URI or HTTP method. For example, to request for the authentication
information, add Content-Type, which specifies the request body type.
Common request header fields are as follows.
Table 3-3 Common request header fields
Parameter Description Mandatory Example Value
Host Specifies the server
domain name and port
number of the resources
being requested. The
value can be obtained
from the URL of the
service API. The value is
in the format of
Hostname:Port number.
If the port number is not
specified, the default
port is used. The default
port number for https is
443.
No
This field is
mandatory for
AK/SK
authentication.
code.test.com
or
code.test.com:44
3
Content-Type Specifies the type (or
format) of the message
body. The default value
application/json is
recommended. Other
values of this field will be
provided for specific APIs
if any.
Yes application/json
Content-
Length
Specifies the length of
the request body. The
unit is byte.
No 3495
X-Project-Id Specifies the project ID.
Obtain the project ID by
following the instructions
in Obtaining a Project
ID.
No
This field is
mandatory for
requests that
use AK/SK
authentication
in the Dedicated
Cloud (DeC)
scenario or
multi-project
scenario.
e9993fc787d94b
6c886cbaa340f9c
0f4
Elastic IP
API Reference 3 Calling APIs
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 6

--- Page 13 ---
Parameter Description Mandatory Example Value
X-Auth-Token Specifies the user token.
It is a response to the API
for obtaining a user
token (This is the only
API that does not require
authentication).
After the request is
processed, the value of
X-Subject-Token in the
response header is the
token value.
No
This field is
mandatory for
token
authentication.
The following is
part of an
example token:
MIIPAgYJKoZIhvc
NAQcCo...ggg1B
BIINPXsidG9rZ
 
NO TE
In addition to supporting authentication using tokens, APIs support authentication using
AK/SK, which uses SDKs to sign a request. During the signature, the Authorization
(signature authentication) and X-Sdk-Date (time when a request is sent) headers are
automatically added in the request.
For more details, see "Authentication Using AK/SK" in Authentication.
The following shows an example request of the API for creating an IAM user
when AK/SK authentication is used:
POST https://iam.ap-southeast-1.myhuaweicloud.com/v3.0/OS-USER/users
Content-Type: application/json 
X-Sdk-Date: 20240416T095341Z 
Authorization: SDK-HMAC-SHA256 Access=****************, SignedHeaders=content-type;host;x-sdk-date, 
Signature=****************
(Optional) Request Body
This part is optional. A request body is generally sent in a structured format (for
example, JSON or XML), which is specified by Content-Type in the request header.
It is used to transfer content other than the request header. If the request body
contains full-width characters, these characters must be coded in UTF-8.
The request body varies depending on APIs. Certain APIs do not require the
request body, such as the APIs requested using the GET and DELETE methods.
The following shows an example request (a request body included) of the API for
creating an IAM user. You can learn about request parameters and related
description from this example. The bold parameters need to be replaced for a real
request.
● accountid: account ID of an IAM user
● username: name of an IAM user
● email: email of an IAM user
● password: login password of an IAM user
POST https://iam.ap-southeast-1.myhuaweicloud.com/v3.0/OS-USER/users
Content-Type: application/json 
X-Sdk-Date: 20240416T095341Z 
Elastic IP
API Reference 3 Calling APIs
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 7

--- Page 14 ---
Authorization: SDK-HMAC-SHA256 Access=****************, SignedHeaders=content-type;host;x-sdk-date, 
Signature=**************** 
 
{ 
     "user": { 
         "domain_id": "accountid", 
         "name": "username", 
         "password": "**********", 
         "email": "email", 
         "description": "IAM User Description" 
     } 
 }
If all data required for the API request is available, you can send the request to call
the API through curl, Postman, or coding.
3.2 Authentication
Requests for calling an API can be authenticated using either of the following
methods:
● Token authentication: Requests are authenticated using tokens.
● AK/SK authentication: Requests are encrypted using AK/SK pairs. AK/SK
authentication is recommended because it is more secure than token
authentication.
Token Authentication
NO TE
The validity period of a token is 24 hours. When using a token for authentication, cache it
to prevent frequently calling the IAM API used to obtain a user token.
A token specifies temporary permissions in a computer system. During API
authentication using a token, the token is added to the request header to get
permissions for calling the API.
You can obtain a token by calling the API for obtaining a user token.
EIP is a project-level service. When you call the API, set auth.scope in the request
body to project.
{
    "auth": {
        "identity": {
            "methods": [
                "password"
            ],
            "password": {
                "user": {
                    "name": "username",   // IAM user name
                    "password": "********",  // IAM user password
                    "domain": {
                        "name": "domainname"  //Name of the account to which the IAM user belongs
                    }
                }
            }
        },
        "scope": {
            "project": {
                "name": "xxxxxxxx"    // Project Name
            }
Elastic IP
API Reference 3 Calling APIs
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 8

--- Page 15 ---
        }
    }
}
After a token is obtained, the X-Auth-Token header field must be added to
requests to specify the token when calling other APIs. For example, if the token is
ABCDEFJ...., X-Auth-Token: ABCDEFJ.... can be added to a request as follows:
POST https://iam.ap-southeast-1.myhuaweicloud.com/v3/auth/projects
Content-Type: application/json
X-Auth-Token: ABCDEFJ....
AK/SK Authentication
NO TE
● AK/SK authentication supports API requests with a body not larger than 12 MB. For API
requests with a larger body, token authentication is recommended.
● The AK/SK can either be permanent or temporary. If it is temporary, the X-Security-
Token field must be included in the request header. The value is the security token of
the temporary AK/SK.
In AK/SK authentication, AK/SK is used to sign requests and the signature is then
added to the requests for authentication.
● AK: access key ID, which is a unique identifier used in conjunction with a
secret access key to sign requests cryptographically.
● SK: secret access key, which is used in conjunction with an AK to sign requests
cryptographically. It identifies a request sender and prevents the request from
being modified.
In AK/SK authentication, you can use an AK/SK to sign requests based on the
signature algorithm or using the signing SDK. For details about how to sign
requests and use the signing SDK, see API Request Signing Guide.
NO TE
The signing SDK is only used for signing requests and is different from the SDKs provided
by services.
3.3 Response
Status Code
After sending a request, you will receive a response, including a status code,
response header, and response body.
A status code is a group of digits, ranging from 1xx to 5xx. It indicates the status
of a request. For more information, see Status Codes.
For example, if status code 201 is returned for calling the API used to create an
IAM user, the request is successful.
Response Header
Similar to a request, a response also has a header, for example, Content-Type.
Elastic IP
API Reference 3 Calling APIs
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 9

--- Page 16 ---
Figure 3-2 shows the response header fields for the API used to create an IAM
user. The X-Subject-Token header field is the desired user token. This token can
then be used to authenticate the calling of other APIs.
NO TE
For security purposes, you are advised to set the token in ciphertext in configuration files or
environment variables and decrypt it when using it.
Figure 3-2 Header fields of the response to the request for creating an IAM user
(Optional) Response Body
The body of a response is often returned in a structured format (for example,
JSON or XML) as specified in the Content-Type header field. The response body
transfers content except the response header.
The following shows part of the response body for the API used to create an IAM
user.
{ 
     "user": { 
         "id": "c131886aec...", 
         "name": "IAMUser", 
         "description": "IAM User Description", 
         "areacode": "", 
         "phone": "", 
         "email": "***@***.com", 
         "status": null, 
         "enabled": true, 
         "pwd_status": false, 
         "access_mode": "default", 
         "is_domain_owner": false, 
         "xuser_id": "", 
         "xuser_type": "", 
         "password_expires_at": null, 
         "create_time": "2024-05-21T09:03:41.000000", 
         "domain_id": "d78cbac1..........", 
         "xdomain_id": "30086000........", 
         "xdomain_type": "", 
         "default_project_id": null 
     } 
 }
If an error occurs during API calling, an error code and a message will be
displayed. The following shows an error response body.
Elastic IP
API Reference 3 Calling APIs
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 10

--- Page 17 ---
{
    "error_msg": "The request message format is invalid.",
    "error_code": "IMG.0001"
}
In the response body, error_code is an error code, and error_msg provides
information about the error.
Elastic IP
API Reference 3 Calling APIs
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 11

--- Page 18 ---
4 APIs
4.1 Job Status
4.1.1 Querying Job Status
Function
This API is used to query job status.
URI
GET /v1/{project_id}/jobs/{job_id}
Table 4-1 Path parameter
Parameter Mandatory Type Description
project_id Yes String Project ID
job_id Yes String Job ID returned by the batch
operation
 
Request Parameters
None
Response Parameters
Status code: 200
Elastic IP
API Reference 4 APIs
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 12

--- Page 19 ---
Table 4-2 Response body parameters
Parameter Type Description
job_id String Job ID
job_type String Job type
begin_time String Creation start time
end_time String Creation end time
status String Job status
error_code String Error code
fail_reason String Error message
entities SubJobsInfo
object
Job information body, which is the loop body.
 
Table 4-3 SubJobsInfo
Parameter Type Description
sub_jobs Array of
objects
Sub-job information. The type is the same as
that of the main job.
 
Example Request
None
Example Response
Status code: 200
Normal response to the GET operation
{
  "job_id" : "ff808082843684110184e155fdb36461",
  "job_type" : "createBatchPublicip",
  "begin_time" : "2022-12-05T08:10:19.951Z",
  "end_time" : "2022-12-05T08:10:21.864Z",
  "status" : "SUCCESS",
  "error_code" : null,
  "fail_reason" : null,
  "entities" : {
    "sub_jobs" : [ ]
  }
}
Status Code
See Status Codes.
Elastic IP
API Reference 4 APIs
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 13

--- Page 20 ---
Error Code
See Error Codes.
4.2 EIP
4.2.1 Changing EIP Billing Mode from Pay-per-Use to Yearly/
Monthly
Function
This API is used to change the EIP billing mode from pay-per-use to yearly/
monthly.
URI
POST /v2.0/{project_id}/publicips/change-to-period
Table 4-4 Path parameter
Parameter Mandatory Type Description
project_id Yes String Project ID
 
Request Parameters
Table 4-5 Request body parameters
Parameter Mandatory Type Description
publicip_ids Yes Array List of pay-per-use EIPs to be
changed to yearly/monthly
extendParam Yes CreatePrePai
dPublicipExte
ndParamOpti
on object
Change billing mode from
pay-per-use to yearly/monthly.
 
Elastic IP
API Reference 4 APIs
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 14

--- Page 21 ---
Table 4-6 CreatePrePaidPublicipExtendParamOption
Parameter Mandatory Type Description
charge_mode No String ● Billing mode.
● The value can be:
– prePaid: yearly/monthly,
which is prepayment.
– postPaid: pay-per-use,
which is postpayment.
● In the postpayment mode,
fields in extendParam will
be ignored.
Default value: postPaid
Enumerated values:
● prePaid
● postPaid
period_type No String ● Subscription unit.
● The value can be:
– month: indicates that
the subscription is in the
unit of month.
– year: indicates that the
subscription is in the
unit of year.
● If you specify the shared
bandwidth ID when you
assign an EIP that is billed
on a yearly/monthly basis,
this parameter is optional.
This parameter is
mandatory if an EIP is
billed on a yearly/monthly
basis and is not assigned
together with a shared
bandwidth. If an EIP is
assigned together with a
shared bandwidth, the
expiration time of the
bandwidth is the same as
that of the EIP.
Enumerated values:
● month
● year
Elastic IP
API Reference 4 APIs
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 15

--- Page 22 ---
Parameter Mandatory Type Description
period_num No Integer ● Subscription period.
● Value range: (The value will
change with the operation
policy.)
– If period_type is set to
month, the value ranges
from 1 to 9.
– If period_type is set to
year, the value ranges
from 1 to 13.
● The constraints for
period_num are the same
as those for period_type.
Minimum value: 1
Maximum value: 9
is_auto_renew No Boolean ● Whether to automatically
renew the subscription.
● false: The subscription will
not be automatically
renewed. true: The
subscription will be
automatically renewed.
● After the subscription
expires, the system
automatically renews the
subscription for one month
by default (the automatic
renewal period may
change). For details,
contact customer service.
Default value: false
Elastic IP
API Reference 4 APIs
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 16

--- Page 23 ---
Parameter Mandatory Type Description
is_auto_pay No Boolean ● Whether the payment will
be automatically deducted
from your account balance
when an order is
submitted.
● The value can be:
– true: indicates
automatic payment. The
system will
automatically deduct
fees from your account
balance after an order is
submitted.
– false: indicates non-
automatic payment. You
need to pay manually.
● If you use automatic
payment, only your account
balance can be used. If you
want to use a voucher, do
not use automatic
payment, and select the
voucher for the payment in
the Billing Center.
Default value: false
 
Response Parameters
Status code: 200
Table 4-7 Response body parameters
Parameter Type Description
publicip_ids Array List of EIPs with billing mode changed to
yearly/monthly
order_id String Order ID
request_id String Request ID
 
Example Request
POST /v2.0/{project_id}/publicips/change-to-period
{
  "publicip_ids" : [ "fe2a11c7-c880-49f7-b1e0-e151df2cc836" ],
  "extendParam" : {
Elastic IP
API Reference 4 APIs
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 17

--- Page 24 ---
    "charge_mode" : "prePaid",
    "period_type" : "month",
    "period_num" : 1,
    "is_auto_renew" : false,
    "is_auto_pay" : true
  }
}
Example Response
Status code: 200
OK
{
  "publicip_ids" : [ "2c3b404b-d595-4ab5-a333-69f3ff937dc2" ],
  "order_id" : "CS2212141730K2FGR",
  "request_id" : "9d5bc34c-810f-48f2-95c4-9c48d02f2a33"
}
Status Code
See Status Codes.
Error Code
See Error Codes.
4.2.2 Assigning an EIP (Pay-per-Use)
Function
This API is used to assign an EIP.
The EIP service provides independent public IP addresses and bandwidth for
Internet access. EIPs can be flexibly bound to or unbound from ECSs, BMSs, virtual
IP addresses, NAT gateways, or load balancers. Various billing modes are provided
to meet diversified service requirements.
URI
POST /v1/{project_id}/publicips
Table 4-8 describes the parameters.
Table 4-8 Parameter description
Parameter Mandatory Description
project_id Yes Specifies the project ID.
For details about how to
obtain a project ID, see
Obtaining a Project ID.
 
Elastic IP
API Reference 4 APIs
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 18

--- Page 25 ---
Request Parameters
Table 4-9 Request body parameter
Paramet
er
Mandatory Type Description
publicip Yes publicip
object
Specifies the EIP object. For details,
see Table 4-10.
bandwidt
h
Yes bandwidth
object
Specifies the bandwidth object. For
details, see Table 4-11.
enterpris
e_project
_id
No String ● Specifies the enterprise project
ID. The value is 0 or a string that
contains a maximum of 36
characters in UUID format with
hyphens (-).
● When you assign an EIP,
associate an enterprise project ID
with the EIP.
● If this parameter is not specified,
the default value is 0, which
indicates that the default
enterprise project is used.
NOTE
For more information about enterprise
projects and how to obtain enterprise
project IDs, see the Enterprise
Management User Guide.
 
Elastic IP
API Reference 4 APIs
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 19

--- Page 26 ---
Table 4-10 Description of the publicip field
Paramete
r
Mandator
y
Type Description
type Yes String ● Specifies the EIP type.
● The value can be 5_bgp (dynamic
BGP) or 5_sbgp (static BGP).
– CN South-Guangzhou: 5_bgp
and 5_sbgp
– CN East-Shanghai1: 5_bgp and
5_sbgp
– CN East-Shanghai2: 5_bgp and
5_sbgp
– CN North-Beijing1: 5_bgp and
5_sbgp
– CN-Hong Kong: 5_bgp
– AP-Bangkok: 5_bgp
– AP-Singapore: 5_bgp
– AF-Johannesburg: 5_bgp
– CN Southwest-Guiyang1:
5_sbgp
– CN North-Beijing4: 5_bgp and
5_sbgp
– LA-Santiago: 5_bgp
– LA-Sao Paulo1: 5_bgp
– LA-Mexico City1: 5_bgp
– LA-Buenos Aires1: 5_bgp
– LA-Lima1: 5_bgp
– LA-Santiago2: 5_bgp
● Constraints:
– The configured value must be
supported by the system.
– publicip_id is an IPv4 port. If
publicip_type is not specified,
the default value is 5_bgp.
Elastic IP
API Reference 4 APIs
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 20

--- Page 27 ---
Paramete
r
Mandator
y
Type Description
ip_version No Integer ● Specifies the EIP version.
● The value can be 4 and 6,
indicating IPv4 address and IPv6
address, respectively.
● Constraints:
– The configured value must be
supported by the system.
– If this parameter is left blank
or is an empty string, IPv4
address is created by default.
ip_addres
s
No String ● Specifies the EIP to be assigned.
The system automatically assigns
an EIP if you do not specify it.
● The value must be a valid IPv4
address in the available IP address
range.
alias No String ● Specifies the EIP name.
● The value can contain 1 to 64
characters, including letters,
digits, underscores (_), hyphens
(-), and periods (.).
port_id No String ● Specifies the port ID. The EIP to
be assigned is bound to this port.
● The value must be an ID of an
existing port. If the port does not
exist or has been bound to an EIP,
an error message is displayed.
 
Elastic IP
API Reference 4 APIs
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 21

--- Page 28 ---
Table 4-11 Description of the bandwidth field
Parameter Mandatory Type Description
name No String ● Specifies the
bandwidth name.
● The value can
contain 1 to 64
characters,
including letters,
digits, underscores
(_), hyphens (-),
and periods (.).
● This parameter is
mandatory when
share_type is set to
PER. This parameter
will be ignored
when share_type is
set to WHOLE with
an ID specified.
Elastic IP
API Reference 4 APIs
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 22

--- Page 29 ---
Parameter Mandatory Type Description
size No Integer ● Specifies the
bandwidth size.
● The value ranges
from 1 Mbit/s to
300 Mbit/s by
default. (The
specific range may
vary depending on
the configuration in
each region. You
can see the
bandwidth range of
each region on the
management
console.)
● This parameter is
mandatory when
share_type is set to
PER. This parameter
will be ignored
when share_type is
set to WHOLE with
an ID specified.
● The minimum
increment for
bandwidth
adjustment varies
depending on the
bandwidth range.
The details are as
follows:
– The minimum
increment is 1
Mbit/s if the
allowed
bandwidth
ranges from 0
Mbit/s to 300
Mbit/s (with 300
Mbit/s included).
– The minimum
increment is 50
Mbit/s if the
allowed
bandwidth
ranges from 300
Mbit/s to 1000
Mbit/s (with
Elastic IP
API Reference 4 APIs
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 23

--- Page 30 ---
Parameter Mandatory Type Description
1000 Mbit/s
included).
– The minimum
increment is 500
Mbit/s if the
allowed
bandwidth is
greater than
1000 Mbit/s.
id No String ● Specifies the
bandwidth ID. You
can specify an
existing shared
bandwidth when
assigning an EIP.
● The value can be
the ID of the shared
bandwidth whose
type is set to
WHOLE.
share_type Yes String ● Specifies the
bandwidth type.
● Range:
– PER: Dedicated
bandwidth
– WHOLE: Shared
bandwidth
● If this parameter is
set to WHOLE, the
bandwidth ID must
be specified.
charge_mode No String ● Specifies whether
the bandwidth is
billed by traffic or
by bandwidth size.
● The value
bandwidth
indicates that you
will be billed by
bandwidth, and the
value traffic
indicates that you
will be billed by
traffic.
 
Elastic IP
API Reference 4 APIs
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 24

--- Page 31 ---
Example Request
Example request (IPv4 EIP with dedicated bandwidth)
POST https://{Endpoint}/v1/{project_id}/publicips
{
    "publicip": {
        "type": "5_bgp",
        "ip_version": 4
    },
    "bandwidth": {
        "name": "bandwidth123",
        "size": 10,
        "share_type": "PER"
    },
    "enterprise_project_id":"b261ac1f-2489-4bc7-b31b-c33c3346a439"
}
Response Message
● Response parameter
Table 4-12 Response parameter
Parameter Type Description
publicip publicip object Specifies the EIP object. For details, see
Table 4-13.
 
Table 4-13 Description of the publicip field
Parameter Type Description
id String Specifies the unique
identifier of an EIP.
Elastic IP
API Reference 4 APIs
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 25

--- Page 32 ---
Parameter Type Description
status String ● Specifies the EIP status.
● Range:
– FREEZED (Frozen)
– BIND_ERROR
(Binding failed)
– BINDING (Binding)
– PENDING_DELETE
(Releasing)
– PENDING_CREATE
(Assigning)
– PENDING_UPDATE
(Updating)
– NOTIFYING
(Assigning)
– NOTIFY_DELETE
(Release)
– DOWN (Unbound)
– ACTIVE (Bound)
– ELB (Bound to a load
balancer)
– VPN (Bound to a
VPN)
– ERROR (Exceptions)
Elastic IP
API Reference 4 APIs
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 26

--- Page 33 ---
Parameter Type Description
type String ● Specifies the EIP type.
● The value can be 5_bgp
(dynamic BGP) or
5_sbgp (static BGP).
– CN South-
Guangzhou: 5_bgp
and 5_sbgp
– CN East-Shanghai1:
5_bgp and 5_sbgp
– CN East-Shanghai2:
5_bgp and 5_sbgp
– CN North-Beijing1:
5_bgp and 5_sbgp
– CN-Hong Kong:
5_bgp
– AP-Bangkok: 5_bgp
– AP-Singapore: 5_bgp
– AF-Johannesburg:
5_bgp
– CN Southwest-
Guiyang1: 5_sbgp
– CN North-Beijing4:
5_bgp and 5_sbgp
– LA-Santiago: 5_bgp
– LA-Sao Paulo1:
5_bgp
– LA-Mexico City1:
5_bgp
– LA-Buenos Aires1:
5_bgp
– LA-Lima1: 5_bgp
– LA-Santiago2: 5_bgp
● Constraints:
– The configured value
must be supported
by the system.
– publicip_id is an
IPv4 port. If
publicip_type is not
specified, the default
value is 5_bgp.
Elastic IP
API Reference 4 APIs
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 27

--- Page 34 ---
Parameter Type Description
public_ip_address String Specifies the obtained EIP
if only IPv4 EIPs are
available.
public_ipv6_address String Specifies the obtained EIP
if IPv6 EIPs are available.
This parameter does not
exist if only IPv4 EIPs are
available.
ip_version Integer Specifies the IP address
version. The value can be 4
or 6.
● 4: IPv4
● 6: IPv6
tenant_id String Specifies the project ID.
create_time String Specifies the time (UTC)
when the EIP is assigned.
Format: yyyy-MM-dd
HH:mm:ss
bandwidth_size Integer Specifies the bandwidth
(Mbit/s).
alias String Specifies the EIP name.
enterprise_project_id String ● Specifies the enterprise
project ID. The value is
0 or a string that
contains a maximum of
36 characters in UUID
format with hyphens
(-).
● When you assign an EIP,
associate an enterprise
project ID with the EIP.
● If this parameter is not
specified, the default
value is 0, which
indicates that the
default enterprise
project is used.
NOTE
For more information about
enterprise projects and how
to obtain enterprise project
IDs, see the Enterprise
Management User Guide.
Elastic IP
API Reference 4 APIs
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 28

--- Page 35 ---
Parameter Type Description
public_border_group String Specifies whether it is in a
central site or an edge site.
Range:
● center
● Edge site name
This resource can only be
associated with an EIP of
the same region.
 
Example Response
Example response (IPv4 EIP with dedicated bandwidth)
{
    "publicip": {
        "id": "f588ccfa-8750-4d7c-bf5d-2ede24414706",
        "alias": "tom",
        "public_border_group": "center",
        "status": "PENDING_CREATE",
        "type": "5_bgp",
        "public_ip_address": "161.xx.xx.7",
        "tenant_id": "8b7e35ad379141fc9df3e178bd64f55c",
        "ip_version": 4,
        "create_time": "2015-07-16 04:10:52",
        "bandwidth_size": 0,
        "enterprise_project_id": "b261ac1f-2489-4bc7-b31b-c33c3346a439"
    }
}
Status Code
See Status Codes.
Error Code
See Error Codes.
4.2.3 Querying an EIP
Function
This API is used to query a specific EIP.
URI
GET /v1/{project_id}/publicips/{publicip_id}
Table 4-14 describes the parameters.
Elastic IP
API Reference 4 APIs
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 29

--- Page 36 ---
Table 4-14 Parameter description
Parameter Mandatory Description
project_id Yes Specifies the project ID.
For details about how to
obtain a project ID, see
Obtaining a Project ID.
publicip_id Yes Specifies the unique
identifier of an EIP.
 
Request Message
● Request parameter
None
● Example request
GET https://{Endpoint}/v1/{project_id}/publicips/{publicip_id}
Response Message
● Response parameter
Table 4-15 Response parameter
Parameter Type Description
publicip publicip object Specifies the EIP object. For details, see
Table 4-16.
 
Table 4-16 Description of the publicip field
Parameter Type Description
id String Specifies the unique
identifier of an EIP.
Elastic IP
API Reference 4 APIs
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 30

--- Page 37 ---
Parameter Type Description
status String ● Specifies the EIP
status.
● Possible values are as
follows:
– FREEZED (Frozen)
– BIND_ERROR
(Binding failed)
– BINDING (Binding)
– PENDING_DELETE
(Releasing)
– PENDING_CREATE
(Assigning)
– PENDING_UPDATE
(Updating)
– NOTIFYING
(Assigning)
– NOTIFY_DELETE
(Releasing)
– DOWN (Unbound)
– ACTIVE (Bound)
– ELB (Bound to a
load balancer)
– VPN (Bound to a
VPN)
– ERROR
(Exceptions)
profile profile object Specifies the additional
parameters, including the
order ID and product ID.
For details, see Table
4-17.
Elastic IP
API Reference 4 APIs
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 31

--- Page 38 ---
Parameter Type Description
type String ● Specifies the EIP type.
● The value can be
5_bgp (dynamic BGP)
or 5_sbgp (static
BGP).
– CN South-
Guangzhou: 5_bgp
and 5_sbgp
– CN East-Shanghai1:
5_bgp and 5_sbgp
– CN East-Shanghai2:
5_bgp and 5_sbgp
– CN North-Beijing1:
5_bgp and 5_sbgp
– CN-Hong Kong:
5_bgp
– AP-Bangkok: 5_bgp
– AP-Singapore:
5_bgp
– AF-Johannesburg:
5_bgp
– CN Southwest-
Guiyang1: 5_sbgp
– CN North-Beijing4:
5_bgp and 5_sbgp
– LA-Santiago: 5_bgp
– LA-Sao Paulo1:
5_bgp
– LA-Mexico City1:
5_bgp
– LA-Buenos Aires1:
5_bgp
– LA-Lima1: 5_bgp
– LA-Santiago2:
5_bgp
● Constraints:
– The configured
value must be
supported by the
system.
– publicip_id is an
IPv4 port. If
publicip_type is
Elastic IP
API Reference 4 APIs
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 32

--- Page 39 ---
Parameter Type Description
not specified, the
default value is
5_bgp.
public_ipv6_address String Specifies the obtained EIP
if IPv6 EIPs are available.
This parameter does not
exist if only IPv4 EIPs are
available.
public_ip_address String Specifies the obtained EIP
if only IPv4 EIPs are
available. Specifies the
IPv4 address
corresponding to the IPv6
address if IPv6 EIPs are
available.
ip_version Integer Specifies the IP address
version. The value can be
4 or 6.
● 4: IPv4
● 6: IPv6
private_ip_address String ● Specifies the private IP
address bound to the
EIP.
● This parameter is
returned only if the
private IP address is
bound to the EIP.
port_id String ● Specifies the port ID.
● This parameter is
returned only when a
port is associated with
the EIP.
tenant_id String Specifies the project ID.
create_time String Specifies the time (UTC)
when the EIP is assigned.
Format: yyyy-MM-dd
HH:mm:ss
bandwidth_id String Specifies the ID of the EIP
bandwidth.
bandwidth_size Integer Specifies the bandwidth
(Mbit/s).
Elastic IP
API Reference 4 APIs
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 33

--- Page 40 ---
Parameter Type Description
bandwidth_share_type String ● Specifies the EIP
bandwidth type.
● The value can be PER
or WHOLE.
– PER: Dedicated
bandwidth
– WHOLE: Shared
bandwidth
bandwidth_name String Specifies the bandwidth
name.
alias String Specifies the EIP name.
enterprise_project_id String ● Specifies the
enterprise project ID.
The value is 0 or a
string that contains a
maximum of 36
characters in UUID
format with hyphens
(-).
● When assigning an EIP,
you need to associate
an enterprise project
ID with the EIP.
● If this parameter is not
specified, the default
value is 0, which
indicates that the
default enterprise
project is used.
NOTE
For more information about
enterprise projects and how
to obtain enterprise project
IDs, see the Enterprise
Management User Guide.
public_border_group String Specifies whether it is in
a central site or an edge
site.
The value can be:
● center
● Edge site name
An EIP can only be bound
to a resource of the same
region.
Elastic IP
API Reference 4 APIs
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 34

--- Page 41 ---
Parameter Type Description
allow_share_bandwidth_t
ypes
Array of strings Specifies types of the
shared bandwidth that an
EIP can be added to. If
this parameter is left
blank, the EIP cannot be
added to any shared
bandwidth.
The EIP can be added
only to the shared
bandwidth of these types.
tags Array of
ResourceTagResp
objects
Specifies the list of tags.
 
Table 4-17 Description of the profile field
Parameter Type Description
order_id String Specifies the order ID.
product_id String Specifies the product ID.
region_id String Specifies the region ID.
user_id String Specifies the user ID.
 
Table 4-18 ResourceTagResp
Parameter Type Description
key String ● Tag key
● Constraints:
– Cannot be left blank.
– Can contain a maximum of 36
characters.
– Can contain letters and special
characters, including hyphens (-),
underscores (_), and at signs (@).
– The tag key of an EIP must be unique.
Minimum length: 0
Maximum length: 36
Elastic IP
API Reference 4 APIs
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 35

--- Page 42 ---
Parameter Type Description
value String ● Tag value
● Constraints:
– Can contain a maximum of 43
characters.
– Can contain letters and special
characters, including hyphens (-),
underscores (_), and at signs (@).
– The tag key of an EIP must be unique.
Minimum length: 0
Maximum length: 43
 
● Example response
{
    "publicip": {
        "id": "2ec9b78d-9368-46f3-8f29-d1a95622a568",
        "status": "DOWN",
        "alias": "tom",
        "type": "5_bgp",
        "public_ip_address": "161.xx.xx.12",
        "tenant_id": "8b7e35ad379141fc9df3e178bd64f55c",
        "private_ip_address": "192.168.10.5",
        "create_time": "2015-07-16 04:32:50",
        "bandwidth_id": "49c8825b-bed9-46ff-9416-704b96d876a2",
        "bandwidth_share_type": "PER",
"bandwidth_size": 10,    //The EIP bandwidth size is 10 Mbit/s.
        "bandwidth_name": "bandwidth-test",
        "ip_version": 4
    }
}
Status Code
See Status Codes.
Error Code
See Error Codes.
4.2.4 Querying EIPs
Function
This API is used to query EIPs.
URI
GET /v1/{project_id}/publicips
Table 4-19 describes the parameters.
Elastic IP
API Reference 4 APIs
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 36

--- Page 43 ---
Table 4-19 Parameter description
Parameter Mandatory Type Description
project_id Yes String Specifies the project ID.
For details about how
to obtain a project ID,
see Obtaining a
Project ID.
Elastic IP
API Reference 4 APIs
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 37

--- Page 44 ---
Parameter Mandatory Type Description
marker No String Specifies a resource ID
for pagination query,
indicating that the
query starts from the
next record of the
specified resource ID.
This parameter can
work together with the
parameter limit.
● If parameters
marker and limit
are not passed,
resource records on
the first page will
be returned.
● If the parameter
marker is not
passed and the
value of parameter
limit is set to 10,
the first 10 resource
records will be
returned.
● If the value of the
parameter marker
is set to the
resource ID of the
10th record and the
value of parameter
limit is set to 10,
the 11th to 20th
resource records
will be returned.
● If the value of the
parameter marker
is set to the
resource ID of the
10th record and the
parameter limit is
not passed, 11th to
2,000th resource
records will be
returned. The
default value of
limit is 2000.
Elastic IP
API Reference 4 APIs
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 38

--- Page 45 ---
Parameter Mandatory Type Description
limit No Integer Specifies the number
of records that will be
returned on each page.
The value is from 0 to
intmax (2^31-1). The
default value is 2000.
limit can be used
together with marker.
For details, see the
parameter description
of marker.
port_id No Array of
strings
Specifies the port ID of
the EIP.
public_ip_address No Array of
strings
Specifies the obtained
EIP if only IPv4 EIPs
are available, or the
IPv4 EIP corresponding
to the IPv6 EIP if IPv6
EIPs are available.
private_ip_address No Array of
strings
● Specifies the private
IP address bound to
the EIP.
● This parameter is
returned only if the
private IP address is
bound to the EIP.
id No Array of
strings
Specifies the ID of the
EIP, which uniquely
identifies the EIP.
 
Request Message
● Request parameter
None
● Example request
GET https://{Endpoint}/v1/{project_id}/publicips?limit={limit}&marker={marker}
Response Message
● Response parameter
Elastic IP
API Reference 4 APIs
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 39

--- Page 46 ---
Table 4-20 Response parameter
Parameter Type Description
publicips Array of
publicips objects
Specifies the EIP object. For details, see
Table 4-21.
 
Table 4-21 Description of the publicips field
Parameter Type Description
id String Specifies the unique
identifier of an EIP.
status String ● Specifies the EIP
status.
● Possible values are as
follows:
– FREEZED (Frozen)
– BIND_ERROR
(Binding failed)
– BINDING (Binding)
– PENDING_DELETE
(Releasing)
– PENDING_CREATE
(Assigning)
– PENDING_UPDATE
(Updating)
– DOWN (Unbound)
– ACTIVE (Bound)
– ELB (Bound to a
load balancer)
– ERROR
(Exceptions)
profile Object Specifies the additional
parameters, including the
order ID and product ID.
For details, see Table
4-22.
Elastic IP
API Reference 4 APIs
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 40

--- Page 47 ---
Parameter Type Description
type String ● Specifies the EIP type.
● The value can be
5_bgp (dynamic BGP)
or 5_sbgp (static
BGP).
– CN South-
Guangzhou: 5_bgp
and 5_sbgp
– CN East-Shanghai1:
5_bgp and 5_sbgp
– CN East-Shanghai2:
5_bgp and 5_sbgp
– CN North-Beijing1:
5_bgp and 5_sbgp
– CN-Hong Kong:
5_bgp
– AP-Bangkok: 5_bgp
– AP-Singapore:
5_bgp
– AF-Johannesburg:
5_bgp
– CN Southwest-
Guiyang1: 5_sbgp
– CN North-Beijing4:
5_bgp and 5_sbgp
– LA-Santiago: 5_bgp
– LA-Sao Paulo1:
5_bgp
– LA-Mexico City1:
5_bgp
– LA-Buenos Aires1:
5_bgp
– LA-Lima1: 5_bgp
– LA-Santiago2:
5_bgp
● Constraints:
– The configured
value must be
supported by the
system.
– publicip_id is an
IPv4 port. If
publicip_type is
Elastic IP
API Reference 4 APIs
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 41

--- Page 48 ---
Parameter Type Description
not specified, the
default value is
5_bgp.
public_ip_address String Specifies the obtained EIP
if only IPv4 EIPs are
available.
public_ipv6_address String Specifies the obtained EIP
if IPv6 EIPs are available.
This parameter does not
exist if only IPv4 EIPs are
available.
ip_version Integer Specifies the IP address
version. The value can be
4 or 6.
● 4: IPv4
● 6: IPv6
private_ip_address String ● Specifies the private IP
address bound to the
EIP.
● This parameter is
returned only if the
private IP address is
bound to the EIP.
port_id String ● Specifies the port ID.
● This parameter is
returned only when a
port is associated with
the EIP.
tenant_id String Specifies the project ID.
create_time String Specifies the time (UTC)
when the EIP is assigned.
Format: yyyy-MM-dd
HH:mm:ss
bandwidth_id String Specifies the ID of the EIP
bandwidth.
bandwidth_size Integer Specifies the bandwidth
(Mbit/s).
Elastic IP
API Reference 4 APIs
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 42

--- Page 49 ---
Parameter Type Description
bandwidth_share_type String ● Specifies the EIP
bandwidth type.
● The value can be PER
or WHOLE.
– PER: Dedicated
bandwidth
– WHOLE: Shared
bandwidth
bandwidth_name String Specifies the bandwidth
name.
alias String Specifies the EIP name.
enterprise_project_id String ● Specifies the
enterprise project ID.
The value is 0 or a
string that contains a
maximum of 36
characters in UUID
format with hyphens
(-).
● When assigning an EIP,
you need to associate
an enterprise project
ID with the EIP.
● If this parameter is not
specified, the default
value is 0, which
indicates that the
default enterprise
project is used.
NOTE
For more information about
enterprise projects and how
to obtain enterprise project
IDs, see the Enterprise
Management User Guide.
public_border_group String Specifies whether it is in
a central site or an edge
site.
The value can be:
● center
● Edge site name
An EIP can only be bound
to a resource of the same
region.
Elastic IP
API Reference 4 APIs
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 43

--- Page 50 ---
Parameter Type Description
allow_share_bandwidth_t
ypes
Array of strings ● Specifies the types of
the shared bandwidth
to which the EIP can
be added.
● If the list is empty, the
EIP cannot be added
to any shared
bandwidth.
● The EIP can be added
only to the shared
bandwidth of these
types.
tags Array of
ResourceTagResp
objects
Specifies the list of tags.
 
Table 4-22 Description of the profile field
Parameter Type Description
order_id String Specifies the order ID.
product_id String Specifies the product ID.
region_id String Specifies the region ID.
user_id String Specifies the user ID.
 
Table 4-23 ResourceTagResp
Parameter Type Description
key String ● Tag name
● Constraints:
– Cannot be left blank.
– Can contain a maximum of 36
characters.
– Can contain letters and special
characters, including hyphens (-),
underscores (_), and at signs (@).
– The tag key of an EIP must be unique.
Minimum length: 0
Maximum length: 36
Elastic IP
API Reference 4 APIs
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 44

--- Page 51 ---
Parameter Type Description
value String ● Tag value
● Constraints:
– Can contain a maximum of 43
characters.
– Can contain letters and special
characters, including hyphens (-),
underscores (_), and at signs (@).
– The tag key of an EIP must be unique.
Minimum length: 0
Maximum length: 43
 
● Example response
{
    "publicips": [
        {
            "id": "6285e7be-fd9f-497c-bc2d-dd0bdea6efe0",
            "status": "DOWN",
            "alias": "tom",
            "profile": {},
            "type": "5_bgp",
            "public_ip_address": "161.xx.xx.9",
            "private_ip_address": "192.168.10.5",
            "tenant_id": "8b7e35ad379141fc9df3e178bd64f55c",
            "create_time": "2015-07-16 04:22:32",
            "bandwidth_id": "3fa5b383-5a73-4dcb-a314-c6128546d855",
            "bandwidth_share_type": "PER",
            "bandwidth_size": 5,
            "bandwidth_name": "bandwidth-test",
            "enterprise_project_id":"b261ac1f-2489-4bc7-b31b-c33c3346a439",
            "ip_version": 4
        },
        {
            "id": "80d5b82e-43b9-4f82-809a-37bec5793bd4",
            "status": "DOWN",
            "profile": {},
            "type": "5_bgp",
            "public_ip_address": "161.xx.xx.10",
            "private_ip_address": "192.168.10.6",
            "tenant_id": "8b7e35ad379141fc9df3e178bd64f55c",
            "create_time": "2015-07-16 04:23:03",
            "bandwidth_id": "a79fd11a-047b-4f5b-8f12-99c178cc780a",
            "bandwidth_share_type": "PER",
            "bandwidth_size": 5,
            "bandwidth_name": "bandwidth-test1",
            "enterprise_project_id":"0",
            "ip_version": 4
        }
    ]
}
Status Code
See Status Codes.
Error Code
See Error Codes.
Elastic IP
API Reference 4 APIs
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 45

--- Page 52 ---
4.2.5 Updating an EIP
Function
This API is used to convert the EIP version, bind an EIP to a NIC, or unbind an EIP
from a NIC.
URI
PUT /v1/{project_id}/publicips/{publicip_id}
Table 4-24 describes the parameters.
Table 4-24 Parameter description
Parameter Mandatory Description
project_id Yes Specifies the project ID.
For details about how to
obtain a project ID, see
Obtaining a Project ID.
publicip_id Yes Specifies the unique
identifier of an EIP.
 
Request Message
● Request parameter
Table 4-25 Request parameter
Param
eter
Mandatory Type Description
publici
p
Yes publicip
object
Specifies the EIP object. For
details, see Table 4-26.
 
Elastic IP
API Reference 4 APIs
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 46

--- Page 53 ---
Table 4-26 Description of the publicip field
Parameter Mandatory Type Description
port_id No String ● Specifies the port
ID.
● The value must be
an existing port ID.
If this parameter is
not included or
the parameter
value is left blank,
the EIP is
unbound. If the
specified port ID
does not exist or
has already been
bound with an EIP,
an error message
will be displayed.
ip_version No Integer ● Specifies the IP
address version.
● The value can be 4
or 6.
– 4: IPv4 address
– 6: IPv6
● Constraints:
– The IP version
must be
supported by
the system.
– The port_id
and ip_version
fields cannot be
set at the same
time.
alias No String ● Specifies the EIP
name.
● The value can
contain 1 to 64
characters,
including letters,
digits, underscores
(_), hyphens (-),
and periods (.).
 
● Example request 1 (Binding an EIP to a NIC)
PUT https://{Endpoint}/v1/{project_id}/publicips/{publicip_id}
{
Elastic IP
API Reference 4 APIs
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 47

--- Page 54 ---
    "publicip": {
        "port_id": "f588ccfa-8750-4d7c-bf5d-2ede24414706"
    }
}
Response Message
● Response parameter
Table 4-27 Response parameter
Parameter Type Description
publicip publicip object Specifies the EIP object. For details, see
Table 4-28.
 
Table 4-28 Description of the publicips field
Parameter Type Description
id String Specifies the unique
identifier of an EIP.
Elastic IP
API Reference 4 APIs
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 48

--- Page 55 ---
Parameter Type Description
status String ● Specifies the EIP
status.
● Possible values are as
follows:
– FREEZED (Frozen)
– BIND_ERROR
(Binding failed)
– BINDING (Binding)
– PENDING_DELETE
(Releasing)
– PENDING_CREATE
(Assigning)
– PENDING_UPDATE
(Updating)
– NOTIFYING
(Assigning)
– NOTIFY_DELETE
(Releasing)
– DOWN (Unbound)
– ACTIVE (Bound)
– ELB (Bound to a
load balancer)
– VPN (Bound to a
VPN)
– ERROR
(Exceptions)
profile profile object Specifies the additional
parameters, including the
order ID and product ID.
For details, see Table
4-29.
Elastic IP
API Reference 4 APIs
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 49

--- Page 56 ---
Parameter Type Description
type String ● Specifies the EIP type.
● The value can be
5_bgp (dynamic BGP)
or 5_sbgp (static
BGP).
– CN South-
Guangzhou: 5_bgp
and 5_sbgp
– CN East-Shanghai1:
5_bgp and 5_sbgp
– CN East-Shanghai2:
5_bgp and 5_sbgp
– CN North-Beijing1:
5_bgp and 5_sbgp
– CN-Hong Kong:
5_bgp
– AP-Bangkok: 5_bgp
– AP-Singapore:
5_bgp
– AF-Johannesburg:
5_bgp
– CN Southwest-
Guiyang1: 5_sbgp
– CN North-Beijing4:
5_bgp and 5_sbgp
– LA-Santiago: 5_bgp
– LA-Sao Paulo1:
5_bgp
– LA-Mexico City1:
5_bgp
– LA-Buenos Aires1:
5_bgp
– LA-Lima1: 5_bgp
– LA-Santiago2:
5_bgp
● Constraints:
– The configured
value must be
supported by the
system.
– publicip_id is an
IPv4 port. If
publicip_type is
Elastic IP
API Reference 4 APIs
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 50

--- Page 57 ---
Parameter Type Description
not specified, the
default value is
5_bgp.
public_ip_address String Specifies the obtained EIP
if only IPv4 EIPs are
available.
public_ipv6_address String Specifies the obtained EIP
if IPv6 EIPs are available.
This parameter does not
exist if only IPv4 EIPs are
available.
ip_version Integer Specifies the IP address
version. The value can be
4 or 6.
● 4: IPv4
● 6: IPv6
private_ip_address String ● Specifies the private IP
address bound to the
EIP.
● This parameter is
returned only when a
port is associated with
the EIP.
port_id String ● Specifies the port ID.
● This parameter is
returned only when a
port is associated with
the EIP.
tenant_id String Specifies the project ID.
create_time String Specifies the time (UTC)
when the EIP is assigned.
Format: yyyy-MM-dd
HH:mm:ss
bandwidth_id String Specifies the ID of the EIP
bandwidth.
bandwidth_size Integer Specifies the bandwidth
(Mbit/s).
Elastic IP
API Reference 4 APIs
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 51

--- Page 58 ---
Parameter Type Description
bandwidth_share_type String ● Specifies the EIP
bandwidth type.
● The value can be PER
or WHOLE.
– PER: Dedicated
bandwidth
– WHOLE: Shared
bandwidth
bandwidth_name String Specifies the bandwidth
name.
alias String Specifies the EIP name.
enterprise_project_id String ● Specifies the
enterprise project ID.
The value is 0 or a
string that contains a
maximum of 36
characters in UUID
format with hyphens
(-).
● When you assign an
EIP, associate an
enterprise project ID
with the EIP.
● If this parameter is not
specified, the default
value is 0, which
indicates that the
default enterprise
project is used.
NOTE
For more information about
enterprise projects and how
to obtain enterprise project
IDs, see the Enterprise
Management User Guide.
 
Table 4-29 Description of the profile field
Parameter Type Description
order_id String Specifies the order ID.
product_id String Specifies the product ID.
region_id String Specifies the region ID.
user_id String Specifies the user ID.
Elastic IP
API Reference 4 APIs
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 52

--- Page 59 ---
 
● Example response (Binding an EIP to a NIC)
{
  "publicip": {
    "id": "f6318bef-6508-4ea5-a48f-6152b6b1a8fb",
    "status": "ACTIVE",
    "alias": "tom",
    "profile": {}, 
    "type": "5_bgp",
    "port_id": "a135e9b8-1630-40d2-a6c5-eb534a61efbe",
    "public_ip_address": "10.xx.xx.162",
    "private_ip_address": "192.168.1.131",
    "tenant_id": "26ae5181a416420998eb2093aaed84d9",
    "create_time": "2019-03-27 01:33:18",
    "bandwidth_size": 7,
    "ip_version": 4,
    "bandwidth_name": "bandwidth-2aef",
    "enterprise_project_id": "0",
    "bandwidth_share_type": "PER",
    "bandwidth_id": "7a258fff-10d8-44b8-8124-c59079eb8f4c"
  }
}
Status Code
See Status Codes.
Error Code
See Error Codes.
4.2.6 Releasing an EIP
Function
This API is used to release an EIP.
URI
DELETE /v1/{project_id}/publicips/{publicip_id}
Table 4-30 describes the parameters.
Table 4-30 Parameter description
Parameter Mandatory Description
project_id Yes Specifies the project ID.
For details about how to
obtain a project ID, see
Obtaining a Project ID.
publicip_id Yes Specifies the unique
identifier of an EIP.
 
Elastic IP
API Reference 4 APIs
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 53

--- Page 60 ---
Request Message
● Request parameter
None
● Example request
DELETE https://{Endpoint}/v1/{project_id}/publicips/{publicip_id}
Response Message
● Response parameter
None
● Example response
None
Or
{
       "code":"xxx",
       "message":"xxxxx"
}
Status Code
See Status Codes.
Error Code
See Error Codes.
4.2.7 Assigning an EIP (Yearly/Monthly)
Function
This API is used to assign a yearly/monthly EIP.
URI
POST /v2.0/{project_id}/publicips
Table 4-31 describes the parameters.
Table 4-31 Parameter description
Parameter Mandatory Description
project_id Yes Specifies the project ID.
For details about how to
obtain a project ID, see
Obtaining a Project ID.
 
Request parameter
● Request parameter
Elastic IP
API Reference 4 APIs
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 54

--- Page 61 ---
Table 4-32 Request parameter
Paramet
er
Mandato
ry
Type Description
publicip Yes publicip
object
Specifies the EIP object. For details,
see Table 4-33.
bandwidt
h
Yes bandwidth
object
Specifies the bandwidth objects.
For details, see Table 4-34.
extendPa
ram
No extendParam
object
Specifies the extended parameter,
which is used to apply for
resources in yearly/monthly billing
mode. For details, see section
Table 4-35.
enterpris
e_project
_id
No String ● Specifies the enterprise project
ID. The value is 0 or a string
that contains a maximum of 36
characters in UUID format with
hyphens (-).
● When you assign an EIP,
associate an enterprise project
ID with the EIP.
● If this parameter is not
specified, the default value is 0,
which indicates that the default
enterprise project is used.
NOTE
For more information about enterprise
projects and how to obtain enterprise
project IDs, see the Enterprise
Management User Guide.
 
Elastic IP
API Reference 4 APIs
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 55

--- Page 62 ---
Table 4-33 Description of the publicip field
Parameter Mandator
y
Type Description
type Yes String ● Specifies the EIP
type.
● The value can be
5_bgp (dynamic
BGP) or 5_sbgp
(static BGP).
– CN South-
Guangzhou:
5_bgp and
5_sbgp
– CN East-
Shanghai1:
5_bgp and
5_sbgp
– CN East-
Shanghai2:
5_bgp and
5_sbgp
– CN North-
Beijing1: 5_bgp
and 5_sbgp
– CN-Hong Kong:
5_bgp
– AP-Bangkok:
5_bgp
– AP-Singapore:
5_bgp
– AF-
Johannesburg:
5_bgp
– CN Southwest-
Guiyang1:
5_sbgp
– CN North-
Beijing4: 5_bgp
and 5_sbgp
– LA-Santiago:
5_bgp
– LA-Sao Paulo1:
5_bgp
– LA-Mexico
City1: 5_bgp
– LA-Buenos
Aires1: 5_bgp
Elastic IP
API Reference 4 APIs
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 56

--- Page 63 ---
Parameter Mandator
y
Type Description
– LA-Lima1:
5_bgp
– LA-Santiago2:
5_bgp
● Constraints:
– The configured
value must be
supported by
the system.
– publicip_id is
an IPv4 port. If
publicip_type
is not specified,
the default
value is 5_bgp.
ip_version No Integer ● Specifies the EIP
version.
● The value can be
4 and 6, indicating
IPv4 address and
IPv6 address,
respectively.
● Constraints:
– The configured
value must be
supported by
the system.
– If this
parameter is
left blank or is
an empty
string, IPv4
address is
created by
default.
alias No String ● Specifies the EIP
name.
● The value can
contain 1 to 64
characters,
including letters,
digits, underscores
(_), hyphens (-),
and periods (.).
Elastic IP
API Reference 4 APIs
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 57

--- Page 64 ---
Parameter Mandator
y
Type Description
port_id No String ● Specifies the port
ID.
● The value must be
an ID of an
existing port. If
the port does not
exist or has been
bound to an EIP,
an error message
is displayed.
 
Table 4-34 Description of the bandwidth field
Parameter Mandator
y
Type Description
name No String ● Specifies the
bandwidth name.
● The value can
contain 1 to 64
characters,
including letters,
digits, underscores
(_), hyphens (-),
and periods (.).
● Constraints:
– This parameter
is mandatory
when
share_type is
set to PER.
– This parameter
will be ignored
if the
bandwidth has
a specified ID.
Elastic IP
API Reference 4 APIs
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 58

--- Page 65 ---
Parameter Mandator
y
Type Description
size No Integer ● Specifies the
bandwidth size.
● The value ranges
from 1 Mbit/s to
2000 Mbit/s by
default. (The
specific range may
vary depending on
the configuration
in each region.
You can see the
available
bandwidth range
on the
management
console.)
● This parameter is
mandatory when
share_type is set
to PER. This
parameter will be
ignored if the
bandwidth has a
specified ID.
● The minimum
increment for
bandwidth
adjustment varies
depending on the
bandwidth range.
The details are as
follows:
– The minimum
increment is 1
Mbit/s if the
allowed
bandwidth
ranges from 0
Mbit/s to 300
Mbit/s (with
300 Mbit/s
included).
– The minimum
increment is 50
Mbit/s if the
allowed
bandwidth
Elastic IP
API Reference 4 APIs
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 59

--- Page 66 ---
Parameter Mandator
y
Type Description
ranges from
300 Mbit/s to
1000 Mbit/s
(with 1000
Mbit/s
included).
– The minimum
increment is
500 Mbit/s if
the allowed
bandwidth is
greater than
1000 Mbit/s.
id No String ● Use the existing
shared bandwidth
to assign an IP
address.
● Specifies the ID of
the shared
bandwidth.
● Constraints:
– The value must
be the ID of
bandwidth
whose
share_type is
WHOLE.
– This parameter
does not need
to be specified
in prepayment
mode. This
parameter will
be ignored if its
value is left
blank.
Elastic IP
API Reference 4 APIs
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 60

--- Page 67 ---
Parameter Mandator
y
Type Description
share_type Yes String ● Specifies the
bandwidth type.
● Possible values are
as follows:
– PER: Dedicated
bandwidth
– WHOLE:
Shared
bandwidth
● When the existing
bandwidth is used
to assign an IP
address, the value
of this parameter
depends on the
bandwidth type.
● The parameter
value can only be
PER in
prepayment
mode.
charge_mode No String ● Specifies the
billing mode. The
yearly/monthly
billing mode
supports only the
bandwidth-based
billing.
● The value can be
bandwidth.
 
Elastic IP
API Reference 4 APIs
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 61

--- Page 68 ---
Table 4-35 Description of the extendParam field
Parameter Manda
tory
Type Description
charge_mo
de
No String ● Specifies the billing mode.
● Possible values are as follows:
– prePaid: prepayment. The
billing mode is yearly/
monthly.
– postPaid: postpayment. The
billing mode is pay per use.
– The default value is
postPaid.
● In the postpayment mode,
parameters in extendParam
will be ignored.
period_typ
e
No String ● Specifies the subscription unit.
● Possible values are as follows:
– month: indicates that
resources are subscribed by
month.
– year: indicates that resources
are subscribed by year.
● Constraints:
If you assign an EIP that uses
an existing yearly/monthly
shared bandwidth (that is, you
specify the shared bandwidth ID
to assign an EIP), this
parameter is optional. This
parameter is mandatory when
the billing mode is prepayment
and the EIP does not use a
shared bandwidth.
When an EIP is created using the
shared bandwidth, the expiration
time of the bandwidth is the same
as that of the EIP.
Elastic IP
API Reference 4 APIs
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 62

--- Page 69 ---
Parameter Manda
tory
Type Description
period_nu
m
No Integer ● Specifies the subscription
period.
● The value range varies
depending on the operation
strategy.
– When period_type is set to
month, the parameter value
ranges from 1 to 9.
– When period_type is set to
year, the parameter value
must be set to 1.
● The constraints for period_num
are the same as those for
period_type.
is_auto_ren
ew
No boolean ● Specifies whether to renew the
subscription.
● Possible values are as follows:
The value false indicates that
the automatic subscription
renewal is enabled. The value
true indicates that the
automatic subscription renewal
is disabled. The default value is
false.
● Constraints:
After the subscription is expired,
the system automatically
renews the subscription for one
month by default (the
automatic renewal period may
change). For details, contact the
customer service personnel.
Elastic IP
API Reference 4 APIs
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 63

--- Page 70 ---
Parameter Manda
tory
Type Description
is_auto_pa
y
No boolean ● Specifies whether the fee is
automatically deducted from
the customer's account balance
after an order is submitted. The
non-automatic payment mode
is used by default.
● Possible values are as follows:
– true: indicates automatic
payment. The system will
automatically deduct fees
from the account balance
after an order is submitted.
– false: indicates non-
automatic payment. This is
the default value. Customers
need to pay manually.
● Constraints:
If you use automatic payment,
the order is paid with your
account balance. If you want to
use cash coupons, do not use
automatic payment and select
the cash coupons for the
payment in the Billing Center.
 
Example Request
Assign an EIP that uses a new yearly/monthly dedicated bandwidth. The
bandwidth size is 1 Mbit/s and the required duration is 1 month. The system does
not automatically renew the subscription and deduct the fee after an order is
submitted.
POST https://{Endpoint}/v2.0/{project_id}/publicips
{
    "publicip": {
        "type": "5_bgp"
    },
    "bandwidth": {
        "name": "bw_666",
        "size": 1,
        "share_type": "PER",
        "charge_mode": "bandwidth"
    },
    "extendParam": {
        "charge_mode": "prePaid",
        "period_type": "month",
        "period_num": 1,
        "is_auto_renew": "false",
        "is_auto_pay": "false"
    }
}
Elastic IP
API Reference 4 APIs
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 64

--- Page 71 ---
Assign an EIP that uses a pay-per-use bandwidth. Leave the parameter
extendParam blank.
POST https://{Endpoint}/v2.0/{project_id}/publicips
{
    "publicip": {
        "type": "5_bgp"
    },
    "bandwidth": {
        "name": "bw_666",
        "size": 1,
        "share_type": "PER",
        "charge_mode": "bandwidth"
    }
}
Response Message
● Response parameter
Parameter Type Description
publicip publicip object Specifies the EIP object. (This parameter
is returned in the pay-per-use scenario.)
order_id String Specifies the order ID. (This parameter is
returned in the yearly/monthly scenario.)
publicip_id String Specifies the EIP ID. This parameter takes
effect 1 minute later in the yearly/
monthly scenario.
 
Table 4-36 Description of the publicip field
Parameter Type Description
id String Specifies the unique identifier of an EIP.
Elastic IP
API Reference 4 APIs
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 65

--- Page 72 ---
Parameter Type Description
status String ● Specifies the EIP status.
● Possible values are as follows:
– FREEZED (Frozen)
– BIND_ERROR (Binding failed)
– BINDING (Binding)
– PENDING_DELETE (Releasing)
– PENDING_CREATE (Assigning)
– PENDING_UPDATE (Updating)
– NOTIFYING (Assigning)
– NOTIFY_DELETE (Releasing)
– DOWN (Unbound)
– ACTIVE (Bound)
– ELB (Bound to a load balancer)
– ERROR (Exceptions)
Elastic IP
API Reference 4 APIs
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 66

--- Page 73 ---
Parameter Type Description
type String ● Specifies the EIP type.
● The value can be 5_bgp (dynamic
BGP) or 5_sbgp (static BGP).
– CN South-Guangzhou: 5_bgp and
5_sbgp
– CN East-Shanghai1: 5_bgp and
5_sbgp
– CN East-Shanghai2: 5_bgp and
5_sbgp
– CN North-Beijing1: 5_bgp and
5_sbgp
– CN-Hong Kong: 5_bgp
– AP-Bangkok: 5_bgp
– AP-Singapore: 5_bgp
– AF-Johannesburg: 5_bgp
– CN Southwest-Guiyang1: 5_sbgp
– CN North-Beijing4: 5_bgp and
5_sbgp
– LA-Santiago: 5_bgp
– LA-Sao Paulo1: 5_bgp
– LA-Mexico City1: 5_bgp
– LA-Buenos Aires1: 5_bgp
– LA-Lima1: 5_bgp
– LA-Santiago2: 5_bgp
● Constraints:
– The configured value must be
supported by the system.
– publicip_id is an IPv4 port. If
publicip_type is not specified, the
default value is 5_bgp.
public_ip_ad
dress
String Specifies the obtained EIP if only IPv4
EIPs are available.
public_ipv6_
address
String Specifies the obtained EIP if IPv6 EIPs are
available. This parameter does not exist if
only IPv4 EIPs are available.
ip_version Integer Specifies the IP address version. The value
can be 4 or 6.
● 4: IPv4 address
● 6: IPv6
tenant_id String Specifies the project ID.
Elastic IP
API Reference 4 APIs
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 67

--- Page 74 ---
Parameter Type Description
create_time String Specifies the time (UTC) when the EIP is
assigned.
Format: yyyy-MM-dd HH:mm:ss
bandwidth_
size
Integer Specifies the bandwidth size.
alias String Specifies the EIP name.
enterprise_p
roject_id
String ● Specifies the enterprise project ID. The
value is 0 or a string that contains a
maximum of 36 characters in UUID
format with hyphens (-).
● When assigning an EIP, you need to
associate an enterprise project ID with
the EIP.
● If this parameter is not specified, the
default value is 0, which indicates that
the default enterprise project is used.
NOTE
For more information about enterprise
projects and how to obtain enterprise project
IDs, see the Enterprise Management User
Guide.
 
Example Response
Yearly/monthly
{
    "order_id": "CS1802081410IMDRN",
    "publicip_id": "4eaf3b63-48ca-4410-ab85-bdfddf4b35fd"
}
Pay-per-use
{
  "publicip": {
    "id": "4eaf3b63-48ca-4410-ab85-bdfddf4b35fd",
    "status": "PENDING_CREATE",
    "type": "5_bgp",
    "public_ip_address": "10.xx.xx.238",
    "tenant_id": "26ae5181a416420998eb2093aaed84d9",
    "create_time": "2019-03-27 13:11:58",
    "bandwidth_size": 0,
    "enterprise_project_id": "0",
    "ip_version": 4
  }
}
Status Code
See Status Codes.
Error Code
See Error Codes.
Elastic IP
API Reference 4 APIs
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 68

--- Page 75 ---
4.3 Batch Operations on EIPs
4.3.1 Assigning EIPs in Batches
Function
This API is used to assign EIPs in batches.
URI
POST /v2/{project_id}/batchpublicips
Table 4-37 Path parameter
Parameter Mandatory Type Description
project_id Yes String Project ID
 
Request Parameters
Table 4-38 Request body parameters
Parameter Mandatory Type Description
bandwidth Yes BatchBandwi
dth object
Bandwidth information
publicip Yes BatchPublicI
p object
EIP information
publicip_num
ber
Yes Integer Number of EIPs to be created
in batches
enterprise_pro
ject_id
Yes String Enterprise project ID
 
Elastic IP
API Reference 4 APIs
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 69

--- Page 76 ---
Table 4-39 BatchBandwidth
Parameter Mandatory Type Description
charge_mode No String ● Whether the billing is
based on traffic or
bandwidth For IPv6
addresses, the default value
is bandwidth outside China
and is traffic in China. If
the value is traffic, the
billing is based on traffic.
Enumerated values:
● bandwidth
● traffic
name No String ● Bandwidth name
● The value can contain 1 to
64 characters, including
letters, digits, underscores
(_), hyphens (-), and
periods (.).
● This parameter is
mandatory if share_type is
set to PER. This parameter
will be ignored if
share_type is set to
WHOLE with an ID
specified.
Minimum length: 1
Maximum length: 64
share_type No String ● Bandwidth type.
● The value can be PER or
WHOLE. IPv6 addresses do
not support bandwidth
whose type is WHOLE.
Enumerated values:
● PER
● WHOLE
Elastic IP
API Reference 4 APIs
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 70

--- Page 77 ---
Parameter Mandatory Type Description
size Yes Integer ● Bandwidth size (Mbit/s).
● The value ranges from 1
Mbit/s to 2000 Mbit/s by
default. (The specific range
may vary depending on the
configuration in each
region. You can see the
available bandwidth range
on the management
console.)
● This parameter is
mandatory if share_type is
set to PER. This parameter
will be ignored if
share_type is set to
WHOLE with an ID
specified.
● The minimum increment
for bandwidth adjustment
varies depending on the
bandwidth range. The
details are as follows:
– The minimum increment
is 1 Mbit/s if the allowed
bandwidth ranges from
0 Mbit/s to 300 Mbit/s
(with 300 Mbit/s
included).
– The minimum increment
is 50 Mbit/s if the
allowed bandwidth
ranges from 300 Mbit/s
to 1000 Mbit/s (with
1000 Mbit/s included).
– The minimum increment
is 500 Mbit/s if the
allowed bandwidth is
greater than 1000
Mbit/s.
id No String ● Bandwidth ID. You can
specify an existing shared
bandwidth ID when
assigning an EIP that uses
the bandwidth whose type
is WHOLE.
● Value: ID of the bandwidth
of type WHOLE
Elastic IP
API Reference 4 APIs
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 71

--- Page 78 ---
 
Table 4-40 BatchPublicIp
Parameter Mandatory Type Description
id No String Assigning an EIP by specifying
an ID
type Yes String EIP type
Enumerated values:
● 5_bgp
● 5_union
● 5_sbgp
ip_version No String EIP version, for example, IPv4
and IPv6. The default value is
ipv4.
enterprise_pro
ject_id
No String Enterprise project ID
tags No Array of
ResourceTag
Option
objects
● Tag list
● Format: The key and value
of a tag are separated by
an asterisk (*). If there are
multiple tags, use commas
(,) to separate different
key-value pairs. For details,
see the request example.
profile No BatchProfile
object
Order information
 
Elastic IP
API Reference 4 APIs
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 72

--- Page 79 ---
Table 4-41 ResourceTagOption
Parameter Mandatory Type Description
key Yes String ● Tag key
● Constraints:
– Cannot be left blank.
– Can contain a maximum
of 128 characters.
– Can contain letters,
digits, underscores (_),
and hyphens (-).
– The tag key of a
resource must be
unique.
Maximum length: 128
value Yes String ● Tag value
● Constraints:
– Can contain no more
than 255 characters.
– Can contain letters,
digits, underscores (_),
and hyphens (-).
– The tag key of a
resource must be
unique.
Maximum length: 255
 
Table 4-42 BatchProfile
Parameter Mandatory Type Description
user_id No String User ID
product_id No String Product ID
region_id No String Region ID
order_id No String Order ID
 
Response Parameters
Status code: 200
Elastic IP
API Reference 4 APIs
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 73

--- Page 80 ---
Table 4-43 Response body parameters
Parameter Type Description
job_id String Job ID. The netAPI needs to be called to view
the job execution status. netAPI: /v1/
{project_id}/jobs/{job_id}
 
Example Request
Assign two EIPs and add tags to them. The EIPs use 5 Mbit/s dedicated bandwidth
and are billed by bandwidth.
POST /v2/{project_id}/batchpublicips
{
  "bandwidth" : {
    "name" : "",
    "size" : 5,
    "charge_mode" : "bandwidth",
    "share_type" : "PER"
  },
  "publicip" : {
    "type" : "5_bgp",
    "tags" : ["name*tom", "type*kkkk"]
  },
  "publicip_number" : 2,
  "enterprise_project_id" : 0
}
Example Response
Status code: 200
OK
{
  "job_id" : "ff8080828436722c0184cdb88e9200a5"
}
Status Code
See Status Codes.
Error Code
See Error Codes.
4.3.2 Releasing EIPs in Batches
Function
This API is used to release EIPs in batches.
URI
DELETE /v2/{project_id}/batchpublicips
Elastic IP
API Reference 4 APIs
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 74

--- Page 81 ---
Table 4-44 Path parameter
Parameter Mandatory Type Description
project_id Yes String Project ID
 
Request Parameters
Table 4-45 Request body parameters
Parameter Mandatory Type Description
publicip_ids Yes Array of
strings
EIP IDs
 
Response Parameters
Status code: 200
Table 4-46 Response body parameters
Parameter Type Description
job_ids Array of
strings
Job ID. The netAPI needs to be called to view
the job execution status. netAPI: /v1/
{project_id}/jobs/{job_id}
 
Example Request
DELETE /v2/{project_id}/batchpublicips
{
  "publicip_ids" : [ "59e55560-4d2c-40d5-b757-0f5c97b701e4", "e83cae01-e68f-4627-84b3-d2d5c4c836bd" ]
}
Example Response
Status code: 200
OK
{
  "job_ids" : [ "ff8080828436722c0184cdb88e9200a5" ]
}
Status Code
See Status Codes.
Elastic IP
API Reference 4 APIs
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 75

--- Page 82 ---
Error Code
See Error Codes.
4.3.3 Unbinding EIPs in Batches
Function
This API is used to unbind EIPs in batches.
URI
PATCH /v2/{project_id}/batchpublicips
Table 4-47 Path parameter
Parameter Mandatory Type Description
project_id Yes String Project ID
 
Request Parameters
Table 4-48 Request body parameters
Parameter Mandatory Type Description
publicip_ids Yes Array of
strings
EIP IDs
 
Response Parameters
Status code: 200
Table 4-49 Response body parameters
Parameter Type Description
job_ids Array of
strings
Job ID. The netAPI needs to be called to view
the job execution status. netAPI: /v1/
{project_id}/jobs/{job_id}
 
Example Request
/v2/{project_id}/batchpublicips
{
  "publicip_ids" : [ "59e55560-4d2c-40d5-b757-0f5c97b701e4", "e83cae01-e68f-4627-84b3-d2d5c4c836bd" ]
}
Elastic IP
API Reference 4 APIs
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 76

--- Page 83 ---
Example Response
Status code: 200
OK
{
  "job_ids" : [ "ff8080828436722c0184cdb88e9200a5" ]
}
Status Code
See Status Codes.
Error Code
See Error Codes.
4.4 Bandwidth
4.4.1 Querying a Bandwidth
Function
This API is used to query details about a bandwidth.
URI
GET /v1/{project_id}/bandwidths/{bandwidth_id}
Table 4-50 describes the parameters.
Table 4-50 Parameter description
Parameter Mandatory Description
project_id Yes Specifies the project ID.
For details about how to
obtain a project ID, see
Obtaining a Project ID.
bandwidth_id Yes Specifies the bandwidth
ID, which uniquely
identifies the bandwidth.
 
Request Message
● Request parameter
None
● Example request
GET https://{Endpoint}//v1/{project_id}/bandwidths/{bandwidth_id}
Elastic IP
API Reference 4 APIs
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 77

--- Page 84 ---
Response Message
● Response parameter
Table 4-51 Response parameter
Parameter Type Description
bandwidth bandwidth
object
Specifies the bandwidth object.
 
Table 4-52 Description of the bandwidth field
Parameter Type Description
name String ● Specifies the bandwidth name.
● The value can contain 1 to 64
characters, including letters, digits,
underscores (_), hyphens (-), and
periods (.).
size Integer ● Specifies the bandwidth size.
● The value ranges from 1 Mbit/s to
300 Mbit/s by default. (The
specific range may vary depending
on the configuration in each
region. You can see the bandwidth
range of each region on the
management console.)
id String Specifies the bandwidth ID, which
uniquely identifies the bandwidth.
share_type String ● Specifies whether the bandwidth
is shared or dedicated.
● Possible values are as follows:
– PER: Dedicated bandwidth
– WHOLE: Shared bandwidth
publicip_info Array of
publicip_info
objects
● Specifies information about the
EIP that uses the bandwidth. For
details, see Table 4-53.
● The bandwidth, whose type is
WHOLE, can be used by up to 20
EIPs. The bandwidth, whose type
is PER, can be used by only one
EIP.
tenant_id String Specifies the project ID.
Elastic IP
API Reference 4 APIs
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 78

--- Page 85 ---
Parameter Type Description
bandwidth_type String ● Specifies the bandwidth type.
● The value can be:
– share: Shared bandwidth
– bgp: Dynamic BGP
– sbgp: Static BGP
charge_mode String ● Specifies whether the billing is
based on traffic or bandwidth.
● Possible values can be bandwidth
(billed by bandwidth) and traffic
(billed by traffic). If the value is
an empty character string or no
value is specified, value
bandwidth is used.
billing_info String Specifies the bill information.
If billing_info is specified, the
bandwidth is in yearly/monthly
billing mode.
enterprise_projec
t_id
String ● Specifies the enterprise project ID.
The value is 0 or a string that
contains a maximum of 36
characters in UUID format with
hyphens (-).
● When creating a bandwidth,
associate the enterprise project ID
with the bandwidth.
● If this parameter is not specified,
the default value is 0, which
indicates that the default
enterprise project is used.
NOTE
For more information about enterprise
projects and how to obtain enterprise
project IDs, see the Enterprise
Management User Guide.
status String ● Specifies the bandwidth status.
● Range:
– FREEZED (Frozen)
– NORMAL (Normal)
created_at String ● Specifies the time (UTC) when the
bandwidth is created.
● Format: yyyy-MM-ddTHH:mm:ss
Elastic IP
API Reference 4 APIs
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 79

--- Page 86 ---
Parameter Type Description
updated_at String ● Specifies the time (UTC) when the
bandwidth is updated.
● Format: yyyy-MM-ddTHH:mm:ss
enable_bandwidt
h_rules
boolean ● Specifies whether to enable QoS.
● The value can be true or false.
rule_quota integer Specifies the maximum number of
grouping rules supported by the
bandwidth.
bandwidth_rules Array of
bandwidth_rul
es objects
Specifies the bandwidth rules.
public_border_gr
oup
String Specifies whether it is in a central
site or an edge site.
Range:
● center
● Edge site name
An EIP can only be bound to a
resource of the same region.
 
Table 4-53 publicip_info object
Parameter Type Description
publicip_id String Specifies the ID of the EIP that uses the
bandwidth.
publicip_address String Specifies the obtained EIP if only IPv4
EIPs are available.
publicipv6_addres
s
String Specifies the obtained EIP if IPv6 EIPs
are available. This parameter does not
exist if only IPv4 EIPs are available.
ip_version Integer ● Specifies the IP address version.
● Range:
– 4: IPv4
– 6: IPv6
Elastic IP
API Reference 4 APIs
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 80

--- Page 87 ---
Parameter Type Description
publicip_type String ● Specifies the EIP type.
● The value can be 5_bgp (dynamic
BGP) or 5_sbgp (static BGP).
– CN South-Guangzhou: 5_bgp and
5_sbgp
– CN East-Shanghai1: 5_bgp and
5_sbgp
– CN East-Shanghai2: 5_bgp and
5_sbgp
– CN North-Beijing1: 5_bgp and
5_sbgp
– CN-Hong Kong: 5_bgp
– AP-Bangkok: 5_bgp
– AP-Singapore: 5_bgp
– AF-Johannesburg: 5_bgp
– CN Southwest-Guiyang1: 5_sbgp
– CN North-Beijing4: 5_bgp and
5_sbgp
– LA-Santiago: 5_bgp
– LA-Sao Paulo1: 5_bgp
– LA-Mexico City1: 5_bgp
– LA-Buenos Aires1: 5_bgp
– LA-Lima1: 5_bgp
– LA-Santiago2: 5_bgp
● Constraints:
– The configured value must be
supported by the system.
– publicip_id is an IPv4 port. If
publicip_type is not specified,
the default value is 5_bgp.
 
Table 4-54 bandwidth_rules object
Parameter Type Description
id string Specifies the bandwidth rule ID.
name string Specifies the name of the bandwidth
rule.
admin_state_up boolean Specifies the configuration status. The
value False indicates that the
configuration does not take effect.
Elastic IP
API Reference 4 APIs
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 81

--- Page 88 ---
Parameter Type Description
egress_size integer ● Specifies the maximum outbound
bandwidth in Mbit/s.
● The value range ranges from 0 to n,
where n indicates the shared
bandwidth size. If the value is set to
0, the maximum bandwidth, that is
the shared bandwidth size will be
used.
egress_guarented_si
ze
integer ● Specifies the guaranteed outbound
bandwidth in Mbit/s.
● The value ranges from 0 to x, where
x indicates the remaining bandwidth.
publicip_info Array of
publicip_i
nfo
objects
● Specifies the EIP associated with the
bandwidth.
● The bandwidth, whose type is set to
WHOLE, can be used by multiple
EIPs. The bandwidth, whose type is
set to PER, can be used by only one
EIP.
 
● Example response
{
  "bandwidth": {
    "id": "3cbd5ae9-368f-4bc8-8841-f2ecc322c64a",
    "name": "EIPResourceSetup_1553594229",
    "size": 5,
    "share_type": "PER",
    "public_border_group": "center",
    "publicip_info": [
      {
        "publicip_id": "22b02f40-b95f-465a-ae9b-7c8b0f042a41",
        "publicip_address": "10.xx.xx.62",
        "ip_version": 4,
        "publicip_type": "5_bgp",
      }
    ],
    "tenant_id": "26ae5181a416420998eb2093aaed84d9",
    "bandwidth_type": "bgp",
    "charge_mode": "bandwidth",
    "enterprise_project_id": "0",
    "status": "NORMAL",
    "created_at": "2020-04-21T07:58:02Z",
    "updated_at": "2020-04-21T07:58:02Z",
    "enable_bandwidth_rules": false,
    "rule_quota": 0,
    "bandwidth_rules": [],
  }
}
Status Code
See Status Codes.
Elastic IP
API Reference 4 APIs
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 82

--- Page 89 ---
Error Code
See Error Codes.
4.4.2 Querying Bandwidths
Function
This API is used to query bandwidths using search criteria.
URI
GET /v1/{project_id}/bandwidths
Table 4-55 describes the parameters.
Table 4-55 Parameter description
Paramete
r
Mandatory Type Description
project_id Yes String Specifies the project ID. For details
about how to obtain a project ID,
see Obtaining a Project ID.
Elastic IP
API Reference 4 APIs
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 83

--- Page 90 ---
Paramete
r
Mandatory Type Description
marker No String Specifies a resource ID for
pagination query, indicating that
the query starts from the next
record of the specified resource ID.
This parameter can work together
with the parameter limit.
● If parameters marker and limit
are not passed, resource records
on the first page will be
returned.
● If the parameter marker is not
passed and the value of
parameter limit is set to 10, the
first 10 resource records will be
returned.
● If the value of the parameter
marker is set to the resource ID
of the 10th record and the value
of parameter limit is set to 10,
the 11th to 20th resource
records will be returned.
● If the value of the parameter
marker is set to the resource ID
of the 10th record and the
parameter limit is not passed,
11th to 2,000th resource records
will be returned. The default
value of limit is 2000.
limit No Integer Specifies the number of records
that will be returned on each page.
The value is from 0 to intmax
(2^31-1). The default value is 2000.
limit can be used together with
marker. For details, see the
parameter description of marker.
share_type No String ● Specifies the bandwidth type.
● Possible values are as follows:
– PER: Dedicated bandwidth
– WHOLE: Shared bandwidth
● If this parameter is not set, the
list of all bandwidths will be
returned by default.
Elastic IP
API Reference 4 APIs
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 84

--- Page 91 ---
Paramete
r
Mandatory Type Description
enterprise_
project_id
No String ● Specifies the enterprise project
ID. This field can be used to
filter out the VPCs associated
with a specified enterprise
project.
● The value is 0 or a string that
contains a maximum of 36
characters in UUID format with
hyphens (-). Value 0 indicates
the default enterprise project. To
obtain the VPCs bound to all
enterprise projects of the user,
set all_granted_eps.
NOTE
For more information about enterprise
projects and how to obtain enterprise
project IDs, see the Enterprise
Management User Guide.
 
● Example request
GET https://{Endpoint}/v1/{project_id}/bandwidths?limit={limit}&marker={marker}
Response Message
● Response parameter
Table 4-56 Response parameter
Parameter Type Description
bandwidths Array of
bandwidths
objects
Specifies the bandwidth objects. For
details, see Table 4-57.
 
Table 4-57 Description of the bandwidths field
Parameter Type Description
name String ● Specifies the bandwidth name.
● The value can contain 1 to 64
characters, including letters,
digits, underscores (_), hyphens
(-), and periods (.).
Elastic IP
API Reference 4 APIs
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 85

--- Page 92 ---
Parameter Type Description
size Integer ● Specifies the bandwidth size in
Mbit/s.
● The value ranges from 1 Mbit/s to
300 Mbit/s by default. (The
specific range may vary
depending on the configuration in
each region. You can see the
bandwidth range of each region
on the management console.)
id String Specifies the bandwidth ID, which
uniquely identifies the bandwidth.
share_type String ● Specifies whether the bandwidth
is shared or dedicated.
● Possible values are as follows:
– PER: Dedicated bandwidth
– WHOLE: Shared bandwidth
If this parameter is not set, the list of
all bandwidths will be returned by
default.
publicip_info Array of
publicip_info
objects
● Specifies the information about
the EIP that uses the bandwidth.
For details, see Table 4-58.
● The bandwidth, whose type is
WHOLE, can be used by multiple
EIPs (up to 20 EIPs by default).
The bandwidth, whose type is
PER, can be used by only one EIP.
tenant_id String Specifies the project ID.
bandwidth_type String ● Specifies the bandwidth type.
● The value can be:
– share: Shared bandwidth
– bgp: Dynamic BGP
– sbgp: Static BGP
charge_mode String ● Specifies whether the bandwidth
is billed by traffic or by bandwidth
size.
● Possible values can be bandwidth
(billed by bandwidth) and traffic
(billed by traffic). If the value is
an empty character string or no
value is specified, value
bandwidth is used.
Elastic IP
API Reference 4 APIs
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 86

--- Page 93 ---
Parameter Type Description
billing_info String Specifies the bill information.
If billing_info is specified, the
bandwidth is in yearly/monthly
billing mode.
enterprise_project
_id
String ● Specifies the enterprise project ID.
The value is 0 or a string that
contains a maximum of 36
characters in UUID format with
hyphens (-). Value 0 indicates the
default enterprise project. To
obtain the bandwidth bound to
all enterprise projects of the user,
set all_granted_eps.
● When creating a bandwidth,
associate the enterprise project ID
with the bandwidth.
NOTE
For more information about enterprise
projects and how to obtain enterprise
project IDs, see the Enterprise
Management User Guide.
status String ● Specifies the bandwidth status.
● Possible values are as follows:
– FREEZED (Frozen)
– NORMAL (Normal)
created_at String ● Specifies the time (UTC) when
the bandwidth is created.
● Format: yyyy-MM-ddTHH:mm:ss
updated_at String ● Specifies the time (UTC) when
the bandwidth is updated.
● Format: yyyy-MM-ddTHH:mm:ss
enable_bandwidth
_rules
boolean ● Specifies whether to enable QoS.
● The value can be true or false.
rule_quota integer Specifies the maximum number of
grouping rules supported by the
bandwidth.
bandwidth_rules Array of
bandwidth_rul
es objects
Specifies the bandwidth rules.
Elastic IP
API Reference 4 APIs
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 87

--- Page 94 ---
Parameter Type Description
public_border_gro
up
String Specifies whether it is in a central
site or an edge site.
The value can be:
● center
● Edge site name
An EIP can only be bound to a
resource of the same region.
 
Table 4-58 publicip_info object
Parameter Type Description
publicip_id String Specifies the ID of the EIP that uses the
bandwidth.
publicip_address String Specifies the obtained EIP if only IPv4
EIPs are available.
publicipv6_addres
s
String Specifies the obtained EIP if IPv6 EIPs
are available. This parameter does not
exist if only IPv4 EIPs are available.
ip_version Integer ● Specifies the IP address version.
● Possible values are as follows:
– 4: IPv4
– 6: IPv6
Elastic IP
API Reference 4 APIs
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 88

--- Page 95 ---
Parameter Type Description
publicip_type String ● Specifies the EIP type.
● The value can be 5_bgp (dynamic
BGP) or 5_sbgp (static BGP).
– CN South-Guangzhou: 5_bgp and
5_sbgp
– CN East-Shanghai1: 5_bgp and
5_sbgp
– CN East-Shanghai2: 5_bgp and
5_sbgp
– CN North-Beijing1: 5_bgp and
5_sbgp
– CN-Hong Kong: 5_bgp
– AP-Bangkok: 5_bgp
– AP-Singapore: 5_bgp
– AF-Johannesburg: 5_bgp
– CN Southwest-Guiyang1: 5_sbgp
– CN North-Beijing4: 5_bgp and
5_sbgp
– LA-Santiago: 5_bgp
– LA-Sao Paulo1: 5_bgp
– LA-Mexico City1: 5_bgp
– LA-Buenos Aires1: 5_bgp
– LA-Lima1: 5_bgp
– LA-Santiago2: 5_bgp
● Constraints:
– The configured value must be
supported by the system.
– publicip_id is an IPv4 port. If
publicip_type is not specified,
the default value is 5_bgp.
 
Table 4-59 bandwidth_rules object
Parameter Type Description
id string Specifies the bandwidth rule ID.
name string Specifies the name of the bandwidth
rule.
admin_state_up boolean Specifies the configuration status. The
value False indicates that the
configuration does not take effect.
Elastic IP
API Reference 4 APIs
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 89

--- Page 96 ---
Parameter Type Description
egress_size integer ● Specifies the maximum outbound
bandwidth in Mbit/s.
● The value range ranges from 0 to n,
where n indicates the shared
bandwidth size. If the value is set to
0, the maximum bandwidth, that is
the shared bandwidth size will be
used.
egress_guarented_si
ze
integer ● Specifies the guaranteed outbound
bandwidth in Mbit/s.
● The value ranges from 0 to x, where
x indicates the remaining bandwidth.
publicip_info Array of
publicip_i
nfo
objects
● Specifies the EIP associated with the
bandwidth.
● The bandwidth, whose type is set to
WHOLE, can be used by multiple
EIPs. The bandwidth, whose type is
set to PER, can be used by only one
EIP.
 
● Example response
{
  "bandwidths": [
    {
      "id": "09b99c91-da7c-449f-94e2-f4934c5b2a71",
      "name": "test-f632a7b0-ef50-4ac5-97e9-ddc56b3d5977",
      "size": 200,
      "share_type": "PER",
      "public_border_group": "center",
      "created_at": "2024-04-27T00:14:36Z",
      "updated_at": "2024-04-27T00:14:36Z",
      "publicip_info": [
        {
          "publicip_id": "2a65923c-7133-415d-ae3b-cf9635a942c5",
          "publicip_address": "10.xx.xx.3",
          "ip_version": 4,
          "publicip_type": "5_bgp"
        }
      ],
      "tenant_id": "26ae5181a416420998eb2093aaed84d9",
      "bandwidth_type": "bgp",
      "charge_mode": "bandwidth",
      "billing_info": "",
      "enterprise_project_id": "0",
      "status": "NORMAL",
      "enable_bandwidth_rules": false,
      "rule_quota": 0,
      "bandwidth_rules": []
    },
    {
      "id": "0a583ff1-b43e-4000-ade3-e7af0097f832",
      "name": "test-7e880d5b-f458-40ad-a7e5-735c44cd8b7d",
      "size": 300,
      "share_type": "PER",
      "public_border_group": "center",
      "created_at": "2024-04-27T00:14:36Z",
Elastic IP
API Reference 4 APIs
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 90

--- Page 97 ---
      "updated_at": "2024-04-27T00:14:36Z",
      "publicip_info": [
        {
          "publicip_id": "c754bc9a-16d5-4763-9674-d7561917aa80",
          "publicip_address": "10.xx.xx.9",
          "ip_version": 4,
          "publicip_type": "5_bgp"
        }
      ],
      "tenant_id": "26ae5181a416420998eb2093aaed84d9",
      "bandwidth_type": "bgp",
      "charge_mode": "bandwidth",
      "billing_info": "",
      "enterprise_project_id": "0",
      "status": "NORMAL",
      "enable_bandwidth_rules": false,
      "rule_quota": 0,
      "bandwidth_rules": []
    },
    {
      "id": "0a673f00-3640-4a13-949e-7049b2916baf",
      "name": "bandwidth123",
      "size": 10,
      "share_type": "PER",
      "public_border_group": "center",
      "created_at": "2024-04-27T00:14:36Z",
      "updated_at": "2024-04-27T00:14:36Z",
      "publicip_info": [
        {
          "publicip_id": "cec7fb70-2f82-4561-bd83-2121fb642fdc",
          "publicip_address": "10.xx.xx.184",
          "ip_version": 4,
          "publicip_type": "5_bgp"
        }
      ],
      "tenant_id": "26ae5181a416420998eb2093aaed84d9",
      "bandwidth_type": "bgp",
      "charge_mode": "bandwidth",
      "billing_info": "",
      "enterprise_project_id": "0",
      "status": "NORMAL",
      "enable_bandwidth_rules": false,
      "rule_quota": 0,
      "bandwidth_rules": []
    },
    {
      "id": "0dde1eae-1783-46dc-998c-930fbe261ff9",
      "name": "bandwidth123",
      "size": 100,
      "share_type": "PER",
      "public_border_group": "center",
      "created_at": "2024-04-27T00:14:36Z",
      "updated_at": "2024-04-27T00:14:36Z",
      "publicip_info": [
        {
          "publicip_id": "24232038-e178-40ad-80e4-5abb75db84be",
          "publicip_address": "10.xx.xx.101",
          "ip_version": 4,
          "publicip_type": "5_bgp"
        }
      ],
      "tenant_id": "26ae5181a416420998eb2093aaed84d9",
      "bandwidth_type": "bgp",
      "charge_mode": "bandwidth",
      "billing_info": "",
      "enterprise_project_id": "0",
      "status": "NORMAL",
      "enable_bandwidth_rules": false,
      "rule_quota": 0,
Elastic IP
API Reference 4 APIs
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 91

--- Page 98 ---
      "bandwidth_rules": []
    }
  ]
}
Status Code
See Status Codes.
Error Code
See Error Codes.
4.4.3 Updating a Bandwidth
Function
This API is used to update information about a bandwidth.
URI
PUT /v1/{project_id}/bandwidths/{bandwidth_id}
Table 4-60 describes the parameters.
Table 4-60 Parameter description
Parameter Mandatory Description
project_id Yes Specifies the project ID.
For details about how to
obtain a project ID, see
Obtaining a Project ID.
bandwidth_id Yes Specifies the bandwidth
ID, which uniquely
identifies the bandwidth.
 
Request Message
● Request parameter
Table 4-61 Request parameter
Paramet
er
Mandatory Type Description
bandwidt
h
Yes bandwidth
object
Specifies the bandwidth
objects. For details, see
Table 4-62.
 
Elastic IP
API Reference 4 APIs
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 92

--- Page 99 ---
Table 4-62 Description of the bandwidth field
Parame
ter
Mandator
y
Type Description
name No String ● Specifies the bandwidth name.
● The value can contain 1 to 64
characters, including letters, digits,
underscores (_), hyphens (-), and
periods (.). If the value is left blank,
the name of the bandwidth is not
changed.
● Either parameter name or size must
be specified.
size No Integer ● Specifies the bandwidth size in
Mbit/s.
● The value ranges from 1 Mbit/s to
300 Mbit/s by default. (The specific
range may vary depending on the
configuration in each region. You can
see the available bandwidth range on
the management console.) If the
parameter is not included, the
bandwidth size is not changed.
● Either parameter name or size must
be specified.
● If a decimal fraction (for example
10.2) or a character string (for
example "10") is specified, the
specified value will be automatically
converted to an integer.
● The minimum increment for
bandwidth adjustment varies
depending on the bandwidth range.
The details are as follows:
– The minimum increment is 1
Mbit/s if the allowed bandwidth
ranges from 0 Mbit/s to 300
Mbit/s (with 300 Mbit/s included).
– The minimum increment is 50
Mbit/s if the allowed bandwidth
ranges from 300 Mbit/s to 1000
Mbit/s (with 1000 Mbit/s
included).
– The minimum increment is 500
Mbit/s if the allowed bandwidth is
greater than 1000 Mbit/s.
Elastic IP
API Reference 4 APIs
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 93

--- Page 100 ---
Parame
ter
Mandator
y
Type Description
charge_
mode
No String ● Specifies whether the billing is based
on traffic, bandwidth, or 95th
percentile bandwidth (enhanced).
● Possible values can be bandwidth
(billed by bandwidth), traffic (billed
by traffic), or 95peak_plus (billed by
enhanced 95th percentile bandwidth).
If the value is an empty character
string or no value is specified, value
bandwidth is used.
● Only the shared bandwidth supports
95peak_plus (billed by enhanced
95th percentile bandwidth). If you
choose to be billed by 95th percentile
bandwidth (enhanced), you need to
specify the guaranteed bandwidth
percentage. The default value is 20%.
 
● Example request
PUT https://{Endpoint}/v1/{project_id}/bandwidths/{bandwidth_id} 
{
    "bandwidth":
        {"name": "bandwidth123",
         "size": 10
        }
}
Response Message
● Response parameter
Table 4-63 Response parameter
Parameter Type Description
bandwidth bandwidth
object
Specifies the bandwidth objects. For
details, see Table 4-64.
 
Table 4-64 Description of the bandwidth field
Parameter Type Description
name String ● Specifies the bandwidth name.
● The value can contain 1 to 64
characters, including letters,
digits, underscores (_), hyphens
(-), and periods (.).
Elastic IP
API Reference 4 APIs
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 94

--- Page 101 ---
Parameter Type Description
size Integer ● Specifies the bandwidth size in
Mbit/s.
● The value ranges from 1 Mbit/s to
300 Mbit/s by default. (The
specific range may vary
depending on the configuration in
each region. You can see the
bandwidth range of each region
on the management console.)
id String Specifies the bandwidth ID, which
uniquely identifies the bandwidth.
share_type String ● Specifies whether the bandwidth
is shared or dedicated.
● Range:
– PER: Dedicated bandwidth
– WHOLE: Shared bandwidth
publicip_info Array of
publicip_info
objects
● Specifies the information about
the EIP that uses the bandwidth.
For details, see Table 4-65.
● The bandwidth, whose type is
WHOLE, can be used by multiple
EIPs (up to 20 EIPs by default).
The bandwidth, whose type is
PER, can be used by only one EIP.
tenant_id String Specifies the project ID.
bandwidth_type String ● Specifies the bandwidth type.
● The value can be bgp, sbgp, or
share.
– share: Shared bandwidth
– bgp: Dynamic BGP
– sbgp: Static BGP
charge_mode String ● Specifies whether the bandwidth
is billed by traffic or by bandwidth
size.
● Possible values can be bandwidth
(billed by bandwidth) and traffic
(billed by traffic). If the value is
an empty character string or no
value is specified, value
bandwidth is used.
Elastic IP
API Reference 4 APIs
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 95

--- Page 102 ---
Parameter Type Description
billing_info String Specifies the bill information.
If billing_info is specified, the
bandwidth is in yearly/monthly
billing mode.
enterprise_project
_id
String ● Specifies the enterprise project ID.
The value is 0 or a string that
contains a maximum of 36
characters in UUID format with
hyphens (-). Value 0 indicates the
default enterprise project. To
obtain the bandwidth bound to
all enterprise projects of the user,
set all_granted_eps.
● When creating a bandwidth,
associate the enterprise project ID
with the bandwidth.
NOTE
For more information about enterprise
projects and how to obtain enterprise
project IDs, see the Enterprise
Management User Guide.
status String ● Specifies the bandwidth status.
● Range:
– FREEZED (Frozen)
– NORMAL (Normal)
created_at String ● Specifies the time (UTC) when
the bandwidth is created.
● Format: yyyy-MM-ddTHH:mm:ss
updated_at String ● Specifies the time (UTC) when
the bandwidth is updated.
● Format: yyyy-MM-ddTHH:mm:ss
enable_bandwidth
_rules
boolean ● Specifies whether to enable QoS.
● The value can be true or false.
rule_quota integer Specifies the maximum number of
grouping rules supported by the
bandwidth.
bandwidth_rules Array of
bandwidth_rul
es objects
Specifies the bandwidth rules.
Elastic IP
API Reference 4 APIs
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 96

--- Page 103 ---
Parameter Type Description
public_border_gro
up
String Specifies whether it is in a central
site or an edge site.
Range:
● center
● Edge site name
An EIP can only be bound to a
resource of the same region.
 
Table 4-65 publicip_info objects
Parameter Type Description
publicip_id String Specifies the ID of the EIP that uses the
bandwidth.
publicip_address String Specifies the obtained EIP if only IPv4
EIPs are available.
publicipv6_addres
s
String Specifies the obtained EIP if IPv6 EIPs
are available. This parameter does not
exist if only IPv4 EIPs are available.
ip_version Integer ● Specifies the IP address version.
● Range:
– 4: IPv4
– 6: IPv6
Elastic IP
API Reference 4 APIs
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 97

--- Page 104 ---
Parameter Type Description
publicip_type String ● Specifies the EIP type.
● The value can be 5_bgp (dynamic
BGP) or 5_sbgp (static BGP).
– CN South-Guangzhou: 5_bgp and
5_sbgp
– CN East-Shanghai1: 5_bgp and
5_sbgp
– CN East-Shanghai2: 5_bgp and
5_sbgp
– CN North-Beijing1: 5_bgp and
5_sbgp
– CN-Hong Kong: 5_bgp
– AP-Bangkok: 5_bgp
– AP-Singapore: 5_bgp
– AF-Johannesburg: 5_bgp
– CN Southwest-Guiyang1: 5_sbgp
– CN North-Beijing4: 5_bgp and
5_sbgp
– LA-Santiago: 5_bgp
– LA-Sao Paulo1: 5_bgp
– LA-Mexico City1: 5_bgp
– LA-Buenos Aires1: 5_bgp
– LA-Lima1: 5_bgp
– LA-Santiago2: 5_bgp
● Constraints:
– The configured value must be
supported by the system.
– publicip_id is an IPv4 port. If
publicip_type is not specified,
the default value is 5_bgp.
 
Table 4-66 bandwidth_rules object
Parameter Type Description
id string Specifies the bandwidth rule ID.
name string Specifies the name of the bandwidth
rule.
admin_state_up boolean Specifies the configuration status. The
value False indicates that the
configuration does not take effect.
Elastic IP
API Reference 4 APIs
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 98

--- Page 105 ---
Parameter Type Description
egress_size integer ● Specifies the maximum outbound
bandwidth in Mbit/s.
● The value range ranges from 0 to n,
where n indicates the shared
bandwidth size. If the value is set to
0, the maximum bandwidth, that is
the shared bandwidth size will be
used.
egress_guarented_si
ze
integer ● Specifies the guaranteed outbound
bandwidth in Mbit/s.
● The value ranges from 0 to x, where
x indicates the remaining bandwidth.
publicip_info Array of
publicip_i
nfo
objects
● Specifies the EIP associated with the
bandwidth.
● The bandwidth, whose type is set to
WHOLE, can be used by multiple
EIPs. The bandwidth, whose type is
set to PER, can be used by only one
EIP.
 
● Example response
{
    "bandwidth": {
        "id": "3fa5b383-5a73-4dcb-a314-c6128546d855",
        "name": "bandwidth123",
        "size": 10,
        "share_type": "PER",
        "public_border_group": "center",
        "created_at": "2024-04-27T00:14:36Z",
        "updated_at": "2024-04-27T00:14:36Z",
        "publicip_info": [
            {
                "publicip_id": "6285e7be-fd9f-497c-bc2d-dd0bdea6efe0",
                "publicip_address": "161.xx.xx.9",
                "publicip_type": "5_bgp",
                "ip_version": 4            
            }
        ],
        "tenant_id": "8b7e35ad379141fc9df3e178bd64f55c",
        "bandwidth_type": "bgp",
        "charge_mode": "bandwidth",
        "status": "NORMAL",
        "enable_bandwidth_rules": false,
        "rule_quota": 0,
        "bandwidth_rules": [],
    }
}
Status Code
See Status Codes.
Elastic IP
API Reference 4 APIs
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 99

--- Page 106 ---
Error Code
See Error Codes.
4.4.4 Updating Bandwidths in Batches
Function
This API is used to update bandwidths in batches. This API is not applicable to
shared bandwidths and yearly/monthly bandwidths.
URI
PUT /v2/{project_id}/batch-bandwidths/modify
Table 4-67 Path parameters
Parameter Mandatory Type Description
project_id Yes String Project ID
 
Request Parameters
Table 4-68 Request body parameters
Parameter Mandatory Type Description
bandwidths Yes Array of
ModifyBand
widthOption
objects
Update bandwidths.
 
Table 4-69 ModifyBandwidthOption
Parameter Mandatory Type Description
id Yes String ● Bandwidth ID, which
uniquely identifies a
bandwidth
Maximum length: 36
Elastic IP
API Reference 4 APIs
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 100

--- Page 107 ---
Parameter Mandatory Type Description
name No String The name of the bandwidth.
The value can contain 1 to 64
characters, including letters,
digits, underscores (_), and
hyphens (-). If the value is left
blank, the name of the
bandwidth is not changed.
Either parameter name, size
or charge_mode must be
specified.
Minimum length: 1
Maximum length: 64
Elastic IP
API Reference 4 APIs
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 101

--- Page 108 ---
Parameter Mandatory Type Description
size No Integer The bandwidth size, in Mbit/s.
The value ranges from 1
Mbit/s to 2,000 Mbit/s by
default. (The specific range
may vary by the configuration
in each region. You can see
the available bandwidth range
on the management console.)
If the parameter is not
included, the bandwidth size is
not changed.
Either parameter name, size
or charge_mode must be
specified.
If a decimal fraction (for
example 10.2) or a character
string (for example "10") is
specified, the specified value
will be automatically
converted to an integer.
Either parameter name or size
must be specified.
The minimum increment for
bandwidth adjustment varies
depending on the bandwidth
range. The details are as
follows:
The minimum increment is 1
Mbit/s if the allowed
bandwidth ranges from 0
Mbit/s to 300 Mbit/s (with
300 Mbit/s included).
The minimum increment is 50
Mbit/s if the allowed
bandwidth ranges from 300
Mbit/s to 1,000 Mbit/s (with
1,000 Mbit/s included).
The minimum increment is
500 Mbit/s if the allowed
bandwidth is greater than
1,000 Mbit/s.
Elastic IP
API Reference 4 APIs
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 102

--- Page 109 ---
Parameter Mandatory Type Description
charge_mode No String Whether the bandwidth is
billed by traffic, bandwidth, or
95th percentile bandwidth
(enhanced).
The value can be bandwidth,
traffic, or 95peak_plus (billed
by enhanced 95th percentile
bandwidth). If the value is an
empty character string or no
value is specified, value
bandwidth is used.
Only the shared bandwidth
supports 95peak_plus (billed
by enhanced 95th percentile
bandwidth). If you choose to
be billed by 95th percentile
bandwidth (enhanced), you
need to specify the
guaranteed bandwidth
percentage. The default value
is 20%.
 
Response Parameters
Status code: 200
Table 4-70 Response body parameters
Parameter Type Description
success_resources Array of
SuccessResources
objects
Successful resources
failure_resources Array of
FailureResources
objects
Failed resources
 
Table 4-71 SuccessResources
Parameter Type Description
id String ● ID of the bandwidth that is
successfully updated.
Minimum length: 1
Maximum length: 36
 
Elastic IP
API Reference 4 APIs
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 103

--- Page 110 ---
Table 4-72 FailureResources
Parameter Type Description
id String ● ID of the bandwidth that fails to be
updated.
Minimum length: 1
Maximum length: 36
code String ● Error code
Minimum length: 1
Maximum length: 36
message String ● Error message
Minimum length: 1
Maximum length: 256
 
Example Request
Update bandwidths in batches.
{
  "bandwidths" : [ {
    "id" : "837d84a0-b940-4401-9477-4a99de1979a7",
    "name" : "bandwidth123",
    "size" : 5
  }, {
    "id" : "f2549bed-c419-4f58-9609-7ade104772bb",
    "name" : "bandwidth123",
    "size" : 5
  } ]
}
Example Response
Status code: 200
Normal response for batch bandwidth update
{
  "success_resources" : [ {
    "id" : "837d84a0-b940-4401-9477-4a99de1979a7"
  } ],
  "failure_resources" : [ {
    "id" : "f2549bed-c419-4f58-9609-7ade104772bb",
    "code" : "VPC.0319",
    "message" : "updateBandwidth bandwidth failed. the bandwidth is share bandwidth."
  } ]
}
SDK Sample Code
The sample code is as follows:
Java
Update bandwidths in batches.
Elastic IP
API Reference 4 APIs
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 104

--- Page 111 ---
package com.huaweicloud.sdk.test;
import com.huaweicloud.sdk.core.auth.ICredential;
import com.huaweicloud.sdk.core.auth.BasicCredentials;
import com.huaweicloud.sdk.core.exception.ConnectionException;
import com.huaweicloud.sdk.core.exception.RequestTimeoutException;
import com.huaweicloud.sdk.core.exception.ServiceResponseException;
import com.huaweicloud.sdk.eip.v2.region.EipRegion;
import com.huaweicloud.sdk.eip.v2.*;
import com.huaweicloud.sdk.eip.v2.model.*;
import java.util.List;
import java.util.ArrayList;
public class BatchModifyBandwidthSolution {
    public static void main(String[] args) {
        // The AK and SK used for authentication are hard-coded or stored in plaintext, which has great 
security risks. It is recommended that the AK and SK be stored in ciphertext in configuration files or 
environment variables and decrypted during use to ensure security.
        // In this example, AK and SK are stored in environment variables for authentication. Before running 
this example, set environment variables CLOUD_SDK_AK and CLOUD_SDK_SK in the local environment
        String ak = System.getenv("CLOUD_SDK_AK");
        String sk = System.getenv("CLOUD_SDK_SK");
        String projectId = "{project_id}";
        ICredential auth = new BasicCredentials()
                .withProjectId(projectId)
                .withAk(ak)
                .withSk(sk);
        EipClient client = EipClient.newBuilder()
                .withCredential(auth)
                .withRegion(EipRegion.valueOf("<YOUR REGION>"))
                .build();
        BatchModifyBandwidthRequest request = new BatchModifyBandwidthRequest();
        ModifyBandwidthRequestBody body = new ModifyBandwidthRequestBody();
        List<ModifyBandwidthOption> listbodyBandwidths = new ArrayList<>();
        listbodyBandwidths.add(
            new ModifyBandwidthOption()
                .withId("837d84a0-b940-4401-9477-4a99de1979a7")
                .withName("bandwidth123")
                .withSize(5)
        );
        listbodyBandwidths.add(
            new ModifyBandwidthOption()
                .withId("f2549bed-c419-4f58-9609-7ade104772bb")
                .withName("bandwidth123")
                .withSize(5)
        );
        body.withBandwidths(listbodyBandwidths);
        request.withBody(body);
        try {
            BatchModifyBandwidthResponse response = client.batchModifyBandwidth(request);
            System.out.println(response.toString());
        } catch (ConnectionException e) {
            e.printStackTrace();
        } catch (RequestTimeoutException e) {
            e.printStackTrace();
        } catch (ServiceResponseException e) {
            e.printStackTrace();
            System.out.println(e.getHttpStatusCode());
            System.out.println(e.getRequestId());
            System.out.println(e.getErrorCode());
            System.out.println(e.getErrorMsg());
        }
    }
}
Elastic IP
API Reference 4 APIs
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 105

--- Page 112 ---
Python
Update bandwidths in batches.
# coding: utf-8
import os
from huaweicloudsdkcore.auth.credentials import BasicCredentials
from huaweicloudsdkeip.v2.region.eip_region import EipRegion
from huaweicloudsdkcore.exceptions import exceptions
from huaweicloudsdkeip.v2 import *
if __name__ == "__main__":
    # The AK and SK used for authentication are hard-coded or stored in plaintext, which has great security 
risks. It is recommended that the AK and SK be stored in ciphertext in configuration files or environment 
variables and decrypted during use to ensure security.
    # In this example, AK and SK are stored in environment variables for authentication. Before running this 
example, set environment variables CLOUD_SDK_AK and CLOUD_SDK_SK in the local environment
    ak = os.environ["CLOUD_SDK_AK"]
    sk = os.environ["CLOUD_SDK_SK"]
    projectId = "{project_id}"
    credentials = BasicCredentials(ak, sk, projectId)
    client = EipClient.new_builder() \
        .with_credentials(credentials) \
        .with_region(EipRegion.value_of("<YOUR REGION>")) \
        .build()
    try:
        request = BatchModifyBandwidthRequest()
        listBandwidthsbody = [
            ModifyBandwidthOption(
                id="837d84a0-b940-4401-9477-4a99de1979a7",
                name="bandwidth123",
                size=5
            ),
            ModifyBandwidthOption(
                id="f2549bed-c419-4f58-9609-7ade104772bb",
                name="bandwidth123",
                size=5
            )
        ]
        request.body = ModifyBandwidthRequestBody(
            bandwidths=listBandwidthsbody
        )
        response = client.batch_modify_bandwidth(request)
        print(response)
    except exceptions.ClientRequestException as e:
        print(e.status_code)
        print(e.request_id)
        print(e.error_code)
        print(e.error_msg)
Go
Update bandwidths in batches.
package main
import (
    "fmt"
    "github.com/huaweicloud/huaweicloud-sdk-go-v3/core/auth/basic"
    eip "github.com/huaweicloud/huaweicloud-sdk-go-v3/services/eip/v2"
    "github.com/huaweicloud/huaweicloud-sdk-go-v3/services/eip/v2/model"
    region "github.com/huaweicloud/huaweicloud-sdk-go-v3/services/eip/v2/region"
)
Elastic IP
API Reference 4 APIs
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 106

--- Page 113 ---
func main() {
    // The AK and SK used for authentication are hard-coded or stored in plaintext, which has great security 
risks. It is recommended that the AK and SK be stored in ciphertext in configuration files or environment 
variables and decrypted during use to ensure security.
    // In this example, AK and SK are stored in environment variables for authentication. Before running this 
example, set environment variables CLOUD_SDK_AK and CLOUD_SDK_SK in the local environment
    ak := os.Getenv("CLOUD_SDK_AK")
    sk := os.Getenv("CLOUD_SDK_SK")
    projectId := "{project_id}"
    auth := basic.NewCredentialsBuilder().
        WithAk(ak).
        WithSk(sk).
        WithProjectId(projectId).
        Build()
    client := eip.NewEipClient(
        eip.EipClientBuilder().
            WithRegion(region.ValueOf("<YOUR REGION>")).
            WithCredential(auth).
            Build())
    request := &model.BatchModifyBandwidthRequest{}
    nameBandwidths:= "bandwidth123"
    sizeBandwidths:= int32(5)
    nameBandwidths1:= "bandwidth123"
    sizeBandwidths1:= int32(5)
    var listBandwidthsbody = []model.ModifyBandwidthOption{
        {
            Id: "837d84a0-b940-4401-9477-4a99de1979a7",
            Name: &nameBandwidths,
            Size: &sizeBandwidths,
        },
        {
            Id: "f2549bed-c419-4f58-9609-7ade104772bb",
            Name: &nameBandwidths1,
            Size: &sizeBandwidths1,
        },
    }
    request.Body = &model.ModifyBandwidthRequestBody{
        Bandwidths: listBandwidthsbody,
    }
    response, err := client.BatchModifyBandwidth(request)
    if err == nil {
        fmt.Printf("%+v\n", response)
    } else {
        fmt.Println(err)
    }
}
More SDK Sample Code
For more SDK sample codes of programming languages, visit API Explorer and
click the Sample Code tab. Example codes can be automatically generated.
Status Codes
Status
Code
Description
200 Normal response for batch bandwidth update
 
Elastic IP
API Reference 4 APIs
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 107

--- Page 114 ---
Error Code
See Error Codes.
4.5 Bandwidth (V2.0)
4.5.1 Changing Bandwidth Billing Mode from Pay-per-Use to
Yearly/Monthly
Function
This API is used to change the bandwidth billing mode from pay-per-use to yearly/
monthly.
URI
POST /v2.0/{project_id}/bandwidths/change-to-period
Table 4-73 Path parameter
Parameter Mandatory Type Description
project_id Yes String Project ID
 
Request Parameters
Table 4-74 Request body parameters
Parameter Mandatory Type Description
bandwidth_id
s
Yes Array List of pay-per-use bandwidths
to be changed to yearly/
monthly
extendParam Yes CreatePrePai
dPublicipExte
ndParamOpti
on object
Change billing mode from
pay-per-use to yearly/monthly.
 
Elastic IP
API Reference 4 APIs
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 108

--- Page 115 ---
Table 4-75 CreatePrePaidPublicipExtendParamOption
Parameter Mandatory Type Description
charge_mode No String ● Billing mode.
● The value can be:
– prePaid: yearly/monthly,
which is prepayment.
– postPaid: pay-per-use,
which is postpayment.
● In the postpayment mode,
fields in extendParam will
be ignored.
Default value: postPaid
Enumerated values:
● prePaid
● postPaid
period_type No String ● Subscription unit.
● The value can be:
– month: indicates that
the subscription is in the
unit of month.
– year: indicates that the
subscription is in the
unit of year.
● If you specify the shared
bandwidth ID when you
assign an EIP that is billed
on a yearly/monthly basis,
this parameter is optional.
This parameter is
mandatory if an EIP is
billed on a yearly/monthly
basis and is not assigned
together with a shared
bandwidth. If an EIP is
assigned together with a
shared bandwidth, the
expiration time of the
bandwidth is the same as
that of the EIP.
Enumerated values:
● month
● year
Elastic IP
API Reference 4 APIs
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 109

--- Page 116 ---
Parameter Mandatory Type Description
period_num No Integer ● Subscription period.
● Value range: (The value will
change with the operation
policy.)
– If period_type is set to
month, the value ranges
from 1 to 9.
– If period_type is set to
year, the value ranges
from 1 to 13.
● The constraints for
period_num are the same
as those for period_type.
Minimum value: 1
Maximum value: 9
is_auto_renew No Boolean ● Whether to automatically
renew the subscription.
● false: The subscription will
not be automatically
renewed. true: The
subscription will be
automatically renewed.
● After the subscription
expires, the system
automatically renews the
subscription for one month
by default (the automatic
renewal period may
change). For details,
contact customer service.
Default value: false
Elastic IP
API Reference 4 APIs
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 110

--- Page 117 ---
Parameter Mandatory Type Description
is_auto_pay No Boolean ● Whether the payment will
be automatically deducted
from your account balance
when an order is
submitted.
● The value can be:
– true: indicates
automatic payment. The
system will
automatically deduct
fees from your account
balance after an order is
submitted.
– false: indicates non-
automatic payment. You
need to pay manually.
● If you use automatic
payment, only your account
balance can be used. If you
want to use a voucher, do
not use automatic
payment, and select the
voucher for the payment in
the Billing Center.
Default value: false
 
Response Parameters
Status code: 200
Table 4-76 Response body parameters
Parameter Type Description
bandwidth_id
s
Array List of bandwidths with billing mode changed
to yearly/monthly
order_id String Order ID
request_id String Request ID
 
Example Request
POST /v2.0/{project_id}/bandwidths/change-to-period
{
  "bandwidth_ids" : [ "fe2a11c7-c880-49f7-b1e0-e151df2cc836" ],
  "extendParam" : {
Elastic IP
API Reference 4 APIs
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 111

--- Page 118 ---
    "charge_mode" : "prePaid",
    "period_type" : "month",
    "period_num" : 1,
    "is_auto_renew" : false,
    "is_auto_pay" : true
  }
}
Example Response
Status code: 200
OK
{
  "bandwidth_ids" : [ "fe2a11c7-c880-49f7-b1e0-e151df2cc836" ],
  "order_id" : "CS2212141741L0QZG",
  "request_id" : "8bcadb5d-1bf4-42e8-909f-1606ecf781ce"
}
Status Code
See Status Codes.
Error Code
See Error Codes.
4.5.2 Assigning a Shared Bandwidth
Function
This API is used to assign a shared bandwidth.
URI
POST /v2.0/{project_id}/bandwidths
Table 4-77 describes the parameters.
Table 4-77 Parameter description
Parameter Mandatory Description
project_id Yes Specifies the project ID.
For details about how to
obtain a project ID, see
Obtaining a Project ID.
 
Request Message
● Request parameter
Elastic IP
API Reference 4 APIs
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 112

--- Page 119 ---
Table 4-78 Request parameter
Paramet
er
Mandato
ry
Type Description
bandwidt
h
Yes bandwidth
object
Specifies the bandwidth objects.
For details, see Table 4-79.
 
Table 4-79 Description of the bandwidth field
Parameter Mand
atory
Type Description
name Yes String ● Specifies the bandwidth name.
● The value can contain 1 to 64
characters, including letters, digits,
underscores (_), hyphens (-), and
periods (.).
Elastic IP
API Reference 4 APIs
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 113

--- Page 120 ---
Parameter Mand
atory
Type Description
size Yes Integer ● Specifies the bandwidth size. The
shared bandwidth has a minimum
limit, which may vary depending
on sites. The default minimum
value is 5 Mbit/s.
● The value ranges from 1 Mbit/s to
2000 Mbit/s by default. (The
specific range may vary depending
on the configuration in each
region. You can see the available
bandwidth range on the
management console.)
● If a decimal fraction (for example
10.2) or a character string (for
example "10") is specified, the
specified value will be
automatically converted to an
integer.
● The minimum increment for
bandwidth adjustment varies
depending on the bandwidth
range. The details are as follows:
– The minimum increment is 1
Mbit/s if the allowed bandwidth
ranges from 0 Mbit/s to 300
Mbit/s (with 300 Mbit/s
included).
– The minimum increment is 50
Mbit/s if the allowed bandwidth
ranges from 300 Mbit/s to 1000
Mbit/s (with 1000 Mbit/s
included).
– The minimum increment is 500
Mbit/s if the allowed bandwidth
is greater than 1000 Mbit/s.
Elastic IP
API Reference 4 APIs
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 114

--- Page 121 ---
Parameter Mand
atory
Type Description
enterprise_projec
t_id
No String ● Specifies the enterprise project ID.
The value is 0 or a string that
contains a maximum of 36
characters in UUID format with
hyphens (-). Value 0 indicates the
default enterprise project.
● When creating a shared
bandwidth, associate the
enterprise project ID with the
shared bandwidth.
NOTE
For more information about enterprise
projects and how to obtain enterprise
project IDs, see the Enterprise
Management User Guide.
charge_mode No String ● Specifies whether the billing is
based on bandwidth, or 95th
percentile bandwidth (enhanced).
● Possible values can be bandwidth
(billed by bandwidth) and
95peak_plus (billed by enhanced
95th percentile bandwidth). If the
value is an empty character string
or no value is specified, value
bandwidth is used.
● Only the shared bandwidth
supports 95peak_plus (billed by
enhanced 95th percentile
bandwidth). If you use the
enhanced 95th percentile
bandwidth, you need to specify the
guaranteed bandwidth percentage.
The default value is 20%.
public_border_gr
oup
No String Specifies whether it is in a central site
or an edge site.
Values:
● center
● Edge site name
This resource can only be associated
with an EIP of the same region.
Elastic IP
API Reference 4 APIs
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 115

--- Page 122 ---
Parameter Mand
atory
Type Description
bandwidth_type No String ● Specifies the type of the
bandwidth to be created.
● For details about supported types
of bandwidth, see Querying a
Bandwidth.
By default:
– Central region: share
– Edge site: edgeshare
 
● Example request
POST https://{Endpoint}/v2.0/{project_id}/bandwidths
{
    "bandwidth": {
        "name": "bandwidth123",
        "size": 10
    }
}
Response Message
● Response parameter
Table 4-80 Response parameter
Parameter Type Description
bandwidth bandwidth
object
Specifies the bandwidth objects. For
details, see Table 4-81.
 
Table 4-81 Description of the bandwidth field
Parameter Type Description
name String ● Specifies the bandwidth name.
● The value can contain 1 to 64
characters, including letters, digits,
underscores (_), hyphens (-), and
periods (.).
size Integer ● Specifies the bandwidth size.
● The value ranges from 1 Mbit/s to
2000 Mbit/s by default. (The
specific range may vary depending
on the configuration in each
region. You can see the available
bandwidth range on the
management console.)
Elastic IP
API Reference 4 APIs
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 116

--- Page 123 ---
Parameter Type Description
id String Specifies the bandwidth ID, which
uniquely identifies the bandwidth.
share_type String ● Specifies whether the bandwidth
is shared or dedicated.
● The value can be PER or WHOLE.
– WHOLE: Shared bandwidth
– PER: Dedicated bandwidth
publicip_info Array of
publicip_info
objects
● Specifies information about the
EIP that uses the bandwidth. For
details, see Table 4-82.
● The bandwidth, whose type is
WHOLE, can be used by multiple
EIPs. The bandwidth, whose type
is PER, can be used by only one
EIP.
tenant_id String Specifies the project ID.
bandwidth_type String ● Specifies the bandwidth type. The
default value for the shared
bandwidth is share.
● The value can be share, bgp, or
sbgp.
– share: Shared bandwidth
– bgp: Dynamic BGP
– sbgp: Static BGP
charge_mode String ● Specifies whether the bandwidth
is billed by traffic or by bandwidth
size.
● Possible values can be bandwidth
(billed by bandwidth) and traffic
(billed by traffic). If the value is an
empty character string or no value
is specified, value bandwidth is
used.
● The shared bandwidth can be
billed only by bandwidth.
billing_info String Specifies the bill information.
If billing_info is specified, the
bandwidth is in yearly/monthly
billing mode.
Elastic IP
API Reference 4 APIs
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 117

--- Page 124 ---
Parameter Type Description
enterprise_projec
t_id
String ● Specifies the enterprise project ID.
The value is 0 or a UUID that can
contain a maximum of 36
characters, including hyphens (-).
Value 0 indicates the default
enterprise project.
● When creating a shared
bandwidth, associate the
enterprise project ID with the
shared bandwidth.
NOTE
For more information about enterprise
projects and how to obtain enterprise
project IDs, see the Enterprise
Management User Guide.
status String ● Specifies the bandwidth status.
● Possible values are as follows:
– FREEZED (Frozen)
– NORMAL (Normal)
created_at String ● Specifies the time (UTC) when the
bandwidth is created.
● Format: yyyy-MM-ddTHH:mm:ss
updated_at String ● Specifies the time (UTC) when the
bandwidth is updated.
● Format: yyyy-MM-ddTHH:mm:ss
enable_bandwidt
h_rules
boolean ● Specifies whether to enable QoS.
● The value can be true or false.
rule_quota integer Specifies the maximum number of
grouping rules supported by the
bandwidth.
bandwidth_rules Array of
bandwidth_rul
es objects
Specifies the bandwidth rules.
public_border_gr
oup
String Specifies whether it is in a central site
or an edge site.
Values:
● center
● Edge site name
This resource can only be associated
with an EIP of the same region.
 
Elastic IP
API Reference 4 APIs
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 118

--- Page 125 ---
Table 4-82 publicip_info object
Parameter Type Description
publicip_id String Specifies the ID of the EIP that uses the
bandwidth.
publicip_address String Specifies the obtained EIP if only IPv4
EIPs are available.
publicipv6_addres
s
String Specifies the obtained EIP if IPv6 EIPs
are available. This parameter does not
exist if only IPv4 EIPs are available.
ip_version Integer ● Specifies the IP address version.
● Possible values are as follows:
– 4: IPv4 address
– 6: IPv6 address
Elastic IP
API Reference 4 APIs
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 119

--- Page 126 ---
Parameter Type Description
publicip_type String ● Specifies the EIP type.
● The value can be 5_bgp (dynamic
BGP) or 5_sbgp (static BGP).
– CN South-Guangzhou: 5_bgp and
5_sbgp
– CN East-Shanghai1: 5_bgp and
5_sbgp
– CN East-Shanghai2: 5_bgp and
5_sbgp
– CN North-Beijing1: 5_bgp and
5_sbgp
– CN-Hong Kong: 5_bgp
– AP-Bangkok: 5_bgp
– AP-Singapore: 5_bgp
– AF-Johannesburg: 5_bgp
– CN Southwest-Guiyang1: 5_sbgp
– CN North-Beijing4: 5_bgp and
5_sbgp
– LA-Santiago: 5_bgp
– LA-Sao Paulo1: 5_bgp
– LA-Mexico City1: 5_bgp
– LA-Buenos Aires1: 5_bgp
– LA-Lima1: 5_bgp
– LA-Santiago2: 5_bgp
● Constraints:
– The configured value must be
supported by the system.
– publicip_id is an IPv4 port. If
publicip_type is not specified,
the default value is 5_bgp.
 
Table 4-83 bandwidth_rules object
Parameter Type Description
id string Specifies the bandwidth rule ID.
name string Specifies the name of the bandwidth
rule.
admin_state_up boolean Specifies the configuration status. The
value False indicates that the
configuration does not take effect.
Elastic IP
API Reference 4 APIs
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 120

--- Page 127 ---
Parameter Type Description
egress_size integer ● Specifies the maximum outbound
bandwidth in Mbit/s.
● The value range ranges from 0 to n,
where n indicates the shared
bandwidth size. If the value is set to
0, the maximum bandwidth, that is
the shared bandwidth size will be
used.
egress_guarented_si
ze
integer ● Specifies the guaranteed outbound
bandwidth in Mbit/s.
● The value ranges from 0 to x, where
x indicates the remaining bandwidth.
publicip_info Array of
publicip_i
nfo
objects
● Specifies the EIP associated with the
bandwidth.
● The bandwidth, whose type is set to
WHOLE, can be used by multiple
EIPs. The bandwidth, whose type is
set to PER, can be used by only one
EIP.
 
● Example response
{
  "bandwidth": {
    "id": "1bffc5f2-ff19-45a6-96d2-dfdca49cc387",
    "name": "bandwidth123",
    "size": 10,
    "share_type": "WHOLE",
    "publicip_info": [],
    "tenant_id": "26ae5181a416420998eb2093aaed84d9",
    "public_border_group": "center",
    "bandwidth_type": "share",
    "charge_mode": "bandwidth",
    "billing_info": "",
    "enterprise_project_id": "0",
    "status": "NORMAL",
    "created_at": "2020-04-21T07:58:02Z", 
    "updated_at": "2020-04-21T07:58:02Z",
    "enable_bandwidth_rules": false,
    "rule_quota": 0,
    "bandwidth_rules": [],
  }
}
Status Code
See Status Codes.
Error Code
See Error Codes.
Elastic IP
API Reference 4 APIs
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 121

--- Page 128 ---
4.5.3 Assigning Multiple Shared Bandwidths
Function
This API is used to assign multiple shared bandwidths at a time.
URI
POST /v2.0/{project_id}/batch-bandwidths
Table 4-84 describes the parameters.
Table 4-84 Parameter description
Parameter Mandatory Description
project_id Yes Specifies the project ID.
For details about how to
obtain a project ID, see
Obtaining a Project ID.
 
Request Message
● Request parameter
Table 4-85 Request parameter
Paramet
er
Mandato
ry
Type Description
bandwidt
h
Yes bandwidth
object
Specifies the bandwidth objects.
For details, see Table 4-86.
 
Table 4-86 Description of the bandwidth field
Parameter Mandator
y
Type Description
name Yes String ● Specifies the
bandwidth name.
● The value can
contain 1 to 64
characters,
including letters,
digits, underscores
(_), hyphens (-),
and periods (.).
Elastic IP
API Reference 4 APIs
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 122

--- Page 129 ---
Parameter Mandator
y
Type Description
size Yes Integer ● Specifies the
bandwidth size.
The shared
bandwidth has a
minimum limit,
which may vary
depending on
sites. The default
minimum value is
5 Mbit/s.
● The value ranges
from 1 Mbit/s to
2000 Mbit/s by
default. (The
specific range may
vary depending on
the configuration
in each region.
You can see the
available
bandwidth range
on the
management
console.)
● The minimum
increment for
bandwidth
adjustment varies
depending on the
bandwidth range.
The details are as
follows:
– The minimum
increment is 1
Mbit/s if the
allowed
bandwidth
ranges from 0
Mbit/s to 300
Mbit/s (with
300 Mbit/s
included).
– The minimum
increment is 50
Mbit/s if the
allowed
bandwidth
Elastic IP
API Reference 4 APIs
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 123

--- Page 130 ---
Parameter Mandator
y
Type Description
ranges from
300 Mbit/s to
1000 Mbit/s
(with 1000
Mbit/s
included).
– The minimum
increment is
500 Mbit/s if
the allowed
bandwidth is
greater than
1000 Mbit/s.
count Yes Integer ● Specifies the
number of shared
bandwidths that
can be assigned at
a time.
● The value is a
positive integer.
● If a decimal
fraction (for
example 2.2) or a
character string
(for example "2")
is specified, the
specified value will
be automatically
converted to an
integer.
public_border_group No String Specifies whether it is
in a central site or an
edge site.
Values:
● center
● Edge site name
This resource can
only be associated
with an EIP of the
same region.
 
● Example request
POST https://{Endpoint}/v2.0/{project_id}/batch-bandwidths
{
    "bandwidth": {
Elastic IP
API Reference 4 APIs
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 124

--- Page 131 ---
        "name": "bandwidth123",
        "size": 10,
        "count": 2
    }
}
Response Message
● Response parameter
Table 4-87 Response parameter
Parameter Type Description
bandwidths Array of
bandwidths
objects
Specifies the bandwidth objects. For
details, see Table 4-88.
 
Table 4-88 Description of the bandwidths field
Parameter Type Description
name String ● Specifies the bandwidth name.
● The value can contain 1 to 64
characters, including letters, digits,
underscores (_), hyphens (-), and
periods (.).
size Integer ● Specifies the bandwidth size.
● The value ranges from 1 Mbit/s to
2000 Mbit/s by default. (The
specific range may vary depending
on the configuration in each
region. You can see the available
bandwidth range on the
management console.)
id String Specifies the bandwidth ID, which
uniquely identifies the bandwidth.
share_type String ● Specifies whether the bandwidth
is shared or dedicated.
● The value can be PER or WHOLE.
– WHOLE: Shared bandwidth
– PER: Dedicated bandwidth
Elastic IP
API Reference 4 APIs
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 125

--- Page 132 ---
Parameter Type Description
publicip_info Array of
publicip_info
objects
● Specifies information about the
EIP that uses the bandwidth. For
details, see Table 4-89.
● The bandwidth, whose type is
WHOLE, can be used by multiple
EIPs. The bandwidth, whose type
is PER, can be used by only one
EIP.
tenant_id String Specifies the project ID.
bandwidth_type String ● Specifies the bandwidth type. The
default value for the shared
bandwidth is share.
● The value can be share, bgp, or
sbgp.
– share: Shared bandwidth
– bgp: Dynamic BGP
– sbgp: Static BGP
charge_mode String ● Specifies whether the bandwidth
is billed by traffic or by bandwidth
size.
● Possible values can be bandwidth
(billed by bandwidth) and traffic
(billed by traffic). If the value is an
empty character string or no value
is specified, value bandwidth is
used.
● The shared bandwidth can be
billed only by bandwidth.
billing_info String Specifies the bill information.
If billing_info is specified, the
bandwidth is in yearly/monthly
billing mode.
status String ● Specifies the bandwidth status.
● Possible values are as follows:
– FREEZED (Frozen)
– NORMAL (Normal)
Elastic IP
API Reference 4 APIs
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 126

--- Page 133 ---
Parameter Type Description
public_border_gr
oup
String Specifies whether it is in a central site
or an edge site.
Values:
● center
● Edge site name
This resource can only be associated
with an EIP of the same region.
 
Table 4-89 publicip_info object
Parameter Type Description
publicip_id String Specifies the ID of the EIP that uses the
bandwidth.
publicip_address String Specifies the obtained EIP if only IPv4
EIPs are available.
publicipv6_addres
s
String Specifies the obtained EIP if IPv6 EIPs
are available. This parameter does not
exist if only IPv4 EIPs are available.
ip_version Integer ● Specifies the IP address version.
● Possible values are as follows:
– 4: IPv4 address
– 6: IPv6 address
Elastic IP
API Reference 4 APIs
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 127

--- Page 134 ---
Parameter Type Description
publicip_type String ● Specifies the EIP type.
● The value can be 5_bgp (dynamic
BGP) or 5_sbgp (static BGP).
– CN South-Guangzhou: 5_bgp and
5_sbgp
– CN East-Shanghai1: 5_bgp and
5_sbgp
– CN East-Shanghai2: 5_bgp and
5_sbgp
– CN North-Beijing1: 5_bgp and
5_sbgp
– CN-Hong Kong: 5_bgp
– AP-Bangkok: 5_bgp
– AP-Singapore: 5_bgp
– AF-Johannesburg: 5_bgp
– CN Southwest-Guiyang1: 5_sbgp
– CN North-Beijing4: 5_bgp and
5_sbgp
– LA-Santiago: 5_bgp
– LA-Sao Paulo1: 5_bgp
– LA-Mexico City1: 5_bgp
– LA-Buenos Aires1: 5_bgp
– LA-Lima1: 5_bgp
– LA-Santiago2: 5_bgp
● Constraints:
– The configured value must be
supported by the system.
– publicip_id is an IPv4 port. If
publicip_type is not specified,
the default value is 5_bgp.
 
● Example response
{
  "bandwidths": [
    {
      "id": "7e5a1a30-6e88-4ce5-b5fa-1d6c6864e084",
      "name": "bandwidth123",
      "size": 10,
      "share_type": "WHOLE",
      "publicip_info": [],
      "tenant_id": "26ae5181a416420998eb2093aaed84d9",
      "bandwidth_type": "share",
      "charge_mode": "bandwidth",
      "billing_info": "",
      "status": "NORMAL"
    },
    {
Elastic IP
API Reference 4 APIs
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 128

--- Page 135 ---
      "id": "ed2da50a-3ce9-4d86-9f17-e8f3801299a5",
      "name": "bandwidth123",
      "size": 10,
      "share_type": "WHOLE",
      "publicip_info": [],
      "tenant_id": "26ae5181a416420998eb2093aaed84d9",
      "bandwidth_type": "share",
      "charge_mode": "bandwidth",
      "billing_info": "",
      "status": "NORMAL"
    }
  ]
}
Status Code
See Status Codes.
Error Code
See Error Codes.
4.5.4 Deleting a Shared Bandwidth
Function
This API is used to delete a shared bandwidth.
URI
DELETE /v2.0/{project_id}/bandwidths/{bandwidth_id}
Table 4-90 describes the parameters.
Table 4-90 Parameter description
Parameter Mandatory Description
project_id Yes Specifies the project ID.
For details about how to
obtain a project ID, see
Obtaining a Project ID.
bandwidth_id Yes Specifies the bandwidth
ID, which uniquely
identifies the bandwidth.
Currently, only the
shared bandwidth can be
deleted.
 
Request Message
● Request parameter
None
Elastic IP
API Reference 4 APIs
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 129

--- Page 136 ---
● Example request
DELETE https://{Endpoint}/v2.0/{project_id}/bandwidths/{bandwidth_id}
Response Message
● Response parameter
None
● Example response
Or
{
       "code":"xxx",
       "message":"xxxxx"
}
Status Code
See Status Codes.
Error Code
See Error Codes.
4.5.5 Adding an EIP to a Shared Bandwidth
Function
This API is used to add an EIP to a shared bandwidth.
URI
POST /v2.0/{project_id}/bandwidths/{bandwidth_id}/insert
Table 4-91 describes the parameters.
Table 4-91 Parameter description
Parameter Mandatory Description
project_id Yes Specifies the project ID.
For details about how to
obtain a project ID, see
Obtaining a Project ID.
bandwidth_id Yes Specifies the bandwidth
ID, which uniquely
identifies the bandwidth.
 
Request Message
● Request parameter
Elastic IP
API Reference 4 APIs
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 130

--- Page 137 ---
Table 4-92 Request parameter
Paramet
er
Mandato
ry
Type Description
bandwidt
h
Yes bandwidth
object
Specifies the bandwidth objects.
For details, see Table 4-93.
 
Table 4-93 Description of the bandwidth field
Parame
ter
Mandat
ory
Type Description
publicip
_info
Yes Array of
publicip
_info
objects
● Specifies information about the EIP to
be added to the shared bandwidth. For
details, see Table 4-94.
● The bandwidth, whose type is WHOLE,
can be used by multiple EIPs. The
number of EIPs varies depending on the
tenant quota. By default, a shared
bandwidth can be used by up to 20 EIPs.
 
Table 4-94 publicip_info object
Paramet
er
Mandator
y
Type Description
publicip_
id
Yes String Specifies the ID of the EIP that uses
the bandwidth.
Elastic IP
API Reference 4 APIs
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 131

--- Page 138 ---
Paramet
er
Mandator
y
Type Description
publicip_
type
No String ● Specifies the EIP type.
● The value can be 5_bgp
(dynamic BGP) or 5_sbgp (static
BGP).
– CN South-Guangzhou: 5_bgp
and 5_sbgp
– CN East-Shanghai1: 5_bgp
and 5_sbgp
– CN East-Shanghai2: 5_bgp
and 5_sbgp
– CN North-Beijing1: 5_bgp and
5_sbgp
– CN-Hong Kong: 5_bgp
– AP-Bangkok: 5_bgp
– AP-Singapore: 5_bgp
– AF-Johannesburg: 5_bgp
– CN Southwest-Guiyang1:
5_sbgp
– CN North-Beijing4: 5_bgp and
5_sbgp
– LA-Santiago: 5_bgp
– LA-Sao Paulo1: 5_bgp
– LA-Mexico City1: 5_bgp
– LA-Buenos Aires1: 5_bgp
– LA-Lima1: 5_bgp
– LA-Santiago2: 5_bgp
● Constraints:
– The configured value must be
supported by the system.
– publicip_id is an IPv4 port. If
publicip_type is not specified,
the default value is 5_bgp.
 
● Example request
POST https://{Endpoint}/v2.0/{project_id}/bandwidths/{bandwidth_id}/insert
{
  "bandwidth": {
    "publicip_info": [
      {
        "publicip_id": "29b114d1-2d41-4741-a1f0-b6f80aabceff",
        "publicip_type": "5_bgp",
      }
    ]
Elastic IP
API Reference 4 APIs
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 132

--- Page 139 ---
  }
}
Response Message
● Response parameter
Table 4-95 Response parameter
Parameter Type Description
bandwidth bandwidth
object
Specifies the bandwidth objects. For
details, see Table 4-96.
 
Table 4-96 Description of the bandwidth field
Parameter Type Description
name String ● Specifies the bandwidth name.
● The value can contain 1 to 64
characters, including letters, digits,
underscores (_), hyphens (-), and
periods (.).
size Integer ● Specifies the bandwidth size.
● The value ranges from 1 Mbit/s to
2000 Mbit/s by default. (The
specific range may vary depending
on the configuration in each
region. You can see the available
bandwidth range on the
management console.)
id String Specifies the bandwidth ID, which
uniquely identifies the bandwidth.
share_type String ● Specifies whether the bandwidth
is shared or dedicated.
● The value can be PER or WHOLE.
– WHOLE: Shared bandwidth
– PER: Dedicated bandwidth
publicip_info Array of
publicip_info
objects
● Specifies information about the
EIP that uses the bandwidth. For
details, see Table 4-97.
● The bandwidth, whose type is
WHOLE, can be used by multiple
EIPs. The bandwidth, whose type
is PER, can be used by only one
EIP.
tenant_id String Specifies the project ID.
Elastic IP
API Reference 4 APIs
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 133

--- Page 140 ---
Parameter Type Description
bandwidth_type String ● Specifies the bandwidth type. The
default value for the shared
bandwidth is share.
● The value can be share, bgp, or
sbgp.
– share: Shared bandwidth
– bgp: Dynamic BGP
– sbgp: Static BGP
charge_mode String ● Specifies whether the bandwidth
is billed by traffic or by bandwidth
size.
● Possible values can be bandwidth
(billed by bandwidth) and traffic
(billed by traffic). If the value is an
empty character string or no value
is specified, value bandwidth is
used.
● The shared bandwidth can be
billed only by bandwidth.
billing_info String Specifies the bill information.
If billing_info is specified, the
bandwidth is in yearly/monthly
billing mode.
enterprise_projec
t_id
String ● Specifies the enterprise project ID.
The value is 0 or a string that
contains a maximum of 36
characters in UUID format with
hyphens (-). Value 0 indicates the
default enterprise project.
● When creating a shared
bandwidth, associate the
enterprise project ID with the
shared bandwidth.
NOTE
For more information about enterprise
projects and how to obtain enterprise
project IDs, see the Enterprise
Management User Guide.
status String ● Specifies the bandwidth status.
● Possible values are as follows:
– FREEZED (Frozen)
– NORMAL (Normal)
enable_bandwidt
h_rules
boolean ● Specifies whether to enable QoS.
● The value can be true or false.
Elastic IP
API Reference 4 APIs
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 134

--- Page 141 ---
Parameter Type Description
rule_quota integer Specifies the maximum number of
grouping rules supported by the
bandwidth.
bandwidth_rules Array of
bandwidth_rul
es objects
Specifies the bandwidth rules.
 
Table 4-97 publicip_info objects
Parameter Type Description
publicip_id String Specifies the ID of the EIP that uses the
bandwidth.
publicip_address String Specifies the obtained EIP if only IPv4 EIPs
are available.
publicipv6_address String Specifies the obtained EIP if IPv6 EIPs are
available. This parameter does not exist if
only IPv4 EIPs are available.
ip_version Integer ● Specifies the IP address version.
● Possible values are as follows:
– 4: IPv4
– 6: IPv6
Elastic IP
API Reference 4 APIs
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 135

--- Page 142 ---
Parameter Type Description
publicip_type String ● Specifies the EIP type.
● The value can be 5_bgp (dynamic BGP)
or 5_sbgp (static BGP).
– CN South-Guangzhou: 5_bgp and
5_sbgp
– CN East-Shanghai1: 5_bgp and
5_sbgp
– CN East-Shanghai2: 5_bgp and
5_sbgp
– CN North-Beijing1: 5_bgp and
5_sbgp
– CN-Hong Kong: 5_bgp
– AP-Bangkok: 5_bgp
– AP-Singapore: 5_bgp
– AF-Johannesburg: 5_bgp
– CN Southwest-Guiyang1: 5_sbgp
– CN North-Beijing4: 5_bgp and
5_sbgp
– LA-Santiago: 5_bgp
– LA-Sao Paulo1: 5_bgp
– LA-Mexico City1: 5_bgp
– LA-Buenos Aires1: 5_bgp
– LA-Lima1: 5_bgp
– LA-Santiago2: 5_bgp
● Constraints:
– The configured value must be
supported by the system.
– publicip_id is an IPv4 port. If
publicip_type is not specified, the
default value is 5_bgp.
 
Table 4-98 bandwidth_rules object
Parameter Type Description
id string Specifies the bandwidth rule ID.
name string Specifies the name of the bandwidth
rule.
admin_state_up boolean Specifies the configuration status. The
value False indicates that the
configuration does not take effect.
Elastic IP
API Reference 4 APIs
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 136

--- Page 143 ---
Parameter Type Description
egress_size integer ● Specifies the maximum outbound
bandwidth in Mbit/s.
● The value range ranges from 0 to n,
where n indicates the shared
bandwidth size. If the value is set to
0, the maximum bandwidth, that is
the shared bandwidth size will be
used.
egress_guarented_si
ze
integer ● Specifies the guaranteed outbound
bandwidth in Mbit/s.
● The value ranges from 0 to x, where
x indicates the remaining bandwidth.
publicip_info Array of
publicip_i
nfo
objects
● Specifies the EIP associated with the
bandwidth.
● The bandwidth, whose type is set to
WHOLE, can be used by multiple
EIPs. The bandwidth, whose type is
set to PER, can be used by only one
EIP.
 
● Example response
{
    "bandwidth": {
        "id": "3fa5b383-5a73-4dcb-a314-c6128546d855",
        "name": "bandwidth123",
        "size": 10,
        "share_type": "WHOLE",
        "publicip_info": [
            {
                "publicip_id": "1d184b2c-4ec9-49b5-a3f9-27600a76ba3f",
                "publicip_address": "99.xx.xx.82",
                "publicip_type": "5_bgp",
                "ip_version": 4
            }
        ],
        "tenant_id": "8b7e35ad379141fc9df3e178bd64f55c",
        "charge_mode": "traffic",
        "billing_info": 
"CS1712121146TSQOJ:0616e2a5dc9f4985ba52ea8c0c7e273c:southchina:35f2b308f5d64441a6fa7999fb
cd4321",
        "bandwidth_type": "share",
        "status": "NORMAL"
    }
}
Status Code
See Status Codes.
Error Code
See Error Codes.
Elastic IP
API Reference 4 APIs
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 137

--- Page 144 ---
4.5.6 Removing an EIP from a Shared Bandwidth
Function
This API is used to remove an EIP from a shared bandwidth.
URI
POST /v2.0/{project_id}/bandwidths/{bandwidth_id}/remove
Table 4-99 describes the parameters.
Table 4-99 Parameter description
Parameter Mandatory Description
project_id Yes Specifies the project ID.
For details about how to
obtain a project ID, see
Obtaining a Project ID.
bandwidth_id Yes Specifies the bandwidth
ID, which uniquely
identifies the bandwidth.
 
Request Message
● Request parameter
Table 4-100 Request parameter
Paramet
er
Mandato
ry
Type Description
bandwidt
h
Yes bandwidth
object
Specifies the bandwidth objects.
For details, see Table 4-101.
 
Elastic IP
API Reference 4 APIs
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 138

--- Page 145 ---
Table 4-101 Description of the bandwidth field
Parame
ter
Mandat
ory
Type Description
publicip
_info
Yes Array of
publicip
_info
objects
● Specifies information about the EIP to
be removed from the bandwidth. For
details, see Table 4-102.
● The bandwidth, whose type is WHOLE,
can be used by multiple EIPs. The
number of EIPs varies depending on the
tenant quota. By default, a shared
bandwidth can be used by up to 20 EIPs.
charge_
mode
Yes String After an EIP is removed from a shared
bandwidth, a dedicated bandwidth will be
allocated to the EIP, and you will be billed
for the dedicated bandwidth.
Specifies whether the dedicated bandwidth
used by the EIP that has been removed
from a shared bandwidth is billed by traffic
or by bandwidth.
The value can be bandwidth or traffic.
size Yes Integer After an EIP is removed from a shared
bandwidth, a dedicated bandwidth will be
allocated to the EIP, and you will be billed
for the dedicated bandwidth.
Specifies the size (Mbit/s) of the dedicated
bandwidth used by the EIP that has been
removed from a shared bandwidth.
The value ranges from 1 Mbit/s to 300
Mbit/s by default. (The specific range may
vary depending on the configuration in
each region. You can see the bandwidth
range of each region on the management
console.)
 
Table 4-102 publicip_info object
Parame
ter
Mandatory Type Description
publicip
_id
Yes String Specifies the ID of the EIP that uses
the bandwidth.
Elastic IP
API Reference 4 APIs
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 139

--- Page 146 ---
Parame
ter
Mandatory Type Description
publicip
_type
No String If the publicip_id value is the EIP ID,
this parameter will be ignored. If
publicip_id is the ID of the IPv6
port, this parameter must be set to
5_dualStack. This only applies to
the CN North-Beijing4 region.
 
● Example request
POST https://{Endpoint}/v2.0/{project_id}/bandwidths/{bandwidth_id}/remove
{
    "bandwidth": {
        "publicip_info": [
            {
                "publicip_id": "d91b0028-6f6b-4478-808a-297b75b6812a"
 
            },
            {
                "publicip_id": "1d184b2c-4ec9-49b5-a3f9-27600a76ba3f"
            }
        ],
        "charge_mode": "traffic",
        "size": 22
    }
}
Response Message
● Response parameter
None
● Example response
None
Or
{
       "code":"xxx",
       "message":"xxxxx"
}
Status Code
See Status Codes.
Error Code
See Error Codes.
4.5.7 Updating a Yearly/Monthly Bandwidth
Function
This API is used to update information about a bandwidth in yearly/monthly
billing mode.
Elastic IP
API Reference 4 APIs
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 140

--- Page 147 ---
URI
PUT /v2.0/{project_id}/bandwidths/{bandwidth_id}
Table 4-103 describes the parameters.
Table 4-103 Parameter description
Parameter Mandatory Description
project_id Yes Specifies the project ID.
For details about how to
obtain a project ID, see
Obtaining a Project ID.
bandwidth_id Yes Specifies the bandwidth
ID, which uniquely
identifies the bandwidth.
You can obtain it in
Querying an EIP.
 
Request Message
● Request parameter
Table 4-104 Request parameter
Paramet
er
Mandato
ry
Type Description
bandwidt
h
Yes bandwidth
object
Specifies the bandwidth objects.
For details, see Table 4-105.
extendPa
ram
No extendParam
object
Specifies the extended parameter,
which is used to apply for
resources in yearly/monthly billing
mode. For details, see Table 4-106.
 
Table 4-105 Description of the bandwidth field
Parame
ter
Mandat
ory
Type Description
name No String ● Specifies the bandwidth name.
● The value can contain 1 to 64 characters,
including letters, digits, underscores (_),
hyphens (-), and periods (.). If the value
is left blank, the name of the bandwidth
is not changed.
● Either name or size must be specified.
Elastic IP
API Reference 4 APIs
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 141

--- Page 148 ---
Parame
ter
Mandat
ory
Type Description
size No Integer ● Specifies the bandwidth size. The size of
the bandwidth in yearly/monthly billing
mode can only be changed to a larger
value.
● The value ranges from 1 Mbit/s to 2000
Mbit/s by default. (The specific range
may vary depending on the configuration
in each region. You can see the available
bandwidth range on the management
console.) If the parameter is not
included, the bandwidth size is not
changed.
● Either name or size must be specified.
● The minimum increment for bandwidth
adjustment varies depending on the
bandwidth range. The details are as
follows:
– The minimum increment is 1 Mbit/s if
the allowed bandwidth ranges from 0
Mbit/s to 300 Mbit/s (with 300 Mbit/s
included).
– The minimum increment is 50 Mbit/s
if the allowed bandwidth ranges from
300 Mbit/s to 1000 Mbit/s (with 1000
Mbit/s included).
– The minimum increment is 500 Mbit/s
if the allowed bandwidth is greater
than 1000 Mbit/s.
 
Elastic IP
API Reference 4 APIs
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 142

--- Page 149 ---
Table 4-106 Description of the extendParam field
Parameter Manda
tory
Type Description
is_auto_pa
y
No boolean ● Specifies whether an order is
automatically paid from the
customer's account without
manual operations. By default,
the system will not
automatically pay the order.
● Possible values are as follows:
– true: Yes (The order will be
automatically paid.)
– false: No (Default value. You
must manually pay the
order.)
● Constraints:
If you use automatic payment,
the order is paid with your
account balance. If you want to
use cash coupons, do not use
automatic payment and select
the cash coupons for the
payment in the Billing Center.
 
● Example request
PUT https://{Endpoint}/v2.0/{project_id}/bandwidths/{bandwidth_id}
{
    "bandwidth": {
        "name": "bandwidth123",
        "size": 10
    },
    "extendParam": {
        "is_auto_pay": "false"
    }
}
Response Message
● Response parameter
Table 4-107 Response parameter
Parameter Type Description
bandwidth bandwidth
object
Specifies the bandwidth object. This
object is returned only when the value of
the name parameter in the bandwidth
fields is updated in the pay-per-use or
yearly/monthly billing mode. For details,
see Table 4-108.
Elastic IP
API Reference 4 APIs
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 143

--- Page 150 ---
Parameter Type Description
order_id String Specifies the order ID. (yearly/monthly
billing mode)
 
Table 4-108 Description of the bandwidth field
Parameter Type Description
name String ● Specifies the bandwidth name.
● The value can contain 1 to 64
characters, including letters, digits,
underscores (_), hyphens (-), and
periods (.).
size Integer ● Specifies the bandwidth size.
● The value ranges from 5 Mbit/s to
2000 Mbit/s by default. (The
specific range may vary depending
on the configuration in each
region. You can see the available
bandwidth range on the
management console.)
id String Specifies the bandwidth ID, which
uniquely identifies the bandwidth.
share_type String ● Specifies whether the bandwidth
is shared or dedicated.
● The value can be PER or WHOLE.
– WHOLE: Shared bandwidth
– PER: Dedicated bandwidth
publicip_info Array of
publicip_info
objects
● Specifies information about the
EIP that uses the bandwidth. For
details, see Table 4-109.
● The bandwidth, whose type is
WHOLE, can be used by multiple
EIPs. The bandwidth, whose type
is PER, can be used by only one
EIP.
tenant_id String Specifies the project ID.
Elastic IP
API Reference 4 APIs
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 144

--- Page 151 ---
Parameter Type Description
bandwidth_type String ● Specifies the bandwidth type. The
default value for the shared
bandwidth is share.
● The value can be share, bgp, or
sbgp.
– share: Shared bandwidth
– bgp: Dynamic BGP
– sbgp: Static BGP
charge_mode String ● Specifies whether the bandwidth
is billed by traffic, bandwidth, or
95th percentile bandwidth
(enhanced).
● Possible values can be bandwidth
(billed by bandwidth), traffic
(billed by traffic), or 95peak_plus
(billed by enhanced 95th
percentile bandwidth). If the value
is an empty character string or no
value is specified, value
bandwidth is used.
● Only the shared bandwidth
supports 95peak_plus (billed by
enhanced 95th percentile
bandwidth). If you use the
enhanced 95th percentile
bandwidth, specify the guaranteed
bandwidth percentage. The
default value is 20%. Shared
bandwidth does not support
billing by traffic. Yearly/monthly
shared bandwidth does not
support billing by enhanced 95th
percentile bandwidth.
billing_info String Specifies the bill information.
If billing_info is specified, the
bandwidth is in yearly/monthly
billing mode.
Elastic IP
API Reference 4 APIs
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 145

--- Page 152 ---
Parameter Type Description
enterprise_projec
t_id
String ● Specifies the enterprise project ID.
The value is 0 or a string that
contains a maximum of 36
characters in UUID format with
hyphens (-). Value 0 indicates the
default enterprise project.
● When creating a shared
bandwidth, associate the
enterprise project ID with the
shared bandwidth.
NOTE
For more information about enterprise
projects and how to obtain enterprise
project IDs, see the Enterprise
Management User Guide.
status String ● Specifies the bandwidth status.
● Values:
– FREEZED (Frozen)
– NORMAL (Normal)
created_at String ● Specifies the time (UTC) when the
bandwidth is created.
● Format: yyyy-MM-ddTHH:mm:ss
updated_at String ● Specifies the time (UTC) when the
bandwidth is updated.
● Format: yyyy-MM-ddTHH:mm:ss
enable_bandwidt
h_rules
boolean ● Specifies whether to enable QoS.
● The value can be true or false.
rule_quota integer Specifies the maximum number of
grouping rules supported by the
bandwidth.
bandwidth_rules Array of
bandwidth_rul
es objects
Specifies the bandwidth rules.
public_border_gr
oup
String Specifies whether it is in a central site
or an edge site.
Values:
● center
● Edge site name
This resource can only be associated
with an EIP of the same region.
 
Elastic IP
API Reference 4 APIs
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 146

--- Page 153 ---
Table 4-109 publicip_info object
Parameter Type Description
publicip_id String Specifies the ID of the EIP or IPv6 port that
uses the bandwidth.
publicip_address String Specifies the obtained EIP if only IPv4 EIPs
are available.
publicipv6_address String Specifies the obtained EIP if IPv6 EIPs are
available. This parameter does not exist if
only IPv4 EIPs are available.
ip_version Integer ● Specifies the IP address version.
● Possible values are as follows:
– 4: IPv4 address
– 6: IPv6 address
Elastic IP
API Reference 4 APIs
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 147

--- Page 154 ---
Parameter Type Description
publicip_type String ● Specifies the EIP type.
● The value can be 5_bgp (dynamic BGP)
or 5_sbgp (static BGP).
– CN South-Guangzhou: 5_bgp and
5_sbgp
– CN East-Shanghai1: 5_bgp and
5_sbgp
– CN East-Shanghai2: 5_bgp and
5_sbgp
– CN North-Beijing1: 5_bgp and
5_sbgp
– CN-Hong Kong: 5_bgp
– AP-Bangkok: 5_bgp
– AP-Singapore: 5_bgp
– AF-Johannesburg: 5_bgp
– CN Southwest-Guiyang1: 5_sbgp
– CN North-Beijing4: 5_bgp and
5_sbgp
– LA-Santiago: 5_bgp
– LA-Sao Paulo1: 5_bgp
– LA-Mexico City1: 5_bgp
– LA-Buenos Aires1: 5_bgp
– LA-Lima1: 5_bgp
– LA-Santiago2: 5_bgp
● Constraints:
– The configured value must be
supported by the system.
– publicip_id is an IPv4 port. If
publicip_type is not specified, the
default value is 5_bgp.
 
Table 4-110 bandwidth_rules object
Parameter Type Description
id string Specifies the bandwidth rule ID.
name string Specifies the name of the bandwidth
rule.
admin_state_up boolean Specifies the configuration status. The
value False indicates that the
configuration does not take effect.
Elastic IP
API Reference 4 APIs
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 148

--- Page 155 ---
Parameter Type Description
egress_size integer ● Specifies the maximum outbound
bandwidth in Mbit/s.
● The value range ranges from 0 to n,
where n indicates the shared
bandwidth size. If the value is set to
0, the maximum bandwidth, that is
the shared bandwidth size will be
used.
egress_guarented_si
ze
integer ● Specifies the guaranteed outbound
bandwidth in Mbit/s.
● The value ranges from 0 to x, where
x indicates the remaining bandwidth.
publicip_info Array of
publicip_i
nfo
objects
● Specifies the EIP associated with the
bandwidth.
● The bandwidth, whose type is set to
WHOLE, can be used by multiple
EIPs. The bandwidth, whose type is
set to PER, can be used by only one
EIP.
 
● Example response 1 (only the value of the name parameter in the bandwidth
field is updated in the pay-per-use or yearly/monthly billing mode.)
{
    "bandwidth": {
        "id": "3fa5b383-5a73-4dcb-a314-c6128546d855",
        "name": "bandwidth123",
        "size": 10,
        "share_type": "PER",
        "publicip_info": [
            {
                "publicip_id": "6285e7be-fd9f-497c-bc2d-dd0bdea6efe0",
                "publicip_address": "161.xx.xx.9",
                "publicip_type": "5_bgp",
                "ip_version": 4
            }
        ],
        "tenant_id": "8b7e35ad379141fc9df3e178bd64f55c",
        "created_at": "2020-04-21T08:56:42Z",
        "updated_at": "2020-04-21T08:56:42Z", 
        "bandwidth_type": "bgp"
    }
}
● Example response 2 (yearly/monthly bandwidth)
{
    "order_id": "xxxx"
}
Status Code
See Status Codes.
Elastic IP
API Reference 4 APIs
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 149

--- Page 156 ---
Error Code
See Error Codes.
4.6 Bandwidth Add-On Packages
4.6.1 Querying Bandwidth Add-On Packages
Function
This API is used to query bandwidth add-on packages.
URI
GET /v2/{project_id}/bandwidthpkgs
Table 4-111 Path parameter
Parameter Mandatory Type Description
project_id Yes String Project ID
 
Request Parameters
None
Response Parameters
Status code: 200
Table 4-112 Response body parameters
Parameter Type Description
bandwidthpkg
s
Array of
BandwidthPk
gResp objects
List of bandwidth add-on packages
bandwidthpkg
s_links
Array of
BandwidthPk
gPage objects
Page turning display
 
Elastic IP
API Reference 4 APIs
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 150

--- Page 157 ---
Table 4-113 BandwidthPkgResp
Parameter Type Description
resourceId String ● Bandwidth add-on package ID
● The value can contain 1 to 64 characters,
including digits, letters, underscores (_), and
hyphens (-).
resourceNam
e
String ● Bandwidth add-on package name
processedTim
e
String ● Time (UTC) when the bandwidth add-on
package is created. The value is in the
format of 2016-03-28T00:00:00Z.
bandwidthId String ● ID of the bandwidth that uses the
bandwidth add-on package
pkgSize Integer ● Bandwidth add-on package size
● Value range: > 1 Mbit/s; Bandwidth add-on
package size + Bandwidth size < Bandwidth
upper limit defined by cloud service
bandwidth API
tenantId String ● Tenant ID
billingInfo String ● Information about the bandwidth add-on
package order. If this parameter is not
empty, the value is in the format of
orderId:productId.
startTime String ● Start time (UTC) when the bandwidth add-
on package takes effect. The value is in the
format of 2016-03-28T00:00:00Z.
● Value range: startTime must be later than
or the same as processedTime.
endTime String ● End time (UTC) when the bandwidth add-
on package takes effect. The value is in the
format of 2016-03-28T00:00:00Z.
● Value range: endTime must be later than
startTime.
status String ● Status of the bandwidth add-on package.
Only administrators can change the status.
● Value range: pending, active, completed,
and error
 
Elastic IP
API Reference 4 APIs
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 151

--- Page 158 ---
Table 4-114 BandwidthPkgPage
Parameter Type Description
href String ● Link
rel String ● Page turning mark
 
Example Request
GET /v2/{project_id}/bandwidthpkgs
Example Response
Status code: 200
Normal response to the GET operation
{
  "bandwidthpkgs" : [ {
    "resourceId" : "0003cb59-eaa4-4c05-85bd-4b4cc806992c",
    "resourceName" : "bandwidthpkg-test",
    "pkgSize" : "5",
    "processedTime" : "2018-10-13 20:21:17.465126",
    "bandwidthId" : "6c50f312-2eab-4f08-9da2-b41b0801d8be",
    "tenantId" : "e136ddf186a84dff9c5d5364de79f4e4",
    "billingInfo" : "CS1810091953KI13V:edcb94a885a84ed3a3fdf8ea4d2741da",
    "startTime" : "2018-10-24 21:2:17.465126",
    "endTime" : "2018-10-28 21:2:17.465126",
    "status" : "pending"
  } ],
  "bandwidthpkgs_links" : [ {
    "href" : "https://vpc.br-iaas-odin1.ulanqab.huawei.com:443/v2/0605767f6f00d5762ff9c001c70e7359/
bandwidthpkgs?limit=2000&marker=4fc74637-753f-46cb-af8c-b58528887a79&page_reverse=true",
    "rel" : "previous"
  } ]
}
Status Code
See Status Codes.
Error Code
See Error Codes.
4.7 Quota
4.7.1 Querying the Quota
Function
This API is used to query the network resource quotas of a tenant. The network
resources include VPCs, subnets, security groups, security group rules, EIPs, VPNs,
and more.
Elastic IP
API Reference 4 APIs
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 152

--- Page 159 ---
NO TE
This API can be used to query quotas of EIPs and VPCs.
URI
GET /v1/{project_id}/quotas
Example:
GET https://{Endpoint}/v1/{project_id}/quotas?type={type}
Table 4-115 describes the parameters.
Table 4-115 Parameter description
Name Mandatory Type Description
project_id Yes String Specifies the project ID. For details
about how to obtain a project ID,
see Obtaining a Project ID.
Elastic IP
API Reference 4 APIs
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 153

--- Page 160 ---
Name Mandatory Type Description
type No String ● Specifies the resource type.
● Values:
– vpc: VPC
– subnet: Subnet
– securityGroup: Security
group
– securityGroupRule: Security
group rule
– publicIp: EIP
– vpn: VPN
– vpngw: VPN gateway
– vpcPeer: VPC peering
connection
– loadbalancer: Load balancer
– listener: Load balancer
listener
– physicalConnect: Direct
Connect connection
– virtualInterface: Virtual
interface
– firewall: Firewall
– shareBandwidthIP: IP
address added to a shared
bandwidth
– shareBandwidth: Shared
bandwidth
– address_group: IP address
group
– flow_log: VPC flow log
– vpcContainRoutetable:
Number of route tables
associated with a VPC
– routetableContainRoutes:
Number of routes in a route
table
 
Request Parameters
None
Elastic IP
API Reference 4 APIs
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 154

--- Page 161 ---
Response Parameters
Table 4-116 Response parameter
Parameter Type Description
quotas quotas object Specifies the quota object. For details, see
Table 4-117.
 
Table 4-117 Description of the quotas field
Parameter Type Description
resources Array of resource
objects
Specifies the resource objects. For details,
see Table 4-118.
 
Elastic IP
API Reference 4 APIs
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 155

--- Page 162 ---
Table 4-118 Description of the resource field
Paramete
r
Type Description
type String ● Specifies the resource type.
● Values:
– vpc: VPC
– subnet: Subnet
– securityGroup: Security group
– securityGroupRule: Security group rule
– publicIp: EIP
– vpn: VPN
– vpngw: VPN gateway
– vpcPeer: VPC peering connection
– loadbalancer: Load balancer
– listener: Load balancer listener
– physicalConnect: Direct Connect connection
– virtualInterface: Virtual interface
– firewall: Firewall
– shareBandwidthIP: IP address added to a
shared bandwidth
– shareBandwidth: Shared bandwidth
– address_group: IP address group
– flow_log: VPC flow log
– vpcContainRoutetable: Number of route
tables associated with a VPC
– routetableContainRoutes: Number of routes
in a route table
used Integer ● Specifies the number of created network
resources.
● The value ranges from 0 to the value of quota.
quota Integer ● Specifies the maximum quota values for the
resources.
● The value ranges from the default quota value
to the maximum quota value.
min Integer Specifies the minimum quota value allowed.
 
NO TE
If value -1 is returned when you use an API to query your VPC quota, this indicates that the
VPC quota is not limited.
Elastic IP
API Reference 4 APIs
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 156

--- Page 163 ---
Example Response
{
    "quotas": {
        "resources": [
            {
                "type": "vpc",
                "used": 4,
                "quota": 150,
                "min": 0
            },
            {
                "type": "subnet",
                "used": 5,
                "quota": 400,
                "min": 0
            },
            {
                "type": "securityGroup",
                "used": 1,
                "quota": 100,
                "min": 0
            },
            {
                "type": "securityGroupRule",
                "used": 6,
                "quota": 5000,
                "min": 0
            },
            {
                "type": "publicIp",
                "used": 2,
                "quota": 10,
                "min": 0
            },
            {
                "type": "vpn",
                "used": 0,
                "quota": 5,
                "min": 0
            },
            {
                "type": "vpngw",
                "used": 0,
                "quota": 2,
                "min": 0
            },
            {
                "type": "vpcPeer",
                "used": 0,
                "quota": 50,
                "min": 0
            },
            {
                "type":"physicalConnect",
                "used":0,
                "quota":10,
                "min":0
            },
            {
                "type":"virtualInterface",
                "used":0,
                "quota":50,
                "min":0
            },
            {
                "type": "firewall",
                "used": 0,
                "quota": 200,
                "min": 0
Elastic IP
API Reference 4 APIs
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 157

--- Page 164 ---
            },
            {
                "type": "shareBandwidth",
                "used": 0,
                "quota": 5,
                "min": 0
            },
            {
                "type": "shareBandwidthIP",
                "used": 0,
                "quota": 20,
                "min": 0
            },
            {
                "type": "loadbalancer",
                "used": 0,
                "quota": 10,
                "min": 0
            },
            {
                "type": "listener",
                "used": 0,
                "quota": 10,
                "min": 0
            },
            {
                "type": "flow_log",
                "used": 0,
                "quota": 10,
                "min": 0
            },
            {
                "type": "vpcContainRoutetable",
                "used": 0,
                "quota": 1,
                "min": 0
            },
            {
                "type": "routetableContainRoutes",
                "used": 0,
                "quota": 200,
                "min": 0
            },
            { 
                 "type": "address_group", 
                 "used": 0, 
                 "quota": 50, 
                 "min": 0 
             }
        ]
    }
}
Status Code
See Status Codes.
Error Code
See Error Codes.
4.8 EIP Tag Management
Elastic IP
API Reference 4 APIs
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 158

--- Page 165 ---
4.8.1 Adding a Tag to an EIP
Function
This API is used to add a tag to an EIP.
URI
POST /v2.0/{project_id}/publicips/{publicip_id}/tags
Table 4-119 describes the parameters.
Table 4-119 Parameter description
Parameter Mandatory Description
project_id Yes Specifies the project ID.
For details about how to
obtain a project ID, see
Obtaining a Project ID.
publicip_id Yes Specifies the unique
identifier of an EIP.
 
Request Message
● Request parameter
Table 4-120 Request parameter
Parameter Type Mandatory Description
tag tag
object
Yes Specifies the tag objects. For
details, see Table 4-121.
 
Table 4-121 tag objects
Attribu
te
Type Manda
tory
Description
key String Yes ● Specifies the tag key.
● Cannot be left blank.
● Can contain a maximum of 36
characters.
● Can contain letters, digits, underscores
(_), and hyphens (-).
● The tag key of a VPC must be unique.
Elastic IP
API Reference 4 APIs
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 159

--- Page 166 ---
Attribu
te
Type Manda
tory
Description
value String Yes ● Specifies the tag value.
● Can contain a maximum of 43
characters.
● Can contain letters, digits, underscores
(_), periods (.), and hyphens (-).
 
● Example request
POST https://{Endpoint}/v2.0/{project_id}/publicips/{publicip_id}/tags
{
    "tag": {
        "key": "key1",
        "value": "value1"
    }
}
Response Message
● Response parameter
None
● Example response
None
Or
{
       "code":"xxx",
       "message":"xxxxx"
}
Status Code
See Status Codes.
Error Code
See Error Codes.
4.8.2 Querying EIP Tags
Function
This API is used to query tags of a specified EIP.
URI
GET /v2.0/{project_id}/publicips/{publicip_id}/tags
Table 4-122 describes the parameters.
Elastic IP
API Reference 4 APIs
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 160

--- Page 167 ---
Table 4-122 Parameter description
Parameter Mandatory Description
project_id Yes Specifies the project ID.
For details about how to
obtain a project ID, see
Obtaining a Project ID.
publicip_id Yes Specifies the unique
identifier of an EIP.
 
Request Message
● Request parameter
None
● Example request
GET https://{Endpoint}/v2.0/{project_id}/publicips/{publicip_id}/tags
Response Message
● Response parameter
Table 4-123 Response parameter
Parame
ter
Type Description
tags Array of tag
objects
Specifies the tag object list. For details, see
Table 4-124.
 
Table 4-124 tag objects
Attribut
e
Type Description
key String ● Specifies the tag key.
● Cannot be left blank.
● Can contain a maximum of 36 characters.
● Can contain letters, digits, underscores (_),
and hyphens (-).
● The tag key of a VPC must be unique.
value String ● Specifies the tag value.
● Can contain a maximum of 43 characters.
● Can contain letters, digits, underscores (_),
periods (.), and hyphens (-).
 
Elastic IP
API Reference 4 APIs
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 161

--- Page 168 ---
● Example response
{
    "tags": [
        {
            "key": "key1",
            "value": "value1"
        },
        {
            "key": "key2",
            "value": "value3"
        }
    ]
}
Status Code
See Status Codes.
Error Code
See Error Codes.
4.8.3 Deleting a Tag from an EIP
Function
This API is used to delete a tag from an EIP.
URI
DELETE /v2.0/{project_id}/publicips/{publicip_id}/tags/{key}
Table 4-125 describes the parameters.
Table 4-125 Parameter description
Parameter Mandatory Description
project_id Yes Specifies the project ID.
For details about how to
obtain a project ID, see
Obtaining a Project ID.
publicip_id Yes Specifies the unique
identifier of an EIP.
key Yes Specifies the tag key.
 
Request Message
● Request parameter
None
● Example request
DELETE https://{Endpoint}/v2.0/{project_id}/publicips/{publicip_id}/tags/{key}
Elastic IP
API Reference 4 APIs
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 162

--- Page 169 ---
Response Message
● Response parameter
None
● Example response
None
Or
{
       "code":"xxx",
       "message":"xxxxx"
}
Status Code
See Status Codes.
Error Code
See Error Codes.
4.8.4 Batch Adding or Deleting EIP Tags
Function
This API is used to add multiple tags to or delete multiple tags from an EIP at a
time.
This API is idempotent.
If there are duplicate keys in the request body when you add tags, an error is
reported.
During tag creation, duplicate keys are not allowed. If a key already exists in the
database, its value will be overwritten by the new duplicate key.
During tag deletion, if some tags do not exist, the operation is considered to be
successful by default. The character set of the tags will not be checked. When you
delete tags, the tag structure cannot be missing, and the key cannot be left blank
or be an empty string.
URI
POST /v2.0/{project_id}/publicips/{publicip_id}/tags/action
Table 4-126 describes the parameters.
Table 4-126 Parameter description
Parameter Mandatory Description
project_id Yes Specifies the project ID.
For details about how to
obtain a project ID, see
Obtaining a Project ID.
Elastic IP
API Reference 4 APIs
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 163

--- Page 170 ---
Parameter Mandatory Description
publicip_id Yes Specifies the unique
identifier of an EIP.
 
Request Message
● Request parameter
Table 4-127 Request parameter
Parame
ter
Type M
a
n
d
at
or
y
Description
tags Array of
tag objects
Ye
s
Specifies the tag object list. For details, see
Table 4-128.
action String Ye
s
Specifies the operation. Possible values are as
follows:
● create
● delete
 
Table 4-128 tag objects
Attribu
te
Type Manda
tory
Description
key String Yes ● Specifies the tag key.
● Cannot be left blank.
● Can contain a maximum of 36
characters.
● Can contain letters, digits, underscores
(_), and hyphens (-).
● The tag key of a VPC must be unique.
value String Yes ● Specifies the tag value.
● Can contain a maximum of 43
characters.
● Can contain letters, digits, underscores
(_), periods (.), and hyphens (-).
 
● Request example 1: Creating tags in batches
Elastic IP
API Reference 4 APIs
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 164

--- Page 171 ---
POST https://{Endpoint}/v2.0/{project_id}/publicips/{publicip_id}/tags/action
{
    "action": "create",
    "tags": [
        {
            "key": "key1",
            "value": "value1"
        },
        {
            "key": "key2",
            "value": "value3"
        }
    ]
}
● Request example 2: Deleting tags in batches
POST https://{Endpoint}/v2.0/{project_id}/publicips/{publicip_id}/tags/action
{
    "action": "delete",
    "tags": [
        {
            "key": "key1",
            "value": "value1"
        },
        {
            "key": "key2",
            "value": "value3"
        }
    ]
}
Response Message
● Response parameter
None
● Example response
None
Or
{
       "code":"xxx",
       "message":"xxxxx"
}
Status Code
See Status Codes.
Error Code
See Error Codes.
4.8.5 Querying EIPs by Tag
Function
This API is used to query EIPs by tag.
Elastic IP
API Reference 4 APIs
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 165

--- Page 172 ---
URI
POST /v2.0/{project_id}/publicips/resource_instances/action
Table 4-129 describes the parameters.
Table 4-129 Parameter description
Parameter Mandatory Description
project_id Yes Specifies the project ID.
For details about how to
obtain a project ID, see
Obtaining a Project ID.
 
Request Message
● Request parameter
Table 4-130 Request parameter
Parame
ter
Type Mand
atory
Description
tags Array of
tags
objects
No Specifies the included tags. A maximum of
10 tag keys are allowed for each query
operation. Each tag key can have up to 10
tag values. The structure body must be
included. The tag key cannot be left blank
or set to an empty string. Each tag key
must be unique, and each tag value in a
tag must be unique.
limit Integer No Sets the page size. This parameter is not
available when action is set to count. The
default value is 1000 when action is set
to filter. The maximum value is 1000, and
the minimum value is 1. The value cannot
be a negative number.
offset Integer No Specifies the index position. The query
starts from the next piece of data indexed
by this parameter. This parameter is not
required when you query data on the first
page. The value in the response returned
for querying data on the previous page
will be included in this parameter for
querying data on subsequent pages. This
parameter is not available when action is
set to count. If action is set to filter, the
value must be a number, and the default
value is 0. The value cannot be a negative
number.
Elastic IP
API Reference 4 APIs
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 166

--- Page 173 ---
Parame
ter
Type Mand
atory
Description
action String Yes Specifies the operation to perform. The
value can only be filter (filtering) or
count (querying the total number).
The value filter indicates pagination
query. The value count indicates that the
total number of query results meeting the
search criteria will be returned.
matches Array of
match
objects
No Specifies the search criteria. The tag key is
the field to match. Currently, only
resource_name is supported. The tag
value indicates the matched value. This
field is a fixed dictionary value.
 
Table 4-131 Description of the tags field
Parameter Mandat
ory
Type Description
key Yes String Specifies the tag key. The
value can contain a
maximum of 127 Unicode
characters. The tag key
cannot be left blank. (This
parameter is not verified
during the search process.)
values Yes Array of
strings
Specifies the tag value list.
Each value can contain a
maximum of 255 Unicode
characters. An empty list for
values indicates any value.
The values are in the OR
relationship.
 
Table 4-132 Description of the match field
Parameter Manda
tory
Type Description
key Yes String Specifies the tag key.
Currently, the tag key can
only be the resource name.
Elastic IP
API Reference 4 APIs
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 167

--- Page 174 ---
Parameter Manda
tory
Type Description
value Yes String Specifies the tag value. Each
value can contain a
maximum of 255 Unicode
characters.
 
● Example request 1: Setting action to filter
POST https://{Endpoint}/v2.0/{project_id}/publicips/resource_instances/action
{
    "offset": "0",
    "limit": "100",
    "action": "filter",
    "matches": [
        {
            "key": "resource_name",
            "value": "resource1"
        }
    ],
    "tags": [
        {
            "key": "key1",
            "values": [
                "value1",
                "value2"
            ]
        }
    ]
}
● Example request 2: Setting action to count
{
    "action": "count",
    "tags": [
        {
            "key": "key1",
            "values": [
                "value1",
                "value2"
            ]
        },
        {
            "key": "key2",
            "values": [
                "value1",
                "value2"
            ]
        }
    ],
    "matches": [
        {
            "key": "resource_name",
            "value": "resource1"
        }
    ]
}
Response Message
● Response parameter
Elastic IP
API Reference 4 APIs
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 168

--- Page 175 ---
Table 4-133 Response parameter
Parameter Type Description
resources Array of resource objects Specifies the resource
object list. For details,
see Table 4-134.
total_count Integer Specifies the total
number of query
records.
 
Table 4-134 resource objects
Parameter Type Description
resource_id String Specifies the resource ID.
resource_detail Object Specifies the resource
details. Resource details
are used for extension.
This parameter is left
blank by default.
tags Array of tags objects Specifies the tag list.
This parameter is an
empty array by default if
there is no tag. For
details, see Table 4-135.
resource_name String Specifies the resource
name. This parameter is
an empty string by
default if there is no
resource name.
 
Table 4-135 Description of the tags field
Parameter Mandat
ory
Type Description
key Yes String Specifies the tag key. The
value can contain a
maximum of 127 Unicode
characters. The tag key
cannot be left blank. (This
parameter is not verified
during the search process.)
Elastic IP
API Reference 4 APIs
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 169

--- Page 176 ---
Parameter Mandat
ory
Type Description
value Yes String Specifies the tag value list.
Each value can contain a
maximum of 255 Unicode
characters. An empty list for
values indicates any value.
The values are in the OR
relationship.
 
● Example response 1: Setting action to filter
{ 
      "resources": [
         {
            "resource_detail": null, 
            "resource_id": "cdfs_cefs_wesas_12_dsad", 
            "resource_name": "resouece1", 
            "tags": [
                {
                   "key": "key1",
                   "value": "value1"
                },
                {
                   "key": "key2",
                   "value": "value1"
                }
             ]
         }
       ], 
      "total_count": 1000
}
● Example response 2: Setting action to count
{
       "total_count": 1000
}
Status Code
See Status Codes.
Error Code
See Error Codes.
4.8.6 Querying EIP Tags in a Specified Project
Function
This API is used to query all EIP tags of a tenant in a specified region.
URI
GET /v2.0/{project_id}/publicips/tags
Table 4-136 describes the parameters.
Elastic IP
API Reference 4 APIs
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 170

--- Page 177 ---
Table 4-136 Parameter description
Parameter Mandatory Description
project_id Yes Specifies the project ID.
For details about how to
obtain a project ID, see
Obtaining a Project ID.
 
Request Message
● Request parameter
None
● Example request
GET /v2.0/{project_id}/publicips/tags
Response Message
● Response parameter
Table 4-137 Response parameter
Parameter Type Description
tags Array of
tag
objects
Specifies the tag object list. For details, see
Table 4-138.
 
Table 4-138 Description of the tag field
Parameter Type Description
key String Specifies the tag key.
● Cannot be left blank.
● Contain up to 128 characters (36
characters on the console).
● Can contain letters, digits,
underscores (_), and hyphens (-).
values Array of strings Specifies the tag value list.
● Contain up to 255 characters (43
characters on the console).
● Can contain letters, digits,
underscores (_), periods (.), and
hyphens (-).
 
● Example response
{
    "tags": [
Elastic IP
API Reference 4 APIs
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 171

--- Page 178 ---
        {
            "key": "key1",
            "values": [
                "value1",
                "value2"
            ]
        },
        {
            "key": "key2",
            "values": [
                "value1",
                "value2"
            ]
        }
    ]
}
Status Code
See Status Codes.
Error Code
See Error Codes.
4.9 Auxiliary APIs for EIPs
4.9.1 Querying the Number of EIPs
Function
This API is used to query the number of EIPs.
URI
GET /v2/{project_id}/publicip/instances
Table 4-139 Path parameter
Parameter Mandatory Type Description
project_id Yes String Project ID
 
Request Parameters
None
Response Parameters
None
Elastic IP
API Reference 4 APIs
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 172

--- Page 179 ---
Example Request
None
Example Response
Status code: 200
Normal response to GET and PUT operations
{
  "instance_num" : 3
}
Status Code
See Status Codes.
Error Code
See Error Codes.
4.9.2 Querying EIP Type
Function
This API is used to query the type of an EIP.
URI
GET /v2/{project_id}/publicip_types
Table 4-140 Path parameter
Parameter Mandatory Type Description
project_id Yes String Project ID
 
Request Parameters
None
Response Parameters
None
Example Request
None
Example Response
Status code: 200
Elastic IP
API Reference 4 APIs
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 173

--- Page 180 ---
Normal response to GET and PUT operations
{
  "publicip_types" : [ {
    "id" : "143fe300-78bc-4e2b-ae4b-d7a2ae7f2197",
    "type" : "5_bgp"
  }, {
    "id" : "71d56cb8-e86e-403b-8ace-8551ff075986",
    "type" : "5_test"
  }, {
    "id" : "985579ea-be40-409e-82b0-68d8acc10865",
    "type" : "5_union"
  }, {
    "id" : "caaef6af-6662-45b0-bd55-519673265a42",
    "type" : "5_telcom"
  } ]
}
Status Code
See Status Codes.
Error Code
See Error Codes.
4.9.3 Querying the Number of EIPs
Function
This API is used to query the number of EIPs.
URI
GET /v2/{project_id}/elasticips
Table 4-141 Path parameter
Parameter Mandatory Type Description
project_id Yes String Project ID
 
Request Parameters
None
Response Parameters
Status code: 200
Elastic IP
API Reference 4 APIs
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 174

--- Page 181 ---
Table 4-142 Response body parameters
Parameter Type Description
elasticip_size Integer Number of EIPs
 
Example Request
None
Example Response
Status code: 200
Normal
{
  "elasticip_size" : 11
}
Status Code
See Status Codes.
Error Code
See Error Codes.
Elastic IP
API Reference 4 APIs
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 175

--- Page 182 ---
5 API V3
5.1 EIPs
5.1.1 Adding EIPs to a Shared Bandwidth in Batches
Function
This API is used to add multiple EIPs to a shared bandwidth.
URI
POST /v3/{project_id}/eip/publicips/attach-share-bandwidth
Table 5-1 Path parameters
Parameter Mandatory Type Description
project_id Yes String Project ID.
Minimum length: 32
Maximum length: 32
 
Elastic IP
API Reference 5 API V3
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 176

--- Page 183 ---
Request Parameters
Table 5-2 Request body parameters
Parameter Mandatory Type Description
publicips Yes Array of
BatchAttachS
harebwDict
objects
● EIPs in a shared bandwidth.
● If multiple EIPs are added
to a shared bandwidth, the
value of bandwidth_id of
these EIPs must be the
same.
Array length: 1 to 50
 
Table 5-3 BatchAttachSharebwDict
Parameter Mandatory Type Description
bandwidth_id Yes String ● Shared bandwidth ID.
Minimum length: 36
Maximum length: 36
publicip_id Yes String ● EIP ID.
Minimum length: 36
Maximum length: 36
 
Response Parameters
Status code: 200
Table 5-4 Response body parameters
Parameter Type Description
publicips Array of
BatchPublicipRes
p objects
EIPs.
request_id String Request ID.
 
Table 5-5 BatchPublicipResp
Parameter Type Description
statusCode Integer Status code
Elastic IP
API Reference 5 API V3
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 177

--- Page 184 ---
Parameter Type Description
publicip PublicipResp
object
EIP.
 
Table 5-6 PublicipResp
Parameter Type Description
id String ● EIP ID, which uniquely identifies the
EIP.
project_id String ● Project ID.
ip_version Integer ● EIP version.
● The value can be 4 or 6. 6 indicates
that the NAT64 capability is
enabled.
– 4: IPv4 EIP
– 6: IPv6 EIP
public_ip_address String ● IPv4 EIP.
public_ipv6_addre
ss
String ● IPv6 EIP.
status String ● EIP status.
● The value can be FREEZED, DOWN,
ACTIVE, or ERROR.
– FREEZED: The EIP is frozen.
– DOWN: The EIP is not bound to
any instance.
– ACTIVE: The EIP is bound to an
instance and is in use.
– ERROR: The EIP status is
abnormal.
description String ● Supplementary information about
the EIP.
● You can customize this value to
identify your EIP, which is not
perceived by the system.
created_at String ● Time when an EIP is assigned.
● The value is in UTC format, for
example, 2018-12-25T10:07:24Z.
updated_at String ● Time when an EIP is updated.
● The value is in UTC format, for
example, 2018-12-25T10:09:20Z.
Elastic IP
API Reference 5 API V3
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 178

--- Page 185 ---
Parameter Type Description
type String ● EIP type.
● The value can be EIP or
DUALSTACK.
vnic VnicResp object ● Port information of the instance
with an EIP bound.
● If the instance has no port, the
value is null.
bandwidth BandwidthResp
object
● Bandwidth of the EIP.
enterprise_project
_id
String ● Enterprise project ID of the EIP.
billing_info String ● Order information of an EIP.
● The value is available only for
yearly/monthly resources. This value
is left blank for pay-per-use
resources.
lock_status String ● Frozen status of an EIP.
● The metadata type indicates that
the EIP is frozen due to arrears or
security reasons.
associate_instance
_type
String ● Type of the instance with an EIP
bound.
● The value can be:
– PORT (Instance type, including
ECS, BMS, and CCE)
– NATGW (NAT gateway type)
– ELB (Load balancer type)
– VPN (VPN instance type)
associate_instance
_id
String ● ID of the instance with an EIP
bound.
publicip_pool_id String ● ID of the network that an EIP
belongs to. It is the network ID
corresponding to
publicip_pool_name.
publicip_pool_na
me
String ● Network type of an EIP,
including public EIP pool (for example,
5_bgp or 5_sbgp) and dedicated EIP
pool. For details about the dedicated
EIP pool, see the APIs about
publcip_pool.
Elastic IP
API Reference 5 API V3
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 179

--- Page 186 ---
Parameter Type Description
alias String ● EIP alias.
public_border_gro
up
String ● Whether it is a central or an edge
EIP. The value is CENTER for a
central EIP and an edge AZ name
for an edge EIP.
 
Table 5-7 VnicResp
Parameter Type Description
private_ip_address String ● Private IP address of a port.
device_id String ● ID of the device that the port
belongs to. The device ID indicates
the ID of the cloud service resource
that uses the private IP address in
the subnet, for example, the cloud
server ID or load balancer ID.
● If there is a port, the value of this
parameter is the same as that of
associate_instance_id.
device_owner String ● Device that the port belongs to,
that is, a cloud service resource that
uses a private IP address in the
subnet.
● If there is a port, this parameter
and associate_instance_type can
be used to identify the instance
type.
vtep String ● VTEP IP address.
vni String ● VXLAN ID.
vpc_id String ● ID of the VPC that the port belongs
to.
port_id String ● Port ID, which uniquely identifies a
port.
port_profile String ● Port profile.
mac String ● MAC address of a port.
Elastic IP
API Reference 5 API V3
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 180

--- Page 187 ---
Parameter Type Description
instance_id String ● User of a port, which is different
from the owner of device_id. For
example, the device_owner of a
virtual IP address port is a virtual IP
address, but the actual user of the
port may be a VM or others.
instance_type String ● Instance type. This parameter is
used together with instance_id.
port_vif_details String ● Details about the NIC virtual
interface.
 
Table 5-8 BandwidthResp
Parameter Type Description
id String ● Bandwidth ID.
size Integer ● Bandwidth size.
share_type String ● Bandwidth type.
WHOLE indicates a shared bandwidth,
and PER indicates a dedicated
bandwidth.
charge_mode String ● Bandwidth billing mode.
name String ● Bandwidth name.
billing_info String ● Bandwidth order information.
 
Example Request
If multiple EIPs are added to the same shared bandwidth, the bandwidth ID of
these EIPs must be the same.
POST /v3/{project_id}/eip/publicips/attach-share-bandwidth
{
  "publicips" : [ {
    "bandwidth_id" : "e6af636c-ea79-4c20-ba2f-402057ba7886",
    "publicip_id" : "99c8a2df-9e90-48df-9132-e2216e659459"
  }, {
    "bandwidth_id" : "e6af636c-ea79-4c20-ba2f-402057ba7886",
    "publicip_id" : "7b484d78-550a-4e92-8363-a34b5194ddcb"
  } ]
}
Example Response
Status code: 200
Elastic IP
API Reference 5 API V3
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 181

--- Page 188 ---
Normal response to POST requests
{
  "publicips" : [ {
    "statusCode" : 200,
    "publicip" : {
      "alias" : "test",
      "associate_instance_id" : null,
      "associate_instance_type" : null,
      "bandwidth" : {
        "id" : "e6af636c-ea79-4c20-ba2f-402057ba7886",
        "size" : 5,
        "share_type" : "WHOLE",
        "charge_mode" : "traffic",
        "name" : "bandwidth-b8ff",
        "billing_info" : ""
      },
      "billing_info" : null,
      "created_at" : "2020-07-10T10:10:18Z",
      "description" : "",
      "enterprise_project_id" : "0",
      "id" : "99c8a2df-9e90-48df-9132-e2216e659459",
      "ip_version" : 4,
      "lock_status" : null,
      "project_id" : "8d53f081ea24444aa95e2bfa942ef6ee",
      "public_border_group" : "center",
      "public_ip_address" : "10.246.165.44",
      "public_ipv6_address" : null,
      "publicip_pool_id" : "ece62314-858c-4793-a768-346efca42131",
      "publicip_pool_name" : "5_bgp",
      "status" : "ACTIVE",
      "type" : "EIP",
      "updated_at" : "2020-07-11T05:03:25Z",
      "vnic" : {
        "device_id" : "cc03e7f7-b820-4a2e-b243-8022daabf0cf",
        "device_owner" : "compute:br-iaas-odin1a",
        "instance_id" : "",
        "instance_type" : "",
        "mac" : "fa:16:3e:7a:5f:db",
        "port_id" : "fb68a8e1-b93e-4100-8735-6d6b0a6a0eb5",
        "port_profile" : "",
        "private_ip_address" : "192.168.3.222",
        "vni" : "435405",
        "vpc_id" : "ac17491b-0769-4d96-b883-6d6295f6afad",
        "vtep" : "18.8.152.158",
        "port_vif_details" : "{\"primary_interface\": true}"
      }
    }
  }, {
    "statusCode" : 200,
    "publicip" : {
      "alias" : "test",
      "associate_instance_id" : null,
      "associate_instance_type" : null,
      "bandwidth" : {
        "id" : "e6af636c-ea79-4c20-ba2f-402057ba7886",
        "size" : 5,
        "share_type" : "WHOLE",
        "charge_mode" : "traffic",
        "name" : "bandwidth-b8ff",
        "billing_info" : ""
      },
      "billing_info" : null,
      "created_at" : "2020-07-10T10:10:18Z",
      "description" : "",
      "enterprise_project_id" : "0",
      "id" : "7b484d78-550a-4e92-8363-a34b5194ddcb",
      "ip_version" : 4,
      "lock_status" : null,
      "project_id" : "8d53f081ea24444aa95e2bfa942ef6ee",
Elastic IP
API Reference 5 API V3
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 182

--- Page 189 ---
      "public_border_group" : "center",
      "public_ip_address" : "10.246.165.45",
      "public_ipv6_address" : null,
      "publicip_pool_id" : "ece62314-858c-4793-a768-346efca42131",
      "publicip_pool_name" : "5_bgp",
      "status" : "ACTIVE",
      "type" : "EIP",
      "updated_at" : "2020-07-11T05:03:25Z",
      "vnic" : {
        "device_id" : "cc03e7f7-b820-4a2e-b243-8022daabf0dd",
        "device_owner" : "compute:br-iaas-odin1a",
        "instance_id" : "",
        "instance_type" : "",
        "mac" : "fa:16:3e:7a:5f:cc",
        "port_id" : "fb68a8e1-b93e-4100-8735-6d6b0a6a0eb6",
        "port_profile" : "",
        "private_ip_address" : "192.168.3.221",
        "vni" : "435405",
        "vpc_id" : "ac17491b-0769-4d96-b883-6d6295f6afad",
        "vtep" : "18.8.152.158",
        "port_vif_details" : "{\"primary_interface\": true}"
      }
    }
  } ],
  "request_id" : "db4b975a79d1da86dda3d02054f11e16"
}
SDK Sample Code
The sample code is as follows:
Java
If multiple EIPs are added to the same shared bandwidth, the bandwidth ID of
these EIPs must be the same.
package com.huaweicloud.sdk.test;
import com.huaweicloud.sdk.core.auth.ICredential;
import com.huaweicloud.sdk.core.auth.BasicCredentials;
import com.huaweicloud.sdk.core.exception.ConnectionException;
import com.huaweicloud.sdk.core.exception.RequestTimeoutException;
import com.huaweicloud.sdk.core.exception.ServiceResponseException;
import com.huaweicloud.sdk.eip.v3.region.EipRegion;
import com.huaweicloud.sdk.eip.v3.*;
import com.huaweicloud.sdk.eip.v3.model.*;
import java.util.List;
import java.util.ArrayList;
public class AttachBatchPublicIpSolution {
    public static void main(String[] args) {
        // The AK and SK used for authentication are hard-coded or stored in plaintext, which has great 
security risks. It is recommended that the AK and SK be stored in ciphertext in configuration files or 
environment variables and decrypted during use to ensure security.
        // In this example, AK and SK are stored in environment variables for authentication. Before running 
this example, set environment variables CLOUD_SDK_AK and CLOUD_SDK_SK in the local environment
        String ak = System.getenv("CLOUD_SDK_AK");
        String sk = System.getenv("CLOUD_SDK_SK");
        String projectId = "{project_id}";
        ICredential auth = new BasicCredentials()
                .withProjectId(projectId)
                .withAk(ak)
                .withSk(sk);
Elastic IP
API Reference 5 API V3
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 183

--- Page 190 ---
        EipClient client = EipClient.newBuilder()
                .withCredential(auth)
                .withRegion(EipRegion.valueOf("<YOUR REGION>"))
                .build();
        AttachBatchPublicIpRequest request = new AttachBatchPublicIpRequest();
        BatchAttachSharebwReq body = new BatchAttachSharebwReq();
        List<BatchAttachSharebwDict> listbodyPublicips = new ArrayList<>();
        listbodyPublicips.add(
            new BatchAttachSharebwDict()
                .withBandwidthId("e6af636c-ea79-4c20-ba2f-402057ba7886")
                .withPublicipId("99c8a2df-9e90-48df-9132-e2216e659459")
        );
        listbodyPublicips.add(
            new BatchAttachSharebwDict()
                .withBandwidthId("e6af636c-ea79-4c20-ba2f-402057ba7886")
                .withPublicipId("7b484d78-550a-4e92-8363-a34b5194ddcb")
        );
        body.withPublicips(listbodyPublicips);
        request.withBody(body);
        try {
            AttachBatchPublicIpResponse response = client.attachBatchPublicIp(request);
            System.out.println(response.toString());
        } catch (ConnectionException e) {
            e.printStackTrace();
        } catch (RequestTimeoutException e) {
            e.printStackTrace();
        } catch (ServiceResponseException e) {
            e.printStackTrace();
            System.out.println(e.getHttpStatusCode());
            System.out.println(e.getRequestId());
            System.out.println(e.getErrorCode());
            System.out.println(e.getErrorMsg());
        }
    }
}
Python
If multiple EIPs are added to the same shared bandwidth, the bandwidth ID of
these EIPs must be the same.
# coding: utf-8
import os
from huaweicloudsdkcore.auth.credentials import BasicCredentials
from huaweicloudsdkeip.v3.region.eip_region import EipRegion
from huaweicloudsdkcore.exceptions import exceptions
from huaweicloudsdkeip.v3 import *
if __name__ == "__main__":
    # The AK and SK used for authentication are hard-coded or stored in plaintext, which has great security 
risks. It is recommended that the AK and SK be stored in ciphertext in configuration files or environment 
variables and decrypted during use to ensure security.
    # In this example, AK and SK are stored in environment variables for authentication. Before running this 
example, set environment variables CLOUD_SDK_AK and CLOUD_SDK_SK in the local environment
    ak = os.environ["CLOUD_SDK_AK"]
    sk = os.environ["CLOUD_SDK_SK"]
    projectId = "{project_id}"
    credentials = BasicCredentials(ak, sk, projectId)
    client = EipClient.new_builder() \
        .with_credentials(credentials) \
        .with_region(EipRegion.value_of("<YOUR REGION>")) \
        .build()
    try:
        request = AttachBatchPublicIpRequest()
        listPublicipsbody = [
Elastic IP
API Reference 5 API V3
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 184

--- Page 191 ---
            BatchAttachSharebwDict(
                bandwidth_id="e6af636c-ea79-4c20-ba2f-402057ba7886",
                publicip_id="99c8a2df-9e90-48df-9132-e2216e659459"
            ),
            BatchAttachSharebwDict(
                bandwidth_id="e6af636c-ea79-4c20-ba2f-402057ba7886",
                publicip_id="7b484d78-550a-4e92-8363-a34b5194ddcb"
            )
        ]
        request.body = BatchAttachSharebwReq(
            publicips=listPublicipsbody
        )
        response = client.attach_batch_public_ip(request)
        print(response)
    except exceptions.ClientRequestException as e:
        print(e.status_code)
        print(e.request_id)
        print(e.error_code)
        print(e.error_msg)
Go
If multiple EIPs are added to the same shared bandwidth, the bandwidth ID of
these EIPs must be the same.
package main
import (
    "fmt"
    "github.com/huaweicloud/huaweicloud-sdk-go-v3/core/auth/basic"
    eip "github.com/huaweicloud/huaweicloud-sdk-go-v3/services/eip/v3"
    "github.com/huaweicloud/huaweicloud-sdk-go-v3/services/eip/v3/model"
    region "github.com/huaweicloud/huaweicloud-sdk-go-v3/services/eip/v3/region"
)
func main() {
    // The AK and SK used for authentication are hard-coded or stored in plaintext, which has great security 
risks. It is recommended that the AK and SK be stored in ciphertext in configuration files or environment 
variables and decrypted during use to ensure security.
    // In this example, AK and SK are stored in environment variables for authentication. Before running this 
example, set environment variables CLOUD_SDK_AK and CLOUD_SDK_SK in the local environment
    ak := os.Getenv("CLOUD_SDK_AK")
    sk := os.Getenv("CLOUD_SDK_SK")
    projectId := "{project_id}"
    auth := basic.NewCredentialsBuilder().
        WithAk(ak).
        WithSk(sk).
        WithProjectId(projectId).
        Build()
    client := eip.NewEipClient(
        eip.EipClientBuilder().
            WithRegion(region.ValueOf("<YOUR REGION>")).
            WithCredential(auth).
            Build())
    request := &model.AttachBatchPublicIpRequest{}
    bandwidthIdPublicips:= "e6af636c-ea79-4c20-ba2f-402057ba7886"
    publicipIdPublicips:= "99c8a2df-9e90-48df-9132-e2216e659459"
    bandwidthIdPublicips1:= "e6af636c-ea79-4c20-ba2f-402057ba7886"
    publicipIdPublicips1:= "7b484d78-550a-4e92-8363-a34b5194ddcb"
    var listPublicipsbody = []model.BatchAttachSharebwDict{
        {
            BandwidthId: &bandwidthIdPublicips,
            PublicipId: &publicipIdPublicips,
        },
        {
            BandwidthId: &bandwidthIdPublicips1,
Elastic IP
API Reference 5 API V3
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 185

--- Page 192 ---
            PublicipId: &publicipIdPublicips1,
        },
    }
    request.Body = &model.BatchAttachSharebwReq{
        Publicips: &listPublicipsbody,
    }
    response, err := client.AttachBatchPublicIp(request)
    if err == nil {
        fmt.Printf("%+v\n", response)
    } else {
        fmt.Println(err)
    }
}
More SDK Sample Code
For more SDK sample codes of programming languages, visit API Explorer and
click the Sample Code tab. Example codes can be automatically generated.
Status Codes
Status
Code
Description
200 Normal response to POST requests
 
Error Codes
See Error Codes.
5.1.2 Querying All EIPs
Function
This API is used to query all EIPs.
URI
GET /v3/{project_id}/eip/publicips
Table 5-9 Path parameter
Parameter Mandatory Type Description
project_id Yes String ● Project ID.
Minimum length: 0
Maximum length: 32
 
Elastic IP
API Reference 5 API V3
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 186

--- Page 193 ---
Table 5-10 Query parameters
Parameter Mandatory Type Description
marker No String ● Start resource ID of
pagination query. If the
parameter is left blank,
only resources on the first
page are queried.
Minimum length: 0
Maximum length: 36
offset No Integer ● Start resource number of
pagination query.
Minimum value: 0
Maximum value: 99999
limit No Integer ● Number of records
returned on each page.
● The value ranges from 0 to
2,000. The maximum value
varies by region.
Minimum value: 0
Maximum value: 2000
fields No Array ● Field. Format:
"fields=id&fields=owner&..."
● Supported fields: id,
project_id, ip_version,
type, public_ip_address,
public_ipv6_address,
network_type, status,
description, created_at,
updated_at, vnic,
bandwidth,
associate_instance_type,
associate_instance_id,
lock_status, billing_info,
tags,
enterprise_project_id,
allow_share_bandwidth_t
ypes,
public_border_group,
alias, publicip_pool_name,
and publicip_pool_id.
Elastic IP
API Reference 5 API V3
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 187

--- Page 194 ---
Parameter Mandatory Type Description
sort_key No String ● Sort. Format: "sort_key=id"
● Supported fields: id,
public_ip_address,
public_ipv6_address,
ip_version, created_at,
updated_at, and
public_border_group.
Enumerated values:
● id
● public_ip_address
● public_ipv6_address
● ip_version
● created_at
● updated_at
● public_border_group
sort_dir No String ● Sorting direction.
● The value can be asc or
desc
Enumerated values:
● asc
● desc
id No Array ● Filter by id.
ip_version No Array ● Filter by ip_version.
● The value can be 4 (IPv4)
or 6 (IPv6).
Enumerated values:
● 4
● 6
public_ip_add
ress
No Array ● Filter by public_ip_address.
public_ip_add
ress_like
No String ● Filter by public_ip_address
in a fuzzy search.
Minimum length: 0
Maximum length: 64
public_ipv6_a
ddress
No Array ● Filter by
public_ipv6_address.
Elastic IP
API Reference 5 API V3
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 188

--- Page 195 ---
Parameter Mandatory Type Description
public_ipv6_a
ddress_like
No String ● Filter by
public_ipv6_address in a
fuzzy search.
Minimum length: 0
Maximum length: 64
type No Array ● Filter by type.
● The value can be:
– EIP: EIP
– DUALSTACK: Dual-stack
IPv6
Enumerated values:
● EIP
● DUALSTACK
network_type No Array ● Filter by network_type.
● The value can be 5_telcom,
5_union, 5_bgp, 5_sbgp,
5_ipv6, or 5_graybgp.
Enumerated values:
● 5_telcom
● 5_union
● 5_bgp
● 5_sbgp
● 5_ipv6
● 5_graybgp
publicip_pool_
name
No Array ● Filter by
publicip_pool_name.
● The value can be 5_telcom,
5_union, 5_bgp, 5_sbgp,
5_ipv6, 5_graybgp, or a
dedicated pool name.
status No Array ● Filter by status.
● The value can be FREEZED,
DOWN, ACTIVE, or
ERROR.
Enumerated values:
● FREEZED
● DOWN
● ACTIVE
● ERROR
Elastic IP
API Reference 5 API V3
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 189

--- Page 196 ---
Parameter Mandatory Type Description
alias_like No String ● Filter by alias in a fuzzy
search.
Minimum length: 0
Maximum length: 64
alias No Array ● Filter by alias.
description No Array ● Filter by description.
vnic.private_ip
_address
No Array ● Filter by
private_ip_address.
vnic.private_ip
_address_like
No String ● Filter by
private_ip_address in a
fuzzy search.
Minimum length: 0
Maximum length: 64
vnic.device_id No Array ● Filter by device_id.
vnic.device_o
wner
No Array ● Filter by device_owner.
vnic.vpc_id No Array ● Filter by vpc_id.
vnic.port_id No Array ● Filter by port_id.
vnic.device_o
wner_prefixlik
e
No String ● Filter by
device_owner_prefixlike in
a fuzzy search.
Minimum length: 0
Maximum length: 64
vnic.instance_
type
No Array ● Filter by instance_type.
vnic.instance_i
d
No Array ● Filter by instance_id.
bandwidth.id No Array ● Filter by the bandwidth ID.
bandwidth.na
me
No Array ● Filter by name.
bandwidth.na
me_like
No Array ● Filter by name in a fuzzy
search.
bandwidth.siz
e
No Array ● Filter by size.
Elastic IP
API Reference 5 API V3
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 190

--- Page 197 ---
Parameter Mandatory Type Description
bandwidth.sh
are_type
No Array ● Filter by share_type.
Enumerated values:
● PER
● WHOLE
bandwidth.ch
arge_mode
No Array ● Filter by charge_mode.
Enumerated values:
● bandwidth
● traffic
● 95peak_plus
billing_info No Array ● Filter by billing_info.
billing_mode No String ● Filter by billing_mode.
● The value can be
YEARLY_MONTHLY or
PAY_PER_USE.
Enumerated values:
● YEARLY_MONTHLY
● PAY_PER_USE
associate_inst
ance_type
No Array ● Filter by
associate_instance_type.
● The value can be PORT,
NATGW, ELB, VPN, or
ELBV1.
Enumerated values:
● PORT
● NATGW
● ELB
● VPN
● ELBV1
associate_inst
ance_id
No Array ● Filter by
associate_instance_id.
enterprise_pro
ject_id
No Array ● Filter by
enterprise_project_id.
public_border
_group
No Array ● Filter by
public_border_group.
Elastic IP
API Reference 5 API V3
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 191

--- Page 198 ---
Parameter Mandatory Type Description
allow_share_b
andwidth_typ
e_any
No Array ● Shared bandwidth type.
EIPs can be filtered by
shared bandwidth type. You
can specify multiple shared
bandwidth types, which are
separated by commas (,).
 
Request Parameter
None
Response Parameters
Status code: 200
Table 5-11 Response body parameters
Parameter Type Description
request_id String Request ID.
Minimum length: 0
Maximum length: 36
publicips Array of
PublicipSingl
eShowResp
objects
EIP object.
page_info PageInfoOpti
on object
Pagination page number information.
total_count Integer Total number of EIPs.
Minimum value: 0
Maximum value: 999999
 
Table 5-12 PublicipSingleShowResp
Parameter Type Description
id String ● Unique ID of the EIP.
Minimum length: 0
Maximum length: 36
project_id String ● Project ID.
Minimum length: 0
Maximum length: 32
Elastic IP
API Reference 5 API V3
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 192

--- Page 199 ---
Parameter Type Description
ip_version Integer ● IP address version.
● The value can be:
– 4: IPv4 EIP
– 6: IPv6 EIP
Enumerated values:
● 4
● 6
public_ip_add
ress
String ● EIP or IPv6 port address.
Minimum length: 0
Maximum length: 36
public_ipv6_a
ddress
String ● Obtained EIP if IPv6 EIPs are available. This
parameter does not exist if only IPv4 EIPs
are available.
Minimum length: 0
Maximum length: 64
network_type String ● Network type of an EIP. This parameter is
discarded and is not displayed by default. It
is inherited by publicip_pool_name.
Minimum length: 0
Maximum length: 64
Elastic IP
API Reference 5 API V3
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 193

--- Page 200 ---
Parameter Type Description
status String ● EIP status.
● The value can be:
– FREEZED (Frozen)
– BIND_ERROR (Binding failed)
– BINDING (Binding)
– PENDING_DELETE (Releasing)
– PENDING_CREATE (Assigning)
– NOTIFYING (Notify that EIP is assigned)
– NOTIFY_DELETE (Notify to release an
EIP)
– PENDING_UPDATE (Updating)
– DOWN (Unbound)
– ACTIVE (Bound)
– ELB (Bound to a load balancer)
– VPN (Bound to a VPN)
– ERROR (Assignment failed)
Minimum length: 0
Maximum length: 64
Enumerated values:
● FREEZED
● BIND_ERROR
● BINDING
● PENDING_DELETE
● PENDING_CREATE
● NOTIFYING
● NOTIFY_DELETE
● PENDING_UPDATE
● DOWN
● ACTIVE
● ELB
● VPN
● ERROR
description String ● Supplementary information about the EIP.
● This is customized by users and is not
perceived by the system.
Minimum length: 0
Maximum length: 256
Elastic IP
API Reference 5 API V3
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 194

--- Page 201 ---
Parameter Type Description
public_border
_group
String ● Whether the resource is in a central region
or an edge site.
● The value can be center or an edge site
name.
● This resource can only be associated with an
EIP of the same region.
Minimum length: 1
Maximum length: 64
created_at String ● Time (UTC) when an EIP is assigned.
● Format: yyyy-MM-ddTHH:mm:ssZ
Minimum length: 0
Maximum length: 64
updated_at String ● Time (UTC) when an EIP is updated.
● Format: yyyy-MM-ddTHH:mm:ssZ
Minimum length: 0
Maximum length: 64
type String ● EIP type.
Minimum length: 1
Maximum length: 36
Enumerated values:
● EIP
● DUALSTACK
vnic VnicInfo
object
● Port information of the instance with an EIP
bound.
● If the instance with an EIP bound does not
depend on a port, the value is null.
bandwidth PublicipBand
widthInfo
object
Bandwidth bound to an EIP.
enterprise_pro
ject_id
String Enterprise project ID. The value is 0 or a string
that contains a maximum of 36 characters in
UUID format with hyphens (-). This is the ID of
the enterprise project that you associate with
the EIP when you assign the EIP.
Minimum length: 0
Maximum length: 36
Elastic IP
API Reference 5 API V3
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 195

--- Page 202 ---
Parameter Type Description
billing_info String ● Order information of an EIP.
● Order information is available only for
yearly/monthly resources. This parameter is
left empty for pay-per-use resources.
Minimum length: 0
Maximum length: 256
lock_status String ● Frozen status of an EIP.
● The metadata type indicates that the EIP is
frozen due to arrears or abuse.
● The value can be:
– police
– locked
Minimum length: 0
Maximum length: 64
associate_inst
ance_type
String ● Type of the instance bound with an EIP.
● The value can be:
– PORT
– NATGW
– ELB
– ELBV1
– VPN
– null
Minimum length: 0
Maximum length: 64
Enumerated values:
● PORT
● NATGW
● ELB
● ELBV1
● VPN
● null
associate_inst
ance_id
String ● ID of the instance bound with an EIP.
Minimum length: 0
Maximum length: 36
Elastic IP
API Reference 5 API V3
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 196

--- Page 203 ---
Parameter Type Description
publicip_pool_
id
String ● ID of the network that an EIP belongs to. It
is the network ID corresponding to
publicip_pool_name.
Minimum length: 0
Maximum length: 36
publicip_pool_
name
String ● Network type of an EIP, including public EIP
pool (for example, 5_bgp or 5_sbgp) and
dedicated EIP pool.
● For details about the dedicated EIP pool, see
the APIs about publcip_pool.
Minimum length: 0
Maximum length: 64
alias String ● EIP name.
Minimum length: 0
Maximum length: 64
profile ProfileInfo
object
● EIP and metadata. (The parameter is not
displayed by default.)
fake_network
_type
Boolean ● Whether an EIP can change its BGP type. If
the value is true, the EIP can change its
BGP type. If the value is false, the EIP
cannot change its BGP type. (The parameter
is not displayed by default.)
Enumerated values:
● true
● false
tags Array of
strings
● User tag. (The parameter is not displayed by
default.)
associate_inst
ance_metadat
a
String ● Record the upper-level ownership of an
instance. For example, if
associate_instance_type is set to PORT,
this parameter records the device_id and
device_owner information of the port. (This
parameter only records information in
limited scenarios and is not displayed by
default.)
Minimum length: 1
Maximum length: 64
Elastic IP
API Reference 5 API V3
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 197

--- Page 204 ---
Parameter Type Description
associate_mo
de
String ● Passthrough mode. The parameter is
displayed only after the passthrough mode
is enabled.
Minimum length: 1
Maximum length: 36
allow_share_b
andwidth_typ
es
Array of
strings
● Types of the shared bandwidth that an EIP
can be added to. If this parameter is left
blank, the EIP cannot be added to any
shared bandwidth.
● The EIP can be added only to the shared
bandwidth of these types.
Maximum length: 64
cascade_delet
e_by_instance
Boolean ● Whether an EIP can be released together
with its instance. (The parameter is not
displayed by default.)
 
Table 5-13 VnicInfo
Parameter Type Description
private_ip_ad
dress
String ● Private IP address.
Minimum length: 0
Maximum length: 36
device_id String ● ID of the device that a port belongs to.
● The system automatically sets this
parameter.
Minimum length: 0
Maximum length: 36
device_owner String ● Device that the port belongs to.
● The value can be:
– network:dhcp
– network:VIP_PORT
– network:router_interface_distributed
– network:router_centralized_snat
● The system automatically sets this
parameter.
Minimum length: 0
Maximum length: 64
Elastic IP
API Reference 5 API V3
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 198

--- Page 205 ---
Parameter Type Description
vpc_id String ● VPC ID.
Minimum length: 0
Maximum length: 36
port_id String ● Port ID.
Minimum length: 0
Maximum length: 36
port_profile String ● Port profile.
Minimum length: 0
Maximum length: 256
mac String ● Port MAC address.
● The system automatically sets this
parameter.
Minimum length: 0
Maximum length: 64
vtep String ● VTEP IP address.
Minimum length: 0
Maximum length: 36
vni String ● VXLAN ID.
Minimum length: 0
Maximum length: 36
instance_id String ● ID of the instance that the port belongs to,
for example, RDS instance ID.
● The system automatically sets this
parameter.
Minimum length: 0
Maximum length: 36
instance_type String ● Type of the instance that the port belongs
to, for example, RDS.
● The system automatically sets this
parameter.
Minimum length: 0
Maximum length: 36
port_vif_detail
s
String ● Details about the NIC virtual interface.
Minimum length: 0
Maximum length: 255
 
Elastic IP
API Reference 5 API V3
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 199

--- Page 206 ---
Table 5-14 PublicipBandwidthInfo
Parameter Type Description
id String ● Bandwidth ID.
Minimum length: 0
Maximum length: 36
size Integer ● Bandwidth size.
● The value ranges from 5 Mbit/s to 2000
Mbit/s by default.
Minimum value: 0
Maximum value: 99999
share_type String ● Whether the bandwidth is shared or
dedicated.
● The value can be:
– PER: Dedicated bandwidth
– WHOLE: Shared bandwidth
● IPv6 addresses do not support bandwidth
whose type is WHOLE.
Minimum length: 0
Maximum length: 36
charge_mode String ● Whether the billing is based on traffic or
bandwidth.
● The value can be:
– bandwidth: billed by bandwidth
– traffic: billed by traffic
– 95peak_plus: billed by 95th percentile
bandwidth (enhanced)
Minimum length: 0
Maximum length: 36
name String ● Bandwidth name.
● The value can contain 1 to 64 characters,
including letters, digits, underscores (_),
hyphens (-), and periods (.).
Minimum length: 0
Maximum length: 64
billing_info String ● Billing information. If billing_info is
specified, the bandwidth is billed on a
yearly/monthly basis.
Minimum length: 0
Maximum length: 256
 
Elastic IP
API Reference 5 API V3
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 200

--- Page 207 ---
Table 5-15 ProfileInfo
Parameter Type Description
local_network
_port
String ● port_id in the 5_xxx network (for example,
5_bgp) of an EIP.
Minimum length: 0
Maximum length: 36
standalone Boolean ● Whether an EIP is assigned together with a
VM. If the value is true, the EIP is assigned
independently. If the value is false, the EIP
is assigned together with a VM.
notify_status String ● EIP assigning status. This parameter is only
for internal use of the EIP service.
Minimum length: 0
Maximum length: 36
Enumerated values:
● PENDING_CREATE
● PENDING_UPDATE
● NOTIFYING
● NOTIFYED
● NOTIFY_DELETE
create_time String ● Time when an EIP is assigned.
Minimum length: 0
Maximum length: 64
fake_network
_type
Boolean ● Whether an EIP can change its BGP type. If
the value is true, the EIP can change its
BGP type. If the value is false, the EIP
cannot change its BGP type.
Enumerated values:
● true
● false
create_source String ● Type of the resource purchased together
with an EIP.
Minimum length: 0
Maximum length: 36
Enumerated value:
● ecs
ecs_id String ● ID of the ECS purchased together with an
EIP.
Minimum length: 0
Maximum length: 36
Elastic IP
API Reference 5 API V3
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 201

--- Page 208 ---
Parameter Type Description
lock_status String ● Lock status of an EIP, for example, POLICE
(abuse), LOCKED (common issues),
ARREAR (in arrears), and DELABLE (can be
deleted).
Minimum length: 0
Maximum length: 36
freezed_status String ● EIP frozen status.
Minimum length: 0
Maximum length: 36
Enumerated values:
● FREEZED
● UNFREEZED
bandwith_info BandwidthIn
foResp object
● Bandwidth bound to an EIP.
 
Table 5-16 BandwidthInfoResp
Parameter Type Description
bandwidth_na
me
String ● Bandwidth name.
Minimum length: 0
Maximum length: 256
bandwidth_nu
mber
Integer ● Bandwidth size (Mbit/s).
Minimum value: 0
Maximum value: 99999
bandwidth_ty
pe
String ● Bandwidth type.
Enumerated values:
● PER
● WHOLE
bandwidth_id String ● Bandwidth ID.
Minimum length: 0
Maximum length: 36
 
Elastic IP
API Reference 5 API V3
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 202

--- Page 209 ---
Table 5-17 PageInfoOption
Parameter Type Description
previous_mar
ker
String Marker value of the previous page.
Minimum length: 0
Maximum length: 36
next_marker String Marker value of the next page.
Minimum length: 0
Maximum length: 36
current_count Integer Total number of data records on the current
page.
Minimum value: 0
Maximum value: 99999
 
Example Request
None
Example Response
Status code: 200
Normal response to the GET operation
{
  "page_info" : {
    "current_count" : 1,
    "next_marker" : "0490aeae-ab8f-4764-b012-45645e9c0aa9",
    "previous_marker" : "0490aeae-ab8f-4764-b012-45645e9c0aa9"
  },
  "publicips" : [ {
    "created_at" : "2022-03-17T09:46:22Z",
    "updated_at" : "2022-03-30T02:46:04Z",
    "lock_status" : null,
    "allow_share_bandwidth_types" : [ "bgp", "sbgp", "share", "share_yidongdanxian", "share_youxuan" ],
    "id" : "006343a1-32bf-4361-958a-efd158153dd0",
    "alias" : null,
    "project_id" : "060576787a80d5762fa2c00f07ddfcf4",
    "ip_version" : 4,
    "public_ip_address" : "88.88.1.141",
    "public_ipv6_address" : null,
    "status" : "DOWN",
    "description" : "",
    "enterprise_project_id" : "0",
    "billing_info" : null,
    "type" : "EIP",
    "vnic" : {
      "private_ip_address" : "172.16.1.235",
      "device_id" : "",
      "device_owner" : "",
      "vpc_id" : "1c30f428-9741-48b2-a788-0b2f359705eb",
      "port_id" : "22d3576d-c042-4f3d-8c7c-1330a2724627",
      "mac" : "fa:16:3e:3a:22:66",
      "vtep" : null,
      "vni" : null,
      "instance_id" : "",
      "instance_type" : "",
Elastic IP
API Reference 5 API V3
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 203

--- Page 210 ---
      "port_profile" : null,
      "port_vif_details": ""
    },
    "bandwidth" : {
      "id" : "149ff19b-5de4-4436-958f-2eca39952e93",
      "size" : 100,
      "share_type" : "PER",
      "charge_mode" : "traffic",
      "name" : "bandwidth-xym-br-eqos",
      "billing_info" : ""
    },
    "associate_instance_type" : "PORT",
    "associate_instance_id" : "22d3576d-c042-4f3d-8c7c-1330a2724627",
    "publicip_pool_id" : "9af5f2e5-1765-4b86-b342-ece52e785c8b",
    "publicip_pool_name" : "5_union",
    "public_border_group" : "center",
    "tags" : [ "key=value" ]
  } ],
  "request_id" : "c4962d006b34af3c2343de7f88ef65e3",
  "total_count" : 100
}
Status Codes
See Status Codes.
Error Codes
See Error Codes.
5.1.3 Querying EIP Details
Function
This API is used to query EIP details.
URI
GET /v3/{project_id}/eip/publicips/{publicip_id}
Table 5-18 Path parameters
Parameter Mandatory Type Description
project_id Yes String Project ID.
Minimum length: 0
Maximum length: 32
publicip_id Yes String EIP ID.
Minimum length: 0
Maximum length: 36
 
Elastic IP
API Reference 5 API V3
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 204

--- Page 211 ---
Table 5-19 Query parameter
Parameter Mandatory Type Description
fields No Array ● Field. Format:
"fields=id&fields=owner&..."
● Supported fields: id,
project_id, ip_version,
type, public_ip_address,
public_ipv6_address,
network_type, status,
description, created_at,
updated_at, vnic,
bandwidth,
associate_instance_type,
associate_instance_id,
lock_status, billing_info,
tags,
enterprise_project_id,
publicip_pool_name,
allow_share_bandwidth_t
ypes, alias,
publicip_pool_id, and
public_border_group.
 
Request Parameter
None
Response Parameters
Status code: 200
Table 5-20 Response body parameters
Parameter Type Description
request_id String Request ID.
Minimum length: 0
Maximum length: 36
publicip PublicipSingl
eShowResp
object
EIP.
 
Elastic IP
API Reference 5 API V3
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 205

--- Page 212 ---
Table 5-21 PublicipSingleShowResp
Parameter Type Description
id String ● Unique ID of the EIP.
Minimum length: 0
Maximum length: 36
project_id String ● Project ID.
Minimum length: 0
Maximum length: 32
ip_version Integer ● IP address version.
● The value can be:
– 4: IPv4 EIP
– 6: IPv6 EIP
Enumerated values:
● 4
● 6
public_ip_add
ress
String ● EIP or IPv6 port address.
Minimum length: 0
Maximum length: 36
public_ipv6_a
ddress
String ● Obtained EIP if IPv6 EIPs are available. This
parameter does not exist if only IPv4 EIPs
are available.
Minimum length: 0
Maximum length: 64
network_type String ● Network type of an EIP. This parameter is
discarded and is not displayed by default. It
is inherited by publicip_pool_name.
Minimum length: 0
Maximum length: 64
Elastic IP
API Reference 5 API V3
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 206

--- Page 213 ---
Parameter Type Description
status String ● EIP status.
● The value can be:
– FREEZED (Frozen)
– BIND_ERROR (Binding failed)
– BINDING (Binding)
– PENDING_DELETE (Releasing)
– PENDING_CREATE (Assigning)
– NOTIFYING
– NOTIFY_DELETE
– PENDING_UPDATE (Updating)
– DOWN (Unbound)
– ACTIVE (Bound)
– ELB (Bound to a load balancer)
– VPN (Bound to a VPN)
– ERROR
Minimum length: 0
Maximum length: 64
Enumerated values:
● FREEZED
● BIND_ERROR
● BINDING
● PENDING_DELETE
● PENDING_CREATE
● NOTIFYING
● NOTIFY_DELETE
● PENDING_UPDATE
● DOWN
● ACTIVE
● ELB
● VPN
● ERROR
description String ● Supplementary information about the EIP.
● This is customized by users and is not
perceived by the system.
Minimum length: 0
Maximum length: 256
Elastic IP
API Reference 5 API V3
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 207

--- Page 214 ---
Parameter Type Description
public_border
_group
String ● Whether the resource is in a central region
or an edge site.
● The value can be center or an edge site
name.
● This resource can only be associated with an
EIP of the same region.
Minimum length: 1
Maximum length: 64
created_at String ● Time (UTC) when an EIP is assigned.
● Format: yyyy-MM-ddTHH:mm:ssZ
Minimum length: 0
Maximum length: 64
updated_at String ● Time (UTC) when an EIP is updated.
● Format: yyyy-MM-ddTHH:mm:ssZ
Minimum length: 0
Maximum length: 64
type String ● EIP type.
Minimum length: 1
Maximum length: 36
Enumerated values:
● EIP
● DUALSTACK
vnic VnicInfo
object
● Port information of the instance with an EIP
bound.
● If the instance with an EIP bound does not
depend on a port, the value is null.
bandwidth PublicipBand
widthInfo
object
Bandwidth bound to an EIP.
enterprise_pro
ject_id
String Enterprise project ID. The value is 0 or a string
that contains a maximum of 36 characters in
UUID format with hyphens (-). This is the ID of
the enterprise project that you associate with
the EIP when you assign the EIP.
Minimum length: 0
Maximum length: 36
Elastic IP
API Reference 5 API V3
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 208

--- Page 215 ---
Parameter Type Description
billing_info String ● Order information of an EIP.
● Order information is available only for
yearly/monthly resources. This parameter is
left empty for pay-per-use resources.
Minimum length: 0
Maximum length: 256
lock_status String ● Frozen status of an EIP.
● The metadata type indicates that the EIP is
frozen due to arrears or abuse.
● The value can be:
– police
– locked
Minimum length: 0
Maximum length: 64
associate_inst
ance_type
String ● Type of the instance bound with an EIP.
● The value can be:
– PORT
– NATGW
– ELB
– ELBV1
– VPN
– null
Minimum length: 0
Maximum length: 64
Enumerated values:
● PORT
● NATGW
● ELB
● ELBV1
● VPN
● null
associate_inst
ance_id
String ● ID of the instance bound with an EIP.
Minimum length: 0
Maximum length: 36
Elastic IP
API Reference 5 API V3
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 209

--- Page 216 ---
Parameter Type Description
publicip_pool_
id
String ● ID of the network that an EIP belongs to. It
is the network ID corresponding to
publicip_pool_name.
Minimum length: 0
Maximum length: 36
publicip_pool_
name
String ● Network type of an EIP, including public EIP
pool (for example, 5_bgp or 5_sbgp) and
dedicated EIP pool.
● For details about the dedicated EIP pool, see
the APIs about publcip_pool.
Minimum length: 0
Maximum length: 64
alias String ● EIP name.
Minimum length: 0
Maximum length: 64
profile ProfileInfo
object
● EIP and metadata. (The parameter is not
displayed by default.)
fake_network
_type
Boolean ● Whether an EIP can change its BGP type. If
the value is true, the EIP can change its
BGP type. If the value is false, the EIP
cannot change its BGP type. (The parameter
is not displayed by default.)
Enumerated values:
● true
● false
tags Array of
strings
● User tag. (The parameter is not displayed by
default.)
associate_inst
ance_metadat
a
String ● Record the upper-level ownership of an
instance. For example, if
associate_instance_type is set to PORT,
this parameter records the device_id and
device_owner information of the port. (This
parameter only records information in
limited scenarios and is not displayed by
default.)
Minimum length: 1
Maximum length: 64
Elastic IP
API Reference 5 API V3
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 210

--- Page 217 ---
Parameter Type Description
associate_mo
de
String ● Passthrough mode. The parameter is
displayed only after the passthrough mode
is enabled.
Minimum length: 1
Maximum length: 36
allow_share_b
andwidth_typ
es
Array of
strings
● Types of the shared bandwidth that an EIP
can be added to. If this parameter is left
blank, the EIP cannot be added to any
shared bandwidth.
● The EIP can be added only to the shared
bandwidth of these types.
Maximum length: 64
cascade_delet
e_by_instance
Boolean ● Whether an EIP can be released together
with its instance. (The parameter is not
displayed by default.)
 
Table 5-22 VnicInfo
Parameter Type Description
private_ip_ad
dress
String ● Private IP address.
Minimum length: 0
Maximum length: 36
device_id String ● ID of the device that a port belongs to.
● The system automatically sets this
parameter.
Minimum length: 0
Maximum length: 36
device_owner String ● Device that the port belongs to.
● The value can be:
– network:dhcp
– network:VIP_PORT
– network:router_interface_distributed
– network:router_centralized_snat
● The system automatically sets this
parameter.
Minimum length: 0
Maximum length: 64
Elastic IP
API Reference 5 API V3
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 211

--- Page 218 ---
Parameter Type Description
vpc_id String ● VPC ID.
Minimum length: 0
Maximum length: 36
port_id String ● Port ID.
Minimum length: 0
Maximum length: 36
port_profile String ● Port profile.
Minimum length: 0
Maximum length: 256
mac String ● Port MAC address.
● The system automatically sets this
parameter.
Minimum length: 0
Maximum length: 64
vtep String ● VTEP IP address.
Minimum length: 0
Maximum length: 36
vni String ● VXLAN ID.
Minimum length: 0
Maximum length: 36
instance_id String ● ID of the instance that the port belongs to,
for example, RDS instance ID.
● The system automatically sets this
parameter.
Minimum length: 0
Maximum length: 36
instance_type String ● Type of the instance that the port belongs
to, for example, RDS.
● The system automatically sets this
parameter.
Minimum length: 0
Maximum length: 36
port_vif_detail
s
String ● Details about the NIC virtual interface.
Minimum length: 0
Maximum length: 255
 
Elastic IP
API Reference 5 API V3
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 212

--- Page 219 ---
Table 5-23 PublicipBandwidthInfo
Parameter Type Description
id String ● Bandwidth ID.
Minimum length: 0
Maximum length: 36
size Integer ● Bandwidth size.
● The value ranges from 5 Mbit/s to 2000
Mbit/s by default.
Minimum value: 0
Maximum value: 99999
share_type String ● Whether the bandwidth is shared or
dedicated.
● The value can be:
– PER: Dedicated bandwidth
– WHOLE: Shared bandwidth
● IPv6 addresses do not support bandwidth
whose type is WHOLE.
Minimum length: 0
Maximum length: 36
charge_mode String ● Whether the billing is based on traffic or
bandwidth.
● The value can be:
– bandwidth: billed by bandwidth
– traffic: billed by traffic
– 95peak_plus: billed by 95th percentile
bandwidth (enhanced)
Minimum length: 0
Maximum length: 36
name String ● Bandwidth name.
● The value can contain 1 to 64 characters,
including letters, digits, underscores (_),
hyphens (-), and periods (.).
Minimum length: 0
Maximum length: 64
billing_info String ● Billing information. If billing_info is
specified, the bandwidth is billed on a
yearly/monthly basis.
Minimum length: 0
Maximum length: 256
 
Elastic IP
API Reference 5 API V3
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 213

--- Page 220 ---
Table 5-24 ProfileInfo
Parameter Type Description
local_network
_port
String ● port_id in the 5_xxx network (for example,
5_bgp) of an EIP.
Minimum length: 0
Maximum length: 36
standalone Boolean ● Whether an EIP is assigned together with a
VM. If the value is true, the EIP is assigned
independently. If the value is false, the EIP
is assigned together with a VM.
notify_status String ● EIP assigning status. This parameter is only
for internal use of the EIP service.
Minimum length: 0
Maximum length: 36
Enumerated values:
● PENDING_CREATE
● PENDING_UPDATE
● NOTIFYING
● NOTIFYED
● NOTIFY_DELETE
create_time String ● Time when an EIP is assigned.
Minimum length: 0
Maximum length: 64
fake_network
_type
Boolean ● Whether an EIP can change its BGP type. If
the value is true, the EIP can change its
BGP type. If the value is false, the EIP
cannot change its BGP type.
Enumerated values:
● true
● false
create_source String ● Type of the resource purchased together
with an EIP.
Minimum length: 0
Maximum length: 36
Enumerated value:
● ecs
ecs_id String ● ID of the ECS purchased together with an
EIP.
Minimum length: 0
Maximum length: 36
Elastic IP
API Reference 5 API V3
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 214

--- Page 221 ---
Parameter Type Description
lock_status String ● Lock status of an EIP, for example, POLICE
(abuse), LOCKED (common issues),
ARREAR (in arrears), and DELABLE (can be
deleted).
Minimum length: 0
Maximum length: 36
freezed_status String ● EIP frozen status.
Minimum length: 0
Maximum length: 36
Enumerated values:
● FREEZED
● UNFREEZED
bandwith_info BandwidthIn
foResp object
● Bandwidth bound to an EIP.
 
Table 5-25 BandwidthInfoResp
Parameter Type Description
bandwidth_na
me
String ● Bandwidth name.
Minimum length: 0
Maximum length: 256
bandwidth_nu
mber
Integer ● Bandwidth size (Mbit/s).
Minimum value: 0
Maximum value: 99999
bandwidth_ty
pe
String ● Bandwidth type.
Enumerated values:
● PER
● WHOLE
bandwidth_id String ● Bandwidth ID.
Minimum length: 0
Maximum length: 36
 
Example Request
None
Elastic IP
API Reference 5 API V3
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 215

--- Page 222 ---
Example Response
Status code: 200
Normal response to the GET operation
{
  "publicip" : {
    "created_at" : "2022-03-17T09:46:22Z",
    "updated_at" : "2022-03-30T02:46:04Z",
    "lock_status" : null,
    "allow_share_bandwidth_types" : [ "bgp", "sbgp", "share", "share_yidongdanxian", "share_youxuan" ],
    "id" : "006343a1-32bf-4361-958a-efd158153dd0",
    "alias" : null,
    "project_id" : "060576787a80d5762fa2c00f07ddfcf4",
    "ip_version" : 4,
    "public_ip_address" : "88.88.1.141",
    "public_ipv6_address" : null,
    "status" : "DOWN",
    "description" : "",
    "enterprise_project_id" : "0",
    "billing_info" : null,
    "type" : "EIP",
    "vnic" : {
      "private_ip_address" : "172.16.1.235",
      "device_id" : "",
      "device_owner" : "",
      "vpc_id" : "1c30f428-9741-48b2-a788-0b2f359705eb",
      "port_id" : "22d3576d-c042-4f3d-8c7c-1330a2724627",
      "mac" : "fa:16:3e:3a:22:66",
      "vtep" : null,
      "vni" : null,
      "instance_id" : "",
      "instance_type" : "",
      "port_profile" : null,
      "port_vif_details": ""
    },
    "bandwidth" : {
      "id" : "149ff19b-5de4-4436-958f-2eca39952e93",
      "size" : 100,
      "share_type" : "PER",
      "charge_mode" : "traffic",
      "name" : "bandwidth-xym-br-eqos",
      "billing_info" : ""
    },
    "associate_instance_type" : "PORT",
    "associate_instance_id" : "22d3576d-c042-4f3d-8c7c-1330a2724627",
    "publicip_pool_id" : "9af5f2e5-1765-4b86-b342-ece52e785c8b",
    "publicip_pool_name" : "5_union",
    "public_border_group" : "center",
    "tags" : [ "key=value" ]
  },
  "request_id" : "ce1a33a85d2e105040497a21bbe58c26"
}
Status Codes
See Status Codes.
Error Codes
See Error Codes.
Elastic IP
API Reference 5 API V3
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 216

--- Page 223 ---
5.1.4 Updating an EIP
Function
This API is used to update an EIP.
URI
PUT /v3/{project_id}/eip/publicips/{publicip_id}
Table 5-26 Path parameters
Parameter Mandatory Type Description
project_id Yes String Project ID
Maximum length: 32
publicip_id Yes String EIP ID
Minimum length: 0
Maximum length: 36
 
Request Parameters
Table 5-27 Request body parameters
Parameter Mandatory Type Description
publicip Yes UpdatePublic
ipOption
object
EIP
 
Table 5-28 UpdatePublicipOption
Parameter Mandatory Type Description
alias No String ● EIP name
Minimum length: 0
Maximum length: 64
description No String ● Supplementary information
about the EIP
● The value can contains 0 to
255 characters and cannot
contain the following
special characters: <>
Minimum length: 0
Maximum length: 255
Elastic IP
API Reference 5 API V3
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 217

--- Page 224 ---
Parameter Mandatory Type Description
associate_inst
ance_type
No String ● Type of the instance that
the port belongs to
● The value can be:
– PORT
– NATGW
– VPN
– ELB
● Constraints:
– If neither
associate_instance_typ
e nor
associate_instance_id is
left empty, the EIP is
bound to an instance.
– If both
associate_instance_typ
e and
associate_instance_id
are null, an instance is
unbound. You can set
associate_instance_typ
e and
associate_instance_id
to null on API Explorer.
For details, see the
example request for
unbinding an EIP from
an instance.
– A dual-stack EIP cannot
have its bound instance
changed.
Minimum length: 0
Maximum length: 36
Elastic IP
API Reference 5 API V3
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 218

--- Page 225 ---
Parameter Mandatory Type Description
associate_inst
ance_id
No String ● ID of the bound instance,
such as a load balancer ID
or an ECS NIC ID.
● Constraints:
– If neither
associate_instance_typ
e nor
associate_instance_id is
left empty, the EIP is
bound to an instance.
– If both
associate_instance_typ
e and
associate_instance_id
are null, an instance is
unbound. You can set
associate_instance_typ
e and
associate_instance_id
to null on API Explorer.
For details, see the
example request for
unbinding an EIP from
an instance.
– A dual-stack EIP cannot
have its bound instance
changed.
Minimum length: 0
Maximum length: 36
 
Response Parameters
Status code: 200
Table 5-29 Response body parameters
Parameter Type Description
request_id String Request ID
Minimum length: 0
Maximum length: 36
publicip PublicipUpdateR-
esp object
Response object of updating an EIP
 
Elastic IP
API Reference 5 API V3
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 219

--- Page 226 ---
Table 5-30 PublicipUpdateResp
Parameter Type Description
id String ● EIP ID, which uniquely identifies the
EIP.
Minimum length: 0
Maximum length: 36
project_id String ● Project ID
Minimum length: 0
Maximum length: 32
ip_version Integer ● IP address version
● The value can be:
– 4: IPv4 EIP
– 6: IPv6 EIP
public_ip_address String ● EIP or IPv6 port address
Minimum length: 0
Maximum length: 36
public_ipv6_addre
ss
String ● Obtained EIP if IPv6 EIPs are
available. This parameter does not
exist if only IPv4 EIPs are available.
Minimum length: 0
Maximum length: 64
Elastic IP
API Reference 5 API V3
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 220

--- Page 227 ---
Parameter Type Description
status String ● EIP status
● The value can be:
– FREEZED (Frozen)
– BIND_ERROR (Binding failed)
– BINDING (Binding)
– PENDING_DELETE (Releasing)
– PENDING_CREATE (Assigning)
– NOTIFYING (Notify that EIP is
assigned)
– NOTIFY_DELETE (Notify to
release an EIP)
– PENDING_UPDATE (Updating)
– DOWN (Unbound)
– ACTIVE (Bound)
– ELB (Bound to a load balancer)
– VPN (Bound to a VPN)
– ERROR (Assignment failed)
Minimum length: 0
Maximum length: 64
description String ● Supplementary information about
the EIP
● You can customize this value to
identify your EIP, which is not
perceived by the system.
Minimum length: 0
Maximum length: 255
public_border_gro
up
String ● Whether it is a central or an edge
EIP.
● The value can be center or an edge
site name.
● An EIP can only be bound to a
resource of the same region or site.
Minimum length: 1
Maximum length: 64
created_at String ● Time (UTC) when an EIP is assigned
● Format: yyyy-MM-ddTHH:mm:ssZ
Minimum length: 0
Maximum length: 64
Elastic IP
API Reference 5 API V3
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 221

--- Page 228 ---
Parameter Type Description
updated_at String ● Time (UTC) when an EIP is updated
● Format: yyyy-MM-ddTHH:mm:ssZ
Minimum length: 0
Maximum length: 64
type String EIP type
Minimum length: 1
Maximum length: 36
vnic VnicInfo object ● Port information of the instance
with an EIP bound
● If the instance has no port, the
value is null.
bandwidth PublicipBandwid-
thInfo object
Bandwidth of an EIP
enterprise_project
_id
String Enterprise project ID. The value is 0 or
a string that contains a maximum of
36 characters in UUID format with
hyphens (-). This is the ID of the
enterprise project that you associate
with the EIP when you assign the EIP.
Minimum length: 0
Maximum length: 36
billing_info String ● Order information of an EIP
● The value is available only for
yearly/monthly resources. This value
is left blank for pay-per-use
resources.
Minimum length: 0
Maximum length: 256
lock_status String ● Frozen status of an EIP
● The metadata type indicates that
the EIP is frozen due to arrears or
security reasons.
● The value can be:
– police
– locked
Minimum length: 0
Maximum length: 64
Elastic IP
API Reference 5 API V3
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 222

--- Page 229 ---
Parameter Type Description
associate_instance
_type
String ● Type of the instance with an EIP
bound
● The value can be:
– PORT
– NATGW
– ELB
– ELBV1
– VPN
Minimum length: 0
Maximum length: 64
associate_instance
_id
String ID of the instance with an EIP bound
Minimum length: 0
Maximum length: 36
publicip_pool_id String ID of the network that an EIP belongs
to It is the network ID corresponding
to publicip_pool_name.
Minimum length: 0
Maximum length: 36
publicip_pool_na
me
String ● Network type of an EIP, including
public EIP pool (for example, 5_bgp
or 5_sbgp) and dedicated EIP pool.
● For details about the dedicated EIP
pool, see the APIs about
publcip_pool.
Minimum length: 0
Maximum length: 64
alias String ● EIP name
Minimum length: 0
Maximum length: 64
associate_mode String ● Passthrough mode. (The parameter
is not displayed by default.)
Minimum length: 1
Maximum length: 36
 
Elastic IP
API Reference 5 API V3
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 223

--- Page 230 ---
Table 5-31 VnicInfo
Parameter Type Description
private_ip_address String ● Private IP address
Minimum length: 0
Maximum length: 36
device_id String ● ID of the device that the port
belongs to
● The system automatically sets this
parameter.
Minimum length: 0
Maximum length: 36
device_owner String ● Device that the port belongs to
● The value can be:
– network:dhcp
– network:VIP_PORT
– network:router_interface_distri
buted
– network:router_centralized_sna
t
● The system automatically sets this
parameter.
Minimum length: 0
Maximum length: 64
vpc_id String ● VPC ID
Minimum length: 0
Maximum length: 36
port_id String ● Port ID
Minimum length: 0
Maximum length: 36
port_profile String ● Port profile
Minimum length: 0
Maximum length: 256
mac String ● Port MAC address
● The system automatically sets this
parameter.
Minimum length: 0
Maximum length: 64
Elastic IP
API Reference 5 API V3
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 224

--- Page 231 ---
Parameter Type Description
vtep String ● VTEP IP address
Minimum length: 0
Maximum length: 36
vni String ● VXLAN ID
Minimum length: 0
Maximum length: 36
instance_id String ● ID of the instance that the port
belongs to, for example, RDS
instance ID
● The system automatically sets this
parameter.
Minimum length: 0
Maximum length: 36
instance_type String ● Type of the instance that the port
belongs to, for example, RDS.
● The system automatically sets this
parameter.
Minimum length: 0
Maximum length: 36
port_vif_details String ● Details about the NIC virtual
interface.
Minimum length: 0
Maximum length: 255
 
Table 5-32 PublicipBandwidthInfo
Parameter Type Description
id String ● Bandwidth ID
Minimum length: 0
Maximum length: 36
size Integer ● Bandwidth size
● The value ranges from 5 Mbit/s to
2,000 Mbit/s by default.
Minimum value: 0
Maximum value: 99999
Elastic IP
API Reference 5 API V3
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 225

--- Page 232 ---
Parameter Type Description
share_type String ● Whether the bandwidth is shared or
dedicated.
● The value can be:
– PER: Dedicated bandwidth
– WHOLE: Shared bandwidth
● IPv6 addresses do not support
bandwidth whose type is WHOLE.
Minimum length: 0
Maximum length: 36
charge_mode String ● Whether the billing is based on
traffic or bandwidth.
● The value can be:
– bandwidth: billed by bandwidth
– traffic: billed by traffic
– 95peak_plus: billed by 95th
percentile bandwidth (enhanced)
Minimum length: 0
Maximum length: 36
name String ● Bandwidth name
● The value can contain 1 to 64
characters, including letters, digits,
underscores (_), hyphens (-), and
periods (.).
Minimum length: 0
Maximum length: 64
billing_info String ● Billing information. If billing_info is
specified, the bandwidth is billed on
a yearly/monthly basis.
Minimum length: 0
Maximum length: 256
 
Example Request
● Update the alias and description of an EIP.
{
  "publicip" : {
    "alias" : "abcd",
    "description" : "test!!!!"
  }
}
● Unbind an EIP from an instance.
{
  "publicip" : {
Elastic IP
API Reference 5 API V3
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 226

--- Page 233 ---
    "associate_instance_type" : null,
    "associate_instance_id" : null
  }
}
Example Response
Status code: 200
Normal response to PUT requests
{
  "publicip" : {
    "alias" : "abcd",
    "associate_instance_id" : null,
    "associate_instance_type" : null,
    "bandwidth" : {
      "billing_info" : "xxxx:xxxx:xxxx",
      "charge_mode" : "bandwidth",
      "id" : "80549ae1-cf7a-4f39-a45f-bdb8e194a1f4",
      "name" : "bandwidth-bd25-test",
      "share_type" : "WHOLE",
      "size" : 7
    },
    "billing_info" : null,
    "created_at" : "2020-06-18T14:05:32Z",
    "description" : "test!!!!",
    "enterprise_project_id" : "0",
    "public_border_group" : "center",
    "id" : "b0c42aa6-3d1d-4b39-9188-35ee6aa8d6f7",
    "ip_version" : 4,
    "lock_status" : null,
    "project_id" : "060576782980d5762f9ec014dd2f1148",
    "public_ip_address" : "xx.xx.xx.xx",
    "public_ipv6_address" : null,
    "publicip_pool_id" : "160576782980d5762f9ec014dd2f1148",
    "publicip_pool_name" : "5_mobile",
    "status" : "DOWN",
    "type" : "EIP",
    "updated_at" : "2020-06-18T14:05:32Z",
    "vnic" : null
  },
  "request_id" : "ead9f912bd1191e3d5f0037141098d91"
}
Status Codes
Status
Code
Description
200 Normal response to PUT requests
 
Error Codes
See Error Codes.
5.1.5 Unbinding an EIP
Function
This API is used to unbind an EIP.
Elastic IP
API Reference 5 API V3
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 227

--- Page 234 ---
URI
POST /v3/{project_id}/eip/publicips/{publicip_id}/disassociate-instance
Table 5-33 Path parameters
Parameter Mandatory Type Description
project_id Yes String Project ID.
Minimum length: 0
Maximum length: 32
publicip_id Yes String EIP ID.
Minimum length: 0
Maximum length: 36
 
Request Parameter
None
Response Parameters
Status code: 200
Table 5-34 Response body parameters
Parameter Type Description
request_id String Request ID.
Minimum length: 0
Maximum length: 36
publicip PublicipInsta
nceResp
object
Response body of unbinding an EIP.
 
Table 5-35 PublicipInstanceResp
Parameter Type Description
id String ● Unique ID of the EIP.
Minimum length: 0
Maximum length: 36
project_id String ● Project ID.
Minimum length: 0
Maximum length: 32
Elastic IP
API Reference 5 API V3
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 228

--- Page 235 ---
Parameter Type Description
ip_version Integer ● IP address version.
● The value can be:
– 4: IPv4 EIP
– 6: IPv6 EIP
Enumerated values:
● 4
● 6
public_ip_add
ress
String ● EIP or IPv6 port address.
Minimum length: 0
Maximum length: 36
public_ipv6_a
ddress
String ● Obtained EIP if IPv6 EIPs are available. This
parameter does not exist if only IPv4 EIPs
are available.
Minimum length: 0
Maximum length: 64
Elastic IP
API Reference 5 API V3
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 229

--- Page 236 ---
Parameter Type Description
status String ● EIP status.
● The value can be:
– FREEZED (Frozen)
– BIND_ERROR (Binding failed)
– BINDING (Binding)
– PENDING_DELETE (Releasing)
– PENDING_CREATE (Assigning)
– NOTIFYING
– NOTIFY_DELETE
– PENDING_UPDATE (Updating)
– DOWN (Unbound)
– ACTIVE (Bound)
– ELB (Bound to a load balancer)
– VPN (Bound to a VPN)
– ERROR
Enumerated values:
● FREEZED
● BIND_ERROR
● BINDING
● PENDING_DELETE
● PENDING_CREATE
● NOTIFYING
● NOTIFY_DELETE
● PENDING_UPDATE
● DOWN
● ACTIVE
● ELB
● ERROR
● VPN
description String ● Supplementary information about the EIP.
● This is customized by users and is not
perceived by the system.
Minimum length: 1
Maximum length: 255
Elastic IP
API Reference 5 API V3
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 230

--- Page 237 ---
Parameter Type Description
public_border
_group
String ● Whether the resource is in a central region
or an edge site.
● The value can be center or an edge site
name.
● This resource can only be associated with an
EIP of the same region.
Minimum length: 1
Maximum length: 64
created_at String ● Time (UTC) when an EIP is assigned.
● Format: yyyy-MM-ddTHH:mm:ssZ
updated_at String ● Time (UTC) when an EIP is updated.
● Format: yyyy-MM-ddTHH:mm:ssZ
type String ● EIP type.
Minimum length: 1
Maximum length: 36
Enumerated values:
● EIP
● DUALSTACK
vnic VnicInfo
object
● Port information of the instance with an EIP
bound.
● If the instance with an EIP bound does not
depend on a port, the value is null.
bandwidth PublicipBand
widthInfo
object
● Bandwidth bound to an EIP.
enterprise_pro
ject_id
String ● Enterprise project ID. The value is 0 or a
string that contains a maximum of 36
characters in UUID format with hyphens (-).
This is the ID of the enterprise project that
you associate with the EIP when you assign
the EIP.
Minimum length: 0
Maximum length: 36
billing_info String ● Order information of an EIP.
● Order information is available only for
yearly/monthly resources. This parameter is
left empty for pay-per-use resources.
Minimum length: 0
Maximum length: 256
Elastic IP
API Reference 5 API V3
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 231

--- Page 238 ---
Parameter Type Description
lock_status String ● Frozen status of an EIP.
● The metadata type indicates that the EIP is
frozen due to arrears or abuse.
● Value range: police or locked
Minimum length: 0
Maximum length: 64
associate_inst
ance_type
String ● Type of the instance bound with an EIP.
● Value range: PORT, NATGW, ELB, ELBV1,
VPN or null
Minimum length: 0
Maximum length: 64
Enumerated values:
● PORT
● NATGW
● ELB
● ELBV1
● VPN
● null
associate_inst
ance_id
String ● ID of the instance bound with an EIP.
Minimum length: 0
Maximum length: 64
publicip_pool_
id
String ● ID of the network that an EIP belongs to.
Network ID corresponding to
publicip_pool_name
Minimum length: 0
Maximum length: 36
publicip_pool_
name
String ● Network type of an EIP, including public EIP
pool (for example, 5_bgp or 5_sbgp) and
dedicated EIP pool.
● For details about the dedicated EIP pool, see
the APIs about publcip_pool.
Minimum length: 0
Maximum length: 64
alias String ● EIP name.
Minimum length: 0
Maximum length: 64
 
Elastic IP
API Reference 5 API V3
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 232

--- Page 239 ---
Table 5-36 VnicInfo
Parameter Type Description
private_ip_ad
dress
String ● Private IP address.
Minimum length: 0
Maximum length: 36
device_id String ● ID of the device that a port belongs to.
● The system automatically sets this
parameter.
Minimum length: 0
Maximum length: 36
device_owner String ● Device that the port belongs to.
● The value can be:
– network:dhcp
– network:VIP_PORT
– network:router_interface_distributed
– network:router_centralized_snat
● The system automatically sets this
parameter.
Minimum length: 0
Maximum length: 64
vpc_id String ● VPC ID.
Minimum length: 0
Maximum length: 36
port_id String ● Port ID.
Minimum length: 0
Maximum length: 36
port_profile String ● Port profile.
Minimum length: 0
Maximum length: 256
mac String ● Port MAC address.
● The system automatically sets this
parameter.
Minimum length: 0
Maximum length: 64
vtep String ● VTEP IP address.
Minimum length: 0
Maximum length: 36
Elastic IP
API Reference 5 API V3
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 233

--- Page 240 ---
Parameter Type Description
vni String ● VXLAN ID.
Minimum length: 0
Maximum length: 36
instance_id String ● ID of the instance that the port belongs to,
for example, RDS instance ID.
● The system automatically sets this
parameter.
Minimum length: 0
Maximum length: 36
instance_type String ● Type of the instance that the port belongs
to, for example, RDS.
● The system automatically sets this
parameter.
Minimum length: 0
Maximum length: 36
port_vif_detail
s
String ● Details about the NIC virtual interface.
Minimum length: 0
Maximum length: 255
 
Table 5-37 PublicipBandwidthInfo
Parameter Type Description
id String ● Bandwidth ID.
Minimum length: 0
Maximum length: 36
size Integer ● Bandwidth size.
● The value ranges from 5 Mbit/s to 2000
Mbit/s by default.
Minimum value: 0
Maximum value: 99999
Elastic IP
API Reference 5 API V3
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 234

--- Page 241 ---
Parameter Type Description
share_type String ● Whether the bandwidth is shared or
dedicated.
● The value can be:
– PER: Dedicated bandwidth
– WHOLE: Shared bandwidth
● IPv6 addresses do not support bandwidth
whose type is WHOLE.
Minimum length: 0
Maximum length: 36
charge_mode String ● Whether the billing is based on traffic or
bandwidth.
● The value can be:
– bandwidth: billed by bandwidth
– traffic: billed by traffic
– 95peak_plus: billed by 95th percentile
bandwidth (enhanced)
Minimum length: 0
Maximum length: 36
name String ● Bandwidth name.
● The value can contain 1 to 64 characters,
including letters, digits, underscores (_),
hyphens (-), and periods (.).
Minimum length: 0
Maximum length: 64
billing_info String ● Billing information. If billing_info is
specified, the bandwidth is billed on a
yearly/monthly basis.
Minimum length: 0
Maximum length: 256
 
Example Request
None
Example Response
Status code: 200
Normal response to POST requests
{
  "publicip" : {
    "alias" : "abcd",
Elastic IP
API Reference 5 API V3
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 235

--- Page 242 ---
    "associate_instance_id" : null,
    "associate_instance_type" : null,
    "bandwidth" : {
      "billing_info" : "xxxx:xxxx:xxxx:xxxx",
      "charge_mode" : "bandwidth",
      "id" : "80549ae1-cf7a-4f39-a45f-bdb8e194a1f4",
      "name" : "bandwidth-bd25-test",
      "share_type" : "WHOLE",
      "size" : 7
    },
    "billing_info" : null,
    "created_at" : "2020-06-18T14:05:32Z",
    "description" : "test!!!!",
    "enterprise_project_id" : "0",
    "public_border_group" : "center",
    "id" : "b0c42aa6-3d1d-4b39-9188-35ee6aa8d6f7",
    "ip_version" : 4,
    "lock_status" : null,
    "project_id" : "060576782980d5762f9ec014dd2f1148",
    "public_ip_address" : "xx.xx.xx.xx",
    "public_ipv6_address" : null,
    "publicip_pool_id" : "160576782980d5762f9ec014dd2f1148",
    "publicip_pool_name" : "5_mobile",
    "status" : "DOWN",
    "type" : "EIP",
    "updated_at" : "2020-06-18T14:05:32Z",
    "vnic" : null
  },
  "request_id" : "ead9f912bd1191e3d5f0037141098d91"
}
Status Codes
See Status Codes.
Error Codes
See Error Codes.
5.1.6 Binding an EIP
Function
This API is used to bind an EIP.
URI
POST /v3/{project_id}/eip/publicips/{publicip_id}/associate-instance
Table 5-38 Path parameters
Parameter Mandatory Type Description
project_id Yes String Project ID.
Minimum length: 0
Maximum length: 32
Elastic IP
API Reference 5 API V3
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 236

--- Page 243 ---
Parameter Mandatory Type Description
publicip_id Yes String EIP ID.
Minimum length: 0
Maximum length: 36
 
Request Parameters
Table 5-39 Request body parameter
Parameter Mandatory Type Description
publicip Yes AssociatePub
licipsOption
object
EIP object.
 
Table 5-40 AssociatePublicipsOption
Parameter Mandatory Type Description
associate_inst
ance_type
Yes String ● Type of the instance that
the port belongs to.
● The value can be PORT,
NATGW, VPN, or ELB.
● Constraints:
– If neither
associate_instance_typ
e nor
associate_instance_id is
left empty, the instance
is bound.
– associate_instance_typ
e cannot be empty.
– A dual-stack EIP cannot
have its bound instance
changed.
Minimum length: 0
Maximum length: 36
Enumerated values:
● PORT
● NATGW
● VPN
● ELB
Elastic IP
API Reference 5 API V3
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 237

--- Page 244 ---
Parameter Mandatory Type Description
associate_inst
ance_id
Yes String ● ID of the instance that the
port belongs to, for
example, RDS instance ID.
● Constraints:
– If neither
associate_instance_typ
e nor
associate_instance_id is
left empty, the instance
is bound.
– associate_instance_id
cannot be empty.
– A dual-stack EIP cannot
have its bound instance
changed.
Minimum length: 0
Maximum length: 36
 
Response Parameters
Status code: 200
Table 5-41 Response body parameters
Parameter Type Description
request_id String Request ID.
Minimum length: 0
Maximum length: 36
publicip PublicipInsta
nceResp
object
Response body of binding an EIP.
 
Table 5-42 PublicipInstanceResp
Parameter Type Description
id String ● Unique ID of the EIP.
Minimum length: 0
Maximum length: 36
Elastic IP
API Reference 5 API V3
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 238

--- Page 245 ---
Parameter Type Description
project_id String ● Project ID.
Minimum length: 0
Maximum length: 32
ip_version Integer ● IP address version.
● The value can be:
– 4: IPv4 EIP
– 6: IPv6 EIP
Enumerated values:
● 4
● 6
public_ip_add
ress
String ● EIP or IPv6 port address.
Minimum length: 0
Maximum length: 36
public_ipv6_a
ddress
String ● Obtained EIP if IPv6 EIPs are available. This
parameter does not exist if only IPv4 EIPs
are available.
Minimum length: 0
Maximum length: 64
Elastic IP
API Reference 5 API V3
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 239

--- Page 246 ---
Parameter Type Description
status String ● EIP status.
● The value can be:
– FREEZED (Frozen)
– BIND_ERROR (Binding failed)
– BINDING (Binding)
– PENDING_DELETE (Releasing)
– PENDING_CREATE (Assigning)
– NOTIFYING
– NOTIFY_DELETE
– PENDING_UPDATE (Updating)
– DOWN (Unbound)
– ACTIVE (Bound)
– ELB (Bound to a load balancer)
– VPN (Bound to a VPN)
– ERROR
Enumerated values:
● FREEZED
● BIND_ERROR
● BINDING
● PENDING_DELETE
● PENDING_CREATE
● NOTIFYING
● NOTIFY_DELETE
● PENDING_UPDATE
● DOWN
● ACTIVE
● ELB
● ERROR
● VPN
description String ● Supplementary information about the EIP.
● This is customized by users and is not
perceived by the system.
Minimum length: 1
Maximum length: 255
Elastic IP
API Reference 5 API V3
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 240

--- Page 247 ---
Parameter Type Description
public_border
_group
String ● Whether the resource is in a central region
or an edge site.
● The value can be center or an edge site
name.
● This resource can only be associated with an
EIP of the same region.
Minimum length: 1
Maximum length: 64
created_at String ● Time (UTC) when an EIP is assigned.
● Format: yyyy-MM-ddTHH:mm:ssZ
updated_at String ● Time (UTC) when an EIP is updated.
● Format: yyyy-MM-ddTHH:mm:ssZ
type String ● EIP type
Minimum length: 1
Maximum length: 36
Enumerated values:
● EIP
● DUALSTACK
vnic VnicInfo
object
● Port information of the instance with an EIP
bound.
● If the instance with an EIP bound does not
depend on a port, the value is null.
bandwidth PublicipBand
widthInfo
object
● Bandwidth bound to an EIP.
enterprise_pro
ject_id
String ● Enterprise project ID. The value is 0 or a
string that contains a maximum of 36
characters in UUID format with hyphens (-).
This is the ID of the enterprise project that
you associate with the EIP when you assign
the EIP.
Minimum length: 0
Maximum length: 36
billing_info String ● Order information of an EIP.
● Order information is available only for
yearly/monthly resources. This parameter is
left empty for pay-per-use resources.
Minimum length: 0
Maximum length: 256
Elastic IP
API Reference 5 API V3
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 241

--- Page 248 ---
Parameter Type Description
lock_status String ● Frozen status of an EIP.
● The metadata type indicates that the EIP is
frozen due to arrears or abuse.
● Value range: police or locked
Minimum length: 0
Maximum length: 64
associate_inst
ance_type
String ● Type of the instance bound with an EIP.
● Value range: PORT, NATGW, ELB, ELBV1,
VPN or null
Minimum length: 0
Maximum length: 64
Enumerated values:
● PORT
● NATGW
● ELB
● ELBV1
● VPN
● null
associate_inst
ance_id
String ● ID of the instance bound with an EIP.
Minimum length: 0
Maximum length: 64
publicip_pool_
id
String ● ID of the network that an EIP belongs to.
Network ID corresponding to
publicip_pool_name
Minimum length: 0
Maximum length: 36
publicip_pool_
name
String ● Network type of an EIP, including public EIP
pool (for example, 5_bgp or 5_sbgp) and
dedicated EIP pool.
● For details about the dedicated EIP pool, see
the APIs about publcip_pool.
Minimum length: 0
Maximum length: 64
alias String ● EIP name.
Minimum length: 0
Maximum length: 64
 
Elastic IP
API Reference 5 API V3
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 242

--- Page 249 ---
Table 5-43 VnicInfo
Parameter Type Description
private_ip_ad
dress
String ● Private IP address.
Minimum length: 0
Maximum length: 36
device_id String ● ID of the device that a port belongs to.
● The system automatically sets this
parameter.
Minimum length: 0
Maximum length: 36
device_owner String ● Device that the port belongs to.
● The value can be:
– network:dhcp
– network:VIP_PORT
– network:router_interface_distributed
– network:router_centralized_snat
● The system automatically sets this
parameter.
Minimum length: 0
Maximum length: 64
vpc_id String ● VPC ID.
Minimum length: 0
Maximum length: 36
port_id String ● Port ID.
Minimum length: 0
Maximum length: 36
port_profile String ● Port profile.
Minimum length: 0
Maximum length: 256
mac String ● Port MAC address.
● The system automatically sets this
parameter.
Minimum length: 0
Maximum length: 64
vtep String ● VTEP IP address.
Minimum length: 0
Maximum length: 36
Elastic IP
API Reference 5 API V3
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 243

--- Page 250 ---
Parameter Type Description
vni String ● VXLAN ID.
Minimum length: 0
Maximum length: 36
instance_id String ● ID of the instance that the port belongs to,
for example, RDS instance ID.
● The system automatically sets this
parameter.
Minimum length: 0
Maximum length: 36
instance_type String ● Type of the instance that the port belongs
to, for example, RDS.
● The system automatically sets this
parameter.
Minimum length: 0
Maximum length: 36
port_vif_detail
s
String ● Details about the NIC virtual interface.
Minimum length: 0
Maximum length: 255
 
Table 5-44 PublicipBandwidthInfo
Parameter Type Description
id String ● Bandwidth ID.
Minimum length: 0
Maximum length: 36
size Integer ● Bandwidth size.
● The value ranges from 5 Mbit/s to 2000
Mbit/s by default.
Minimum value: 0
Maximum value: 99999
Elastic IP
API Reference 5 API V3
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 244

--- Page 251 ---
Parameter Type Description
share_type String ● Whether the bandwidth is shared or
dedicated.
● The value can be:
– PER: Dedicated bandwidth
– WHOLE: Shared bandwidth
● IPv6 addresses do not support bandwidth
whose type is WHOLE.
Minimum length: 0
Maximum length: 36
charge_mode String ● Whether the billing is based on traffic or
bandwidth.
● The value can be:
– bandwidth: billed by bandwidth
– traffic: billed by traffic
– 95peak_plus: billed by 95th percentile
bandwidth (enhanced)
Minimum length: 0
Maximum length: 36
name String ● Bandwidth name.
● The value can contain 1 to 64 characters,
including letters, digits, underscores (_),
hyphens (-), and periods (.).
Minimum length: 0
Maximum length: 64
billing_info String ● Billing information. If billing_info is
specified, the bandwidth is billed on a
yearly/monthly basis.
Minimum length: 0
Maximum length: 256
 
Example Request
{
  "publicip" : {
    "associate_instance_id" : "921b9dc7-8151-41e1-b83c-d50fe959592a",
    "associate_instance_type" : "PORT"
  }
}
Example Response
Status code: 200
Normal response to POST requests
Elastic IP
API Reference 5 API V3
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 245

--- Page 252 ---
{
  "publicip" : {
    "alias" : "abcd",
    "associate_instance_id" : "921b9dc7-8151-41e1-b83c-d50fe959592a",
    "associate_instance_type" : "PORT",
    "bandwidth" : {
      "billing_info" : "xxxx:xxxx:xxxx:xxxx",
      "charge_mode" : "bandwidth",
      "id" : "80549ae1-cf7a-4f39-a45f-bdb8e194a1f4",
      "name" : "bandwidth-bd25-test",
      "share_type" : "WHOLE",
      "size" : 7
    },
    "billing_info" : null,
    "created_at" : "2020-06-18T14:05:32Z",
    "description" : "test!!!!",
    "enterprise_project_id" : "0",
    "public_border_group" : "center",
    "id" : "b0c42aa6-3d1d-4b39-9188-35ee6aa8d6f7",
    "ip_version" : 4,
    "lock_status" : null,
    "project_id" : "060576782980d5762f9ec014dd2f1148",
    "public_ip_address" : "xx.xx.xx.xx",
    "public_ipv6_address" : null,
    "publicip_pool_id" : "160576782980d5762f9ec014dd2f1148",
    "publicip_pool_name" : "5_mobile",
    "status" : "ACTIVE",
    "type" : "EIP",
    "updated_at" : "2020-06-18T14:05:32Z",
    "vnic" : {
      "device_id" : "78aa6d7f-7111-434e-9a93-0dc6fdacff63",
      "device_owner" : "network:nat_gateway",
      "instance_id" : "",
      "instance_type" : "",
      "mac" : "fa:16:3e:83:6b:0a",
      "port_id" : "921b9dc7-8151-41e1-b83c-d50fe959592a",
      "port_profile" : null,
      "private_ip_address" : "xx.xx.xx.xx",
      "vni" : null,
      "vpc_id" : "a26c231a-cf6f-48d3-83db-1e261d0e235a",
      "vtep" : null,
      "port_vif_details": ""
    }
  },
  "request_id" : "ead9f912bd1191e3d5f0037141098d91"
}
Status Codes
See Status Codes.
Error Codes
See Error Codes.
5.1.7 Querying the Number of Available EIPs
Function
This API is used to query the number of available EIP in an EIP pool.
URI
POST /v3/{project_id}/eip/resources/available
Elastic IP
API Reference 5 API V3
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 246

--- Page 253 ---
Table 5-45 Path parameter
Parameter Mandatory Type Description
project_id Yes String Project ID.
 
Request Parameters
Table 5-46 Request body parameters
Parameter Mandatory Type Description
type No String EIP pool type.
limit Yes Integer Number of available EIPs in an
EIP pool.
 
Response Parameter
Status code: 200
Table 5-47 Response body parameter
Parameter Type Description
result Integer ● Returned result.
 
Example Request
{
  "limit" : 5,
  "type" : "5_bgp"
}
Example Response
Status code: 200
OK
{
  "result" : 5
}
Status Codes
See Status Codes.
Error Codes
See Error Codes.
Elastic IP
API Reference 5 API V3
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 247

--- Page 254 ---
5.2 Shared Bandwidth Types
5.2.1 Querying Shared Bandwidth Types of a Specified Tenant
Function
This API is used to query shared bandwidth types of a specified tenant.
URI
GET /v3/{project_id}/eip/share-bandwidth-types
Table 5-48 Path parameter
Parameter Mandatory Type Description
project_id Yes String ● Project ID.
Minimum length: 0
Maximum length: 32
 
Table 5-49 Query parameters
Parameter Mandatory Type Description
fields No String ● Field. Format:
"fields=id&fields=bandwidt
h_type&..."
● Supported fields: id,
bandwidth_type,
name_en, name_zh,
created_at, update_at,
public_border_group, and
description.
Minimum length: 0
Maximum length: 1024
id No String ● Bandwidth type ID.
Minimum length: 0
Maximum length: 36
bandwidth_ty
pe
No String ● Bandwidth type.
Minimum length: 1
Maximum length: 36
Elastic IP
API Reference 5 API V3
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 248

--- Page 255 ---
Parameter Mandatory Type Description
name_en No String ● Bandwidth type in English.
Minimum length: 0
Maximum length: 256
name_zh No String ● Bandwidth type in Chinese.
Minimum length: 0
Maximum length: 256
public_border
_group
No String ● Whether the bandwidth
type is in a central region
or an edge site.
Minimum length: 0
Maximum length: 36
sort_key No String ● Sort. Format:
"sort_key=id&sort_dir=asc"
● Supported fields: id,
bandwidth_type, and
public_border_group.
Minimum length: 0
Maximum length: 1024
sort_dir No String ● Sorting direction.
● The value can be asc or
desc
Minimum length: 0
Maximum length: 1024
limit No Integer ● Number of records
returned on each page.
● The value ranges from 0 to
2,000. The maximum value
varies by region.
Minimum value: 0
Maximum value: 2000
 
Request Parameter
None
Response Parameters
Status code: 200
Elastic IP
API Reference 5 API V3
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 249

--- Page 256 ---
Table 5-50 Response body parameters
Parameter Type Description
share_bandwi
dth_types
Array of
ShareBandwi
dthTypeShow
Resp objects
Shared bandwidth type.
request_id String Request ID.
page_info PageInfoOpti
on object
Pagination page number information.
 
Table 5-51 ShareBandwidthTypeShowResp
Parameter Type Description
id String Bandwidth type ID.
Minimum length: 0
Maximum length: 36
bandwidth_ty
pe
String Bandwidth type.
Minimum length: 0
Maximum length: 36
public_border
_group
String Central region or edge site. The parameter is
displayed by default.
Minimum length: 0
Maximum length: 64
created_at String Assigning time
Minimum length: 0
Maximum length: 64
updated_at String Update time
Minimum length: 0
Maximum length: 64
name_en String Bandwidth type in English.
Minimum length: 0
Maximum length: 256
name_zh String Bandwidth type in Chinese.
Minimum length: 0
Maximum length: 256
Elastic IP
API Reference 5 API V3
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 250

--- Page 257 ---
Parameter Type Description
description String Bandwidth type description.
Minimum length: 0
Maximum length: 1024
 
Table 5-52 PageInfoOption
Parameter Type Description
previous_mar
ker
String Marker value of the previous page.
Minimum length: 0
Maximum length: 36
next_marker String Marker value of the next page.
Minimum length: 0
Maximum length: 36
current_count Integer Total number of data records on the current
page.
Minimum value: 0
Maximum value: 99999
 
Example Request
None
Example Response
Status code: 200
Normal response to the GET operation
{
  "share_bandwidth_types" : [ {
    "id" : "1b478471-eaf1-4a71-9c77-edba89f62016",
    "bandwidth_type" : "share",
    "name_en" : "share_bandwidth_type",
    "description" : null,
    "created_at" : "2021-09-29T04:19:22Z",
    "updated_at" : "2021-09-29T04:19:22Z",
    "public_border_group" : "center"
  }, {
    "id" : "2bbb2990-e908-46a7-b664-03d3084af032",
    "bandwidth_type" : "edgeshare",
    "name_en" : "edge_share_bandwidth_type",
    "description" : null,
    "created_at" : "2021-09-29T04:19:22Z",
    "updated_at" : "2021-09-29T04:19:22Z",
    "public_border_group" : "az1"
  } ],
  "request_id" : "07f05e3d-b688-43f8-bda2-e9d10d2352e9",
  "page_info" : {
Elastic IP
API Reference 5 API V3
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 251

--- Page 258 ---
    "previous_marker" : "1b478471-eaf1-4a71-9c77-edba89f62016",
    "current_count" : 2
  }
}
Status Codes
See Status Codes.
Error Codes
See Error Codes.
5.3 Bandwidths
5.3.1 Querying Bandwidths (Old APIs)
Function
This API is used to query bandwidths.
URI
GET /v3/{project_id}/eip-bandwidths
Table 5-53 Path parameters
Parameter Mandatory Type Description
project_id Yes String Project ID
Maximum length: 32
 
Table 5-54 Query parameters
Parameter Mandatory Type Description
limit No String ● Number of records
returned on each page.
● The value ranges from 1 to
2000. The maximum value
varies by region.
marker No String ● Start resource ID of
pagination query. If the
parameter is left blank,
only resources on the first
page are queried.
Minimum length: 0
Maximum length: 36
Elastic IP
API Reference 5 API V3
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 252

--- Page 259 ---
Parameter Mandatory Type Description
id No String ● Bandwidth ID, which
uniquely identifies a
bandwidth
bandwidth_ty
pe
No String ● Bandwidth type. The
default value for a shared
bandwidth is share.
● The value can be share,
bgp, telcom, or sbgp.
– share: Shared
bandwidth
– bgp: Dynamic BGP
– telcom: China Unicom
– sbgp: Static BGP
name No String ● Bandwidth name. You can
filter by bandwidth name.
name_like No String ● Fuzzy search by bandwidth
name.
tenant_id No String ● Filter by the tenant ID.
ingress_size No String ● Filter by inbound
bandwidth size.
admin_state No String ● Filter by bandwidth status.
billing_info No String ● Filter by billing information.
tags No String ● Filter by tag.
enable_band
width_rules
No String ● Filter based on whether
bandwidth rules are
enabled.
● The value can be true or
false.
rule_quota No Integer ● Filter by rule numbers.
public_border
_group
No String ● Filter by border group.
Elastic IP
API Reference 5 API V3
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 253

--- Page 260 ---
Parameter Mandatory Type Description
charge_mode No String ● Whether the bandwidth is
billed by traffic, bandwidth,
or 95th percentile
bandwidth (enhanced).
● Possible values can be
bandwidth (billed by
bandwidth), traffic (billed
by traffic), or 95peak_plus
(billed by enhanced 95th
percentile bandwidth). If
the value is an empty
character string or no value
is specified, value
bandwidth is used.
● Only the shared bandwidth
supports 95peak_plus
(billed by enhanced 95th
percentile bandwidth). If
you choose to be billed by
95th percentile bandwidth
(enhanced), you need to
specify the guaranteed
bandwidth percentage. The
default value is 20%.
Elastic IP
API Reference 5 API V3
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 254

--- Page 261 ---
Parameter Mandatory Type Description
size No String ● Bandwidth size. The shared
bandwidth has a minimum
limit, which may vary by
site. The default minimum
value is 5 Mbit/s.
● The value ranges from 5
Mbit/s to 2000 Mbit/s by
default. (The specific range
may vary depending on the
configuration in each
region. You can see the
available bandwidth range
on the management
console.)
The minimum increment
for bandwidth adjustment
varies by the bandwidth
range.
● The minimum increment is
1 Mbit/s if the allowed
bandwidth ranges from 0
Mbit/s to 300 Mbit/s (with
300 Mbit/s included).
● The minimum increment is
50 Mbit/s if the allowed
bandwidth ranges from 300
Mbit/s to 1000 Mbit/s (with
1000 Mbit/s included).
● The minimum increment is
500 Mbit/s if the allowed
bandwidth is greater than
1000 Mbit/s.
type No String ● Whether the bandwidth is
shared or dedicated.
● The value can be PER or
WHOLE.
– WHOLE: Shared
bandwidth
– PER: Dedicated
bandwidth
 
Request Parameters
None
Elastic IP
API Reference 5 API V3
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 255

--- Page 262 ---
Response Parameters
Status code: 200
Table 5-55 Response body parameters
Parameter Type Description
eip_bandwidths Array of
EipBandwidthRes
ponseBody
objects
Bandwidths
page_info PageInfoDict
object
Pagination page number information
request_id String Request ID
 
Table 5-56 EipBandwidthResponseBody
Parameter Type Description
admin_state String ● Bandwidth status
● The value can be normal or
freezed.
ingress_size Integer ● Inbound bandwidth size in Mbit/s
rule_quota Integer ● Number of bandwidth rules. The
minimum value can be adjusted.
ratio_95peak_plus Integer ● Guaranteed rate of the enhanced
95th percentile bandwidth. The
minimum rate is 20%.
enable_bandwidth
_rules
Boolean ● Whether to enable the bandwidth
rules.
bandwidth_rules Array of
BandWidthRules
objects
● Bandwidth rules (This parameter is
available only in CN East-
Shanghai1.)
public_border_gro
up
String ● Whether it is a central or edge
bandwidth. Value center indicates a
central bandwidth.
Elastic IP
API Reference 5 API V3
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 256

--- Page 263 ---
Parameter Type Description
bandwidth_type String ● Bandwidth type. The default value
for a shared bandwidth is share.
● The value can be share, bgp,
telcom, or sbgp.
share: Shared bandwidth
bgp: Dynamic BGP
telcom: China Unicom
sbgp: Static BGP
Minimum length: 1
Maximum length: 36
billinginfo String ● Billing information
Minimum length: 0
Maximum length: 255
id String ● Bandwidth ID, which uniquely
identifies a bandwidth
Minimum length: 1
Maximum length: 36
name String ● Bandwidth name
● The value can contain 1 to 64
characters, including letters, digits,
underscores (_), hyphens (-), and
periods (.).
Minimum length: 1
Maximum length: 64
publicip_info Array of
PublicipInfoRes-
ponseBody
objects
● EIP associated with the bandwidth
● The bandwidth, whose type is set to
WHOLE, can be used by multiple
EIPs. The bandwidth, whose type is
set to PER, can be used by only one
EIP.
type String ● Whether the bandwidth is shared or
dedicated.
● The value can be PER or WHOLE.
The value WHOLE indicates the
shared bandwidth, and the value
PER indicates the dedicated
bandwidth.
Elastic IP
API Reference 5 API V3
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 257

--- Page 264 ---
Parameter Type Description
size Integer ● Bandwidth size
● The value ranges from 5 Mbit/s to
2000 Mbit/s by default. (The
specific range may vary depending
on the configuration in each region.
You can see the available
bandwidth range on the
management console.)
Minimum value: 5
Maximum value: 2000
tenant_id String ● Project ID
tags Array of strings ● EIP tag
created_at String ● Time (UTC) when a resource is
created. The format is YYYY-MM-
DDTHH:MM:SS.
updated_at String ● Time (UTC) when a resource is
updated. The format is YYYY-MM-
DDTHH:MM:SS.
 
Table 5-57 BandWidthRules
Parameter Type Description
id String ● Bandwidth rule ID
Maximum length: 36
name String ● Bandwidth rule name
Minimum length: 0
Maximum length: 64
admin_state_up Boolean ● Configuration status. The value
False indicates that the
configuration does not take effect.
egress_size Integer ● Maximum outbound bandwidth in
Mbit/s
● The value range ranges from 0 to n,
where n indicates the bandwidth
size. If the value is set to 0, the
maximum bandwidth size will be
used.
Minimum value: 0
Default value: 0
Elastic IP
API Reference 5 API V3
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 258

--- Page 265 ---
Parameter Type Description
egress_guarented_
size
Integer ● Guaranteed outbound bandwidth in
Mbit/s
● The value ranges from 0 to x, where
x indicates the remaining
bandwidth.
Minimum value: 0
Default value: 0
publicip_info Array of
PublicipInfoRes-
ponseBody
objects
● EIP associated with the bandwidth
● The bandwidth, whose type is set to
WHOLE, can be used by multiple
EIPs. The bandwidth, whose type is
set to PER, can be used by only one
EIP.
 
Table 5-58 PublicipInfoResponseBody
Parameter Type Description
publicip_address String ● IPv4 or IPv6 EIP
publicip_id String ● ID of the IPv4 or IPv6 EIP that uses
the bandwidth
Minimum length: 1
Maximum length: 36
publicip_type String ● EIP type
● The value can be 5_bgp.
● Constraints:
– The configured value must be
supported by the system.
– publicip_id is an IPv4 port. If
type is not specified, the default
value is 5_bgp.
Maximum length: 36
publicipv6_addres
s
String ● Obtained EIP if IPv6 EIPs are
available. This parameter does not
exist if only IPv4 EIPs are available.
ip_version Integer ● IP address version
● The value can be:
4: IPv4
6: IPv6
 
Elastic IP
API Reference 5 API V3
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 259

--- Page 266 ---
Table 5-59 PageInfoDict
Parameter Type Description
previous_marker String Marker value of the previous page
next_marker String Marker value of the next page
current_count Integer Total number of data records on the
current page
 
Example Request
Query the bandwidths. You can filter the bandwidths based on the query field.
GET https://{Endpoint}/v3/{project_id}/eip-bandwidths?limit=3&marker=4779ab1c-7c1a-44b1-
a02e-93dfc361b32d
Example Response
Status code: 200
Normal response to the GET operation
{
  "request_id" : "4e5945ddd409f306b3cb4fd921a45390",
  "eip_bandwidths" : [ {
    "name" : "bandwidth-838f",
    "id" : "08b4700e-cc3c-4aed-a35a-66022bcbd0f6",
    "tenant_id" : "cb576f8cf0df40b8bb6cea0a1765c569",
    "size" : 10,
    "bandwidth_type" : "bgp",
    "ratio_95peak_plus" : null,
    "admin_state" : "NORMAL",
    "ingress_size" : 10,
    "type" : "PER",
    "enable_bandwidth_rules" : false,
    "rule_quota" : 0,
    "created_at" : "2023-05-17T02:06:49Z",
    "updated_at" : "2023-05-17T02:06:49Z",
    "bandwidth_rules" : [ ],
    "publicip_info" : [ {
      "publicip_address" : "10.83.15.65",
      "publicip_type" : "5_bgp",
      "publicip_id" : "e73fcc26-c009-4ea3-9b57-d546359bda38",
      "ip_version" : 4,
      "publicipv6_address" : null
    } ],
    "tags" : [ ],
    "public_border_group" : "center"
  } ],
  "page_info" : [ {
    "next_marker" : "08b4700e-cc3c-4aed-a35a-66022bcbd0f6",
    "previous_marker" : "08b4700e-cc3c-4aed-a35a-66022bcbd0f6",
    "current_count" : 1
  } ]
}
SDK Sample Code
The sample code is as follows:
Elastic IP
API Reference 5 API V3
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 260

--- Page 267 ---
Java
package com.huaweicloud.sdk.test;
import com.huaweicloud.sdk.core.auth.ICredential;
import com.huaweicloud.sdk.core.auth.BasicCredentials;
import com.huaweicloud.sdk.core.exception.ConnectionException;
import com.huaweicloud.sdk.core.exception.RequestTimeoutException;
import com.huaweicloud.sdk.core.exception.ServiceResponseException;
import com.huaweicloud.sdk.eip.v3.region.EipRegion;
import com.huaweicloud.sdk.eip.v3.*;
import com.huaweicloud.sdk.eip.v3.model.*;
public class ListEipBandwidthsSolution {
    public static void main(String[] args) {
        // The AK and SK used for authentication are hard-coded or stored in plaintext, which has great 
security risks. It is recommended that the AK and SK be stored in ciphertext in configuration files or 
environment variables and decrypted during use to ensure security.
        // In this example, AK and SK are stored in environment variables for authentication. Before running 
this example, set environment variables CLOUD_SDK_AK and CLOUD_SDK_SK in the local environment
        String ak = System.getenv("CLOUD_SDK_AK");
        String sk = System.getenv("CLOUD_SDK_SK");
        String projectId = "{project_id}";
        ICredential auth = new BasicCredentials()
                .withProjectId(projectId)
                .withAk(ak)
                .withSk(sk);
        EipClient client = EipClient.newBuilder()
                .withCredential(auth)
                .withRegion(EipRegion.valueOf("<YOUR REGION>"))
                .build();
        ListEipBandwidthsRequest request = new ListEipBandwidthsRequest();
        try {
            ListEipBandwidthsResponse response = client.listEipBandwidths(request);
            System.out.println(response.toString());
        } catch (ConnectionException e) {
            e.printStackTrace();
        } catch (RequestTimeoutException e) {
            e.printStackTrace();
        } catch (ServiceResponseException e) {
            e.printStackTrace();
            System.out.println(e.getHttpStatusCode());
            System.out.println(e.getRequestId());
            System.out.println(e.getErrorCode());
            System.out.println(e.getErrorMsg());
        }
    }
}
Python
# coding: utf-8
import os
from huaweicloudsdkcore.auth.credentials import BasicCredentials
from huaweicloudsdkeip.v3.region.eip_region import EipRegion
from huaweicloudsdkcore.exceptions import exceptions
from huaweicloudsdkeip.v3 import *
if __name__ == "__main__":
    # The AK and SK used for authentication are hard-coded or stored in plaintext, which has great security 
risks. It is recommended that the AK and SK be stored in ciphertext in configuration files or environment 
variables and decrypted during use to ensure security.
    # In this example, AK and SK are stored in environment variables for authentication. Before running this 
example, set environment variables CLOUD_SDK_AK and CLOUD_SDK_SK in the local environment
Elastic IP
API Reference 5 API V3
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 261

--- Page 268 ---
    ak = os.environ["CLOUD_SDK_AK"]
    sk = os.environ["CLOUD_SDK_SK"]
    projectId = "{project_id}"
    credentials = BasicCredentials(ak, sk, projectId)
    client = EipClient.new_builder() \
        .with_credentials(credentials) \
        .with_region(EipRegion.value_of("<YOUR REGION>")) \
        .build()
    try:
        request = ListEipBandwidthsRequest()
        response = client.list_eip_bandwidths(request)
        print(response)
    except exceptions.ClientRequestException as e:
        print(e.status_code)
        print(e.request_id)
        print(e.error_code)
        print(e.error_msg)
Go
package main
import (
    "fmt"
    "github.com/huaweicloud/huaweicloud-sdk-go-v3/core/auth/basic"
    eip "github.com/huaweicloud/huaweicloud-sdk-go-v3/services/eip/v3"
    "github.com/huaweicloud/huaweicloud-sdk-go-v3/services/eip/v3/model"
    region "github.com/huaweicloud/huaweicloud-sdk-go-v3/services/eip/v3/region"
)
func main() {
    // The AK and SK used for authentication are hard-coded or stored in plaintext, which has great security 
risks. It is recommended that the AK and SK be stored in ciphertext in configuration files or environment 
variables and decrypted during use to ensure security.
    // In this example, AK and SK are stored in environment variables for authentication. Before running this 
example, set environment variables CLOUD_SDK_AK and CLOUD_SDK_SK in the local environment
    ak := os.Getenv("CLOUD_SDK_AK")
    sk := os.Getenv("CLOUD_SDK_SK")
    projectId := "{project_id}"
    auth := basic.NewCredentialsBuilder().
        WithAk(ak).
        WithSk(sk).
        WithProjectId(projectId).
        Build()
    client := eip.NewEipClient(
        eip.EipClientBuilder().
            WithRegion(region.ValueOf("<YOUR REGION>")).
            WithCredential(auth).
            Build())
    request := &model.ListEipBandwidthsRequest{}
    response, err := client.ListEipBandwidths(request)
    if err == nil {
        fmt.Printf("%+v\n", response)
    } else {
        fmt.Println(err)
    }
}
More SDK Sample Code
For more SDK sample codes of programming languages, visit API Explorer and
click the Sample Code tab. Example codes can be automatically generated.
Elastic IP
API Reference 5 API V3
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 262

--- Page 269 ---
Status Codes
Status
Code
Description
200 Normal response to the GET operation
 
Error Codes
See Error Codes.
5.3.2 Viewing Bandwidth Limits
Function
This API is used to obtain the EIP bandwidth limits. You can call this API to query
data about a bandwidth, including its billing mode and upper and lower limits.
URI
GET /v3/{project_id}/eip/eip-bandwidth-limits
Table 5-60 Path parameters
Parameter Mandatory Type Description
project_id Yes String Project ID
Maximum length: 32
 
Table 5-61 Query parameters
Parameter Mandatory Type Description
limit No Integer Number of records on each
page
Minimum value: 0
Maximum value: 2000
offset No Integer Start page number
marker No String Start page number
page_reverse No Boolean Direction of page turning
fields No Array of
strings
Display only the specified
fields. If ext-fields is used,
fields are added in addition to
the default ones.
charge_mode No String Filter by billing mode
Elastic IP
API Reference 5 API V3
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 263

--- Page 270 ---
 
Request Parameters
None
Response Parameters
Status code: 200
Table 5-62 Response body parameters
Parameter Type Description
eip_bandwidth_li
mits
Array of
ShowTenantDict
objects
Bandwidth limits
Array length: 0 to 2000
page_info PageInfoDict
object
Pagination page number information
request_id String Request ID
 
Table 5-63 ShowTenantDict
Parameter Type Description
id String ● EIP ID, which uniquely identifies the
EIP.
Minimum length: 36
Maximum length: 36
charge_mode String Bandwidth billing mode
min_size Integer Minimum size of the bandwidth that
can be purchased
max_size Integer Maximum size of the bandwidth that
can be purchased
ext_limit ExtLimitPojo
object
Additional limits
 
Table 5-64 ExtLimitPojo
Parameter Type Description
min_ingress_size Integer ● Minimum inbound bandwidth
max_ingress_size Integer ● Maximum inbound bandwidth
Elastic IP
API Reference 5 API V3
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 264

--- Page 271 ---
Parameter Type Description
ratio_95peak Integer Minimum ratio of 95th percentile
billing
 
Table 5-65 PageInfoDict
Parameter Type Description
previous_marker String Marker value of the previous page
next_marker String Marker value of the next page
current_count Integer Total number of data records on the
current page
 
Example Request
Query the bandwidth limits. You can filter the bandwidth limits based on the
query field.
GET https://{Endpoint}/v3/{project_id}/eip/eip-bandwidth-limits
Example Response
Status code: 200
Normal response to the GET operation
{
  "request_id" : "4e5945ddd409f306b3cb4fd921a45390",
  "eip_bandwidth_limits" : [ {
    "id" : "08b4700e-cc3c-4aed-a35a-66022bcbd0f6",
    "charge_mode" : "bandwidth",
    "min_size" : 1,
    "max_size" : 500,
    "ext_limit" : null
  }, {
    "id" : "8a6990e6-638c-4a80-9da7-3c1a465ccf59",
    "charge_mode" : "traffic",
    "min_size" : 5,
    "max_size" : 2000,
    "ext_limit" : null
  } ],
  "page_info" : [ {
    "previous_marker" : "08b4700e-cc3c-4aed-a35a-66022bcbd0f6",
    "current_count" : 2
  } ]
}
SDK Sample Code
The sample code is as follows:
Java
package com.huaweicloud.sdk.test;
Elastic IP
API Reference 5 API V3
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 265

--- Page 272 ---
import com.huaweicloud.sdk.core.auth.ICredential;
import com.huaweicloud.sdk.core.auth.BasicCredentials;
import com.huaweicloud.sdk.core.exception.ConnectionException;
import com.huaweicloud.sdk.core.exception.RequestTimeoutException;
import com.huaweicloud.sdk.core.exception.ServiceResponseException;
import com.huaweicloud.sdk.eip.v3.region.EipRegion;
import com.huaweicloud.sdk.eip.v3.*;
import com.huaweicloud.sdk.eip.v3.model.*;
public class ListBandwidthsLimitSolution {
    public static void main(String[] args) {
        // The AK and SK used for authentication are hard-coded or stored in plaintext, which has great 
security risks. It is recommended that the AK and SK be stored in ciphertext in configuration files or 
environment variables and decrypted during use to ensure security.
        // In this example, AK and SK are stored in environment variables for authentication. Before running 
this example, set environment variables CLOUD_SDK_AK and CLOUD_SDK_SK in the local environment
        String ak = System.getenv("CLOUD_SDK_AK");
        String sk = System.getenv("CLOUD_SDK_SK");
        String projectId = "{project_id}";
        ICredential auth = new BasicCredentials()
                .withProjectId(projectId)
                .withAk(ak)
                .withSk(sk);
        EipClient client = EipClient.newBuilder()
                .withCredential(auth)
                .withRegion(EipRegion.valueOf("<YOUR REGION>"))
                .build();
        ListBandwidthsLimitRequest request = new ListBandwidthsLimitRequest();
        try {
            ListBandwidthsLimitResponse response = client.listBandwidthsLimit(request);
            System.out.println(response.toString());
        } catch (ConnectionException e) {
            e.printStackTrace();
        } catch (RequestTimeoutException e) {
            e.printStackTrace();
        } catch (ServiceResponseException e) {
            e.printStackTrace();
            System.out.println(e.getHttpStatusCode());
            System.out.println(e.getRequestId());
            System.out.println(e.getErrorCode());
            System.out.println(e.getErrorMsg());
        }
    }
}
Python
# coding: utf-8
import os
from huaweicloudsdkcore.auth.credentials import BasicCredentials
from huaweicloudsdkeip.v3.region.eip_region import EipRegion
from huaweicloudsdkcore.exceptions import exceptions
from huaweicloudsdkeip.v3 import *
if __name__ == "__main__":
    # The AK and SK used for authentication are hard-coded or stored in plaintext, which has great security 
risks. It is recommended that the AK and SK be stored in ciphertext in configuration files or environment 
variables and decrypted during use to ensure security.
    # In this example, AK and SK are stored in environment variables for authentication. Before running this 
example, set environment variables CLOUD_SDK_AK and CLOUD_SDK_SK in the local environment
    ak = os.environ["CLOUD_SDK_AK"]
    sk = os.environ["CLOUD_SDK_SK"]
    projectId = "{project_id}"
Elastic IP
API Reference 5 API V3
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 266

--- Page 273 ---
    credentials = BasicCredentials(ak, sk, projectId)
    client = EipClient.new_builder() \
        .with_credentials(credentials) \
        .with_region(EipRegion.value_of("<YOUR REGION>")) \
        .build()
    try:
        request = ListBandwidthsLimitRequest()
        response = client.list_bandwidths_limit(request)
        print(response)
    except exceptions.ClientRequestException as e:
        print(e.status_code)
        print(e.request_id)
        print(e.error_code)
        print(e.error_msg)
Go
package main
import (
    "fmt"
    "github.com/huaweicloud/huaweicloud-sdk-go-v3/core/auth/basic"
    eip "github.com/huaweicloud/huaweicloud-sdk-go-v3/services/eip/v3"
    "github.com/huaweicloud/huaweicloud-sdk-go-v3/services/eip/v3/model"
    region "github.com/huaweicloud/huaweicloud-sdk-go-v3/services/eip/v3/region"
)
func main() {
    // The AK and SK used for authentication are hard-coded or stored in plaintext, which has great security 
risks. It is recommended that the AK and SK be stored in ciphertext in configuration files or environment 
variables and decrypted during use to ensure security.
    // In this example, AK and SK are stored in environment variables for authentication. Before running this 
example, set environment variables CLOUD_SDK_AK and CLOUD_SDK_SK in the local environment
    ak := os.Getenv("CLOUD_SDK_AK")
    sk := os.Getenv("CLOUD_SDK_SK")
    projectId := "{project_id}"
    auth := basic.NewCredentialsBuilder().
        WithAk(ak).
        WithSk(sk).
        WithProjectId(projectId).
        Build()
    client := eip.NewEipClient(
        eip.EipClientBuilder().
            WithRegion(region.ValueOf("<YOUR REGION>")).
            WithCredential(auth).
            Build())
    request := &model.ListBandwidthsLimitRequest{}
    response, err := client.ListBandwidthsLimit(request)
    if err == nil {
        fmt.Printf("%+v\n", response)
    } else {
        fmt.Println(err)
    }
}
More SDK Sample Code
For more SDK sample codes of programming languages, visit API Explorer and
click the Sample Code tab. Example codes can be automatically generated.
Elastic IP
API Reference 5 API V3
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 267

--- Page 274 ---
Status Codes
Status
Code
Description
200 Normal response to the GET operation
 
Error Codes
See Error Codes.
5.4 Common Pools
5.4.1 Querying Common Pools
Function
This API is used to query common pools.
URI
GET /v3/{project_id}/eip/publicip-pools/common-pools
Table 5-66 Path parameter
Parameter Mandatory Type Description
project_id Yes String ● Project ID.
Minimum length: 0
Maximum length: 32
 
Table 5-67 Query parameters
Parameter Mandatory Type Description
fields No String ● Field. Format:
"fields=id&fields=name&.."
● Supported fields: id, name,
status, type, used,
allow_share_bandwidth_t
ypes, and
public_border_group.
Minimum length: 0
Maximum length: 1024
Elastic IP
API Reference 5 API V3
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 268

--- Page 275 ---
Parameter Mandatory Type Description
name No String ● Common pool name.
Minimum length: 0
Maximum length: 36
public_border
_group
No String ● Whether the common pool
is in a central region or an
edge site.
Minimum length: 0
Maximum length: 64
 
Request Parameter
None
Response Parameters
Status code: 200
Table 5-68 Response body parameters
Parameter Type Description
common_pool
s
Array of
CommonPool
Dict objects
Common pool.
request_id String Request ID.
 
Table 5-69 CommonPoolDict
Parameter Type Description
name String ● Common pool name.
Minimum length: 0
Maximum length: 36
status String ● Common pool status
Minimum length: 0
Maximum length: 36
type String ● Common pool type, such as bgp.
Minimum length: 0
Maximum length: 36
Elastic IP
API Reference 5 API V3
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 269

--- Page 276 ---
Parameter Type Description
used Integer ● Number of used EIPs.
Minimum value: 0
Maximum value: 99999
public_border
_group
String ● Whether the resource is in a central region
or an edge site.
● The value can be center or an edge site
name.
● This resource can only be associated with an
EIP of the same region.
Minimum length: 1
Maximum length: 64
id String ● Common pool ID. The parameter is not
displayed by default.
Minimum length: 0
Maximum length: 36
allow_share_b
andwidth_typ
es
Array of
strings
● Types of the shared bandwidth that an EIP
can be added to. If this parameter is left
blank, the EIP cannot be added to any
shared bandwidth.
● The EIP can be added only to the shared
bandwidth of these types.
Maximum length: 64
 
Example Request
None
Example Response
Status code: 200
Normal response to the GET operation
{
  "common_pools" : [ {
    "name" : "5_bgp",
    "status" : "active",
    "type" : "bgp",
    "used" : 99,
    "public_border_group" : "center",
    "allow_share_bandwidth_types" : [ "share" ]
  } ],
  "request_id" : "4a06c169-cc67-4d94-a786-2d70ef09b100"
}
Status Codes
See Status Codes.
Elastic IP
API Reference 5 API V3
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 270

--- Page 277 ---
Error Codes
See Error Codes.
5.4.2 Querying EIP Pools
Function
This API is used to query EIP pools.
URI
GET /v3/{project_id}/eip/publicip-pools
Table 5-70 Path parameter
Parameter Mandatory Type Description
project_id Yes String ● Project ID.
Minimum length: 0
Maximum length: 32
 
Table 5-71 Query parameters
Parameter Mandatory Type Description
marker No String ● Start resource ID of
pagination query. If the
parameter is left blank,
only resources on the first
page are queried.
Minimum length: 0
Maximum length: 36
limit No Integer ● Number of records
returned on each page.
● The value ranges from 0 to
2,000. The maximum value
varies by region.
Minimum value: 0
Maximum value: 2000
Elastic IP
API Reference 5 API V3
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 271

--- Page 278 ---
Parameter Mandatory Type Description
fields No String ● Field. Format:
"fields=id&fields=name&..."
● Supported fields: id, name,
size, used, project_id,
status, billing_info,
created_at, updated_at,
type, shared, is_common,
description, tags,
enterprise_project_id,
allow_share_bandwidth_t
ypes, and
public_border_group.
Minimum length: 0
Maximum length: 1024
sort_key No String ● Sort. Format:
"sort_key=id&sort_dir=asc"
● Supported fields: id, name,
created_at, updated_at,
and public_border_group.
Minimum length: 0
Maximum length: 36
sort_dir No String ● Sorting direction.
● The value can be asc or
desc
Minimum length: 0
Maximum length: 16
id No String ● Filter by id.
Minimum length: 0
Maximum length: 36
name No String ● Filter by name.
Minimum length: 0
Maximum length: 128
size No Integer ● Filter by size.
Minimum value: 0
Maximum value: 999999
status No String ● Filter by status.
Minimum length: 0
Maximum length: 36
Elastic IP
API Reference 5 API V3
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 272

--- Page 279 ---
Parameter Mandatory Type Description
type No String ● Filter by type.
Minimum length: 0
Maximum length: 36
description No String ● Filter by description.
Minimum length: 0
Maximum length: 1024
public_border
_group
No String ● Filter by
public_border_group.
Minimum length: 0
Maximum length: 64
 
Request Parameter
None
Response Parameters
Status code: 200
Table 5-72 Response body parameters
Parameter Type Description
publicip_pools Array of
PublicipPoolS
howResp
objects
EIP pool.
request_id String Request ID.
page_info PageInfoOpti
on object
Pagination page number information.
 
Table 5-73 PublicipPoolShowResp
Parameter Type Description
id String ● EIP pool ID.
Minimum length: 1
Maximum length: 36
Elastic IP
API Reference 5 API V3
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 273

--- Page 280 ---
Parameter Type Description
name String ● EIP pool name.
Minimum length: 0
Maximum length: 64
status String ● EIP pool status.
Minimum length: 0
Maximum length: 36
type String ● EIP pool type.
● The value can be:
– spec_bgp: Dynamic
– spec_sbgp: Static
Enumerated values:
● spec_bgp
● spec_sbgp
description String ● Supplementary information about the EIP
pool.
Minimum length: 0
Maximum length: 1024
project_id String ● Tenant ID.
Minimum length: 1
Maximum length: 36
size Integer ● EIP pool size.
Minimum value: 0
Maximum value: 999999
used Integer ● Number of used EIPs.
Minimum value: 0
Maximum value: 999999
created_at String ● Time when an EIP pool is assigned.
Minimum length: 0
Maximum length: 64
updated_at String ● Time when an EIP pool is updated.
Minimum length: 0
Maximum length: 64
billing_info BillingInfoDic
t object
Order information, which is available only for
yearly/monthly resources.
Elastic IP
API Reference 5 API V3
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 274

--- Page 281 ---
Parameter Type Description
public_border
_group
String ● Whether the EIP pool is in a central region
or an edge site. The value can be center.
Minimum length: 0
Maximum length: 64
shared Boolean ● Whether the EIP pool is shared.
is_common Boolean ● Whether the EIP pool is a common pool.
tags Array of
TagsInfo
objects
● User tag. (The parameter is not displayed by
default.)
enterprise_pro
ject_id
String ● Enterprise project ID. The value is 0 or a
string that contains a maximum of 36
characters in UUID format with hyphens (-).
This is the ID of the enterprise project that
you associate with the EIP when you assign
the EIP.
Minimum length: 0
Maximum length: 36
allow_share_b
andwidth_typ
es
Array of
strings
● Types of the shared bandwidth that an EIP
can be added to. If this parameter is left
blank, the EIP cannot be added to any
shared bandwidth.
● The EIP can be added only to the shared
bandwidth of these types.
Maximum length: 64
 
Table 5-74 BillingInfoDict
Parameter Type Description
order_id String ● Order information.
Minimum length: 0
Maximum length: 64
product_id String ● Product ID.
Minimum length: 0
Maximum length: 64
 
Elastic IP
API Reference 5 API V3
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 275

--- Page 282 ---
Table 5-75 TagsInfo
Parameter Type Description
key String ● Key. The tag key of a resource must be
unique.
Minimum length: 0
Maximum length: 64
value String ● Values.
Minimum length: 0
Maximum length: 256
 
Table 5-76 PageInfoOption
Parameter Type Description
previous_mar
ker
String Marker value of the previous page.
Minimum length: 0
Maximum length: 36
next_marker String Marker value of the next page.
Minimum length: 0
Maximum length: 36
current_count Integer Total number of data records on the current
page.
Minimum value: 0
Maximum value: 99999
 
Example Request
None
Example Response
Status code: 200
Normal response to the GET operation
{
  "publicip_pools" : [ {
    "id" : "f588ccfa-8750-4d7c-bf5d-2ede24414706",
    "name" : "test_pool_xxx",
    "status" : "active",
    "shared" : true,
    "is_common" : false,
    "enterprise_project_id" : 0,
    "type" : "spec_bgp",
    "project_id" : "8b7e35ad379141fc9df3e178bd64f55c",
    "size" : 100,
    "used" : 20,
Elastic IP
API Reference 5 API V3
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 276

--- Page 283 ---
    "billing_info" : {
      "order_id" : "CS20081917179HW3H",
      "product_id" : "00301-335034-0--0"
    },
    "created_at" : "2020-07-17T09:25:53Z",
    "updated_at" : "2020-07-17T09:25:53Z",
    "description" : "test",
    "public_border_group" : "center",
    "allow_share_bandwidth_types" : [ "share" ]
  } ],
  "request_id" : "4a06c169-cc67-4d94-a786-2d70ef09b100",
  "page_info" : {
    "previous_marker" : "f588ccfa-8750-4d7c-bf5d-2ede24414706",
    "current_count" : 1
  }
}
Status Codes
See Status Codes.
Error Codes
See Error Codes.
5.4.3 Querying EIP Pool Details
Function
This API is used to query EIP pool details.
URI
GET /v3/{project_id}/eip/publicip-pools/{publicip_pool_id}
Table 5-77 Path parameters
Parameter Mandatory Type Description
project_id Yes String Project ID.
Minimum length: 1
Maximum length: 32
publicip_pool_
id
Yes String EIP pool ID, which uniquely
identifies the EIP pool.
Minimum length: 36
Maximum length: 36
 
Elastic IP
API Reference 5 API V3
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 277

--- Page 284 ---
Table 5-78 Query parameter
Parameter Mandatory Type Description
fields No String ● Field. Format:
"fields=id&fields=name&..."
● Supported fields: id, name,
size, used, project_id,
status, billing_info,
created_at, updated_at,
type, shared, is_common,
description, tags,
enterprise_project_id,
allow_share_bandwidth_t
ypes, and
public_border_group.
Minimum length: 0
Maximum length: 1024
 
Request Parameter
None
Response Parameters
Status code: 200
Table 5-79 Response body parameters
Parameter Type Description
publicip_pool PublicipPoolS
howResp
object
EIP pool details.
request_id String Request ID.
 
Table 5-80 PublicipPoolShowResp
Parameter Type Description
id String ● EIP pool ID.
Minimum length: 1
Maximum length: 36
name String ● EIP pool name.
Minimum length: 0
Maximum length: 64
Elastic IP
API Reference 5 API V3
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 278

--- Page 285 ---
Parameter Type Description
status String ● EIP pool status.
Minimum length: 0
Maximum length: 36
type String ● EIP pool type.
● The value can be:
– spec_bgp: Dynamic
– spec_sbgp: Static
Enumerated values:
● spec_bgp
● spec_sbgp
description String ● Supplementary information about the EIP
pool.
Minimum length: 0
Maximum length: 1024
project_id String ● Tenant ID.
Minimum length: 1
Maximum length: 36
size Integer ● EIP pool size.
Minimum value: 0
Maximum value: 999999
used Integer ● Number of used EIPs.
Minimum value: 0
Maximum value: 999999
created_at String ● Time when an EIP pool is assigned.
Minimum length: 0
Maximum length: 64
updated_at String ● Time when an EIP pool is updated.
Minimum length: 0
Maximum length: 64
billing_info BillingInfoDic
t object
Order information, which is available only for
yearly/monthly resources.
public_border
_group
String ● Whether the EIP pool is in a central region
or an edge site. The value can be center.
Minimum length: 0
Maximum length: 64
shared Boolean ● Whether the EIP pool is shared.
Elastic IP
API Reference 5 API V3
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 279

--- Page 286 ---
Parameter Type Description
is_common Boolean ● Whether the EIP pool is a common pool.
tags Array of
TagsInfo
objects
● User tag. (The parameter is not displayed by
default.)
enterprise_pro
ject_id
String ● Enterprise project ID. The value is 0 or a
string that contains a maximum of 36
characters in UUID format with hyphens (-).
This is the ID of the enterprise project that
you associate with the EIP when you assign
the EIP.
Minimum length: 0
Maximum length: 36
allow_share_b
andwidth_typ
es
Array of
strings
● Types of the shared bandwidth that an EIP
can be added to. If this parameter is left
blank, the EIP cannot be added to any
shared bandwidth.
● The EIP can be added only to the shared
bandwidth of these types.
Maximum length: 64
 
Table 5-81 BillingInfoDict
Parameter Type Description
order_id String ● Order information.
Minimum length: 0
Maximum length: 64
product_id String ● Product ID.
Minimum length: 0
Maximum length: 64
 
Table 5-82 TagsInfo
Parameter Type Description
key String ● Key. The tag key of a resource must be
unique.
Minimum length: 0
Maximum length: 64
Elastic IP
API Reference 5 API V3
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 280

--- Page 287 ---
Parameter Type Description
value String ● Values.
Minimum length: 0
Maximum length: 256
 
Example Request
None
Example Response
Status code: 200
Normal response to the GET operation
{
  "publicip_pool" : {
    "id" : "f588ccfa-8750-4d7c-bf5d-2ede24414706",
    "name" : "test_pool_xxx",
    "status" : "active",
    "shared" : true,
    "is_common" : false,
    "enterprise_project_id" : 0,
    "type" : "spec_bgp",
    "project_id" : "8b7e35ad379141fc9df3e178bd64f55c",
    "size" : 100,
    "used" : 20,
    "billing_info" : {
      "order_id" : "CS20081917179HW3H",
      "product_id" : "00301-335034-0--0"
    },
    "created_at" : "2020-07-17T09:25:53Z",
    "updated_at" : "2020-07-17T09:25:53Z",
    "description" : "test",
    "public_border_group" : "center",
    "allow_share_bandwidth_types" : [ "share" ]
  },
  "request_id" : "4a06c169-cc67-4d94-a786-2d70ef09b100"
}
Status Codes
See Status Codes.
Error Codes
See Error Codes.
Elastic IP
API Reference 5 API V3
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 281

--- Page 288 ---
6 Native OpenStack Neutron APIs V2.0
6.1 API Version Information
6.1.1 Querying API Versions
Function
This API is used to query all available versions of a native OpenStack API.
URI
GET /
Request Parameters
None
Example Request
GET https://{Endpoint}/
Response Parameters
Table 6-1 Response parameter
Parameter Type Description
versions Array of version
objects
Specifies the API version list. For details,
see Table 6-2.
 
Elastic IP
API Reference 6 Native OpenStack Neutron APIs V2.0
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 282

--- Page 289 ---
Table 6-2 version objects
Parameter Type Description
status String Specifies the API version status. Possible
values are as follows:
● CURRENT
● STABLE
● DEPRECATED
id String Specifies the API version.
links Array of link
objects
Specifies the link list. For details, see
Table 6-3.
 
Table 6-3 link objects
Parameter Type Description
href String Specifies the API link.
rel String Specifies the relationship between the
API link and the API version.
 
Example Response
{
    "versions": [
        {
            "status": "CURRENT", 
            "id": "v2.0", 
            "links": [
                {
                    "href": "https://{Endpoint}/v2.0", 
                    "rel": "self"
                }
            ]
        }
    ]
}
Status Code
See Status Codes.
Error Code
See Error Codes.
Elastic IP
API Reference 6 Native OpenStack Neutron APIs V2.0
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 283

--- Page 290 ---
6.1.2 Pagination
Function
Neutron APIs v2.0 provides the pagination function. You can set parameters limit
and marker in the URL of the list request to enable the desired number of items
to be returned. All returned items are displayed in the ascending order of ID.
● To access the next page of the request, perform the following configurations:
– Replace the value of marker in the original access request URL. Replace
the value of marker to the value of marker in the value of href if the
value of rel in the response is next.
– Set the value of page_reverse to False.
● To access the previous page of the request, perform the following
configurations:
– Replace the value of marker in the original access request URL. Replace
the value of marker to the value of marker in the value of href if the
value of rel in the response is previous.
– Set the value of page_reverse to True.
Request Parameters
Table 6-4 Request parameter
Parameter Type Mandatory Description
limit Integer No Specifies the number of items
displayed per page.
marker String No Specifies the ID of the last item in the
previous list. If the marker value is
invalid, error code 400 will be returned.
page_revers
e
Boolean No Specifies the page direction. The value
can be True or False.
 
Example Request
● When page_reverse is set to False:
GET https://{Endpoint}/v2.0/networks?limit=2&marker=3d42a0d4-a980-4613-ae76-
a2cddecff054&page_reverse=False
● When page_reverse is set to True:
GET https://{Endpoint}/v2.0/vpc/peerings?limit=2&marker=e5a0c88e-228e-4e62-
a8b0-90825b1b7958&page_reverse=True
Elastic IP
API Reference 6 Native OpenStack Neutron APIs V2.0
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 284

--- Page 291 ---
Response Parameters
Table 6-5 Response parameter
Parameter Type Description
{resources}_link
s
Array of
{resources}_link
objects
Specifies the pagination information. For
details, see Table 6-6. {resources}
indicates the resource name, for example,
ports, networks, subnets, routers,
firewall_rules, firewall_policies,
firewall_groups, security_groups, and
security_group_rules.
Only when limit is used for filtering and
the number of resources exceeds the
value of limit or 2000 (default value of
limit), value next will be returned for rel
and a link for href.
 
Table 6-6 {resources}_link object
Paramet
er
Type Description
href String Specifies the API link.
rel String The API link is used to query the next or previous page.
next: The next page is queried. previous: The previous
page is queried.
 
Example Response
● When page_reverse is set to False:
{
    "networks": [
        {
            "status": "ACTIVE",
            "subnets": [],
            "name": "liudongtest ",
            "admin_state_up": false,
            "tenant_id": "6fbe9263116a4b68818cf1edce16bc4f",
            "id": "60c809cb-6731-45d0-ace8-3bf5626421a9"
        },
        {
            "status": "ACTIVE",
            "subnets": [
                "132dc12d-c02a-4c90-9cd5-c31669aace04"
            ],
            "name": "publicnet",
            "admin_state_up": true,
            "tenant_id": "6fbe9263116a4b68818cf1edce16bc4f",
            "id": "9daeac7c-a98f-430f-8e38-67f9c044e299"
        }
    ],
    "networks_links": [
Elastic IP
API Reference 6 Native OpenStack Neutron APIs V2.0
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 285

--- Page 292 ---
        {
            "href": "http://192.168.82.231:9696/v2.0/networks?limit=2&marker=9daeac7c-
a98f-430f-8e38-67f9c044e299",
            "rel": "next"
        },
        {
            "href": "http://192.168.82.231:9696/v2.0/networks?limit=2&marker=60c809cb-6731-45d0-
ace8-3bf5626421a9&page_reverse=True",
            "rel": "previous"
        }
    ]
}
● When page_reverse is set to True:
{
    "peerings_links": [
        {
            "marker": "dd442819-5638-401c-bd48-a82703cf0464",
            "rel": "next"
        },
        {
            "marker": "1e13cbaf-3ce4-413d-941f-66d855dbfa7f",
            "rel": "previous"
        }
    ],
    "peerings": [
        {
            "status": "ACTIVE",
            "accept_vpc_info": {
                "vpc_id": "83a48834-b9bc-4f70-aa46-074568594650",
                "tenant_id": "e41a43bf06e249678413c6d61536eff9"
            },
            "request_vpc_info": {
                "vpc_id": "db8e7687-e43b-4fc1-94cf-16f69f484d6d",
                "tenant_id": "e41a43bf06e249678413c6d61536eff9"
            },
            "name": "peering1",
            "id": "1e13cbaf-3ce4-413d-941f-66d855dbfa7f"
        },
        {
            "status": "ACTIVE",
            "accept_vpc_info": {
                "vpc_id": "83a48834-b9bc-4f70-aa46-074568594650",
                "tenant_id": "e41a43bf06e249678413c6d61536eff9"
            },
            "request_vpc_info": {
                "vpc_id": "bd63cc9e-e7b8-4d4e-a0e9-055031470ffc",
                "tenant_id": "e41a43bf06e249678413c6d61536eff9"
            },
            "name": "peering2",
            "id": "dd442819-5638-401c-bd48-a82703cf0464"
        }
    ]
}
Status Code
See Status Codes.
Error Code
See Error Codes.
6.2 Floating IP Address
Elastic IP
API Reference 6 Native OpenStack Neutron APIs V2.0
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 286

--- Page 293 ---
6.2.1 Querying Floating IP Addresses
Function
This API is used to query all floating IP addresses accessible to the tenant
submitting the request. A maximum of 2,000 records can be returned for each
query operation. If the number of records exceeds 2,000, the pagination marker
will be returned.
You can query the detailed information about a specified floating IP address using
the API for Querying a Floating IP Address.
URI
GET /v2.0/floatingips
Table 6-7 describes the parameters.
Table 6-7 Parameter description
Parameter Mandatory Type Description
id No String Specifies the
floating IP
address ID.
floating_ip_addres
s
No String Specifies the
floating IPv4
address.
floating_network_
id
No String Specifies the
external network
ID.
You can only use
fixed external
network.
You can use GET /
v2.0/networks?
router:external=T
rue or
GET /v2.0/
networks?
name={floating_
network} or run
the neutron net-
external-list
command to
obtain
information about
the external
network.
Elastic IP
API Reference 6 Native OpenStack Neutron APIs V2.0
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 287

--- Page 294 ---
Parameter Mandatory Type Description
router_id No String Specifies the ID of
the belonged
router.
port_id No String Specifies the port
ID.
fixed_ip_address No String Specifies the
private IP address
of the associated
port.
tenant_id No String Specifies the
project ID.
limit No Integer Specifies the
number of records
that will be
returned on each
page. The value is
from 0 to intmax
(2^31-1). The
default value is
2000.
limit can be used
together with
marker. For
details, see the
parameter
description of
marker.
Elastic IP
API Reference 6 Native OpenStack Neutron APIs V2.0
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 288

--- Page 295 ---
Parameter Mandatory Type Description
marker No String Specifies a
resource ID for
pagination query,
indicating that
the query starts
from the next
record of the
specified resource
ID.
This parameter
can work together
with the
parameter limit.
● If parameters
marker and
limit are not
passed,
resource
records on the
first page will
be returned.
● If the
parameter
marker is not
passed and the
value of
parameter
limit is set to
10, the first 10
resource
records will be
returned.
● If the value of
the parameter
marker is set
to the resource
ID of the 10th
record and the
value of
parameter
limit is set to
10, the 11th to
20th resource
records will be
returned.
● If the value of
the parameter
marker is set
to the resource
Elastic IP
API Reference 6 Native OpenStack Neutron APIs V2.0
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 289

--- Page 296 ---
Parameter Mandatory Type Description
ID of the 10th
record and the
parameter
limit is not
passed, 11th to
2,000th
resource
records will be
returned. The
default value
of limit is
2000.
page_reverse No Boolean Specifies the page
direction. The
value can be True
or False.
 
Example:
GET https://{Endpoint}/v2.0/floatingips?
id={fip_id}&router_id={router_id}&floating_network_id={net_id}&floating_ip_address={floating_ip}&port_id={
port_id}&fixed_ip_address={fixed_ip}&tenant_id={tenant_id}
Request Message
None
Response Message
Table 6-8 Response parameter
Paramete
r
Type Description
floatingips Array of
floatingip
objects
Specifies the floating IP address list. For details,
see Table 6-9.
floatingips
_links
Array of
floatingips_link
objects
Specifies the floating IP address object list. For
details, see Table 6-10.
Only when limit is used for filtering and the
number of resources exceeds the value of limit
or 2000 (default value of limit), value next will
be returned for rel and a link for href.
 
Elastic IP
API Reference 6 Native OpenStack Neutron APIs V2.0
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 290

--- Page 297 ---
Table 6-9 floatingip objects
Parameter Type Description
status String Specifies the floating IP
address status. The value
can be ACTIVE, DOWN,
or ERROR.
● DOWN indicates that
the floating IP
address has not been
bound.
● ACTIVE indicates that
the floating IP
address has been
bound.
● ERROR indicates that
the floating IP
address is abnormal.
id String Specifies the floating IP
address ID.
project_id String Specifies the project ID.
floating_ip_address String Specifies the floating IP
address.
floating_network_id String Specifies the external
network ID.
router_id String Specifies the ID of the
belonged router.
port_id String Specifies the port ID.
fixed_ip_address String Specifies the private IP
address of the associated
port.
tenant_id String Specifies the project ID.
dns_name String Specifies the DNS name.
This parameter is
available only in the CN
South-Guangzhou
region.
dns_domain String Specifies the DNS
domain.
This parameter is
available only in the CN
South-Guangzhou
region.
Elastic IP
API Reference 6 Native OpenStack Neutron APIs V2.0
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 291

--- Page 298 ---
Parameter Type Description
created_at String Specifies the time when
the floating IP address
was created.
UTC time is used.
Format: yyyy-MM-
ddTHH:mm:ss
updated_at String Specifies the time when
the floating IP address
was updated.
UTC time is used.
Format: yyyy-MM-
ddTHH:mm:ss
 
Table 6-10 floatingips_link object
Parameter Type Description
href String Specifies the API link.
rel String Specifies the relationship between the
API link and the API version.
 
Example Request
GET https://{Endpoint}/v2.0/floatingips?limit=1
Example Response
Status code: 200
Normal response to the GET operation
{
  "floatingips" : [ {
    "id" : "1a3a2818-d9b4-4a9c-8a19-5252c499d1cd",
    "status" : "DOWN",
    "router_id" : null,
    "tenant_id" : "bbfe8c41dd034a07bebd592bf03b4b0c",
    "project_id" : "bbfe8c41dd034a07bebd592bf03b4b0c",
    "floating_network_id" : "0a2228f2-7f8a-45f1-8e09-9039e1d09975",
    "fixed_ip_address" : null,
    "floating_ip_address" : "99.99.99.84",
    "port_id" : null,
    
    
    "created_at" : "2017-10-19T12:21:28",
    "updated_at" : "2018-07-30T12:52:13"
  } ],
  "floatingips_links" : [ {
    "href" : "https://network.region.cn-test-2.clouds.com/v2.0/floatingips.json?
limit=2000&marker=000a6144-5010-46f2-bf06-6a1c94477ea3&page_reverse=true",
    "rel" : "previous"
Elastic IP
API Reference 6 Native OpenStack Neutron APIs V2.0
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 292

--- Page 299 ---
  }, {
    "href" : "https://network.region.cn-test-2.clouds.com/v2.0/floatingips.json?limit=2000&marker=d445e537-
bc81-4039-9c7b-f9c1f5c73c78",
    "rel" : "next"
  } ]
}
Status Code
See Status Codes.
Error Code
See Error Codes.
6.2.2 Querying a Floating IP Address
Function
This API is used to query details about a specified floating IP address, including the
floating IP address status, ID of the router to which the floating IP address
belongs, and external network ID of the floating IP address.
URI
GET /v2.0/floatingips/{floatingip_id}
Request Message
None
Response Message
Table 6-11 Response parameter
Parameter Type Description
floatingip floatingip
object
Specifies the floating IP address list. For
details, see Table 6-12.
 
Elastic IP
API Reference 6 Native OpenStack Neutron APIs V2.0
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 293

--- Page 300 ---
Table 6-12 floatingip objects
Parameter Type Description
status String Specifies the floating IP address
status. The value can be ACTIVE,
DOWN, or ERROR.
● DOWN indicates that the
floating IP address has not been
bound.
● ACTIVE indicates that the
floating IP address has been
bound.
● ERROR indicates that the
floating IP address is abnormal.
id String Specifies the floating IP address ID.
project_id String Specifies the project ID.
floating_ip_address String Specifies the floating IP address.
floating_network_id String Specifies the external network ID.
router_id String Specifies the ID of the belonged
router.
port_id String Specifies the port ID.
fixed_ip_address String Specifies the private IP address of
the associated port.
tenant_id String Specifies the project ID.
dns_name String Specifies the DNS name.
This parameter is available only in
the CN South-Guangzhou region.
dns_domain String Specifies the DNS domain.
This parameter is available only in
the CN South-Guangzhou region.
created_at String Specifies the time when the
floating IP address was created.
UTC time is used.
Format: yyyy-MM-ddTHH:mm:ss
updated_at String Specifies the time when the
floating IP address was updated.
UTC time is used.
Format: yyyy-MM-ddTHH:mm:ss
 
Elastic IP
API Reference 6 Native OpenStack Neutron APIs V2.0
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 294

--- Page 301 ---
Example Request
GET https://{Endpoint}/v2.0/floatingips/1a3a2818-d9b4-4a9c-8a19-5252c499d1cd
Example Response
Status code: 200
{
    "floatingip": {
        "id": "1a3a2818-d9b4-4a9c-8a19-5252c499d1cd",
        "status": "DOWN",
        "router_id": null,
        "tenant_id": "bbfe8c41dd034a07bebd592bf03b4b0c",
        "project_id": "bbfe8c41dd034a07bebd592bf03b4b0c",
        "floating_network_id": "0a2228f2-7f8a-45f1-8e09-9039e1d09975",
        "fixed_ip_address": null,
        "floating_ip_address": "99.99.99.84",
        "port_id": null,
        "created_at": "2017-10-19T12:21:28",
        "updated_at": "2018-07-30T12:52:13"
    }
}
Status Code
See Status Codes.
Error Code
See Error Codes.
6.2.3 Assigning a Floating IP Address
Function
When assigning a floating IP address, you need to obtain the external network ID
floating_network_id of the floating IP address.
You can use GET /v2.0/networks?router:external=True or run the neutron net-
external-list command to obtain the UUID of the external network required for
assigning a floating IP address.
URI
POST /v2.0/floatingips
Request Message
Table 6-13 Request parameter
Parameter Type Mand
atory
Description
floatingip floatingip
object
Yes Specifies the floating IP address list.
For details, see Table 6-14.
 
Elastic IP
API Reference 6 Native OpenStack Neutron APIs V2.0
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 295

--- Page 302 ---
Table 6-14 floatingip objects
Parameter Man
dat
ory
Type Description
floating_ip_ad
dress
No String Specifies the floating IP address.
floating_netw
ork_id
Yes String Specifies the external network ID.
You can only use fixed external network.
You can use GET /v2.0/networks?
router:external=True or
GET /v2.0/networks?
name={floating_network} or
run the neutron net-external-list mode
command to obtain information about
the external network.
port_id No String Specifies the port ID.
fixed_ip_addre
ss
No String Specifies the private IP address of the
associated port.
 
Response Message
Table 6-15 Response parameter
Parameter Type Description
floatingip floatingip
object
Specifies the floating IP address list. For
details, see Table 6-16.
 
Elastic IP
API Reference 6 Native OpenStack Neutron APIs V2.0
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 296

--- Page 303 ---
Table 6-16 floatingip objects
Parameter Type Description
status String Specifies the floating IP
address status. The value
can be ACTIVE, DOWN,
or ERROR.
● DOWN indicates that
the floating IP
address has not been
bound.
● ACTIVE indicates that
the floating IP
address has been
bound.
● ERROR indicates that
the floating IP
address is abnormal.
id String Specifies the floating IP
address ID.
floating_ip_address String Specifies the floating IP
address.
floating_network_id String Specifies the external
network ID.
router_id String Specifies the ID of the
belonged router.
port_id String Specifies the port ID.
fixed_ip_address String Specifies the private IP
address of the associated
port.
tenant_id String Specifies the project ID.
dns_name String Specifies the DNS name.
This parameter is
available only in the CN
South-Guangzhou
region.
dns_domain String Specifies the DNS
domain.
This parameter is
available only in the CN
South-Guangzhou
region.
 
Elastic IP
API Reference 6 Native OpenStack Neutron APIs V2.0
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 297

--- Page 304 ---
Example Request
Create a floating IP address whose network is
0a2228f2-7f8a-45f1-8e09-9039e1d09975.
POST https://{Endpoint}/v2.0/floatingips 
{
    "floatingip": {
           "floating_network_id": "0a2228f2-7f8a-45f1-8e09-9039e1d09975"
    }
}
Example Response
Status code: 201
Normal response to POST requests
{
    "floatingip": {
        "id": "b997e0d4-3359-4c74-8f88-bc0af81cd5a2",
        "status": "DOWN",
        "router_id": null,
        "tenant_id": "bbfe8c41dd034a07bebd592bf03b4b0c",
        "floating_network_id": "0a2228f2-7f8a-45f1-8e09-9039e1d09975",
        "fixed_ip_address": null,
        "floating_ip_address": "88.88.215.205",
        "port_id": null,
    }
}
Status Code
See Status Codes.
Error Code
See Error Codes.
6.2.4 Updating a Floating IP Address
Function
This API is used to update a floating IP address.
During the update, the ID of the floating IP address must be provided in the URL.
If port_id is left blank, the floating IP address has been unbound from the port.
NO TE
This API has the following constraints:
● If a floating IP address that you are binding is in the error state, unbind the IP address
first.
● Do not associate a port that has a floating IP address associated to another floating IP
address. You must first disassociate the port from the IP address and then associate it
with another IP address.
Elastic IP
API Reference 6 Native OpenStack Neutron APIs V2.0
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 298

--- Page 305 ---
URI
PUT /v2.0/floatingips/{floatingip_id}
Table 6-17 describes the parameters.
Table 6-17 Parameter description
Parameter Manda
tory
Type Description
floatingip_id Yes String Specifies the floating IP address
ID.
This parameter is not required
when you assign a floating IP
address. This parameter is
mandatory when you query,
update, or delete a floating IP
address.
 
Request Message
Table 6-18 Request parameter
Parameter Type Mandatory Description
floatingip floatingip
object
Yes Specifies the floating IP address list.
For details, see Table 6-19.
 
Table 6-19 floatingip objects
Parameter Mandat
ory
Type Description
port_id No String Specifies the port ID.
 
Response Message
Table 6-20 Response parameter
Parameter Type Description
floatingip floatingip
object
Specifies the floating IP address list. For
details, see Table 6-21.
 
Elastic IP
API Reference 6 Native OpenStack Neutron APIs V2.0
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 299

--- Page 306 ---
Table 6-21 floatingip objects
Parameter Type Description
status String Specifies the floating IP
address status. The value
can be ACTIVE, DOWN,
or ERROR.
● DOWN indicates that
the floating IP
address has not been
bound.
● ACTIVE indicates that
the floating IP
address has been
bound.
● ERROR indicates that
the floating IP
address is abnormal.
id String Specifies the floating IP
address ID.
floating_ip_address String Specifies the floating IP
address.
floating_network_id String Specifies the external
network ID.
router_id String Specifies the ID of the
belonged router.
port_id String Specifies the port ID.
fixed_ip_address String Specifies the private IP
address of the associated
port.
tenant_id String Specifies the project ID.
dns_name String Specifies the DNS name.
This parameter is
available only in the CN
South-Guangzhou
region.
dns_domain String Specifies the DNS
domain.
This parameter is
available only in the CN
South-Guangzhou
region.
 
Elastic IP
API Reference 6 Native OpenStack Neutron APIs V2.0
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 300

--- Page 307 ---
Example Request
● Unbind a floating IP address from a port.
PUT https://{Endpoint}/v2.0/floatingips/b997e0d4-3359-4c74-8f88-bc0af81cd5a2
{
    "floatingip": {
        "port_id": null
    }
}
● Bind a floating IP address to a port. The port ID is f91f5763-
c5a2-4458-979d-61e48b3c3fac.
PUT https://{Endpoint}/v2.0/floatingips/b997e0d4-3359-4c74-8f88-bc0af81cd5a2 
 
{
    "floatingip": {
           "port_id": "f91f5763-c5a2-4458-979d-61e48b3c3fac"
    }
}
Example Response
Status code: 200
(The floating IP address is unbound from the port.)
{
    "floatingip": {
        "id": "b997e0d4-3359-4c74-8f88-bc0af81cd5a2",
        "status": "DOWN",
        "router_id": null,
        "tenant_id": "bbfe8c41dd034a07bebd592bf03b4b0c",
        "floating_network_id": "0a2228f2-7f8a-45f1-8e09-9039e1d09975",
        "fixed_ip_address": null,
        "floating_ip_address": "88.88.215.205",
        "port_id": null,
    }
}
(The floating IP address is bound to the port.)
{
    "floatingip": {
        "id": "b997e0d4-3359-4c74-8f88-bc0af81cd5a2",
        "status": "DOWN",
        "router_id": null,
        "tenant_id": "bbfe8c41dd034a07bebd592bf03b4b0c",
        "floating_network_id": "0a2228f2-7f8a-45f1-8e09-9039e1d09975",
        "fixed_ip_address": "192.168.10.3",
        "floating_ip_address": "88.88.215.205",
        "port_id": "f91f5763-c5a2-4458-979d-61e48b3c3fac",
    }
}
Status Code
See Status Codes.
Error Code
See Error Codes.
Elastic IP
API Reference 6 Native OpenStack Neutron APIs V2.0
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 301

--- Page 308 ---
6.2.5 Deleting a Floating IP Address
Function
This API is used to delete a floating IP address.
URI
DELETE /v2.0/floatingips/{floatingip_id}
Table 6-22 describes the parameters.
Table 6-22 Parameter description
Parameter Mandatory Type Description
floatingip_id Yes String Specifies the
floating IP
address ID.
 
Request Message
None
Response Message
None
Example Request
Delete the floating IP address whose ID is a95ec431-8473-463b-
aede-34fb048ee3a7.
DELETE https://{Endpoint}/v2.0/floatingips/a95ec431-8473-463b-aede-34fb048ee3a7
Example Response
None
Status Code
See Status Codes.
Error Code
See Error Codes.
Elastic IP
API Reference 6 Native OpenStack Neutron APIs V2.0
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 302

--- Page 309 ---
7 Application Examples
7.1 Binding an EIP to an ECS
Scenarios
This section describes how to bind an EIP to an ECS by calling APIs.
Prerequisites
● You have created an ECS. For details, see Purchasing an ECS.
● If you use a token for authentication, you must obtain the token and add X-
Auth-Token to the request header when making an API call. Obtain the token
by following instructions in section Authentication.
NO TE
The token obtained from IAM is valid for only 24 hours. If you want to use a token for
authentication, you can cache it to avoid frequent calling.
Procedure
1. Obtain the NIC information based on the ECS ID. For details, see Querying a
Port.
a. Send GET https://VPC endpoint/v1/project_id/ports?device_id=ecs_id.
Parameter project_id indicates the project ID.
b. Add X-Auth-Token to the request header.
c. Check the response message.
▪ The request is successful if the following response is displayed.
{ 
     "ports": [{ 
         "id": "02c72193-efec-42fb-853b-c33f2b802467", 
         "name": "", 
         "status": "ACTIVE", 
         "admin_state_up": true, 
         "fixed_ips": [{ 
             "subnet_id": "213cb9d-3122-2ac1-1a29-91ffc1231a12", 
             "ip_address": "192.168.0.75" 
         }], 
Elastic IP
API Reference 7 Application Examples
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 303

--- Page 310 ---
         "mac_address": "fa:16:3e:47:5f:c1", 
         "network_id": "4779ab1c-7c1a-44b1-a02e-93dfc361b32d", 
         "tenant_id": "db82c9e1415a464ea68048baa8acc6b8", 
         "project_id": "db82c9e1415a464ea68048baa8acc6b8", 
         "device_id": "ea61f836-b52f-41bf-9d06-685644001d6f", 
         "device_owner": "compute:br-iaas-odin1a", 
         "security_groups": [ 
             "e0598d96-9451-4f8a-8de0-b8b4d451d9e7" 
         ], 
         "extra_dhcp_opts": [], 
         "allowed_address_pairs": [], 
         "binding:vnic_type": "normal", 
         "binding:vif_details": { 
             "primary_interface": true 
         }, 
         "binding:profile": {}, 
         "port_security_enabled": true, 
         "created_at": "2020-06-20T08:07:29", 
         "updated_at": "2020-06-20T08:07:29" 
     }] 
 }
▪ For details about the error codes when the request is abnormal, see
Error Codes.
2. Assign an EIP.
a. Send POST https://Endpoint/v1/project_id/publicips. Parameter
project_id indicates the project ID.
b. Add X-Auth-Token to the request header.
c. Specify the following parameters in the request body:
{     
     "publicip": {         
         "type": "5_bgp",         
         "ip_version": 6        
  },    
     "bandwidth": {        
         "name": "bandwidth123",        
         "size": 5,         
         "share_type": "WHOLE", 
         "id":"ebfa375c-3f93-465e-81a3-bd66e578ee9d" 
     },          
     "enterprise_project_id":"0"   
 }
d. Check the response message.
▪ The request is successful if the following response is displayed.
{ 
     "publicip": { 
         "id": "f588ccfa-8750-4d7c-bf5d-2ede24414706", 
         "status": "PENDING_CREATE", 
         "type": "5_bgp", 
         "public_ip_address": "161.xx.xx.7", 
         "tenant_id": "8b7e35ad379141fc9df3e178bd64f55c", 
         "ip_version": 4, 
         "create_time": "2015-07-16 04:10:52", 
         "bandwidth_size": 0, 
         "enterprise_project_id":"b261ac1f-2489-4bc7-b31b-c33c3346a439" 
     } 
 }
▪ For details about the error codes when the request is abnormal, see
Error Codes.
3. Bind the EIP to the ECS NIC.
Elastic IP
API Reference 7 Application Examples
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 304

--- Page 311 ---
a. Send PUT /v1/project_id/publicips/publicip_id. Parameter project_id
indicates the project ID.
b. Add X-Auth-Token to the request header.
c. Specify the following parameters in the request body:
{     
     "publicip": {         
         "port_id": "02c72193-efec-42fb-853b-c33f2b802467"      
     }
 }
d. Check the response message.
▪ The request is successful if the following response is displayed.
{ 
   "publicip": { 
     "id": "f588ccfa-8750-4d7c-bf5d-2ede24414706", 
     "status": "ACTIVE", 
     "type": "5_bgp", 
     "port_id": "02c72193-efec-42fb-853b-c33f2b802467", 
     "public_ip_address": "10.xx.xx.162", 
     "private_ip_address": "192.168.1.131", 
     "tenant_id": "26ae5181a416420998eb2093aaed84d9", 
     "create_time": "2019-03-27 01:33:18", 
     "bandwidth_id": "02da78da-4fb0-4880-b512-f516cdeb8ef3",
     "bandwidth_name": "test",
     "bandwidth_share_type": "PER",
     "bandwidth_size": 1,
     "profile": {},
     "enterprise_project_id": "0", 
     "ip_version": 4 
   } 
 }
▪ For details about the error codes when the request is abnormal, see
Error Codes.
7.2 Unbinding an EIP from an ECS
Scenarios
This section describes how to unbind an EIP from an ECS by calling APIs.
Prerequisites
● You have created an ECS. For details, see Purchasing an ECS.
● If you use a token for authentication, you must obtain the token and add X-
Auth-Token to the request header when making an API call. Obtain the token
by following instructions in section Authentication.
NO TE
The token obtained from IAM is valid for only 24 hours. If you want to use a token for
authentication, you can cache it to avoid frequent calling.
Procedure
1. Query EIP details.
a. Send GET /v1/project_id/publicips/publicip_id. Parameter project_id
indicates the project ID.
Elastic IP
API Reference 7 Application Examples
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 305

--- Page 312 ---
b. Add X-Auth-Token to the request header.
c. Check the response message.
▪ The request is successful if the following response is displayed.
{ 
   "publicip": { 
     "id": "f6318bef-6508-4ea5-a48f-6152b6b1a8fb", 
     "status": "ACTIVE", 
     "type": "5_bgp", 
     "port_id": "a135e9b8-1630-40d2-a6c5-eb534a61efbe", 
     "public_ip_address": "10.xx.xx.162", 
     "private_ip_address": "192.168.1.131", 
     "port_id": "a135e9b8-1630-40d2-a6c5-eb534a61efbe",
     "tenant_id": "26ae5181a416420998eb2093aaed84d9", 
     "create_time": "2019-03-27 01:33:18", 
     "bandwidth_id": "02da78da-4fb0-4880-b512-f516cdeb8ef3",
     "bandwidth_name": "test",
     "bandwidth_share_type": "PER",
     "bandwidth_size": 1,
     "enterprise_project_id": "0",
     "profile": {},
     "ip_version": 4 
   } 
 }
▪ For details about the error codes when the request is abnormal, see
Error Codes.
2. Unbind the EIP from the ECS NIC.
a. Send PUT /v1/project_id/publicips/publicip_id. Parameter project_id
indicates the project ID.
b. Add X-Auth-Token to the request header.
c. Specify the following parameters in the request body:
{     
     "publicip": {         
         "port_id": ""      
     }
 }
a. Check the response message.
▪ The request is successful if the following response is displayed.
{ 
   "publicip": { 
     "id": "f6318bef-6508-4ea5-a48f-6152b6b1a8fb", 
     "status": "DOWN", 
     "type": "5_bgp",  
     "public_ip_address": "10.xx.xx.162", 
     "bandwidth_id": "02da78da-4fb0-4880-b512-f516cdeb8ef3",
     "bandwidth_name": "test",
     "bandwidth_share_type": "PER",
     "bandwidth_size": 1,
     "tenant_id": "26ae5181a416420998eb2093aaed84d9", 
     "create_time": "2019-03-27 01:33:18",
     "enterprise_project_id": "0", 
     "profile": {}
     "ip_version": 4 
   } 
 }
– For details about the error codes when the request is abnormal, see Error
Codes.
Elastic IP
API Reference 7 Application Examples
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 306

--- Page 313 ---
7.3 Assigning an EIP with a Specific Shared Bandwidth
Scenarios
This section describes how to assign an EIP with a specific shared bandwidth by
calling APIs.
Prerequisites
You have planned the region where you want to assign the EIP and obtained the
endpoint required for calling APIs. For details, see EIP Endpoints.
If you use a token for authentication, you must obtain the token and add X-Auth-
Token to the request header when making an API call. Obtain the token by
following instructions in section Authentication.
NO TE
The token obtained from IAM is valid for only 24 hours. If you want to use a token for
authentication, you can cache it to avoid frequent calling.
Procedure
1. Assign a shared bandwidth.
a. Send POST https://Endpoint/v2.0/project_id/bandwidths. Parameter
project_id indicates the project ID.
b. Add X-Auth-Token to the request header.
c. Specify the following parameters in the request body:
{ 
     "bandwidth": { 
         "name": "bandwidth123", 
         "size": 10
     } 
 }
d. Check the response message.
▪ The request is successful if the following response is displayed. In the
response, id indicates the bandwidth ID.
{ 
   "bandwidth": { 
     "id": "1bffc5f2-ff19-45a6-96d2-dfdca49cc387", 
     "name": "bandwidth123", 
     "size": 10, 
     "share_type": "WHOLE", 
     "publicip_info": [], 
     "tenant_id": "26ae5181a416420998eb2093aaed84d9", 
     "bandwidth_type": "share", 
     "charge_mode": "bandwidth", 
     "enterprise_project_id": "0", 
     "status": "NORMAL", 
     "created_at": "2020-04-21T07:58:02Z",  
     "updated_at": "2020-04-21T07:58:02Z"  
   } 
 }
▪ For details about the error codes when the request is abnormal, see
Error Codes.
Elastic IP
API Reference 7 Application Examples
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 307

--- Page 314 ---
2. Query the shared bandwidth details.
a. Send Get https://Endpoint//v1/project_id/bandwidths/bandwidth_id.
Parameter project_id indicates the project ID.
b. Add X-Auth-Token to the request header.
c. Check the response message.
▪ The request is successful if the following response is displayed. In the
response, id indicates the bandwidth ID.
{ 
     "bandwidth": { 
         "id": "1bffc5f2-ff19-45a6-96d2-dfdca49cc387", 
         "name": "bandwidth123", 
         "size": 10, 
         "share_type": "WHOLE", 
         "publicip_info": [ 
             { 
                 "publicip_id": "ff156c26-bcc9-4541-a75c-42baf8b9748f", 
                 "publicip_address": "114.xx.xx.244", 
                 "ip_version": 4, 
                 "publicip_type": "5_sbgp" 
             } 
         ], 
         "tenant_id": "b3292dde618e40408e30cd87455a0652", 
         "bandwidth_type": "sbgp", 
         "charge_mode": "bandwidth", 
         "enterprise_project_id": "0", 
         "status": "NORMAL", 
         "created_at": "2020-04-21T07:58:02Z", 
         "updated_at": "2020-04-21T07:58:02Z" 
     } 
 }
▪ For details about the error codes when the request is abnormal, see
Error Codes.
3. Assign an EIP using the shared bandwidth.
a. Send POST https://Endpoint/v1/project_id/publicips. Parameter
project_id indicates the project ID.
b. Add X-Auth-Token to the request header.
c. Specify the following parameters in the request body:
{     
     "publicip": {         
         "type": "5_bgp",         
         "ip_version": 6        
  },    
     "bandwidth": {        
         "name": "bandwidth123",        
         "size": 10,         
         "share_type": "WHOLE", 
         "id":"1bffc5f2-ff19-45a6-96d2-dfdca49cc387" 
     },          
     "enterprise_project_id":"0"   
 }
d. Check the response message.
▪ The request is successful if the following response is displayed.
{ 
     "publicip": { 
         "id": "f588ccfa-8750-4d7c-bf5d-2ede24414706", 
         "status": "PENDING_CREATE", 
         "type": "5_bgp", 
         "public_ip_address": "161.xx.xx.7", 
         "tenant_id": "8b7e35ad379141fc9df3e178bd64f55c", 
Elastic IP
API Reference 7 Application Examples
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 308

--- Page 315 ---
         "ip_version": 4, 
         "create_time": "2015-07-16 04:10:52", 
         "bandwidth_size": 0, 
         "enterprise_project_id":"b261ac1f-2489-4bc7-b31b-c33c3346a439" 
     } 
 }
▪ For details about the error codes when the request is abnormal, see
Error Codes.
4. Query EIP details.
a. Send GET /v1/project_id/publicips/publicip_id. Parameter project_id
indicates the project ID.
b. Add X-Auth-Token to the request header.
c. Check the response message.
{ 
     "publicip": {
            "id": "3ec9fea0-2d4c-49e2-8aca-ce883eae547d",
            "type": "5_bgp",
            "public_ip_address": "10.246.164.87",
            "status": "DOWN",
            "tenant_id": "060576782980d5762f9ec014dd2f1148",
            "create_time": "2020-08-13 12:55:27",
            "bandwidth_id": "1bffc5f2-ff19-45a6-96d2-dfdca49cc387",
            "bandwidth_name": "bandwidth123",
            "bandwidth_share_type": "WHOLE",
            "bandwidth_size": 10,
            "profile": {},
            "enterprise_project_id": "a380829c-db6f-4db3-b5b6-cc377f7a3ff8",
            "ip_version": 4
        }
 }
Elastic IP
API Reference 7 Application Examples
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 309

--- Page 316 ---
8 Permissions Policies and Supported
Actions
8.1 Introduction
You can use Identity and Access Management (IAM) for fine-grained permissions
management of your EIP. If your HUAWEI ID does not need individual IAM users,
you can skip this section.
By default, new IAM users do not have permissions assigned. You need to add
them to one or more groups and attach policies or roles to these groups. The
users then inherit permissions from the groups. This way, they can perform
specified operations on cloud services based on the permissions.
You can grant users permissions by using roles and policies. Roles are provided by
IAM to define service-based permissions that match user's job responsibilities.
Policies define API-based permissions for operations on specific resources under
certain conditions, allowing for more fine-grained, secure access control of cloud
resources.
NO TE
If you want to allow or deny the access to an API, use policy-based authorization.
Currently, only publicip resources are supported and available in CN South-Shenzhen, CN
Southwest-Guiyang1, CN South-Guangzhou, and CN East-Shanghai1. For other regions, you
can configure policy-based authorization but the configuration does not take effect.
Each account has all the permissions required to call all APIs, but IAM users in an
account must be granted the permissions required for calling an API. The
permissions required for calling an API are determined by the actions supported by
the API. Only users who have been granted permissions allowing the actions can
call the API successfully. For example, if an IAM user wants to query EIPs using an
API, the user must have been granted permissions that allow the eip:publicIps:list
action.
Supported Actions
EIP provides system-defined policies that can be directly used in IAM. You can also
create custom policies to supplement system-defined policies for more refined
Elastic IP
API Reference 8 Permissions Policies and Supported Actions
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 310

--- Page 317 ---
access control. Operations supported by policies are specific to APIs. The following
are common concepts related to policies:
● Permissions: statements in a policy that allow or deny certain operations
● APIs: REST APIs that can be called by a user who has been granted specific
permissions
● Actions: specific operations that are allowed or denied in a custom policy
● IAM project/Enterprise project: A custom policy can be applied to IAM projects
or enterprise projects or both. Policies that contain actions supporting both
IAM and enterprise projects can be assigned to user groups and take effect in
both IAM and Enterprise Management. Policies that only contain actions
supporting IAM projects can be assigned to user groups and only take effect
for IAM. Such policies will not take effect if they are assigned to user groups
in Enterprise Management. For details about the differences between IAM
projects and enterprise projects, see What Are the Differences Between IAM
and Enterprise Management?.
NO TE
√: supported; x: not supported
EIP supports the following actions that can be defined in custom policies:
EIP: actions that supported by EIP APIs include assigning an EIP, querying an EIP,
querying EIPs, updating an EIP, and deleting an EIP.
8.2 EIP
Permission API Action
Assigning an
EIP
POST /v1/{project_id}/
publicips
vpc:publicIps:create
Querying an
EIP
GET /v1/{project_id}/
publicips/{publicip_id}
vpc:publicIps:get
Querying EIPs GET /v1/{project_id}/
publicips
vpc:publicIps:list
Updating an
EIP
PUT /v1/{project_id}/
publicips/{publicip_id}
vpc:publicIps:update
Releasing an
EIP
DELETE /v1/{project_id}/
publicips/{publicip_id}
vpc:publicIps:delete
 
8.3 Bandwidth
Permission API Action
Querying a
bandwidth
GET /v1/{project_id}/bandwidths/
{bandwidth_id}
vpc:bandwidths:get
Elastic IP
API Reference 8 Permissions Policies and Supported Actions
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 311

--- Page 318 ---
Permission API Action
Querying
bandwidths
GET /v1/{project_id}/bandwidths vpc:bandwidths:list
Updating a
bandwidth
PUT /v1/{project_id}/bandwidths/
{bandwidth_id}
vpc:bandwidths:upda
te
 
8.4 Bandwidth (V2)
Permission API Action
Assigning a
shared
bandwidth
POST /v2.0/{project_id}/bandwidths vpc:bandwidths:creat
e
Deleting a
shared
bandwidth
DELETE /v2.0/{project_id}/
bandwidths/{bandwidth_id}
vpc:bandwidths:delet
e
Adding an EIP to
a shared
bandwidth
POST /v2.0/{project_id}/bandwidths/
{bandwidth_id}/insert
vpc:publicIps:insert
Removing an
EIP from a
shared
bandwidth
POST /v2.0/{project_id}/bandwidths/
{bandwidth_id}/remove
vpc:publicIps:remove
 
8.5 EIP Tags
Permission API Action
Creating a Tag for
an EIP
POST /v2.0/{project_id}/publicips/
{publicip_id}/tags
vpc:publicipTags:crea
te
Querying EIP Tags GET /v2.0/{project_id}/publicips/
{publicip_id}/tags
vpc:publicipTags:get
Deleting an EIP Tag DELETE /v2.0/{project_id}/
publicips/{publicip_id}/tags/{key}
vpc:publicipTags:dele
te
Batch Creating or
Deleting EIP Tags
POST /v2.0/{project_id}/publicips/
{publicip_id}/tags/action
vpc:publicipTags:crea
te
vpc:publicipTags:dele
te
Elastic IP
API Reference 8 Permissions Policies and Supported Actions
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 312

--- Page 319 ---
Permission API Action
Querying EIPs by
Tag
POST /v2.0/{project_id}/publicips/
resource_instances/action
vpc:publicipTags:get
Querying EIP Tags in
a Specified Project
GET /v2.0/{project_id}/publicips/
tags
vpc:publicipTags:get
 
8.6 Floating IP Address (OpenStack Neutron API)
Permission API Action
Querying
floating IP
addresses
GET /v2.0/floatingips vpc:floatingIps:get
Querying a
floating IP
address
GET /v2.0/floatingips/
{floatingip_id}
vpc:floatingIps:get
Creating a
floating IP
address
POST /v2.0/floatingips vpc:floatingIps:create
Updating a
floating IP
address
PUT /v2.0/floatingips/
{floatingip_id}
vpc:floatingIps:update
Deleting a
floating IP
address
DELETE /v2.0/floatingips/
{floatingip_id}
vpc:floatingIps:delete
 
8.7 Precautions for API Permissions
Note:
If you have insufficient permissions, response code 200 will be returned when you
query network resources and an empty list will be displayed.
You can apply for the permissions and try again.
Elastic IP
API Reference 8 Permissions Policies and Supported Actions
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 313

--- Page 320 ---
A Appendix
A.1 VPC Monitoring Metrics
Description
This section describes monitoring metrics reported by VPC to Cloud Eye as well as
their namespaces and dimensions. You can use APIs provided by Cloud Eye to
query the monitoring metrics of the monitored object and alarms generated for
VPC.
Namespace
SYS.VPCnetwork ACL
Metrics
Table A-1 EIP and bandwidth metrics
ID Nam
e
Description Value
Rang
e
Uni
t
Co
nv
ers
ion
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
10
00
(SI
)
Bandwidth
or EIP
1 minute
Elastic IP
API Reference A Appendix
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 314

--- Page 321 ---
ID Nam
e
Description Value
Rang
e
Uni
t
Co
nv
ers
ion
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
10
00
(SI
)
Bandwidth
or EIP
1 minute
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
0-100 % N/
A
Bandwidth
or EIP
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
platform in a
minute
(Previously
called
"Upstream
Traffic")
≥ 0 Byt
e
10
00
(SI
)
Bandwidth
or EIP
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
platform in a
minute
(Previously
called
"Downstrea
m Traffic")
≥ 0 Byt
e
10
00
(SI
)
Bandwidth
or EIP
1 minute
 
Elastic IP
API Reference A Appendix
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 315

--- Page 322 ---
Dimension
Key Value
publicip_id EIP ID
bandwidth_id Bandwidth ID
 
A.2 Status Codes
Table A-2 Normal values
Normal
Response
Code
Type Description
200 OK Specifies the normal response code for the GET,
PUT, and POST operations.
201 Created Specifies the normal response code for the POST
operation of the OpenStack Neutron API and API
V3.
202 Accepted Specifies the normal response to the pre-check
request of the V3 API.
204 No Content Specifies the normal response code for the
DELETE operation.
 
Table A-3 Abnormal values
Returned Value Description
400 Bad Request The server failed to process the request.
401 Unauthorized You must enter a username and password
to access the requested page.
403 Forbidden You are forbidden to access the requested
page.
404 Not Found The server could not find the requested
page.
405 Method Not Allowed You are not allowed to use the method
specified in the request.
406 Not Acceptable The response generated by the server could
not be accepted by the client.
Elastic IP
API Reference A Appendix
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 316

--- Page 323 ---
Returned Value Description
407 Proxy Authentication
Required
You must use the proxy server for
authentication so that the request can be
processed.
408 Request Timeout The request timed out.
409 Conflict The request could not be processed due to a
conflict.
500 Internal Server Error Failed to complete the request because of
an internal service error.
501 Not Implemented Failed to complete the request because the
server does not support the requested
function.
502 Bad Gateway Failed to complete the request because the
server has received an invalid response.
503 Service Unavailable Failed to complete the request because the
service is unavailable.
504 Gateway Timeout A gateway timeout error occurred.
 
A.3 Error Codes
Description
If an error occurs when an API is called, error information is returned. This section
describes the error information for EIP APIs (excluding native OpenStack APIs).
Example of Returned Error Information
{
    "code": "VPC.0504",
    "message": "Floating IP could not be found."
}
Error Code Description
If an error code starting with APIGW is returned after you call an API, rectify the
fault by referring to the instructions provided in Error Codes.
Elastic IP
API Reference A Appendix
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 317

--- Page 324 ---
Modul
e
Sta
tus
Cod
es
Error
Code
Message Description Handling
Measure
Public 400 VPC.00
02
Available zone
Name is null.
The AZ is
left blank.
Check whether
the
availability_zone
field in the
request body for
creating a subnet
is left blank.
404 VPC.00
03
VPC does not
exist.
The VPC
does not
exist.
Check whether
the VPC ID is
correct or
whether the VPC
exists under the
tenant.
400 VPC.00
04
VPC is not active,
please try later.
The VPC
status is
abnormal.
Try again later or
contact technical
support.
401 VPC.00
09
real-name
authentication fail.
Real-name
authenticati
on fails.
Contact technical
support.
Public 400 VPC.00
07
urlTenantId is not
equal
tokenTenantId
Inconsistent
tenant IDs.
The tenant ID in
the URL is
different from
that parsed in the
token.
401 VPC.00
08
Invalid token in
the header.
Invalid
token.
Check whether
the token in the
request header is
valid.
403 VPC.27
01
Token not allowed
to do this action.
You do not
have the
permission
to perform
this
operation, or
your account
balance is
insufficient.
Check whether
the account
balance is
insufficient or
whether your
account has been
frozen.
Public 403 VPC.00
10
Rules on xx by **
disallowed by
policy
Insufficient
permissions
to make
calls to the
underlying
system.
Obtain the
required
permissions.
Elastic IP
API Reference A Appendix
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 318

--- Page 325 ---
Modul
e
Sta
tus
Cod
es
Error
Code
Message Description Handling
Measure
403 VPC.22
01
Policy doesn't
allow <x:x:x> to be
performed
Insufficient
fine-grained
permissions.
Obtain the
required
permissions.
Public 400 VPC.00
14
This
enterpriseProject
status is disable.
The
enterprise
project is
unavailable.
Use the ID of
another available
enterprise project.
400 VPC.00
11
EnterpriseProjectId
is invalid
Invalid
enterprise
project ID.
Enter a valid
enterprise project
ID.
500
409
VPC.03
04
createBandwidth
error.
NO QUOTAS for
shareBandwidthIP!
Query routers fail.
An internal
error occurs
when
operations
are being
performed
on the
bandwidth.
Contact technical
support for
handling the error
based on the
displayed error
message.
Assigni
ng an
EIP
400 VPC.03
01
Bandwidth name
or share_type is
invalid.
The specified
bandwidth
parameter
for assigning
an EIP is
invalid.
Check whether
the specified
bandwidth
parameter is
valid.
400 VPC.05
01
Bandwidth
share_type is
invalid.
Invalid EIP
parameters.
Check whether
the parameter
values are valid
based on the
returned error
message and API
reference
document.
403 VPC.05
02
Tenant status is
op_restricted.
You are not
allowed to
assign the
EIP.
Check whether
the account
balance is
insufficient or
whether your
account has been
frozen.
500 VPC.05
03
Creating publicIp
failed.
Failed to
assign the
EIP.
Contact technical
support.
Elastic IP
API Reference A Appendix
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 319

--- Page 326 ---
Modul
e
Sta
tus
Cod
es
Error
Code
Message Description Handling
Measure
500 VPC.05
04
FloatIp is null. Failed to
assign the
EIP because
no IP
address is
found.
Contact technical
support.
500 VPC.05
08
Port is invalid. Port-related
resources
could not be
found.
Contact technical
support.
409 VPC.05
10
Floatingip has
already associated
with port.
The EIP has
already been
bound to
another ECS.
Unbind the EIP
from the ECS.
409 VPC.05
11
Port has already
associated with
floatingip.
The port has
already been
bound with
an EIP.
Disassociate the
port from the EIP.
409 VPC.05
21
Quota exceeded
for resources:
['floatingip'].
Insufficient
EIP quota.
Release the
unbound EIPs or
request to
increase the EIP
quota.
409 VPC.05
22
The IP address is
in use.
The IP
address is
invalid or in
use.
Check whether
the IP address
format is valid or
replace it with
another IP
address.
409 VPC.05
32
No more IP
addresses
available on
network.
Failed to
assign the IP
address
because no
IP addresses
are
available.
Release unbound
EIPs or try again
later.
404 VPC.00
12
Requested
resources not
found.
The
enterprise
project ID
does not
exist.
Check whether an
enterprise project
with this ID exists
for the tenant.
Elastic IP
API Reference A Appendix
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 320

--- Page 327 ---
Modul
e
Sta
tus
Cod
es
Error
Code
Message Description Handling
Measure
400 EIP.790
1
Input param is
invalid.
Invalid
request
body.
Check the JSON
format and the
value range as
prompted.
Queryi
ng an
EIP
400 VPC.05
01
Invalid
floatingip_id.
Invalid EIP
parameters.
Check whether
the EIP ID is valid.
404 VPC.05
04
Floating IP could
not be found.
The EIP
could not be
found.
Check whether
the specified EIP
ID is valid.
500 VPC.05
14
Neutron Error. An exception
occurs in the
IaaS
OpenStack
system.
Check whether
the Neutron
service is normal
or contact
technical support.
Queryi
ng EIPs
400 VPC.05
01
Invalid limit. Invalid EIP
parameters.
Check whether
the parameter
values are valid
based on the
returned error
message and API
reference
document.
Releasi
ng an
EIP
400 VPC.05
01
Invalid param. Invalid EIP
parameters.
Contact technical
support.
404 VPC.05
04
Floating IP could
not be found.
The EIP
could not be
found.
Check whether
the specified EIP
ID is valid.
409 VPC.05
12
Resource status is
busy, try it again
later.
The EIP
status is
abnormal.
Try again later or
contact technical
support.
500 VPC.05
13
getElementByKey
error.
Network
resources
cannot be
found.
Contact technical
support.
500 VPC.05
16
Publicip is in used
by ELB.
Failed to
release the
EIP because
it is being
used by a
load
balancer.
Unbind the EIP
from the load
balancer.
Elastic IP
API Reference A Appendix
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 321

--- Page 328 ---
Modul
e
Sta
tus
Cod
es
Error
Code
Message Description Handling
Measure
409 VPC.05
17
Floatingip has
associated with
port, please
disassociate it
firstly.
Failed to
release the
EIP because
it is bound
to an ECS.
Unbind the EIP
from the ECS.
500 VPC.05
18
Public IP has
firewall rules.
Failed to
release the
EIP because
it is being
used by a
network
ACL.
Contact technical
support.
409 VPC.05
25
The FloatingIp is
billing, can not
delete.
An EIP
whose
billing mode
is yearly/
monthly
cannot be
released
directly.
Perform rollback
operations.
Updati
ng an
EIP
400 VPC.05
01
Port id is invalid. Invalid EIP
parameters.
Check whether
the port ID is
valid.
404 VPC.05
04
Floating IP could
not be found.
The EIP
could not be
found.
Check whether
the specified EIP
ID is valid.
500 VPC.05
09
Floating ip double
status is invalid.
The port has
already been
associated
with an EIP.
Disassociate the
port from the EIP.
409 VPC.05
10
Floatingip has
already associated
with port.
The EIP has
already been
bound to
another ECS.
Unbind the EIP
from the ECS.
409 VPC.05
11
Port has already
associated with
floatingip.
Failed to
bind the EIP
to the ECS
because
another EIP
has already
been bound
to the ECS.
Unbind the EIP
from the ECS.
Elastic IP
API Reference A Appendix
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 322

--- Page 329 ---
Modul
e
Sta
tus
Cod
es
Error
Code
Message Description Handling
Measure
409 VPC.05
12
Resource status is
busy, try it again
later.
The EIP
status is
abnormal.
Try again later or
contact technical
support.
404
/50
0
VPC.05
14
Neutron Error. An exception
occurs in the
IaaS
OpenStack
system.
Check whether
the Neutron
service is normal
or contact
technical support.
Queryi
ng a
bandwi
dth
400 VPC.03
01
getBandwidth
error bandwidthId
is invalid.
The
bandwidth
parameters
are incorrect.
Check whether
the bandwidth ID
is valid.
404 VPC.03
06
No Eip bandwidth
exist with id.
The
bandwidth
object does
not exist.
The bandwidth
object to be
queried does not
exist.
500 VPC.03
02
Neutron Error. An exception
occurs in the
IaaS
OpenStack
system.
Check whether
the Neutron
service is normal
or contact
technical support.
Queryi
ng
bandwi
dths
400 VPC.03
01
Get bandwidths
error limit is
invalid.
The
bandwidth
parameters
are incorrect.
Check whether
the parameter
values are valid
based on the
returned error
message and API
reference
document.
404 VPC.03
06
No Eip bandwidth
exist with id.
The
bandwidth
object does
not exist.
The bandwidth
object to be
queried does not
exist.
500 VPC.03
02
Neutron Error. An exception
occurs in the
IaaS
OpenStack
system.
Check whether
the Neutron
service is normal
or contact
technical support.
Elastic IP
API Reference A Appendix
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 323

--- Page 330 ---
Modul
e
Sta
tus
Cod
es
Error
Code
Message Description Handling
Measure
Updati
ng a
bandwi
dth
400 VPC.03
01
updateBandwidth
input param is
invalid.
The
bandwidth
parameters
are incorrect.
Check whether
the parameter
values are valid
based on the
returned error
message and API
reference
document.
500 VPC.03
02
Neutron Error. Failed to
obtain
underlying
resources.
Check whether
the Neutron
service is normal
or contact
technical support.
500 VPC.03
05
updateBandwidth
error.
An internal
error occurs
during the
bandwidth
update.
Contact technical
support.
Assigni
ng a
shared
bandwi
dth
400 VPC.03
10
NO QUOTAS for
shareBandwidth!
Insufficient
shared
bandwidth
quota.
Delete the shared
bandwidth that is
no longer
required or
contact technical
support.
Adding
an EIP
to or
removi
ng an
EIP
from a
shared
bandwi
dth
400 VPC.03
01
Invalid publicip_id Invalid EIP. Check whether
the value of
publicip_id in
publicip_info is
valid.
400 VPC.03
23
publicIp can not
be operate with
this bandwidth
Failed to add
an EIP to or
remove an
EIP from a
shared
bandwidth.
Check whether
the shared
bandwidth or EIP
is normal.
Queryi
ng the
Quota
400 VPC.12
07
resource type is
invalid.
The specified
resource
type does
not exist.
Use an existing
resource type.
 
Elastic IP
API Reference A Appendix
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 324

--- Page 331 ---
A.4 Obtaining a Project ID
Scenarios
A project ID is required for some URLs when an API is called. Therefore, you need
to obtain a project ID in advance. Two methods are available:
● Obtain the Project ID by Calling an API
● Obtain the Project ID from the Console
Obtain the Project ID by Calling an API
You can obtain a project ID by calling the API used to query projects based on
specified criteria.
The API used to obtain a project ID is GET https://{Endpoint}/v3/projects.
{Endpoint} is the IAM endpoint and can be obtained from Regions and
Endpoints. For details about API authentication, see Authentication.
The following is an example response. The value of id is the project ID.
{
    "projects": [
        {
            "domain_id": "65ewtrgaggshhk1223245sghjlse684b",
            "is_domain": false,
            "parent_id": "65ewtrgaggshhk1223245sghjlse684b",
            "name": "project_name",
            "description": "",
            "links": {
                "next": null,
                "previous": null,
                "self": "https://www.example.com/v3/projects/a4adasfjljaaaakla12334jklga9sasfg"
            },
            "id": "a4adasfjljaaaakla12334jklga9sasfg",
            "enabled": true
        }
    ],
    "links": {
        "next": null,
        "previous": null,
        "self": "https://www.example.com/v3/projects"
    }
}
Obtain a Project ID from the Console
To obtain a project ID from the console, perform the following operations:
1. Log in to the management console.
2. Click the username and select My Credentials from the drop-down list.
On the API Credentials page, view the project ID in the project list.
Elastic IP
API Reference A Appendix
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 325

--- Page 332 ---
Figure A-1 Viewing the project ID
Elastic IP
API Reference A Appendix
Issue 12 (2025-10-21) Copyright © Huawei Technologies Co., Ltd. 326