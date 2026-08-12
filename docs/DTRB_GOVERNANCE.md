# DTRB Governance & Change Requests

Automated Delivery Technical Review Board (DTRB) compliance and Architecture unlocking.

---

## Overview

The **DTRB Governance & Change Requests** module provides automated technical compliance validation for your migration architecture. It acts as a **Delivery Technical Review Board** — evaluating every architecture blueprint against security, continuity, and commercial standards before locking it for provisioning.

This is step **2.5** in the Architecture phase of the Standard Delivery Methodology.

---

## How It Works

### 1. Automated Technical Scoring

The DTRB engine performs automated checks on your architecture nodes:

| Check | Category | Weight | What It Validates |
|---|---|---|---|
| **CBR Backup Vaults** | Continuity | 20% | At least one CBR (Cloud Backup & Recovery) vault must be mapped |
| **Security Groups** | Security | 20% | Security groups must be defined for network isolation |
| **Database Isolation** | Security | 30% | No database should have a public IP address (must be on private subnet) |
| **Commercial Alignment** | Commercial | Info only | Unquoted resources flagged as upsell opportunities (no deduction) |

A score of **80% or above** is required to lock the architecture.

### 2. Architecture Locking

- **Lock & Approve Blueprint**: When score ≥ 80%, locks the architecture and transitions the project to "Approved" status
- **Acknowledge Risks & Lock**: When score < 80%, allows locking with explicit risk acknowledgment
- **[Admin Override] Force Lock**: Bypasses the DTRB gate entirely for testing/emergency scenarios

Once locked, the architecture is **immutable** — it cannot be edited without either:
- Raising a Change Request (CR)
- Admin force-unlock

### 3. Change Requests (CR)

Structural changes to a locked architecture require a formal Change Request:

| CR Type | Approval | Effect |
|---|---|---|
| **Minor Modification** | Auto-approved | Unlocks architecture for edits immediately |
| **Major / Phase 2 Scope** | Requires Phase 2 SOW spin-off | Logged as upsell opportunity; original blueprint stays locked |

When submitting a CR:
1. Enter the CR title and reason
2. Select the affected resource and approver
3. Set the cost impact (monthly)
4. Optionally update the playbook with DTRB lessons learned
5. CRs related to quotation changes are automatically linked to the latest quotation version

### 4. Playbook Integration

Enabling "Update Playbook" on a CR injects a new task into the **Standard VM Lift & Shift** playbook under `[DTRB LESSON]`. This builds institutional knowledge — every CR becomes a preventive check for future projects.

---

## Visual Indicators

| State | Icon | Meaning |
|---|---|---|
| **Draft Mode Active** | 🔓 Unlock | Architecture is editable; awaiting DTRB sign-off |
| **Blueprint Locked** | 🔒 Lock | Approved for provisioning; no edits allowed without CR |
| **Admin Override** | 🛡 Shield | Force-lock or force-unlock for emergency/test scenarios |

---

## Workflow Summary

```
Architecture Complete → DTRB Tech Score Evaluated
                              │
                    ┌─────────┴──────────┐
                    │                    │
                Score ≥ 80%          Score < 80%
                    │                    │
              Lock & Approve       Review warnings
                    │                    │
                    │              Acknowledge & Lock
                    │              (or fix & re-check)
                    │
            Blueprint Locked
                    │
        ┌───────────┴───────────┐
        │                       │
   Raise CR (Minor)        Raise CR (Major)
   → Unlock & Edit         → Phase 2 Upsell
        │                       │
   Re-lock after edit      New SOW block sent
                           to Account Manager
```

---

## FAQ

**Q: What happens if I lock with a score below 80%?**
A: The project proceeds but carries a risk flag. The warnings remain visible in the DTRB panel. Consider addressing the critical issues before execution begins.

**Q: Can I change the scoring thresholds?**
A: Currently thresholds are hard-coded. Contact the development team to customize scoring weights per project type.

**Q: Where are CRs stored?**
A: All change requests are persisted in the project's `changeRequests` array and visible in the Structural Change Log panel.

**Q: What about quotation changes?**
A: CRs containing "quotation" in the title or reason are automatically linked to the latest quotation version for traceability.
