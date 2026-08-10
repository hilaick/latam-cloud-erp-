import React, { useState, useContext } from 'react';
import { ERPContext } from '../../context/ERPContext';

const ACTION_DEFS = {
    cancel: {
        icon: 'fa-ban',
        label: 'Cancel Project',
        color: '#dc2626',
        bg: '#dc262610',
        description: 'Permanently cancel the migration. Resources will be flagged for teardown.',
        requiresExtra: false,
    },
    suspend: {
        icon: 'fa-pause-circle',
        label: 'Suspend Project',
        color: '#f59e0b',
        bg: '#f59e0b10',
        description: 'Temporarily freeze the project. Resources are preserved for later resumption.',
        requiresExtra: false,
        extraField: 'resumeReviewDate',
        extraLabel: 'Review Date',
        extraPlaceholder: 'e.g. 2026-09-01',
    },
    transfer: {
        icon: 'fa-exchange-alt',
        label: 'Transfer Ownership',
        color: '#6366f1',
        bg: '#6366f110',
        description: 'Hand over the project to the customer or a partner. All runbooks and credentials are exported.',
        requiresExtra: true,
        extraField: 'transferredTo',
        extraLabel: 'Transfer To',
        extraPlaceholder: 'Customer or partner name',
    },
};

export default function HaltProjectModal({ project, onClose }) {
    const { handleHaltProject } = useContext(ERPContext);
    const [action, setAction] = useState('cancel');
    const [reason, setReason] = useState('');
    const [extraValue, setExtraValue] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [result, setResult] = useState(null);

    if (!project) return null;

    const def = ACTION_DEFS[action];

    const handleSubmit = async () => {
        if (!reason.trim()) {
            alert('Please provide a reason for halting the project.');
            return;
        }
        if (def.requiresExtra && !extraValue.trim()) {
            alert(`Please specify the ${def.extraLabel.toLowerCase()}.`);
            return;
        }

        setSubmitting(true);
        const payload = { action, reason: reason.trim() };
        if (action === 'transfer') payload.transferredTo = extraValue.trim();
        if (action === 'suspend' && extraValue.trim()) payload.resumeReviewDate = extraValue.trim();

        const res = await handleHaltProject(project.id, payload);
        setSubmitting(false);

        if (res.success) {
            setResult({ success: true, action, status: res.status });
            setTimeout(() => onClose(), 2000);
        } else {
            setResult({ success: false, error: res.error || 'Unknown error' });
        }
    };

    const projectName = project.customerName || project.name || project.id || 'Unknown';

    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 100000,
            background: 'rgba(0,0,0,0.7)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 20,
        }}
            onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
            <div style={{
                background: '#1e293b', borderRadius: 24,
                width: '100%', maxWidth: 560,
                padding: 32,
                boxShadow: '0 25px 60px rgba(0,0,0,0.5)',
                border: '1px solid #334155',
            }}>
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
                    <div>
                        <h2 style={{ color: '#fff', fontSize: 18, fontWeight: 800, margin: 0 }}>
                            <i className="fas fa-exclamation-triangle mr-2" style={{ color: '#f59e0b' }}></i>
                            Halt Project
                        </h2>
                        <p style={{ color: '#94a3b8', fontSize: 12, margin: '4px 0 0' }}>
                            {projectName}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        style={{
                            background: '#334155', color: '#94a3b8',
                            border: 'none', borderRadius: 10,
                            width: 36, height: 36, fontSize: 16,
                            cursor: 'pointer', display: 'flex',
                            alignItems: 'center', justifyContent: 'center',
                        }}
                    >
                        <i className="fas fa-times"></i>
                    </button>
                </div>

                {result ? (
                    <div style={{
                        textAlign: 'center', padding: '40px 20px',
                    }}>
                        {result.success ? (
                            <>
                                <div style={{
                                    width: 64, height: 64, borderRadius: 32,
                                    background: '#10b98115', margin: '0 auto 16px',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                }}>
                                    <i className="fas fa-check-circle" style={{ color: '#10b981', fontSize: 32 }}></i>
                                </div>
                                <h3 style={{ color: '#fff', fontSize: 16, fontWeight: 700, margin: '0 0 8px' }}>
                                    Project {result.action}ed
                                </h3>
                                <p style={{ color: '#94a3b8', fontSize: 13 }}>
                                    Status set to <strong style={{ color: '#e2e8f0' }}>{result.status}</strong>.
                                    Closing automatically...
                                </p>
                            </>
                        ) : (
                            <>
                                <div style={{
                                    width: 64, height: 64, borderRadius: 32,
                                    background: '#dc262610', margin: '0 auto 16px',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                }}>
                                    <i className="fas fa-exclamation-circle" style={{ color: '#dc2626', fontSize: 32 }}></i>
                                </div>
                                <h3 style={{ color: '#fff', fontSize: 16, fontWeight: 700, margin: '0 0 8px' }}>
                                    Failed
                                </h3>
                                <p style={{ color: '#dc2626', fontSize: 13 }}>{result.error}</p>
                                <button
                                    onClick={() => setResult(null)}
                                    style={{
                                        marginTop: 16, padding: '8px 20px',
                                        background: '#334155', color: '#e2e8f0',
                                        border: 'none', borderRadius: 10,
                                        fontSize: 12, fontWeight: 700, cursor: 'pointer',
                                    }}
                                >
                                    Try Again
                                </button>
                            </>
                        )}
                    </div>
                ) : (
                    <>
                        {/* Action selector */}
                        <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
                            {Object.entries(ACTION_DEFS).map(([key, d]) => (
                                <button
                                    key={key}
                                    onClick={() => { setAction(key); setExtraValue(''); }}
                                    style={{
                                        flex: 1, padding: '14px 8px',
                                        background: action === key ? d.bg : '#0f172a',
                                        border: `2px solid ${action === key ? d.color : '#334155'}`,
                                        borderRadius: 14,
                                        cursor: 'pointer',
                                        transition: 'all 0.15s',
                                        display: 'flex', flexDirection: 'column',
                                        alignItems: 'center', gap: 6,
                                    }}
                                >
                                    <i className={`fas ${d.icon}`} style={{
                                        color: d.color, fontSize: 20,
                                    }}></i>
                                    <span style={{
                                        color: action === key ? '#fff' : '#94a3b8',
                                        fontSize: 11, fontWeight: 700,
                                        letterSpacing: '0.03em',
                                    }}>
                                        {key.charAt(0).toUpperCase() + key.slice(1)}
                                    </span>
                                </button>
                            ))}
                        </div>

                        {/* Description */}
                        <div style={{
                            background: def.bg, borderRadius: 12,
                            padding: '12px 16px', marginBottom: 20,
                            border: `1px solid ${def.color}30`,
                        }}>
                            <p style={{ color: '#cbd5e1', fontSize: 12, margin: 0, lineHeight: 1.5 }}>
                                <i className={`fas ${def.icon} mr-1.5`} style={{ color: def.color }}></i>
                                {def.description}
                            </p>
                        </div>

                        {/* Reason field */}
                        <div style={{ marginBottom: 16 }}>
                            <label style={{ color: '#e2e8f0', fontSize: 12, fontWeight: 700, display: 'block', marginBottom: 6 }}>
                                Reason <span style={{ color: '#dc2626' }}>*</span>
                            </label>
                            <textarea
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                placeholder="Describe why this project is being halted — required for audit trail..."
                                rows={3}
                                style={{
                                    width: '100%', padding: 12,
                                    background: '#0f172a', color: '#e2e8f0',
                                    border: '1px solid #334155', borderRadius: 12,
                                    fontSize: 12, resize: 'vertical',
                                    outline: 'none',
                                }}
                            />
                        </div>

                        {/* Extra field (transfer to / review date) */}
                        {def.requiresExtra && (
                            <div style={{ marginBottom: 20 }}>
                                <label style={{ color: '#e2e8f0', fontSize: 12, fontWeight: 700, display: 'block', marginBottom: 6 }}>
                                    {def.extraLabel} <span style={{ color: '#dc2626' }}>*</span>
                                </label>
                                <input
                                    type={action === 'suspend' ? 'date' : 'text'}
                                    value={extraValue}
                                    onChange={(e) => setExtraValue(e.target.value)}
                                    placeholder={def.extraPlaceholder}
                                    style={{
                                        width: '100%', padding: '10px 12px',
                                        background: '#0f172a', color: '#e2e8f0',
                                        border: '1px solid #334155', borderRadius: 12,
                                        fontSize: 12, outline: 'none',
                                    }}
                                />
                            </div>
                        )}

                        {action === 'suspend' && (
                            <div style={{ marginBottom: 20 }}>
                                <label style={{ color: '#e2e8f0', fontSize: 12, fontWeight: 700, display: 'block', marginBottom: 6 }}>
                                    {def.extraLabel} (optional)
                                </label>
                                <input
                                    type="date"
                                    value={extraValue}
                                    onChange={(e) => setExtraValue(e.target.value)}
                                    style={{
                                        width: '100%', padding: '10px 12px',
                                        background: '#0f172a', color: '#e2e8f0',
                                        border: '1px solid #334155', borderRadius: 12,
                                        fontSize: 12, outline: 'none',
                                    }}
                                />
                            </div>
                        )}

                        {/* Impact summary */}
                        <div style={{
                            background: '#0f172a', borderRadius: 12,
                            padding: 12, marginBottom: 20,
                            border: '1px solid #334155',
                        }}>
                            <p style={{ color: '#64748b', fontSize: 10, fontWeight: 700, margin: '0 0 6px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                                Impact Summary
                            </p>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <span style={{ color: '#94a3b8', fontSize: 11 }}>Current Phase:</span>
                                    <span style={{ color: '#e2e8f0', fontSize: 11, fontWeight: 600 }}>
                                        {project.lifecycleState || project.phase || 'Unknown'}
                                    </span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <span style={{ color: '#94a3b8', fontSize: 11 }}>Progress:</span>
                                    <span style={{ color: '#e2e8f0', fontSize: 11, fontWeight: 600 }}>
                                        {project.prog || project.progress || '0%'}
                                    </span>
                                </div>
                                {action === 'cancel' && (
                                    <div style={{ color: '#dc2626', fontSize: 11, marginTop: 4 }}>
                                        <i className="fas fa-exclamation-triangle mr-1"></i>
                                        All deployed resources will be flagged for teardown
                                    </div>
                                )}
                                {action === 'transfer' && (
                                    <div style={{ color: '#6366f1', fontSize: 11, marginTop: 4 }}>
                                        <i className="fas fa-info-circle mr-1"></i>
                                        Runbooks &amp; credentials will be exported for handover
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Action buttons */}
                        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                            <button
                                onClick={onClose}
                                disabled={submitting}
                                style={{
                                    padding: '10px 20px',
                                    background: '#334155', color: '#e2e8f0',
                                    border: 'none', borderRadius: 12,
                                    fontSize: 12, fontWeight: 700, cursor: 'pointer',
                                    opacity: submitting ? 0.5 : 1,
                                }}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSubmit}
                                disabled={submitting}
                                style={{
                                    padding: '10px 24px',
                                    background: def.color, color: 'white',
                                    border: 'none', borderRadius: 12,
                                    fontSize: 12, fontWeight: 700, cursor: 'pointer',
                                    opacity: submitting ? 0.5 : 1,
                                    display: 'flex', alignItems: 'center', gap: 6,
                                }}
                            >
                                {submitting ? (
                                    <>
                                        <i className="fas fa-spinner fa-spin"></i>
                                        Processing...
                                    </>
                                ) : (
                                    <>
                                        <i className={`fas ${def.icon}`}></i>
                                        {def.label}
                                    </>
                                )}
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
