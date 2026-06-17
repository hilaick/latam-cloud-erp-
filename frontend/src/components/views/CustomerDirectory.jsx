// Add the TwoFactorModal import at the top
import TwoFactorModal from '../utils/TwoFactorModal';

export default function CustomerDirectory() {
    const { projects, customers, handleAddCustomer, handleUpdateCustomer } = useContext(ERPContext);
    
    // ... (existing state)
    
    // 🚨 1. Add 2FA State for Customer Deletion
    const [customerToDelete, setCustomerToDelete] = useState(null);

    // 🚨 2. Replace the old handleDeleteCustomer with the Intent Pre-Check
    const initiateDeleteCustomer = (customerId) => {
        if (!customerId) return;

        const customer = customers.find(c => c?.id === customerId);
        if (!customer) return;

        // The Relational Guardrail: Block if projects are attached
        const attachedProjects = projects.filter(p => {
            return (p?.customerId === customerId) || 
                   (p?.customerName && p.customerName.toLowerCase() === customer.name.toLowerCase());
        });
        
        if (attachedProjects.length > 0) {
            alert(`Access Denied: Cannot delete customer "${customer.name}". They have ${attachedProjects.length} active project(s) attached.`);
            return; 
        }

        // Trigger the 2FA Modal
        setCustomerToDelete(customer);
    };

    // 🚨 3. The Execution Function (Runs only after 2FA succeeds)
    const executeDelete = async () => {
        if (!customerToDelete) return;

        try {
            const token = localStorage.getItem('erp_jwt_token');
            const response = await fetch(`/api/erp/customers/${customerToDelete.id}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                // THE CRASH FIX: Safe state update using optional chaining
                setCustomers(prev => prev.filter(c => c?.id !== customerToDelete.id));
                alert("2FA Verified. Customer securely deleted.");
            } else {
                alert("Server rejected the deletion request.");
            }
        } catch (error) {
            console.error("Deletion error:", error);
            alert("A network error occurred.");
        } finally {
            setCustomerToDelete(null);
        }
    };

    // ... (rest of component)

    return (
        <div className="animate-fade-in max-w-[1600px] mx-auto pb-12">
            {/* ... (existing UI) ... */}
            
            {/* Update the delete button in the grid map to call initiateDeleteCustomer */}
            <button onClick={() => initiateDeleteCustomer(c.id)} className="text-slate-400 hover:text-rose-600 transition-colors">
                <i className="fas fa-trash"></i>
            </button>

            {/* ... (existing modals) ... */}

            {/* 🚨 4. Mount the 2FA Modal */}
            {customerToDelete && (
                <TwoFactorModal 
                    actionName={`Delete Customer Vault: ${customerToDelete.name}`} 
                    onConfirm={executeDelete} 
                    onCancel={() => setCustomerToDelete(null)} 
                />
            )}
        </div>
    );
}
