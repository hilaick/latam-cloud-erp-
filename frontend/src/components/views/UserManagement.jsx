import React, { useState } from 'react';
import TwoFactorModal from '../utils/TwoFactorModal';
import ModelConfigPanel from '../wizard/ModelConfigPanel';
import KnowledgeTreePanel from '../utils/KnowledgeTreePanel';
import McpServerView from './McpServerView';

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

    const [userToDelete, setUserToDelete] = useState(null); 
    const [editingUser, setEditingUser] = useState(null);
    const [showQR, setShowQR] = useState(false); // Controls the 2FA Setup Modal

    const executeDelete = () => {
        if (userToDelete !== null) {
            setUsers(users.filter(u => u.id !== userToDelete));
            setUserToDelete(null);
        }
    };

    const handleSaveEdit = () => {
        setUsers(users.map(u => u.id === editingUser.id ? editingUser : u));
        setEditingUser(null);
        alert("User Profile Updated.");
    };

    const targetUserName = users.find(u => u.id === userToDelete)?.name || 'Unknown User';
    const myProfile = users[0]; // Assuming Hilaick is user 0 for the demo

    return (
        <div className="animate-fade-in max-w-[1600px] mx-auto space-y-6 pb-12">
            
            {/* TOP HEADER */}
            <div className="bg-slate-900 rounded-2xl shadow-xl p-6 md:p-8 flex flex-col md:flex-row justify-between items-center text-white border border-slate-700 gap-4 text-center md:text-left">
                <div>
                    <h2 className="text-2xl md:text-3xl font-black mb-2"><i className="fas fa-users-cog text-blue-400 mr-3"></i> Profile & User Management</h2>
                    <p className="text-sm text-slate-400">Manage your credentials, 2FA configuration, and Organization RBAC.</p>
                </div>
            </div>

            <div className="flex flex-col xl:flex-row gap-6">
                
                {/* LEFT: MY PROFILE & 2FA CONFIGURATION */}
                <div className="xl:w-1/3 shrink-0 flex flex-col gap-6">
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
                        <div className="flex justify-between items-start border-b border-slate-100 pb-6 mb-6">
                            <h3 className="font-black text-xl text-slate-800"><i className="fas fa-id-badge text-blue-600 mr-2"></i> My Profile</h3>
                            <span className="bg-amber-100 text-amber-800 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border border-amber-200"><i className="fas fa-crown mr-1"></i> Master Admin</span>
                        </div>
                        <div className="space-y-4">
                            <div><label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Full Name</label><input type="text" disabled value={myProfile.name} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-600" /></div>
                            <div><label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Email Address</label><input type="text" disabled value={myProfile.email} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-600" /></div>
                            
                            <div className="mt-8 pt-6 border-t border-slate-100">
                                <h4 className="text-xs font-black uppercase tracking-widest text-slate-800 mb-4"><i className="fas fa-shield-alt text-emerald-500 mr-2"></i> Two-Factor Authentication</h4>
                                <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl mb-4 text-emerald-800 flex items-start gap-3 shadow-sm">
                                    <i className="fas fa-check-circle text-lg mt-0.5"></i>
                                    <div><div className="font-black text-sm">2FA is Currently Active</div><div className="text-xs mt-1 font-medium">Your account requires an authenticator code for destructive actions.</div></div>
                                </div>
                                <button onClick={() => setShowQR(true)} className="w-full py-3 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-md transition-colors"><i className="fas fa-qrcode mr-2"></i> Reconfigure 2FA App</button>
                            </div>
                        </div>
                    </div>

                    {/* ── Hermes AI Configuration ── */}
                    <ModelConfigPanel />

                    {/* ── Federated Knowledge Tree ── */}
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                        <div className="border-b border-slate-100 pb-3 mb-4">
                            <h3 className="font-black text-base text-slate-800">
                                <i className="fas fa-sitemap text-emerald-600 mr-2"></i> Skill Knowledge Tree
                            </h3>
                            <p className="text-[10px] text-slate-400 mt-1">
                                Hierarchical view of all skills across 3 sources (Skill Registry · External · History)
                            </p>
                        </div>
                        <KnowledgeTreePanel />
                    </div>

                    {/* ── MCP Servers ── */}
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                        <div className="border-b border-slate-100 pb-3 mb-4">
                            <h3 className="font-black text-base text-slate-800">
                                <i className="fas fa-plug text-blue-600 mr-2"></i> MCP Servers
                            </h3>
                            <p className="text-[10px] text-slate-400 mt-1">
                                Model Context Protocol servers for Huawei Cloud IaaS APIs
                            </p>
                        </div>
                        <McpServerView />
                    </div>
                </div>

                {/* RIGHT: ORGANIZATION USERS TABLE */}
                <div className="flex-1 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
                    <div className="p-6 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                        <h3 className="font-black text-lg text-slate-800">Organization Users</h3>
                        <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-black uppercase tracking-widest shadow-sm transition-colors"><i className="fas fa-user-plus mr-2"></i> Invite User</button>
                    </div>
                    <div className="overflow-x-auto custom-scrollbar flex-1">
                        <table className="w-full text-left min-w-[800px]">
                            <thead className="bg-slate-100 text-[10px] uppercase text-slate-500 border-b border-slate-200 sticky top-0 z-10">
                                <tr>
                                    <th className="p-4">User Details</th>
                                    <th className="p-4">System Role</th>
                                    <th className="p-4">Security (2FA)</th>
                                    <th className="p-4">Status</th>
                                    <th className="p-4 text-center">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-sm">
                                {users.map(u => (
                                    <tr key={u.id} className="hover:bg-blue-50/30 transition-colors group">
                                        <td className="p-4">
                                            <div className="font-black text-slate-800">{u.name}</div>
                                            <div className="text-xs text-slate-500 mt-1">{u.email}</div>
                                        </td>
                                        <td className="p-4 font-bold text-slate-700">{u.role}</td>
                                        <td className="p-4">
                                            {u.is2fa ? <span className="bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full text-[10px] font-black border border-emerald-200 whitespace-nowrap"><i className="fas fa-shield-check mr-1"></i> Enabled</span> : <span className="bg-rose-50 text-rose-700 px-3 py-1 rounded-full text-[10px] font-black border border-rose-200 whitespace-nowrap"><i className="fas fa-exclamation-triangle mr-1"></i> Disabled</span>}
                                        </td>
                                        <td className="p-4">
                                            <div className={`text-xs font-black ${u.status==='Active'?'text-emerald-600':'text-amber-600'}`}>{u.status}</div>
                                        </td>
                                        <td className="p-4 text-center space-x-2">
                                            <button onClick={() => setEditingUser(u)} className="p-2 text-slate-400 hover:text-blue-600 transition-colors opacity-0 group-hover:opacity-100"><i className="fas fa-edit text-lg"></i></button>
                                            <button disabled={u.role==='Master Admin'} onClick={() => setUserToDelete(u.id)} className="p-2 text-slate-400 hover:text-rose-600 transition-colors disabled:opacity-30 opacity-0 group-hover:opacity-100" title={u.role==='Master Admin' ? 'Master Admin cannot be deleted' : 'Delete User'}><i className="fas fa-trash-alt text-lg"></i></button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* 🚨 MOCK QR CODE MODAL FOR 2FA CONFIGURATION */}
            {showQR && (
                <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-8 text-center relative border border-slate-300">
                        <button onClick={()=>setShowQR(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-800"><i className="fas fa-times text-xl"></i></button>
                        <h3 className="font-black text-xl text-slate-800 mb-2">Configure Authenticator</h3>
                        <p className="text-xs text-slate-500 mb-6 font-medium">Scan this code using Google Authenticator or Authy to link your device.</p>
                        <div className="w-48 h-48 mx-auto bg-slate-100 border-4 border-slate-200 rounded-2xl flex items-center justify-center mb-6">
                            {/* A mock visual representation of a QR Code */}
                            <i className="fas fa-qrcode text-[120px] text-slate-800"></i>
                        </div>
                        <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                            <div className="text-[10px] uppercase font-bold text-slate-400 mb-1">Manual Entry Key</div>
                            <div className="font-mono text-xs font-black text-slate-800 tracking-wider">LATAM-ERP-HYARD-X9A2</div>
                        </div>
                    </div>
                </div>
            )}

            {/* 🚨 INLINE EDIT USER MODAL */}
            {editingUser && (
                <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md flex flex-col overflow-hidden">
                        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                            <h3 className="font-black text-lg text-slate-800">Edit User Profile</h3>
                            <button onClick={()=>setEditingUser(null)} className="text-slate-400 hover:text-rose-500"><i className="fas fa-times text-xl"></i></button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div><label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Full Name</label><input type="text" value={editingUser.name} onChange={e=>setEditingUser({...editingUser, name: e.target.value})} className="w-full p-3 border-2 border-slate-200 rounded-xl text-sm font-bold bg-white focus:border-blue-500 outline-none" /></div>
                            <div><label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Email Address</label><input type="text" value={editingUser.email} onChange={e=>setEditingUser({...editingUser, email: e.target.value})} className="w-full p-3 border-2 border-slate-200 rounded-xl text-sm font-bold bg-white focus:border-blue-500 outline-none" /></div>
                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">System Role</label>
                                <select disabled={editingUser.role === 'Master Admin'} value={editingUser.role} onChange={e=>setEditingUser({...editingUser, role: e.target.value})} className="w-full p-3 border-2 border-slate-200 rounded-xl text-sm font-bold bg-white focus:border-blue-500 outline-none disabled:bg-slate-100 disabled:opacity-50">
                                    {roles.map(r => <option key={r} value={r}>{r}</option>)}
                                </select>
                            </div>
                        </div>
                        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-3">
                            <button onClick={()=>setEditingUser(null)} className="px-5 py-2.5 text-xs font-black text-slate-600 uppercase tracking-widest hover:bg-slate-200 rounded-xl transition-colors">Cancel</button>
                            <button onClick={handleSaveEdit} className="px-5 py-2.5 text-xs font-black text-white uppercase tracking-widest bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md transition-colors">Save Changes</button>
                        </div>
                    </div>
                </div>
            )}

            {userToDelete !== null && (
                <TwoFactorModal actionName={`Revoke Access: ${targetUserName}`} onConfirm={executeDelete} onCancel={() => setUserToDelete(null)} />
            )}
        </div>
    );
}
