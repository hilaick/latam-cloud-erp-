"""
Data Aggregation Service for Master Execution Pipeline
Combines data from multiple sources and allows editing
"""

import json
from datetime import datetime
from typing import Dict, List, Optional, Any
from models import db, ProjectData
from flask import current_app

class MasterPipelineAggregator:
    """Aggregates and manages Master Pipeline data from multiple sources"""
    
    def __init__(self):
        self.cache = {}
        self.cache_timeout = 300  # 5 minutes
        
    def get_master_pipeline_data(self, project_id: Optional[str] = None) -> List[Dict]:
        """
        Get aggregated Master Pipeline data for all projects or specific project
        
        Args:
            project_id: Optional specific project ID
            
        Returns:
            List of enriched project data for Master Pipeline
        """
        # Check cache first
        cache_key = f"master_pipeline_{project_id or 'all'}"
        if cache_key in self.cache:
            cached_data, timestamp = self.cache[cache_key]
            if (datetime.now().timestamp() - timestamp) < self.cache_timeout:
                return cached_data
        
        # Get base projects
        if project_id:
            project = ProjectData.query.get(project_id)
            projects = [project] if project else []
        else:
            projects = ProjectData.query.filter_by(is_deleted=False).all()
        
        # Enrich each project with data from all sources
        enriched_projects = []
        for project in projects:
            try:
                project_data = json.loads(project.data) if isinstance(project.data, str) else project.data
                enriched = self._enrich_project_data(project.id, project_data)
                enriched_projects.append(enriched)
            except Exception as e:
                current_app.logger.error(f"Error enriching project {project.id}: {e}")
                continue
        
        # Cache the results
        self.cache[cache_key] = (enriched_projects, datetime.now().timestamp())
        
        return enriched_projects
    
    def _enrich_project_data(self, project_id: str, base_data: Dict) -> Dict:
        """Enrich project data with information from all sources"""
        # Start with base project data
        enriched = {
            'id': project_id,
            'name': base_data.get('name', 'Unnamed Project'),
            'customerName': base_data.get('customerName', 'Unknown Customer'),
            'country': base_data.get('country', 'TBD'),
            'region': base_data.get('region', 'TBD'),
            'partner': base_data.get('partner', 'TBD'),
            'sa': base_data.get('sa', 'TBD'),
            'techContact': base_data.get('techContact', 'TBD'),
            'status': base_data.get('status', 'draft'),
            'createdAt': base_data.get('createdAt', datetime.now().isoformat()),
            'updatedAt': base_data.get('updatedAt', datetime.now().isoformat()),
            
            # Timeline data (editable in Master Pipeline)
            'startDate': base_data.get('startDate') or base_data.get('timeline', {}).get('start'),
            'liveDate': base_data.get('liveDate') or base_data.get('timeline', {}).get('live'),
            'timeline': base_data.get('timeline', {}),
            
            # Progress data (calculated from execution board)
            'progress': self._calculate_progress(project_id, base_data),
            'currentPhase': self._determine_current_phase(project_id, base_data),
            'blockers': base_data.get('blockers', []),
            
            # Financial data (from FinOps)
            'budget': base_data.get('budget', 0),
            'spend': base_data.get('spend', 0),
            'forecast': base_data.get('forecast', 0),
            'roi': base_data.get('roi', 0),
            
            # ORA data
            'ora': base_data.get('ora', {}),
            
            # Metadata for editing
            '_source': 'aggregated',
            '_lastSync': datetime.now().isoformat(),
            '_editHistory': base_data.get('_editHistory', [])
        }
        
        return enriched
    
    def _calculate_progress(self, project_id: str, project_data: Dict) -> int:
        """Calculate progress percentage from execution board tasks"""
        # Check if progress is manually overridden
        if 'progress' in project_data and project_data['progress'] is not None:
            return project_data['progress']
        
        # Default: calculate from phases
        phases = ['intake', 'wbs', 'architecture', 'execution', 'validation', 'live']
        current_phase = project_data.get('currentPhase', 'intake')
        
        try:
            phase_index = phases.index(current_phase.lower())
            # Each phase is worth 100/len(phases) %
            return min(100, int((phase_index / len(phases)) * 100))
        except (ValueError, AttributeError):
            return 0
    
    def _determine_current_phase(self, project_id: str, project_data: Dict) -> str:
        """Determine current phase from project data"""
        phases = ['Intake', 'WBS', 'Architecture', 'Execution', 'Validation', 'Live']
        
        # Check for explicit phase setting
        if 'currentPhase' in project_data and project_data['currentPhase'] in phases:
            return project_data['currentPhase']
        
        # Determine from progress
        progress = self._calculate_progress(project_id, project_data)
        phase_index = min(len(phases) - 1, int((progress / 100) * len(phases)))
        
        return phases[phase_index]
    
    def update_master_pipeline_field(self, project_id: str, field: str, value: Any, user: str = 'system') -> bool:
        """
        Update a field in the Master Pipeline
        
        Args:
            project_id: Project ID to update
            field: Field name to update
            value: New value
            user: User making the change (for audit trail)
            
        Returns:
            Success status
        """
        try:
            project = ProjectData.query.get(project_id)
            if not project:
                current_app.logger.error(f"Project {project_id} not found")
                return False
            
            # Parse existing data
            project_data = json.loads(project.data) if isinstance(project.data, str) else project.data
            
            # Track edit history
            old_value = project_data.get(field)
            edit_record = {
                'field': field,
                'old_value': old_value,
                'new_value': value,
                'user': user,
                'timestamp': datetime.now().isoformat()
            }
            
            # Initialize edit history if not exists
            if '_editHistory' not in project_data:
                project_data['_editHistory'] = []
            
            # Add to edit history (limit to last 100 edits)
            project_data['_editHistory'].append(edit_record)
            if len(project_data['_editHistory']) > 100:
                project_data['_editHistory'] = project_data['_editHistory'][-100:]
            
            # Update the field
            project_data[field] = value
            project_data['updatedAt'] = datetime.now().isoformat()
            
            # Save back to database
            project.data = json.dumps(project_data, ensure_ascii=False)
            db.session.commit()
            
            # Invalidate cache
            self._invalidate_cache(project_id)
            
            current_app.logger.info(f"Updated {field} for project {project_id}: {old_value} -> {value}")
            return True
            
        except Exception as e:
            current_app.logger.error(f"Error updating field {field} for project {project_id}: {e}")
            db.session.rollback()
            return False
    
    def update_timeline(self, project_id: str, timeline_data: Dict, user: str = 'system') -> bool:
        """
        Update timeline data (startDate, liveDate, milestones)
        
        Args:
            project_id: Project ID
            timeline_data: Dictionary with timeline fields
            user: User making the change
            
        Returns:
            Success status
        """
        try:
            project = ProjectData.query.get(project_id)
            if not project:
                return False
            
            project_data = json.loads(project.data) if isinstance(project.data, str) else project.data
            
            # Initialize timeline if not exists
            if 'timeline' not in project_data:
                project_data['timeline'] = {}
            
            # Track changes
            changes = []
            for field, new_value in timeline_data.items():
                old_value = project_data.get(field) or project_data.get('timeline', {}).get(field)
                
                if old_value != new_value:
                    changes.append({
                        'field': field,
                        'old_value': old_value,
                        'new_value': new_value,
                        'user': user,
                        'timestamp': datetime.now().isoformat()
                    })
                    
                    # Update in timeline or root
                    if field in ['startDate', 'liveDate', 'milestones']:
                        project_data['timeline'][field] = new_value
                        # Also keep at root for backward compatibility
                        project_data[field] = new_value
                    else:
                        project_data[field] = new_value
            
            # Add to edit history
            if '_editHistory' not in project_data:
                project_data['_editHistory'] = []
            
            for change in changes:
                project_data['_editHistory'].append(change)
            
            # Limit edit history
            if len(project_data['_editHistory']) > 100:
                project_data['_editHistory'] = project_data['_editHistory'][-100:]
            
            project_data['updatedAt'] = datetime.now().isoformat()
            project.data = json.dumps(project_data, ensure_ascii=False)
            db.session.commit()
            
            # Invalidate cache
            self._invalidate_cache(project_id)
            
            current_app.logger.info(f"Updated timeline for project {project_id}: {len(changes)} changes")
            return True
            
        except Exception as e:
            current_app.logger.error(f"Error updating timeline for project {project_id}: {e}")
            db.session.rollback()
            return False
    
    def bulk_update_projects(self, updates: List[Dict], user: str = 'system') -> Dict:
        """
        Bulk update multiple projects in Master Pipeline
        
        Args:
            updates: List of update objects with project_id, field, value
            user: User making the changes
            
        Returns:
            Dictionary with results
        """
        results = {
            'success': [],
            'failed': []
        }
        
        for update in updates:
            project_id = update.get('project_id')
            field = update.get('field')
            value = update.get('value')
            
            if not all([project_id, field, value]):
                results['failed'].append({
                    'project_id': project_id,
                    'error': 'Missing required fields'
                })
                continue
            
            success = self.update_master_pipeline_field(project_id, field, value, user)
            
            if success:
                results['success'].append({
                    'project_id': project_id,
                    'field': field,
                    'value': value
                })
            else:
                results['failed'].append({
                    'project_id': project_id,
                    'field': field,
                    'error': 'Update failed'
                })
        
        return results
    
    def get_edit_history(self, project_id: str, limit: int = 50) -> List[Dict]:
        """Get edit history for a project"""
        project = ProjectData.query.get(project_id)
        if not project:
            return []
        
        try:
            project_data = json.loads(project.data) if isinstance(project.data, str) else project.data
            history = project_data.get('_editHistory', [])
            return history[-limit:]  # Return most recent edits
        except:
            return []
    
    def _invalidate_cache(self, project_id: Optional[str] = None):
        """Invalidate cache for specific project or all projects"""
        if project_id:
            cache_keys = [f"master_pipeline_{project_id}", "master_pipeline_all"]
        else:
            cache_keys = [k for k in self.cache.keys() if k.startswith("master_pipeline_")]
        
        for key in cache_keys:
            self.cache.pop(key, None)

# Singleton instance
master_pipeline_aggregator = MasterPipelineAggregator()