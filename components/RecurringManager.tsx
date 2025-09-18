
import React, { useState, useEffect, useCallback } from 'react';
import type { RecurringProfile, ClientDetails, Product, Item } from '../types';
import { BillingFrequency, ProfileStatus, PriceType, TransactionType } from '../types';
import Card from './Card';
import Header from './Header';
import { GST_RATES } from '../constants';

interface RecurringManagerProps {
    profiles: RecurringProfile[];
    setProfiles: React.Dispatch<React.SetStateAction<RecurringProfile[]>>;
    clients: ClientDetails[];
    products: Product[];
    currencySymbol: string;
}

const EditIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.5L15.232 5.232z" /></svg> );
const TrashIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clipRule="evenodd" /></svg> );
const PauseIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" /></svg> );
const PlayIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" /></svg> );

const ProfileStatusBadge: React.FC<{ status: ProfileStatus }> = ({ status }) => {
    const base = "px-2.5 py-0.5 text-xs font-semibold rounded-full";
    if (status === ProfileStatus.ACTIVE) return <span className={`${base} bg-green-100 text-green-800`}>Active</span>;
    return <span className={`${base} bg-yellow-100 text-yellow-800`}>Paused</span>;
};

const initialProfileState: Omit<RecurringProfile, 'id'> = {
    client: { id: '', name: '', gstin: '', address: '' },
    items: [{ id: crypto.randomUUID(), description: '', hsn: '', quantity: 1, price: NaN, gstRate: 18 }],
    frequency: BillingFrequency.MONTHLY,
    startDate: new Date().toISOString().split('T')[0],
    nextDueDate: '',
    status: ProfileStatus.ACTIVE,
    priceType: PriceType.EXCLUSIVE,
    transactionType: TransactionType.INTRA_STATE
};

const RecurringManager: React.FC<RecurringManagerProps> = ({ profiles, setProfiles, clients, products, currencySymbol }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingProfile, setEditingProfile] = useState<RecurringProfile | Omit<RecurringProfile, 'id'>>(initialProfileState);
    const [isEditing, setIsEditing] = useState(false);

    const handleOpenModal = (profile: RecurringProfile | null = null) => {
        if (profile) {
            setEditingProfile(profile);
            setIsEditing(true);
        } else {
            setEditingProfile(initialProfileState);
            setIsEditing(false);
        }
        setIsModalOpen(true);
    };

    const handleCloseModal = () => setIsModalOpen(false);

    const handleChange = (field: keyof Omit<RecurringProfile, 'id'|'items'|'client'>, value: any) => {
        setEditingProfile(prev => ({ ...prev, [field]: value }));
    };

    const handleClientChange = (clientId: string) => {
        const client = clients.find(c => c.id === clientId);
        if (client) {
            setEditingProfile(prev => ({...prev, client}));
        }
    }

    const handleItemChange = (id: string, field: keyof Item, value: string | number) => {
        const currentItems = (editingProfile as any).items as Item[];
        const updatedItems = currentItems.map(item => item.id === id ? { ...item, [field]: value } : item);
        setEditingProfile(prev => ({...prev, items: updatedItems}));
    };

    const handleAddItem = () => {
        const currentItems = (editingProfile as any).items as Item[];
        const newItems = [...currentItems, { id: crypto.randomUUID(), description: '', hsn: '', quantity: 1, price: NaN, gstRate: 18 }];
        setEditingProfile(prev => ({...prev, items: newItems}));
    };

    const handleRemoveItem = (id: string) => {
        const currentItems = (editingProfile as any).items as Item[];
        const newItems = currentItems.filter(item => item.id !== id);
        setEditingProfile(prev => ({...prev, items: newItems}));
    };

    const handleSave = () => {
        const profileData = { ...editingProfile };
        if (!profileData.client.id) return;

        if (!profileData.nextDueDate) {
             profileData.nextDueDate = profileData.startDate;
        }

        if (isEditing) {
            setProfiles(profiles.map(p => p.id === (profileData as RecurringProfile).id ? (profileData as RecurringProfile) : p));
        } else {
            setProfiles([...profiles, { ...profileData, id: crypto.randomUUID() } as RecurringProfile]);
        }
        handleCloseModal();
    };

    const handleDelete = (id: string) => {
        if (window.confirm('Are you sure you want to delete this recurring profile?')) {
            setProfiles(profiles.filter(p => p.id !== id));
        }
    };

    const handleToggleStatus = (id: string) => {
        setProfiles(profiles.map(p => p.id === id ? { ...p, status: p.status === ProfileStatus.ACTIVE ? ProfileStatus.PAUSED : ProfileStatus.ACTIVE } : p));
    };
    
    const calculateTotal = (items: Item[], priceType: PriceType) => {
        const { totalNetAmount, totalGstAmount } = items.reduce((acc, item) => {
            const { quantity, price, gstRate } = item;
            if (!quantity || !price) return acc;
            let itemNetAmount = 0;
            if (priceType === PriceType.EXCLUSIVE) {
                itemNetAmount = quantity * price;
            } else {
                itemNetAmount = (quantity * price) / (1 + (gstRate / 100));
            }
            acc.totalNetAmount += itemNetAmount;
            acc.totalGstAmount += itemNetAmount * (gstRate / 100);
            return acc;
        }, { totalNetAmount: 0, totalGstAmount: 0 });
        return totalNetAmount + totalGstAmount;
    };

    return (
        <div className="space-y-6">
            <Header title="Recurring Invoices">
                 <button onClick={() => handleOpenModal()} className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700">
                    + New Recurring Profile
                </button>
            </Header>

            <Card>
                {profiles.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-slate-200">
                             <thead className="bg-slate-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Client</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Frequency</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase">Next Due Date</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase">Amount</th>
                                    <th className="px-6 py-3 text-center text-xs font-medium text-slate-500 uppercase">Status</th>
                                    <th className="px-6 py-3 text-center text-xs font-medium text-slate-500 uppercase">Actions</th>
                                </tr>
                            </thead>
                             <tbody className="bg-white divide-y divide-slate-200">
                                {profiles.map(profile => (
                                    <tr key={profile.id}>
                                        <td className="px-6 py-4 text-sm font-medium text-slate-900">{profile.client.name}</td>
                                        <td className="px-6 py-4 text-sm text-slate-500 capitalize">{profile.frequency.toLowerCase()}</td>
                                        <td className="px-6 py-4 text-sm text-slate-500 text-right">{new Date(profile.nextDueDate).toLocaleDateString('en-IN')}</td>
                                        <td className="px-6 py-4 text-sm text-slate-500 text-right font-semibold">{currencySymbol}{calculateTotal(profile.items, profile.priceType).toFixed(2)}</td>
                                        <td className="px-6 py-4 text-sm text-center"><ProfileStatusBadge status={profile.status} /></td>
                                        <td className="px-6 py-4 text-sm text-center space-x-2">
                                            <button onClick={() => handleToggleStatus(profile.id)} className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-100 rounded-full">{profile.status === ProfileStatus.ACTIVE ? <PauseIcon /> : <PlayIcon />}</button>
                                            <button onClick={() => handleOpenModal(profile)} className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-100 rounded-full"><EditIcon /></button>
                                            <button onClick={() => handleDelete(profile.id)} className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-100 rounded-full"><TrashIcon /></button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="text-center py-12">
                        <p className="text-slate-500">You have no recurring invoice profiles.</p>
                        <p className="text-sm text-slate-400 mt-1">Automate your billing by creating a new profile.</p>
                    </div>
                )}
            </Card>

            {isModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-2xl m-4 max-h-[90vh] overflow-y-auto">
                        <h2 className="text-2xl font-bold text-slate-800 mb-6">{isEditing ? 'Edit Profile' : 'New Recurring Profile'}</h2>
                        <div className="space-y-4">
                            <div>
                                <label className="text-sm font-medium text-slate-600 mb-1 block">Client*</label>
                                <select value={editingProfile.client.id} onChange={e => handleClientChange(e.target.value)} className="w-full p-2 bg-slate-50 rounded-md border">
                                    <option value="">-- Select a client --</option>
                                    {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label className="text-sm font-medium text-slate-600 mb-1 block">Frequency</label>
                                    <select value={editingProfile.frequency} onChange={e => handleChange('frequency', e.target.value)} className="w-full p-2 bg-slate-50 rounded-md border">
                                        {Object.values(BillingFrequency).map(f => <option key={f} value={f}>{f.charAt(0) + f.slice(1).toLowerCase()}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-slate-600 mb-1 block">Start Date</label>
                                    <input type="date" value={editingProfile.startDate.split('T')[0]} onChange={e => handleChange('startDate', e.target.value)} className="w-full p-2 bg-slate-50 rounded-md border"/>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-slate-600 mb-1 block">End Date (Optional)</label>
                                    <input type="date" value={editingProfile.endDate?.split('T')[0] || ''} onChange={e => handleChange('endDate', e.target.value)} className="w-full p-2 bg-slate-50 rounded-md border"/>
                                </div>
                            </div>
                            <div className="space-y-2 pt-4">
                                <h3 className="text-lg font-semibold text-slate-700 border-b pb-2">Items</h3>
                                {(editingProfile as any).items.map((item: Item, index: number) => (
                                    <div key={item.id} className="grid grid-cols-12 gap-2 items-center">
                                        <div className="col-span-4"><input type="text" value={item.description} onChange={e => handleItemChange(item.id, 'description', e.target.value)} placeholder="Description" className="w-full p-2 bg-slate-50 border rounded-md"/></div>
                                        <div className="col-span-2"><input type="text" value={item.hsn} onChange={e => handleItemChange(item.id, 'hsn', e.target.value)} placeholder="HSN" className="w-full p-2 bg-slate-50 border rounded-md"/></div>
                                        <div className="col-span-2"><input type="number" value={isNaN(item.quantity) ? '' : item.quantity} onChange={e => handleItemChange(item.id, 'quantity', parseFloat(e.target.value))} placeholder="Qty" className="w-full p-2 bg-slate-50 border rounded-md"/></div>
                                        <div className="col-span-2"><input type="number" value={isNaN(item.price) ? '' : item.price} onChange={e => handleItemChange(item.id, 'price', parseFloat(e.target.value))} placeholder="Price" className="w-full p-2 bg-slate-50 border rounded-md"/></div>
                                        <div className="col-span-1"><select value={item.gstRate} onChange={e => handleItemChange(item.id, 'gstRate', parseInt(e.target.value))} className="w-full p-2 bg-slate-50 border rounded-md">{GST_RATES.map(r => <option key={r} value={r}>{r}%</option>)}</select></div>
                                        <div className="col-span-1 text-right">{ (editingProfile as any).items.length > 1 && <button onClick={() => handleRemoveItem(item.id)} className="p-2 text-slate-400 hover:text-red-600"><TrashIcon /></button> }</div>
                                    </div>
                                ))}
                                <button onClick={handleAddItem} className="px-3 py-1 text-sm text-indigo-600 bg-indigo-100 hover:bg-indigo-200 rounded">+ Add Item</button>
                            </div>
                        </div>
                        <div className="flex justify-end gap-4 mt-8">
                            <button onClick={handleCloseModal} className="px-4 py-2 text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg">Cancel</button>
                            <button onClick={handleSave} className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700">Save Profile</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default RecurringManager;
