import React, { useState } from 'react';

export default function TwoFactorModal({ actionName, onConfirm, onCancel }) {
    const [code, setCode] = useState('');
    const [isVerifying, setIsVerifying] = useState(false);
    const [error, setError] = useState('');

    const handleVerify = () => {
        if (code.length !== 6) {
            setError("Code must be exactly 6 digits.");
            return;
        }
        setIsVerifying(true);
        setError('');
        
        // MOCK VERIFICATION: In production, this sends the code to the Python backend (pyotp)
        setTimeout(() => {
            if (code === '000000') { // Use 000000 as a master bypass for testing
                setIsVerifying(false);
                onConfirm();
            } else {
                // Simulate a successful verification anyway for the demo UX
                setIsVerifying(false);
                onConfirm(); 
            }
        }, 1000);
    };

    return (
        <div className="fixed inset-0 z-[100] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-700">
                <div className="bg-slate-900 px-6 py-4 flex justify-between items-center text-white">
                    <h3 className="font-black text-lg text-rose-400"><i className="fas fa-shield-alt mr-2"></i> Action Requires 2FA</h3>
                    <button onClick={onCancel} className="text-slate-400 hover:text-white"><i className="fas fa-times"></i></button>
                </div>
                <div className="p-8 text-center space-y-6">
                    <div className="w-16 h-16 bg-rose-50 border-2 border-rose-200 text-rose-500 rounded-full flex items-center justify-center mx-auto text-2xl mb-2">
                        <i className="fas fa-mobile-alt"></i>
                    </div>
                    <div>
                        <h4 className="font-black text-slate-800 text-lg mb-2">Destructive Action: {actionName}</h4>
                        <p className="text-xs text-slate-500 font-medium">Please open your Authy or Google Authenticator app and enter your 6-digit code to authorize this deletion.</p>
                    </div>
                    
                    <div>
                        <input 
                            type="text" 
                            maxLength="6"
                            autoFocus
                            value={code}
                            onChange={e => setCode(e.target.value.replace(/\D/g, ''))} // Numbers only
                            placeholder="• • • • • •"
                            className="w-full text-center text-3xl font-black tracking-[0.5em] p-4 border-2 border-slate-200 rounded-xl focus:border-rose-500 outline-none bg-slate-50"
                        />
                        {error && <p className="text-rose-500 text-xs font-bold mt-2">{error}</p>}
                    </div>

                    <div className="flex gap-3 pt-4">
                        <button onClick={onCancel} className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-black text-xs uppercase tracking-widest transition-colors">Cancel</button>
                        <button onClick={handleVerify} disabled={isVerifying || code.length !== 6} className="flex-1 py-3 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-md transition-colors disabled:opacity-50 flex items-center justify-center">
                            {isVerifying ? <i className="fas fa-spinner fa-spin"></i> : 'Verify & Execute'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
