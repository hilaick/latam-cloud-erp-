import React, { useState } from 'react';
import TwoFactorModal from '../utils/TwoFactorModal'; // 🚨 IMPORT 2FA MODAL

export default function UserManagement() {
    const roles = [
        "Master Admin", "Principal Architect", "TAM", "Sales", 
        "Project Management", "Delivery Manager", "Delivery POD / Partner", "TAM / Principal Architect"
    ];

    const [users, setUsers] = useState([
        { id: 1, name: "Hilaick Yard", email: "hilaick@latamcloud.com", role: "Master Admin", status: "Active", lastLogin: "Just now", is2fa: true },
        { id: 2, name: "John Doe", email: "john@latamcloud.com", role: "Sales", status: "Active", lastLogin: "2 hours ago", is2fa: true },
        { id: 3, name: "Maria Garcia", email: "maria@latamcloud.com", role: "Delivery Manager", status: "Active", lastLogin: "1 day ago", is2fa: true },
        { id: 4, name: "TechCorp Integrators", email: "vendor@techcorp.com", role: "Delivery POD / Partner", status: "Pending", lastLogin: "Never", is2fa: false }
    ]);

    const [userToDelete, setUserToDelete] = useState(null); // 🚨 STATE FOR MODAL

    // 🚨 2FA DELETION EXECUTION
    const executeDelete = () => {
        if (userToDelete !== null) {
            setUsers(users.filter(u => u.id !== userToDelete));
            setUserToDelete(null);
        }
    };

    const targetUserName = users.find(u => u.id === userToDelete)?.name || 'Unknown User';

    return (
        <div className="animate-fade-in max-w-[1600px] mx-auto space-y-6 pb-12">
            <div className="bg-slate-900 rounded-2xl shadow-xl p-6 md:p-8 flex flex-col md:flex-row justify-between items-center text-white border border-slate-700 gap-4 text-center md:text-left">
                <div>
                    <h2 className="text-2xl md:text-3xl font-black mb-2"><i className="fas fa-users-cog text-blue-400 mr-3"></i> IAM & User Management</h2>
                    <p className="text-sm text-slate-400">Role-Based Access Control (RBAC) and Security Governance.</p>
                </div>
                <button className="w-full md:w-auto px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-xl text-xs font-black uppercase tracking-widest shadow-md transition-transform active:scale-95 whitespace-nowrap"><i className="fas fa-user-plus mr-2"></i> Invite User</button>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left min-w-[800px]">
                        <thead className="bg-slate-100 text-[10px] uppercase text-slate-500 border-b border-slate-200 sticky top-0">
                            <tr>
                                <th className="p-4">User Details</th>
                                <th className="p-4">System Role</th>
                                <th className="p-4">Security (2FA)</th>
                                <th className="p-4">Status / Last Login</th>
                                <th className="p-4 text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-sm">
                            {users.map(u => (
                                <tr key={u.id} className="hover:bg-slate-50 transition-colors group">
                                    <td className="p-4">
                                        <div className="font-black text-slate-800 flex items-center gap-2">
                                            {u.role === 'Master Admin' && <i className="fas fa-crown text-amber-500" title="Superuser"></i>}
                                            {u.name}
                                        </div>
                                        <div className="text-xs text-slate-500 mt-1">{u.email}</div>
                                    </td>
                                    <td className="p-4">
                                        <select value={u.role} onChange={()=>{}} disabled={u.role==='Master Admin'} className="p-2 border border-slate-200 rounded-lg text-xs font-bold outline-none bg-white focus:border-blue-500 disabled:opacity-50 disabled:bg-slate-100">
                                            {roles.map(r => <option key={r} value={r}>{r}</option>)}
                                        </select>
                                    </td>
                                    <td className="p-4">
                                        {u.is2fa ? <span className="bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full text-[10px] font-black border border-emerald-200 whitespace-nowrap"><i className="fas fa-shield-check mr-1"></i> Enabled</span> : <span className="bg-rose-50 text-rose-700 px-3 py-1 rounded-full text-[10px] font-black border border-rose-200 whitespace-nowrap"><i className="fas fa-exclamation-triangle mr-1"></i> Disabled</span>}
                                    </td>
                                    <td className="p-4">
                                        <div className={`text-xs font-black ${u.status==='Active'?'text-emerald-600':'text-amber-600'}`}>{u.status}</div>
                                        <div className="text-[10px] text-slate-400 mt-1 font-bold whitespace-nowrap">{u.lastLogin}</div>
                                    </td>
                                    <td className="p-4 text-center">
                                        {/* 🚨 TRIGGER 2FA MODAL ON CLICK */}
                                        <button 
                                            disabled={u.role==='Master Admin'} 
                                            onClick={() => setUserToDelete(u.id)}
                                            className="p-2 text-slate-300 hover:text-rose-600 transition-colors disabled:opacity-30 opacity-0 group-hover:opacity-100"
                                            title={u.role==='Master Admin' ? 'Master Admin cannot be deleted' : 'Delete User'}
                                        >
                                            <i className="fas fa-trash-alt text-lg"></i>
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* 🚨 RENDER THE MODAL IF ACTIVE */}
            {userToDelete !== null && (
                <TwoFactorModal 
                    actionName={`Revoke User Access: ${targetUserName}`} 
                    onConfirm={executeDelete} 
                    onCancel={() => setUserToDelete(null)} 
                />
            )}
        </div>
    );
}
