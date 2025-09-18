
import React, { useState } from 'react';
import type { Vendor } from '../types';
import Card from './Card';

interface VendorManagerProps {
    vendors: Vendor[];
    setVendors: React.Dispatch<React.SetStateAction<Vendor[]>>;
}

const EditIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.5L15.232 5.232z" />
    </svg>
);

const TrashIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clipRule="evenodd" />
    </svg>
);

const VendorManager: React.FC<VendorManagerProps> = ({ vendors, setVendors }) => {
    const initialVendorState: Omit<Vendor, 'id'> = { name: '', gstin: '', address: '' };
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingVendor, setEditingVendor] = useState<Vendor | Omit<Vendor, 'id'>>(initialVendorState);
    const [isEditing, setIsEditing] = useState(false);

    const handleOpenModal = (vendor: Vendor | null = null) => {
        if (vendor) {
            setEditingVendor(vendor);
            setIsEditing(true);
        } else {
            setEditingVendor(initialVendorState);
            setIsEditing(false);
        }
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
    };

    const handleChange = (field: keyof Omit<Vendor, 'id'>, value: string) => {
        setEditingVendor(prev => ({...prev, [field]: value}));
    };

    const handleSave = () => {
        if (!editingVendor.name) return; // Basic validation
        if (isEditing) {
            setVendors(vendors.map(v => v.id === (editingVendor as Vendor).id ? (editingVendor as Vendor) : v));
        } else {
            setVendors([...vendors, { ...editingVendor, id: crypto.randomUUID() }]);
        }
        handleCloseModal();
    };

    const handleDelete = (id: string) => {
        if (window.confirm('Are you sure you want to delete this vendor? This action cannot be undone.')) {
            setVendors(vendors.filter(v => v.id !== id));
        }
    };

    return (
        <div className="space-y-6">
            {/* FIX: Replaced the Header component with a div for action buttons to conform to the app layout and fix prop errors. */}
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <div></div>
                <button onClick={() => handleOpenModal()} className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors">
                    + Add New Vendor
                </button>
            </div>

            <Card>
                {vendors.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-slate-200">
                             <thead className="bg-slate-50">
                                <tr>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Vendor Name</th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">GSTIN</th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Address</th>
                                    <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                             <tbody className="bg-white divide-y divide-slate-200">
                                {vendors.map(vendor => (
                                    <tr key={vendor.id}>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">{vendor.name}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{vendor.gstin || 'N/A'}</td>
                                        <td className="px-6 py-4 whitespace-normal text-sm text-slate-500 max-w-xs truncate">{vendor.address}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-center space-x-2">
                                            <button onClick={() => handleOpenModal(vendor)} className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-100 rounded-full transition"><EditIcon /></button>
                                            <button onClick={() => handleDelete(vendor.id)} className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-100 rounded-full transition"><TrashIcon /></button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="text-center py-12">
                        <p className="text-slate-500">Your vendor list is empty.</p>
                        <p className="text-sm text-slate-400 mt-1">Click "Add New Vendor" to get started.</p>
                    </div>
                )}
            </Card>

            {isModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" aria-modal="true" role="dialog">
                    <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-md m-4 max-h-screen overflow-y-auto">
                        <h2 className="text-2xl font-bold text-slate-800 mb-6">{isEditing ? 'Edit Vendor' : 'Add New Vendor'}</h2>
                        <div className="space-y-4">
                            <div>
                                <label className="text-sm font-medium text-slate-600 mb-1 block">Vendor Name*</label>
                                <input type="text" value={editingVendor.name} onChange={e => handleChange('name', e.target.value)} placeholder="e.g., Supplier Inc." className="w-full p-2 bg-slate-50 rounded-md border border-slate-200 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none"/>
                            </div>
                            <div>
                                <label className="text-sm font-medium text-slate-600 mb-1 block">Vendor GSTIN</label>
                                <input type="text" value={editingVendor.gstin} onChange={e => handleChange('gstin', e.target.value)} placeholder="Vendor's GST Identification Number" className="w-full p-2 bg-slate-50 rounded-md border border-slate-200 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none"/>
                            </div>
                            <div>
                                <label className="text-sm font-medium text-slate-600 mb-1 block">Vendor Address</label>
                                <textarea value={editingVendor.address} onChange={e => handleChange('address', e.target.value)} placeholder="Vendor's Full Address" rows={4} className="w-full p-2 bg-slate-50 rounded-md border border-slate-200 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none"/>
                            </div>
                        </div>
                        <div className="flex justify-end gap-4 mt-8">
                            <button onClick={handleCloseModal} className="px-4 py-2 text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors">Cancel</button>
                            <button onClick={handleSave} className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors">Save Vendor</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default VendorManager;
