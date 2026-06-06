#!/usr/bin/env python3
"""
Quotation Versioning Service
Handles quotation file storage, version tracking, and blueprint diffs
"""

import os
import json
import hashlib
import uuid
from datetime import datetime
from pathlib import Path
from typing import Dict, Any, Optional, Tuple
from models import db
import difflib

def generate_quotation_version_id() -> str:
    """Generate a unique ID for quotation version"""
    return f"qver_{uuid.uuid4().hex[:12]}"

def save_quotation_file(project_id: str, file_content, filename: str) -> str:
    """
    Save quotation file to permanent storage
    Returns: Path where file was saved
    """
    # Create project-specific directory
    project_dir = Path(f"uploads/quotations/{project_id}")
    project_dir.mkdir(parents=True, exist_ok=True)
    
    # Generate unique filename with timestamp
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    base_name = Path(filename).stem
    extension = Path(filename).suffix
    safe_filename = f"{base_name}_{timestamp}{extension}"
    
    # Save file
    file_path = project_dir / safe_filename
    file_content.save(str(file_path))
    
    return str(file_path)

def get_next_version_number(project_id: str) -> int:
    """Get the next version number for a project's quotations"""
    from models import QuotationVersion
    last_version = QuotationVersion.query.filter_by(
        project_id=project_id
    ).order_by(QuotationVersion.version_number.desc()).first()
    
    return (last_version.version_number + 1) if last_version else 1

def generate_blueprint_diff(old_blueprint: Dict, new_blueprint: Dict) -> str:
    """
    Generate a human-readable diff between two blueprints
    Returns: Markdown-formatted diff summary
    """
    diff_lines = []
    
    # Compare customer
    if old_blueprint.get('customer') != new_blueprint.get('customer'):
        diff_lines.append(f"**Customer changed**: `{old_blueprint.get('customer', 'N/A')}` → `{new_blueprint.get('customer', 'N/A')}`")
    
    # Compare compute resources
    old_compute = old_blueprint.get('topology', {}).get('compute', [])
    new_compute = new_blueprint.get('topology', {}).get('compute', [])
    
    old_compute_names = {c['name'] for c in old_compute}
    new_compute_names = {c['name'] for c in new_compute}
    
    added = new_compute_names - old_compute_names
    removed = old_compute_names - new_compute_names
    
    if added:
        diff_lines.append(f"**Added compute resources**: {', '.join(sorted(added))}")
    
    if removed:
        diff_lines.append(f"**Removed compute resources**: {', '.join(sorted(removed))}")
    
    # Check for modified resources
    old_compute_map = {c['name']: c for c in old_compute}
    new_compute_map = {c['name']: c for c in new_compute}
    
    modified = []
    for name in old_compute_names & new_compute_names:
        old_resource = old_compute_map[name]
        new_resource = new_compute_map[name]
        
        if old_resource != new_resource:
            changes = []
            for key in ['flavor', 'is_public', 'status']:
                if old_resource.get(key) != new_resource.get(key):
                    changes.append(f"{key}: `{old_resource.get(key)}`→`{new_resource.get(key)}`")
            
            if old_resource.get('metadata') != new_resource.get('metadata'):
                old_meta = old_resource.get('metadata', {})
                new_meta = new_resource.get('metadata', {})
                for key in ['cpu_cores', 'ram_gb', 'storage_gb', 'os_type', 'tier']:
                    if old_meta.get(key) != new_meta.get(key):
                        changes.append(f"{key}: `{old_meta.get(key)}`→`{new_meta.get(key)}`")
            
            if changes:
                modified.append(f"{name} ({', '.join(changes)})")
    
    if modified:
        diff_lines.append(f"**Modified compute resources**: {', '.join(modified[:5])}")
        if len(modified) > 5:
            diff_lines.append(f"  ... and {len(modified) - 5} more modifications")
    
    # Compare other resource types
    for resource_type in ['network', 'databases', 'storage']:
        old_resources = old_blueprint.get('topology', {}).get(resource_type, [])
        new_resources = new_blueprint.get('topology', {}).get(resource_type, [])
        
        if len(old_resources) != len(new_resources):
            diff_lines.append(f"**{resource_type.capitalize()} count changed**: {len(old_resources)} → {len(new_resources)}")
    
    if not diff_lines:
        return "No significant changes detected (metadata only)"
    
    return "\\n".join(diff_lines)

def create_quotation_version(
    project_id: str,
    filename: str,
    file_path: str,
    uploaded_by: str,
    blueprint_data: Dict,
    cr_id: Optional[str] = None
):
    """
    Create a new quotation version record
    Returns: Created QuotationVersion object
    """
    from models import QuotationVersion
    # Get previous version
    previous_version = QuotationVersion.query.filter_by(
        project_id=project_id
    ).order_by(QuotationVersion.version_number.desc()).first()
    
    # Generate change summary
    change_summary = None
    if previous_version and previous_version.blueprint_snapshot:
        try:
            old_blueprint = json.loads(previous_version.blueprint_snapshot)
            change_summary = generate_blueprint_diff(old_blueprint, blueprint_data)
        except:
            change_summary = "Could not generate diff (format error)"
    
    # Create new version
    version = QuotationVersion(
        id=generate_quotation_version_id(),
        project_id=project_id,
        version_number=get_next_version_number(project_id),
        quotation_filename=filename,
        quotation_path=file_path,
        uploaded_by=uploaded_by,
        blueprint_snapshot=json.dumps(blueprint_data, indent=2),
        change_summary=change_summary,
        cr_id=cr_id,
        previous_version_id=previous_version.id if previous_version else None
    )
    
    db.session.add(version)
    db.session.commit()
    
    return version

def get_quotation_versions(project_id: str, limit: int = 50) -> list:
    """Get all quotation versions for a project, newest first"""
    from models import QuotationVersion
    versions = QuotationVersion.query.filter_by(
        project_id=project_id
    ).order_by(
        QuotationVersion.version_number.desc()
    ).limit(limit).all()
    
    return [{
        'id': v.id,
        'version_number': v.version_number,
        'quotation_filename': v.quotation_filename,
        'uploaded_by': v.uploaded_by,
        'uploaded_at': v.uploaded_at.isoformat() if v.uploaded_at else None,
        'change_summary': v.change_summary,
        'cr_id': v.cr_id,
        'has_file': os.path.exists(v.quotation_path) if v.quotation_path else False
    } for v in versions]

def get_quotation_version(version_id: str) -> Optional[Dict]:
    """Get a specific quotation version with blueprint data"""
    from models import QuotationVersion
    version = QuotationVersion.query.get(version_id)
    if not version:
        return None
    
    try:
        blueprint_data = json.loads(version.blueprint_snapshot)
    except:
        blueprint_data = {}
    
    return {
        'id': version.id,
        'project_id': version.project_id,
        'version_number': version.version_number,
        'quotation_filename': version.quotation_filename,
        'quotation_path': version.quotation_path,
        'uploaded_by': version.uploaded_by,
        'uploaded_at': version.uploaded_at.isoformat() if version.uploaded_at else None,
        'blueprint_data': blueprint_data,
        'change_summary': version.change_summary,
        'cr_id': version.cr_id,
        'previous_version_id': version.previous_version_id,
        'has_file': os.path.exists(version.quotation_path) if version.quotation_path else False
    }

def link_cr_to_quotation_version(cr_id: str, version_id: str) -> bool:
    """Link a Change Request ID to a quotation version"""
    from models import QuotationVersion
    version = QuotationVersion.query.get(version_id)
    if not version:
        return False
    
    version.cr_id = cr_id
    db.session.commit()
    return True

def revert_to_version(version_id: str) -> Optional[Dict]:
    """
    Revert a project's blueprint to a specific quotation version
    Returns: Blueprint data from that version
    """
    from models import QuotationVersion, ProjectData
    import json as json_module
    
    version = QuotationVersion.query.get(version_id)
    if not version:
        return None
    
    try:
        blueprint_data = json.loads(version.blueprint_snapshot)
        
        # Update the project's blueprintData
        project = ProjectData.query.get(version.project_id)
        if project:
            project_data = json_module.loads(project.data)
            project_data['blueprintData'] = blueprint_data
            project.data = json_module.dumps(project_data)
            project.updated_at = datetime.utcnow()
            db.session.commit()
        
        return blueprint_data
    except Exception as e:
        print(f"Error reverting to version {version_id}: {str(e)}")
        return None