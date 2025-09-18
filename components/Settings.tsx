
import React from 'react';
import type { Settings } from '../types';
import Card from './Card';
import Header from './Header';

interface SettingsProps {
    settings: Settings;
    setSettings: React.Dispatch<React.SetStateAction<Settings>>;
}

const SettingsComponent: React.FC<SettingsProps> = ({ settings, setSettings }) => {

    const handleChange = (field: keyof Settings, value: string) => {
        setSettings(prev => ({ ...prev, [field]: value }));
    };

    return (
        <div className="space-y-6">
            <Header title="Settings" />
            
            <Card>
                <div className="max-w-2xl">
                    <h2 className="text-xl font-bold text-slate-700">Payment Gateway Integration</h2>
                    <p className="text-sm text-slate-500 mt-1 mb-6">
                        Connect your Razorpay account to add "Pay Now" links to your invoices and get paid faster.
                        Your keys are saved securely in your browser.
                    </p>

                    <div className="space-y-4">
                        <div>
                            <label htmlFor="razorpayKeyId" className="text-sm font-medium text-slate-600 mb-1 block">Razorpay Key ID</label>
                            <input 
                                id="razorpayKeyId"
                                type="text" 
                                value={settings.razorpayKeyId} 
                                onChange={e => handleChange('razorpayKeyId', e.target.value)} 
                                placeholder="rzp_live_..."
                                className="w-full p-2 bg-slate-100 rounded-md border border-slate-200 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                            />
                        </div>
                        <div>
                            <label htmlFor="razorpayKeySecret" className="text-sm font-medium text-slate-600 mb-1 block">Razorpay Key Secret</label>
                            <input 
                                id="razorpayKeySecret"
                                type="password" 
                                value={settings.razorpayKeySecret} 
                                onChange={e => handleChange('razorpayKeySecret', e.target.value)} 
                                placeholder="••••••••••••••••"
                                className="w-full p-2 bg-slate-100 rounded-md border border-slate-200 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                            />
                        </div>
                    </div>
                     <div className="mt-6">
                        <p className="text-xs text-slate-400">
                           Changes are saved automatically.
                        </p>
                    </div>
                </div>
            </Card>
        </div>
    );
};

export default SettingsComponent;
