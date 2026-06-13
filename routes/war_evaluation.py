from flask import Blueprint, request, jsonify
import logging
from datetime import datetime

logger = logging.getLogger(__name__)
war_bp = Blueprint('war', __name__)

@war_bp.route('/api/war/evaluate', methods=['POST'])
def evaluate_war():
    """
    Evaluate Huawei Cloud infrastructure against Well-Architected Framework (WAR)
    """
    try:
        data = request.json
        project_id = data.get('project_id')
        region = data.get('region', 'la-south-2')
        target_architecture = data.get('target_architecture', {})
        
        if not project_id:
            return jsonify({"error": "Project ID required"}), 400
        
        logger.info(f"Evaluating WAR for project {project_id} in region {region}")
        
        # Extract topology data
        topology = target_architecture.get('topology', {})
        compute = topology.get('compute', [])
        databases = topology.get('databases', [])
        network = topology.get('network', [])
        storage = topology.get('storage', [])
        
        # Initialize scores
        scores = {
            "resilience": 0,
            "security": 0,
            "performance": 0,
            "cost": 0,
            "operations": 0,
            "total": 0
        }
        
        factors = {
            "resilience": [],
            "security": [],
            "performance": [],
            "cost": [],
            "operations": []
        }
        
        # 1. RESILIENCE SCORE (0-100)
        resilience_score = 0
        
        # Check for HA configurations
        ha_ecs_count = sum(1 for ecs in compute if ecs.get('ha_enabled') or ecs.get('replica_count', 0) > 1)
        ha_db_count = sum(1 for db in databases if db.get('ha_enabled') or db.get('replication', False))
        
        if len(compute) > 0:
            ha_percentage = (ha_ecs_count / len(compute)) * 40
            resilience_score += min(40, ha_percentage)
            factors["resilience"].append(f"ECS HA: {ha_ecs_count}/{len(compute)} ({ha_percentage:.0f}%)")
        
        if len(databases) > 0:
            db_ha_percentage = (ha_db_count / len(databases)) * 30
            resilience_score += min(30, db_ha_percentage)
            factors["resilience"].append(f"Database HA: {ha_db_count}/{len(databases)} ({db_ha_percentage:.0f}%)")
        
        # Check for multi-AZ deployment
        multi_az = any(net.get('multi_az', False) for net in network)
        if multi_az:
            resilience_score += 15
            factors["resilience"].append("Multi-AZ deployment (+15)")
        
        # Check for backup/DR services
        has_backup = any(stor.get('type') in ['CBR', 'SDRS', 'CSBS'] for stor in storage)
        if has_backup:
            resilience_score += 15
            factors["resilience"].append("Backup/DR services configured (+15)")
        
        scores["resilience"] = int(min(100, resilience_score))
        # 2. SECURITY SCORE (0-100) - Improved with better defaults
        security_score = 0
        factors["security"] = []
        
        # Check security groups - if none found, check for any network security
        security_groups = [net for net in network if net.get('type') in ['SG', 'Security Group', 'security-group', 'firewall']]
        if security_groups:
            security_score += 20
            factors["security"].append(f"Security Groups: {len(security_groups)} (+20)")
        elif len(network) > 0:
            # If there are network resources but no explicit security groups, give partial credit
            security_score += 10
            factors["security"].append("Basic network security (implicit) (+10)")
        
        # Check for WAF/DDOS protection
        has_waf = any(net.get('type') in ['WAF', 'Anti-DDoS', 'waf', 'ddos', 'ddos-protection'] for net in network)
        if has_waf:
            security_score += 20
            factors["security"].append("WAF/DDOS protection (+20)")
        elif any('web' in str(net.get('name', '')).lower() or 'app' in str(net.get('name', '')).lower() for net in network):
            # If there are web/app resources but no WAF, suggest it
            security_score += 5
            factors["security"].append("Consider adding WAF for web applications (+5)")
        
        # Check for encryption - give partial credit for any storage
        encrypted_storage = sum(1 for stor in storage if stor.get('encrypted', False))
        if len(storage) > 0:
            encryption_percentage = (encrypted_storage / len(storage)) * 30
            security_score += min(30, encryption_percentage)
            factors["security"].append(f"Encrypted storage: {encrypted_storage}/{len(storage)} ({encryption_percentage:.0f}%)")
        elif len(storage) == 0:
            # No storage resources to encrypt
            security_score += 15
            factors["security"].append("No storage resources to encrypt (baseline +15)")
        
        # Check for IAM/RBAC or any identity management
        has_iam = any(net.get('type') in ['IAM', 'RBAC', 'iam', 'identity', 'role'] for net in network)
        if has_iam:
            security_score += 30
            factors["security"].append("IAM/RBAC configured (+30)")
        elif len(compute) > 0 or len(databases) > 0:
            # If there are resources but no IAM, suggest it
            security_score += 10
            factors["security"].append("Consider implementing IAM for access control (+10)")
        
        # Ensure minimum baseline score for having resources
        if security_score == 0 and (len(compute) > 0 or len(databases) > 0 or len(network) > 0 or len(storage) > 0):
            security_score = 20  # Baseline for having some infrastructure
            factors["security"].append("Basic infrastructure security (baseline +20)")
        
        scores["security"] = int(min(100, security_score))
        
        # 3. PERFORMANCE SCORE (0-100) - Improved with better defaults
        performance_score = 0
        factors["performance"] = []
        
        # Check for load balancers or any network optimization
        load_balancers = [net for net in network if net.get('type') in ['ELB', 'Load Balancer', 'loadbalancer', 'lb']]
        if load_balancers:
            performance_score += 25
            factors["performance"].append(f"Load balancers: {len(load_balancers)} (+25)")
        elif len(compute) > 1:
            # Multiple compute instances without load balancing
            performance_score += 10
            factors["performance"].append("Multiple instances (consider load balancing) (+10)")
        
        # Check for CDN/acceleration or caching
        has_cdn = any(net.get('type') in ['CDN', 'DCDN', 'cdn', 'cache', 'acceleration'] for net in network)
        if has_cdn:
            performance_score += 25
            factors["performance"].append("CDN/acceleration (+25)")
        elif any('web' in str(net.get('name', '')).lower() or 'static' in str(net.get('name', '')).lower() for net in network):
            # Web/static content without CDN
            performance_score += 5
            factors["performance"].append("Consider CDN for web content (+5)")
        
        # Check for auto-scaling or scalability features
        auto_scaling_groups = [comp for comp in compute if comp.get('auto_scaling', False) or comp.get('scalable', False)]
        if auto_scaling_groups:
            performance_score += 25
            factors["performance"].append(f"Auto-scaling groups: {len(auto_scaling_groups)} (+25)")
        elif len(compute) > 0:
            # Compute resources without auto-scaling
            performance_score += 10
            factors["performance"].append("Compute resources present (consider auto-scaling) (+10)")
        
        # Check for high-performance storage or any storage optimization
        high_perf_storage = sum(1 for stor in storage if stor.get('performance_tier') in ['ultra', 'high', 'performance', 'ssd', 'premium'])
        if len(storage) > 0:
            perf_storage_percentage = (high_perf_storage / len(storage)) * 25
            performance_score += min(25, perf_storage_percentage)
            factors["performance"].append(f"High-perf storage: {high_perf_storage}/{len(storage)} ({perf_storage_percentage:.0f}%)")
        elif len(storage) == 0:
            # No storage to optimize
            performance_score += 10
            factors["performance"].append("No storage performance requirements (baseline +10)")
        
        # Ensure minimum baseline for having infrastructure
        if performance_score == 0 and (len(compute) > 0 or len(databases) > 0):
            performance_score = 20
            factors["performance"].append("Basic compute infrastructure (baseline +20)")
        
        scores["performance"] = int(min(100, performance_score))
        
        # 4. COST OPTIMIZATION SCORE (0-100) - Improved with better defaults
        cost_score = 0
        factors["cost"] = []
        
        # Check for reserved instances/savings plans or any cost optimization
        reserved_instances = sum(1 for comp in compute if comp.get('billing_type') in ['reserved', 'savings_plan', 'reserved-instance', 'savings-plan'])
        if len(compute) > 0:
            reserved_percentage = (reserved_instances / len(compute)) * 40
            cost_score += min(40, reserved_percentage)
            factors["cost"].append(f"Reserved instances: {reserved_instances}/{len(compute)} ({reserved_percentage:.0f}%)")
        else:
            # No compute resources to optimize
            cost_score += 20
            factors["cost"].append("No compute resources to optimize (baseline +20)")
        
        # Check for auto-scaling (cost optimization) or any scalability
        if auto_scaling_groups:
            cost_score += 30
            factors["cost"].append("Auto-scaling reduces over-provisioning (+30)")
        elif len(compute) > 0:
            # Compute without auto-scaling
            cost_score += 10
            factors["cost"].append("Consider auto-scaling for cost optimization (+10)")
        
        # Check for storage lifecycle policies or any storage optimization
        has_lifecycle = any(stor.get('lifecycle_policy', False) or stor.get('tiering', False) for stor in storage)
        if has_lifecycle:
            cost_score += 30
            factors["cost"].append("Storage lifecycle policies (+30)")
        elif len(storage) > 0:
            # Storage without lifecycle policies
            cost_score += 10
            factors["cost"].append("Consider storage lifecycle policies (+10)")
        
        # Ensure minimum baseline for having infrastructure
        if cost_score == 0 and (len(compute) > 0 or len(storage) > 0):
            cost_score = 25
            factors["cost"].append("Basic infrastructure cost awareness (baseline +25)")
        
        scores["cost"] = int(min(100, cost_score))
        
        # 5. OPERATIONAL EXCELLENCE SCORE (0-100)
        ops_score = 0
        
        # Check for monitoring/observability
        has_monitoring = any(net.get('type') in ['CES', 'Cloud Eye', 'Monitoring'] for net in network)
        if has_monitoring:
            ops_score += 25
            factors["operations"].append("Monitoring configured (+25)")
        
        # Check for logging/auditing
        has_logging = any(stor.get('type') in ['LTS', 'Log Tank Service'] for stor in storage)
        if has_logging:
            ops_score += 25
            factors["operations"].append("Logging/auditing configured (+25)")
        
        # Check for automation/orchestration
        has_orchestration = any(comp.get('type') in ['AS', 'Auto Scaling', 'CCE'] for comp in compute)
        if has_orchestration:
            ops_score += 25
            factors["operations"].append("Automation/orchestration (+25)")
        
        # Check for backup/restore automation
        if has_backup:
            ops_score += 25
            factors["operations"].append("Backup automation (+25)")
        
        scores["operations"] = int(min(100, ops_score))
        
        # Calculate total score
        scores["total"] = round((scores["resilience"] + scores["security"] + scores["performance"] + scores["cost"] + scores["operations"]) / 5)
        
        # Generate recommendations based on scores
        recommendations = []
        if scores["resilience"] < 70:
            recommendations.append({
                "pillar": "resilience",
                "priority": "high" if scores["resilience"] < 50 else "medium",
                "action": "Enable multi-AZ deployment for critical workloads",
                "huawei_service": "SDRS, CBR",
                "impact": "Improves HA/DR capabilities"
            })
        if scores["security"] < 70:
            recommendations.append({
                "pillar": "security",
                "priority": "high" if scores["security"] < 50 else "medium",
                "action": "Implement WAF and enable storage encryption",
                "huawei_service": "WAF, KMS",
                "impact": "Enhances security posture"
            })
        if scores["performance"] < 70:
            recommendations.append({
                "pillar": "performance",
                "priority": "medium",
                "action": "Add load balancers and enable auto-scaling",
                "huawei_service": "ELB, AS",
                "impact": "Improves scalability and performance"
            })
        if scores["cost"] < 70:
            recommendations.append({
                "pillar": "cost",
                "priority": "medium",
                "action": "Consider reserved instances for steady-state workloads",
                "huawei_service": "Reserved ECS",
                "impact": "Reduces operational costs by 30-60%"
            })
        if scores["operations"] < 70:
            recommendations.append({
                "pillar": "operations",
                "priority": "medium",
                "action": "Implement comprehensive monitoring and logging",
                "huawei_service": "CES, LTS",
                "impact": "Improves observability and troubleshooting"
            })
        
        # Determine overall status
        if scores["total"] >= 80:
            status = "excellent"
            status_message = "Architecture meets Huawei Cloud Well-Architected standards"
        elif scores["total"] >= 60:
            status = "good"
            status_message = "Architecture is well-designed with minor improvements needed"
        elif scores["total"] >= 40:
            status = "needs_improvement"
            status_message = "Architecture requires significant improvements"
        else:
            status = "poor"
            status_message = "Architecture does not meet basic standards"
        
        return jsonify({
            "success": True,
            "project_id": project_id,
            "region": region,
            "evaluation_date": datetime.utcnow().isoformat() + "Z",
            "scores": scores,
            "status": status,
            "status_message": status_message,
            "factors": factors,
            "recommendations": recommendations,
            "next_steps": [
                "Review recommendations for each pillar",
                "Implement high-priority improvements first",
                "Schedule follow-up assessment in 30 days",
                "Document architecture decisions in blueprint"
            ]
        })
        
    except Exception as e:
        logger.error(f"WAR evaluation error: {str(e)}")
        return jsonify({"error": str(e)}), 500

@war_bp.route('/api/war/guided-criteria', methods=['GET'])
def get_guided_criteria():
    """Get interactive guided evaluation criteria with explanations"""
    return jsonify({
        "framework": "Huawei Cloud Well-Architected Framework",
        "version": "2.0",
        "description": "Interactive guidance for evaluating your Huawei Cloud architecture",
        "pillars": {
            "resilience": {
                "title": "🛡️ Resilience (High Availability & Disaster Recovery)",
                "description": "Ensures your workload can recover from infrastructure or service disruptions.",
                "why_it_matters": "Minimizes downtime and data loss during failures.",
                "huawei_services": ["SDRS (Storage Disaster Recovery)", "CBR (Cloud Backup & Recovery)", "CSBS (Cloud Server Backup Service)", "RDS HA"],
                "evaluation_guide": [
                    {
                        "question": "Are critical workloads deployed across multiple Availability Zones?",
                        "explanation": "Multi-AZ deployment protects against zone-level failures.",
                        "huawei_service": "SDRS",
                        "points": 15,
                        "check": "Look for 'multi_az': true in network resources"
                    },
                    {
                        "question": "Do ECS instances have High Availability enabled?",
                        "explanation": "HA ensures automatic failover for compute instances.",
                        "huawei_service": "ECS HA",
                        "points": 40,
                        "check": "Check for 'ha_enabled': true in compute resources"
                    },
                    {
                        "question": "Are databases configured with replication?",
                        "explanation": "Database replication prevents data loss and enables failover.",
                        "huawei_service": "RDS HA",
                        "points": 30,
                        "check": "Look for 'replication': true in database resources"
                    },
                    {
                        "question": "Is backup and disaster recovery configured?",
                        "explanation": "Regular backups and DR plans protect against data loss.",
                        "huawei_service": "CBR, CSBS",
                        "points": 15,
                        "check": "Look for CBR or CSBS in storage resources"
                    }
                ],
                "improvement_tips": [
                    "Enable SDRS for critical storage volumes",
                    "Configure CBR backup policies for all databases",
                    "Use Auto Scaling groups with multiple AZs",
                    "Test failover procedures quarterly"
                ]
            },
            "security": {
                "title": "🔒 Security & Compliance",
                "description": "Protects information, systems, and assets while delivering business value.",
                "why_it_matters": "Prevents unauthorized access and data breaches.",
                "huawei_services": ["SG (Security Groups)", "WAF (Web Application Firewall)", "Anti-DDoS", "KMS (Key Management Service)", "IAM (Identity & Access Management)"],
                "evaluation_guide": [
                    {
                        "question": "Are Security Groups properly configured?",
                        "explanation": "Security Groups control inbound/outbound traffic at instance level.",
                        "huawei_service": "SG",
                        "points": 20,
                        "check": "Look for 'type': 'SG' in network resources"
                    },
                    {
                        "question": "Is WAF or Anti-DDoS protection enabled?",
                        "explanation": "Protects web applications from common attacks and DDoS.",
                        "huawei_service": "WAF, Anti-DDoS",
                        "points": 20,
                        "check": "Look for 'type': 'WAF' or 'Anti-DDoS' in network"
                    },
                    {
                        "question": "Is data encrypted at rest?",
                        "explanation": "Encryption protects sensitive data from unauthorized access.",
                        "huawei_service": "KMS",
                        "points": 30,
                        "check": "Check for 'encrypted': true in storage resources"
                    },
                    {
                        "question": "Is IAM/RBAC implemented?",
                        "explanation": "Role-Based Access Control ensures least privilege access.",
                        "huawei_service": "IAM",
                        "points": 30,
                        "check": "Look for 'type': 'IAM' or 'RBAC' in network"
                    }
                ],
                "improvement_tips": [
                    "Enable KMS for all storage volumes",
                    "Configure WAF for public-facing applications",
                    "Implement IAM roles with least privilege",
                    "Enable CloudTrail for audit logging"
                ]
            },
            "performance": {
                "title": "⚡ Performance Efficiency",
                "description": "Uses computing resources efficiently to meet system requirements.",
                "why_it_matters": "Ensures optimal response times and scalability.",
                "huawei_services": ["ELB (Elastic Load Balancing)", "DCDN (Dynamic Content Delivery Network)", "AS (Auto Scaling)", "EVS Performance Tiers"],
                "evaluation_guide": [
                    {
                        "question": "Is load balancing implemented?",
                        "explanation": "Distributes traffic across multiple instances for better performance.",
                        "huawei_service": "ELB",
                        "points": 25,
                        "check": "Look for 'type': 'ELB' or 'Load Balancer' in network"
                    },
                    {
                        "question": "Is CDN or acceleration enabled?",
                        "explanation": "Reduces latency for global users and static content.",
                        "huawei_service": "DCDN",
                        "points": 25,
                        "check": "Look for 'type': 'CDN' or 'DCDN' in network"
                    },
                    {
                        "question": "Is auto-scaling configured?",
                        "explanation": "Automatically adjusts capacity based on demand.",
                        "huawei_service": "AS",
                        "points": 25,
                        "check": "Check for 'auto_scaling': true in compute resources"
                    },
                    {
                        "question": "Are high-performance storage tiers used?",
                        "explanation": "Optimizes storage performance for demanding workloads.",
                        "huawei_service": "EVS Performance",
                        "points": 25,
                        "check": "Look for 'performance_tier': 'high' or 'ultra' in storage"
                    }
                ],
                "improvement_tips": [
                    "Enable Auto Scaling for variable workloads",
                    "Use ELB for high availability and performance",
                    "Implement DCDN for global applications",
                    "Right-size instances based on workload patterns"
                ]
            },
            "cost": {
                "title": "💰 Cost Optimization",
                "description": "Avoids unnecessary costs while maintaining business value.",
                "why_it_matters": "Reduces operational expenses without compromising performance.",
                "huawei_services": ["Reserved ECS", "Auto Scaling", "OBS Lifecycle", "Spot Instances"],
                "evaluation_guide": [
                    {
                        "question": "Are Reserved Instances used for steady-state workloads?",
                        "explanation": "Reserved Instances provide significant cost savings for predictable usage.",
                        "huawei_service": "Reserved ECS",
                        "points": 40,
                        "check": "Look for 'billing_type': 'reserved' in compute resources"
                    },
                    {
                        "question": "Is auto-scaling optimized for cost?",
                        "explanation": "Scaling down during low demand reduces unnecessary costs.",
                        "huawei_service": "AS",
                        "points": 30,
                        "check": "Check for 'auto_scaling': true in compute resources"
                    },
                    {
                        "question": "Are storage lifecycle policies implemented?",
                        "explanation": "Automatically moves infrequently accessed data to cheaper storage tiers.",
                        "huawei_service": "OBS Lifecycle",
                        "points": 30,
                        "check": "Look for 'lifecycle_policy': true in storage resources"
                    }
                ],
                "improvement_tips": [
                    "Use Reserved Instances for production workloads",
                    "Implement Auto Scaling with appropriate thresholds",
                    "Enable OBS lifecycle policies for archival data",
                    "Monitor and right-size underutilized resources"
                ]
            },
            "operations": {
                "title": "🔧 Operational Excellence",
                "description": "Supports development and run workloads effectively.",
                "why_it_matters": "Improves visibility, automation, and operational efficiency.",
                "huawei_services": ["CES (Cloud Eye Service)", "LTS (Log Tank Service)", "AS (Auto Scaling)", "CCE (Cloud Container Engine)"],
                "evaluation_guide": [
                    {
                        "question": "Is comprehensive monitoring enabled?",
                        "explanation": "Monitoring provides visibility into system health and performance.",
                        "huawei_service": "CES",
                        "points": 25,
                        "check": "Look for 'type': 'CES' or 'Monitoring' in network"
                    },
                    {
                        "question": "Are logs centralized and analyzed?",
                        "explanation": "Centralized logging enables troubleshooting and security analysis.",
                        "huawei_service": "LTS",
                        "points": 25,
                        "check": "Look for 'type': 'LTS' or 'Log Tank Service' in storage"
                    },
                    {
                        "question": "Is infrastructure automation implemented?",
                        "explanation": "Automation reduces manual errors and improves consistency.",
                        "huawei_service": "AS, CCE",
                        "points": 25,
                        "check": "Look for 'type': 'AS' or 'CCE' in compute resources"
                    },
                    {
                        "question": "Are backups automated?",
                        "explanation": "Automated backups ensure data protection without manual intervention.",
                        "huawei_service": "CBR Auto",
                        "points": 25,
                        "check": "Look for 'type': 'CBR' with automation features"
                    }
                ],
                "improvement_tips": [
                    "Enable CES monitoring with custom dashboards",
                    "Implement LTS for centralized log management",
                    "Use Infrastructure as Code (Terraform/Ansible)",
                    "Automate backup and recovery procedures"
                ]
            }
        },
        "scoring_guide": {
            "excellent": {
                "range": "80-100 points",
                "description": "Fully aligned with Huawei Cloud best practices",
                "next_steps": "Maintain current configuration, consider advanced optimizations"
            },
            "good": {
                "range": "60-79 points",
                "description": "Well-designed with minor improvements needed",
                "next_steps": "Address high-priority recommendations first"
            },
            "needs_improvement": {
                "range": "40-59 points",
                "description": "Significant improvements required",
                "next_steps": "Review all recommendations and create improvement plan"
            },
            "poor": {
                "range": "0-39 points",
                "description": "Does not meet basic standards",
                "next_steps": "Immediate action required, consider architectural review"
            }
        },
        "how_to_improve": "Click each pillar to see specific recommendations and Huawei Cloud services to implement."
    })