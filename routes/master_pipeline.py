"""
Master Pipeline API Routes
Provides aggregated view and editing capabilities for the Master Execution Pipeline
"""

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from services.master_pipeline_aggregator import master_pipeline_aggregator
from models import db, ProjectData
import json
from datetime import datetime

master_pipeline_bp = Blueprint('master_pipeline', __name__, url_prefix='/api/master-pipeline')

@master_pipeline_bp.route('/', methods=['GET'])
@jwt_required()
def get_master_pipeline():
    """
    Get complete Master Pipeline view with aggregated data from all sources
    
    Query Parameters:
        - project_id: Optional specific project ID
        - refresh: Optional boolean to force cache refresh
    """
    try:
        project_id = request.args.get('project_id')
        refresh = request.args.get('refresh', 'false').lower() == 'true'
        
        if refresh:
            master_pipeline_aggregator._invalidate_cache(project_id)
        
        data = master_pipeline_aggregator.get_master_pipeline_data(project_id)
        
        return jsonify({
            'success': True,
            'data': data,
            'count': len(data),
            'timestamp': datetime.now().isoformat()
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Failed to get master pipeline data: {str(e)}'
        }), 500

@master_pipeline_bp.route('/update-field', methods=['POST'])
@jwt_required()
def update_field():
    """
    Update a single field in the Master Pipeline
    
    Request Body:
        {
            "project_id": "project-123",
            "field": "startDate",
            "value": "2024-06-01"
        }
    """
    try:
        data = request.get_json()
        if not data:
            return jsonify({'success': False, 'error': 'No data provided'}), 400
        
        project_id = data.get('project_id')
        field = data.get('field')
        value = data.get('value')
        
        if not all([project_id, field]):
            return jsonify({'success': False, 'error': 'Missing required fields'}), 400
        
        # Get current user for audit trail
        current_user = get_jwt_identity()
        user_email = f"user_{current_user}"
        
        success = master_pipeline_aggregator.update_master_pipeline_field(
            project_id, field, value, user_email
        )
        
        if success:
            return jsonify({
                'success': True,
                'message': f'Field {field} updated successfully',
                'project_id': project_id,
                'field': field,
                'value': value
            })
        else:
            return jsonify({
                'success': False,
                'error': f'Failed to update field {field} for project {project_id}'
            }), 400
            
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Failed to update field: {str(e)}'
        }), 500

@master_pipeline_bp.route('/update-timeline', methods=['POST'])
@jwt_required()
def update_timeline():
    """
    Update timeline data (startDate, liveDate, milestones)
    
    Request Body:
        {
            "project_id": "project-123",
            "startDate": "2024-06-01",
            "liveDate": "2024-12-31",
            "milestones": [...]
        }
    """
    try:
        data = request.get_json()
        if not data:
            return jsonify({'success': False, 'error': 'No data provided'}), 400
        
        project_id = data.get('project_id')
        if not project_id:
            return jsonify({'success': False, 'error': 'Missing project_id'}), 400
        
        # Extract timeline data
        timeline_data = {}
        timeline_fields = ['startDate', 'liveDate', 'milestones', 'timelineNotes']
        
        for field in timeline_fields:
            if field in data:
                timeline_data[field] = data[field]
        
        if not timeline_data:
            return jsonify({'success': False, 'error': 'No timeline data provided'}), 400
        
        # Get current user for audit trail
        current_user = get_jwt_identity()
        user_email = f"user_{current_user}"
        
        success = master_pipeline_aggregator.update_timeline(
            project_id, timeline_data, user_email
        )
        
        if success:
            return jsonify({
                'success': True,
                'message': 'Timeline updated successfully',
                'project_id': project_id,
                'updates': timeline_data
            })
        else:
            return jsonify({
                'success': False,
                'error': f'Failed to update timeline for project {project_id}'
            }), 400
            
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Failed to update timeline: {str(e)}'
        }), 500

@master_pipeline_bp.route('/bulk-update', methods=['POST'])
@jwt_required()
def bulk_update():
    """
    Bulk update multiple projects in Master Pipeline
    
    Request Body:
        {
            "updates": [
                {
                    "project_id": "project-123",
                    "field": "progress",
                    "value": 75
                },
                {
                    "project_id": "project-456",
                    "field": "currentPhase",
                    "value": "Execution"
                }
            ]
        }
    """
    try:
        data = request.get_json()
        if not data:
            return jsonify({'success': False, 'error': 'No data provided'}), 400
        
        updates = data.get('updates', [])
        if not updates:
            return jsonify({'success': False, 'error': 'No updates provided'}), 400
        
        # Get current user for audit trail
        current_user = get_jwt_identity()
        user_email = f"user_{current_user}"
        
        results = master_pipeline_aggregator.bulk_update_projects(updates, user_email)
        
        return jsonify({
            'success': True,
            'message': f'Bulk update completed: {len(results["success"])} successful, {len(results["failed"])} failed',
            'results': results
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Failed to perform bulk update: {str(e)}'
        }), 500

@master_pipeline_bp.route('/edit-history/<project_id>', methods=['GET'])
@jwt_required()
def get_edit_history(project_id):
    """
    Get edit history for a project in Master Pipeline
    
    Query Parameters:
        - limit: Maximum number of history entries (default: 50)
    """
    try:
        limit = request.args.get('limit', 50, type=int)
        
        history = master_pipeline_aggregator.get_edit_history(project_id, limit)
        
        return jsonify({
            'success': True,
            'project_id': project_id,
            'history': history,
            'count': len(history)
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Failed to get edit history: {str(e)}'
        }), 500

@master_pipeline_bp.route('/sync-sources', methods=['POST'])
@jwt_required()
def sync_data_sources():
    """
    Manually trigger sync of data from all sources
    Forces cache refresh and re-aggregation
    """
    try:
        # Invalidate all cache
        master_pipeline_aggregator._invalidate_cache()
        
        # Get fresh data
        data = master_pipeline_aggregator.get_master_pipeline_data()
        
        return jsonify({
            'success': True,
            'message': 'Data sources synced successfully',
            'projects_count': len(data),
            'timestamp': datetime.now().isoformat()
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Failed to sync data sources: {str(e)}'
        }), 500

@master_pipeline_bp.route('/fields', methods=['GET'])
@jwt_required()
def get_editable_fields():
    """
    Get list of editable fields in Master Pipeline
    """
    editable_fields = [
        {
            'field': 'name',
            'label': 'Project Name',
            'type': 'text',
            'editable': True,
            'source': 'project'
        },
        {
            'field': 'customerName',
            'label': 'Customer',
            'type': 'text',
            'editable': True,
            'source': 'project'
        },
        {
            'field': 'startDate',
            'label': 'Start Date',
            'type': 'date',
            'editable': True,
            'source': 'timeline'
        },
        {
            'field': 'liveDate',
            'label': 'Live Date',
            'type': 'date',
            'editable': True,
            'source': 'timeline'
        },
        {
            'field': 'progress',
            'label': 'Progress %',
            'type': 'number',
            'min': 0,
            'max': 100,
            'editable': True,
            'source': 'execution'
        },
        {
            'field': 'currentPhase',
            'label': 'Current Phase',
            'type': 'select',
            'options': ['Intake', 'WBS', 'Architecture', 'Execution', 'Validation', 'Live'],
            'editable': True,
            'source': 'execution'
        },
        {
            'field': 'budget',
            'label': 'Budget',
            'type': 'currency',
            'editable': True,
            'source': 'finops'
        },
        {
            'field': 'spend',
            'label': 'Spend to Date',
            'type': 'currency',
            'editable': True,
            'source': 'finops'
        },
        {
            'field': 'forecast',
            'label': 'Forecast',
            'type': 'currency',
            'editable': True,
            'source': 'finops'
        },
        {
            'field': 'region',
            'label': 'Region',
            'type': 'text',
            'editable': True,
            'source': 'project'
        },
        {
            'field': 'partner',
            'label': 'Partner',
            'type': 'text',
            'editable': True,
            'source': 'project'
        },
        {
            'field': 'sa',
            'label': 'SA',
            'type': 'text',
            'editable': True,
            'source': 'project'
        },
        {
            'field': 'techContact',
            'label': 'Tech Contact',
            'type': 'text',
            'editable': True,
            'source': 'project'
        },
        {
            'field': 'blockers',
            'label': 'Blockers',
            'type': 'text_array',
            'editable': True,
            'source': 'execution'
        },
        {
            'field': 'timelineNotes',
            'label': 'Timeline Notes',
            'type': 'textarea',
            'editable': True,
            'source': 'timeline'
        }
    ]
    
    return jsonify({
        'success': True,
        'fields': editable_fields,
        'count': len(editable_fields)
    })

@master_pipeline_bp.route('/capacity-planning', methods=['GET'])
@jwt_required()
def capacity_planning():
    """Get capacity planning data for all phases"""
    try:
        # Get all projects
        projects = ProjectData.query.all()
        
        # Count active vs pre-sales projects
        active_projects = [p for p in projects if not p.isWaiting]
        pipeline_projects = [p for p in projects if p.isWaiting]
        
        # Team capacity configuration
        team_capacity = {
            'total_engineers': 8,
            'engineers_per_phase': {
                '1_arb': 2,
                '2_architecture': 3,
                '3_planning': 2,
                '4_execution': 6,
                '5_postlive': 2
            },
            'max_projects_per_phase': {
                '1_arb': 3,
                '2_architecture': 4,
                '3_planning': 3,
                '4_execution': 8,
                '5_postlive': 4
            }
        }
        
        # Calculate phase capacity
        phase_capacity = {}
        phases = ['1_arb', '2_architecture', '3_planning', '4_execution', '5_postlive']
        
        for phase in phases:
            # Count active projects in this phase
            active_in_phase = len([p for p in active_projects if p.lifecycleState == phase])
            max_concurrent = team_capacity['max_projects_per_phase'][phase]
            
            # Calculate available slots
            available_slots = max(0, max_concurrent - active_in_phase)
            
            # Calculate utilization percentage
            utilization_percentage = (active_in_phase / max_concurrent * 100) if max_concurrent > 0 else 0
            
            # Determine status
            if available_slots >= 2:
                status = 'available'
            elif available_slots == 1:
                status = 'limited'
            else:
                status = 'waiting'
            
            # Calculate queue length (pre-sales projects targeting this phase)
            queue_length = len([p for p in pipeline_projects if p.waitingStage == phase])
            
            # Calculate next available date (simplified - 2 weeks per project in queue)
            next_available_date = None
            if queue_length > 0:
                from datetime import datetime, timedelta
                weeks_per_project = 2
                weeks_to_wait = queue_length * weeks_per_project
                next_available_date = (datetime.now() + timedelta(weeks=weeks_to_wait)).isoformat()
            
            phase_capacity[phase] = {
                'active_projects': active_in_phase,
                'max_concurrent': max_concurrent,
                'available_slots': available_slots,
                'utilization_percentage': round(utilization_percentage, 1),
                'status': status,
                'queue_length': queue_length,
                'next_available_date': next_available_date
            }
        
        # Generate recommendations
        recommendations = []
        
        # Check for bottlenecks
        for phase, data in phase_capacity.items():
            if data['status'] == 'waiting':
                recommendations.append({
                    'priority': 'high',
                    'title': f'{phase.replace("_", " ").title()} Bottleneck',
                    'description': f'{data["active_projects"]}/{data["max_concurrent"]} slots filled. Queue: {data["queue_length"]} projects waiting.',
                    'action': 'Review Queue'
                })
            elif data['status'] == 'limited':
                recommendations.append({
                    'priority': 'medium',
                    'title': f'{phase.replace("_", " ").title()} Capacity Limited',
                    'description': f'Only {data["available_slots"]} slot(s) available. Next opening: {data["next_available_date"][:10] if data["next_available_date"] else "Immediate"}',
                    'action': 'Schedule Now'
                })
        
        # Add general recommendations
        if len(pipeline_projects) > len(active_projects) * 0.5:
            recommendations.append({
                'priority': 'medium',
                'title': 'High Pipeline Volume',
                'description': f'Pipeline ({len(pipeline_projects)}) exceeds 50% of active projects ({len(active_projects)}). Consider accelerating conversions.',
                'action': 'Review Pipeline'
            })
        
        # Check for underutilized phases
        underutilized = [phase for phase, data in phase_capacity.items() if data['utilization_percentage'] < 30]
        if underutilized:
            recommendations.append({
                'priority': 'low',
                'title': 'Underutilized Capacity',
                'description': f'Phases {", ".join([p.replace("_", " ").title() for p in underutilized])} have <30% utilization.',
                'action': 'Reallocate Resources'
            })
        
        return jsonify({
            'success': True,
            'team_capacity': team_capacity,
            'active_projects': len(active_projects),
            'pipeline_projects': len(pipeline_projects),
            'phase_capacity': phase_capacity,
            'recommendations': recommendations[:5]  # Limit to top 5
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500