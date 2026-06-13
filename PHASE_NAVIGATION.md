# Execution Orchestrator Phase Navigation Enhancement

## Problem Statement
The Execution Orchestrator had a linear progression through 5 phases, but once users advanced to a later phase (e.g., Phase 3), they couldn't go back to test previous phases (e.g., Phase 2). This blocked testing of recent changes.

## Solution Implemented
Added phase navigation capabilities to allow moving between phases for testing purposes.

### Changes Made:

1. **Navigation Functions** (`StepExecution.jsx`):
   - `goToPhase(targetStatus)`: Navigates to any phase with confirmation dialog
   - `getPhaseNumber(status)`: Returns phase number (1-5) for any status
   - `getPhaseInfo(status)`: Returns phase name and color for display

2. **Navigation Bar** (Top of orchestrator section):
   - Added a new navigation bar with buttons for all 5 phases
   - Shows current phase information
   - Each button triggers `goToPhase()` with confirmation

3. **Phase-Specific Navigation Buttons**:
   - **Phase 2**: Added "Test Phase 2" button when not in Phase 2
   - **Phase 3**: Added "Test Phase 3" button when not in Phase 3  
   - **Phase 4**: Added "Re-Test" button when in Phase 4, "Test" button when completed
   - All navigation requires confirmation for safety

### Phase Status Mapping:
- `pending` → Phase 1 (Start)
- `preflight_complete` → Phase 1 (Complete)
- `sandbox_built` → Phase 2 (Build Landing Zone)
- `agents_deployed` → Phase 3 (Deploy Agents)
- `syncing` → Phase 4 (Continuous Sync)
- `cutover_ready` → Phase 5 (Ready for Cutover)
- `completed` → Phase 5 (Completed)

### API Endpoint Used:
- `PATCH /api/erp/projects/{project_id}/partial`
- Updates `execStatus` field in project data

### Safety Features:
1. **Confirmation Dialog**: All phase changes require user confirmation
2. **Context-Aware Buttons**: Only show relevant navigation options
3. **No Data Loss**: Phase changes only update `execStatus`, preserve other data

## How to Use:

### Via UI:
1. **Navigation Bar**: Use the top bar to jump to any phase
2. **Phase Buttons**: Use "Test Phase X" buttons in each phase section
3. **Confirmation**: Confirm navigation when prompted

### Via API (for testing):
```bash
# Change to Phase 2
curl -X PATCH http://localhost:9119/api/erp/projects/{project_id}/partial \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{"execStatus": "sandbox_built"}'

# Change to Phase 3  
curl -X PATCH http://localhost:9119/api/erp/projects/{project_id}/partial \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{"execStatus": "agents_deployed"}'
```

### Test Script:
Run the test script to verify:
```bash
python3 test_phase_navigation.py
```

## Files Modified:
1. `frontend/src/components/wizard/StepExecution.jsx` - Main component with navigation
2. `frontend/dist/index.html` - Built output (auto-generated)
3. `test_phase_navigation.py` - Test script for phase navigation

## Commit:
`77b4359` - Add phase navigation to Execution Orchestrator

## Benefits:
1. **Testing Flexibility**: Developers can test any phase without being locked
2. **User Control**: Clear navigation between phases
3. **Safety**: Confirmation dialogs prevent accidental changes
4. **Visual Feedback**: Current phase always displayed
5. **No Breaking Changes**: Original functionality preserved