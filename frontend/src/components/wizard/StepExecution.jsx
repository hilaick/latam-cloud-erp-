import React, { useState } from 'react';

export default function StepExecution({ project, onUpdateProject, onPromote, isCurrent }) {
    const [activeTab, setActiveTab] = useState('tasks');
    const [showTaskModal, setShowTaskModal] = useState(false);
    const [newTask, setNewTask] = useState({ name: '', assignee: '', dueDate: '' });

    const tasks = project?.tasks || [];
    const completedTasks = tasks.filter(t => t.status === 'completed').length;
    const totalTasks = tasks.length;
    const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    const handleAddTask = () => {
        if (!newTask.name.trim()) {
            alert('Task name is required');
            return;
        }

        const updatedTasks = [...tasks, {
            id: Date.now(),
            name: newTask.name,
            assignee: newTask.assignee || 'Unassigned',
            dueDate: newTask.dueDate || '',
            status: 'pending',
            createdAt: new Date().toISOString()
        }];

        onUpdateProject('tasks', updatedTasks);
        setNewTask({ name: '', assignee: '', dueDate: '' });
        setShowTaskModal(false);
    };

    const handleTaskStatusChange = (taskId, newStatus) => {
        const updatedTasks = tasks.map(task => 
            task.id === taskId ? { ...task, status: newStatus } : task
        );
        onUpdateProject('tasks', updatedTasks);
    };

    const handleDeleteTask = (taskId) => {
        if (confirm('Are you sure you want to delete this task?')) {
            const updatedTasks = tasks.filter(task => task.id !== taskId);
            onUpdateProject('tasks', updatedTasks);
        }
    };

    return (
        <div className="p-8">
            <div className="mb-8 border-b border-slate-200 pb-4 flex justify-between items-end">
                <div>
                    <h3 className="font-black text-2xl text-slate-800">
                        <i className="fas fa-play-circle text-blue-600 mr-3"></i> 
                        Step 4: Active Execution
                    </h3>
                    <p className="text-sm text-slate-500 mt-2">
                        Track migration tasks, monitor progress, and manage team assignments.
                    </p>
                </div>
                {isCurrent && (
                    <button 
                        onClick={onPromote} 
                        className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-black uppercase tracking-widest text-xs rounded-xl shadow-lg transition-transform active:scale-95"
                        title={project.project_type === 'poc' ? "Complete PoC and archive" : "Advance to Post-Live WAR"}
                    >
                        {project.project_type === 'poc' ? (
                            <>
                                Complete PoC <i className="fas fa-flag-checkered ml-2"></i>
                            </>
                        ) : (
                            <>
                                Mark Complete & Advance <i className="fas fa-arrow-right ml-2"></i>
                            </>
                        )}
                    </button>
                )}
            </div>

            {/* Progress Overview */}
            <div className="mb-8 bg-white border-2 border-slate-200 rounded-2xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h4 className="text-lg font-black text-slate-800 flex items-center gap-2">
                            <i className="fas fa-chart-line text-emerald-500"></i>
                            Execution Progress
                        </h4>
                        <p className="text-sm text-slate-600 mt-1">
                            {completedTasks} of {totalTasks} tasks completed
                        </p>
                    </div>
                    <div className="text-right">
                        <div className="text-3xl font-black text-emerald-700">{progress}%</div>
                        <div className="text-xs text-slate-500">Overall Progress</div>
                    </div>
                </div>
                
                <div className="h-4 bg-slate-200 rounded-full overflow-hidden">
                    <div 
                        className="h-full bg-emerald-500 transition-all duration-500"
                        style={{ width: `${progress}%` }}
                    ></div>
                </div>
                
                <div className="grid grid-cols-3 gap-4 mt-6">
                    <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
                        <div className="text-xs font-bold text-blue-600 uppercase tracking-widest mb-1">Pending</div>
                        <div className="text-2xl font-black text-slate-800">
                            {tasks.filter(t => t.status === 'pending').length}
                        </div>
                    </div>
                    <div className="p-4 bg-amber-50 rounded-xl border border-amber-100">
                        <div className="text-xs font-bold text-amber-600 uppercase tracking-widest mb-1">In Progress</div>
                        <div className="text-2xl font-black text-slate-800">
                            {tasks.filter(t => t.status === 'in_progress').length}
                        </div>
                    </div>
                    <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100">
                        <div className="text-xs font-bold text-emerald-600 uppercase tracking-widest mb-1">Completed</div>
                        <div className="text-2xl font-black text-slate-800">
                            {completedTasks}
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Task Management */}
                <div className="lg:col-span-2">
                    <div className="bg-white border-2 border-slate-200 rounded-2xl p-6 shadow-sm">
                        <div className="flex items-center justify-between mb-6">
                            <h4 className="text-lg font-black text-slate-800 flex items-center gap-2">
                                <i className="fas fa-tasks text-blue-500"></i>
                                Task Management
                            </h4>
                            <button 
                                onClick={() => setShowTaskModal(true)}
                                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-lg transition-colors flex items-center gap-2"
                            >
                                <i className="fas fa-plus"></i>
                                Add Task
                            </button>
                        </div>
                        
                        {/* Tabs */}
                        <div className="flex border-b border-slate-200 mb-4">
                            <button 
                                className={`px-4 py-2 font-bold text-sm ${activeTab === 'tasks' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
                                onClick={() => setActiveTab('tasks')}
                            >
                                All Tasks ({totalTasks})
                            </button>
                            <button 
                                className={`px-4 py-2 font-bold text-sm ${activeTab === 'pending' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
                                onClick={() => setActiveTab('pending')}
                            >
                                Pending ({tasks.filter(t => t.status === 'pending').length})
                            </button>
                            <button 
                                className={`px-4 py-2 font-bold text-sm ${activeTab === 'completed' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
                                onClick={() => setActiveTab('completed')}
                            >
                                Completed ({completedTasks})
                            </button>
                        </div>
                        
                        {/* Task List */}
                        <div className="space-y-3 max-h-96 overflow-y-auto">
                            {tasks
                                .filter(task => 
                                    activeTab === 'tasks' || 
                                    (activeTab === 'pending' && task.status === 'pending') ||
                                    (activeTab === 'completed' && task.status === 'completed')
                                )
                                .map((task, index) => (
                                    <div key={task.id || index} className="p-4 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${task.status === 'completed' ? 'bg-emerald-100 text-emerald-700' : task.status === 'in_progress' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-700'}`}>
                                                    <i className={`fas ${task.status === 'completed' ? 'fa-check' : task.status === 'in_progress' ? 'fa-spinner fa-spin' : 'fa-clock'}`}></i>
                                                </div>
                                                <div>
                                                    <div className="font-bold text-slate-800">{task.name}</div>
                                                    <div className="text-xs text-slate-600">
                                                        {task.assignee} • {task.dueDate || 'No due date'}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <select 
                                                    value={task.status}
                                                    onChange={(e) => handleTaskStatusChange(task.id, e.target.value)}
                                                    className="text-xs px-3 py-1 border border-slate-300 rounded-lg bg-white"
                                                >
                                                    <option value="pending">Pending</option>
                                                    <option value="in_progress">In Progress</option>
                                                    <option value="completed">Completed</option>
                                                </select>
                                                <button 
                                                    onClick={() => handleDeleteTask(task.id)}
                                                    className="text-slate-400 hover:text-rose-500 transition-colors"
                                                >
                                                    <i className="fas fa-trash"></i>
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            
                            {tasks.length === 0 && (
                                <div className="text-center py-12 text-slate-400">
                                    <i className="fas fa-tasks text-4xl mb-3 opacity-50"></i>
                                    <p className="font-medium">No tasks yet</p>
                                    <p className="text-sm mt-1">Add your first task to start tracking</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Quick Actions */}
                <div className="space-y-6">
                    <div className="bg-white border-2 border-slate-200 rounded-2xl p-6 shadow-sm">
                        <h4 className="text-lg font-black text-slate-800 mb-4 flex items-center gap-2">
                            <i className="fas fa-bolt text-amber-500"></i>
                            Quick Actions
                        </h4>
                        <div className="space-y-3">
                            <button 
                                onClick={() => alert('Generating status report...')}
                                className="w-full p-3 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold rounded-lg transition-colors flex items-center justify-between"
                            >
                                <span>Generate Status Report</span>
                                <i className="fas fa-file-pdf"></i>
                            </button>
                            <button 
                                onClick={() => alert('Sending team notification...')}
                                className="w-full p-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold rounded-lg transition-colors flex items-center justify-between"
                            >
                                <span>Notify Team</span>
                                <i className="fas fa-bell"></i>
                            </button>
                            <button 
                                onClick={() => alert('Opening Huawei Cloud Console...')}
                                className="w-full p-3 bg-purple-50 hover:bg-purple-100 text-purple-700 font-bold rounded-lg transition-colors flex items-center justify-between"
                            >
                                <span>Open Huawei Cloud</span>
                                <i className="fas fa-external-link-alt"></i>
                            </button>
                        </div>
                    </div>

                    {/* Team Members */}
                    <div className="bg-white border-2 border-slate-200 rounded-2xl p-6 shadow-sm">
                        <h4 className="text-lg font-black text-slate-800 mb-4 flex items-center gap-2">
                            <i className="fas fa-users text-purple-500"></i>
                            Team Members
                        </h4>
                        <div className="space-y-3">
                            {['Architect', 'Project Manager', 'Cloud Engineer', 'SMS Specialist'].map((role, index) => (
                                <div key={index} className="flex items-center justify-between p-3 border border-slate-200 rounded-lg">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center">
                                            <i className="fas fa-user text-slate-600"></i>
                                        </div>
                                        <div>
                                            <div className="font-bold text-sm text-slate-800">{role}</div>
                                            <div className="text-xs text-slate-500">Unassigned</div>
                                        </div>
                                    </div>
                                    <button className="text-xs px-3 py-1 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-lg transition-colors">
                                        Assign
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Add Task Modal */}
            {showTaskModal && (
                <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-slate-200">
                        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 rounded-t-2xl flex justify-between items-center">
                            <h3 className="font-black text-xl text-slate-800">Add New Task</h3>
                            <button onClick={() => setShowTaskModal(false)} className="text-slate-400 hover:text-rose-500 text-2xl transition-colors">
                                <i className="fas fa-times"></i>
                            </button>
                        </div>
                        
                        <div className="p-6">
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-2">
                                        Task Name
                                    </label>
                                    <input
                                        type="text"
                                        value={newTask.name}
                                        onChange={(e) => setNewTask({...newTask, name: e.target.value})}
                                        placeholder="e.g., Provision VPC and subnets"
                                        className="w-full p-3 border-2 border-slate-200 rounded-xl focus:border-blue-500 outline-none"
                                    />
                                </div>
                                
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-2">
                                        Assignee
                                    </label>
                                    <input
                                        type="text"
                                        value={newTask.assignee}
                                        onChange={(e) => setNewTask({...newTask, assignee: e.target.value})}
                                        placeholder="e.g., John Doe"
                                        className="w-full p-3 border-2 border-slate-200 rounded-xl focus:border-blue-500 outline-none"
                                    />
                                </div>
                                
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-2">
                                        Due Date
                                    </label>
                                    <input
                                        type="date"
                                        value={newTask.dueDate}
                                        onChange={(e) => setNewTask({...newTask, dueDate: e.target.value})}
                                        className="w-full p-3 border-2 border-slate-200 rounded-xl focus:border-blue-500 outline-none"
                                    />
                                </div>
                            </div>
                            
                            <div className="mt-6 flex justify-end gap-3">
                                <button 
                                    onClick={() => setShowTaskModal(false)}
                                    className="px-5 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-lg"
                                >
                                    Cancel
                                </button>
                                <button 
                                    onClick={handleAddTask}
                                    className="px-5 py-2 text-sm font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-md"
                                >
                                    Add Task
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}