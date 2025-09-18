
import React, { useState } from 'react';
import type { Product } from '../types';
import Card from './Card';
import Header from './Header';
import { GST_RATES } from '../constants';

interface InventoryManagerProps {
    products: Product[];
    setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
    currencySymbol: string;
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

const InventoryManager: React.FC<InventoryManagerProps> = ({ products, setProducts, currencySymbol }) => {
    const initialProductState: Omit<Product, 'id'> = { name: '', hsn: '', price: NaN, gstRate: 18, trackStock: false, stock: 0, lowStockThreshold: 0 };
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Product | Omit<Product, 'id'>>(initialProductState);
    const [isEditing, setIsEditing] = useState(false);

    const handleOpenModal = (product: Product | null = null) => {
        if (product) {
            setEditingProduct(product);
            setIsEditing(true);
        } else {
            setEditingProduct(initialProductState);
            setIsEditing(false);
        }
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
    };

    const handleChange = (field: keyof Omit<Product, 'id'>, value: string | number | boolean) => {
        setEditingProduct(prev => ({...prev, [field]: value}));
    };

    const handleSave = () => {
        if (!editingProduct.name) return; // Basic validation
        if (isEditing) {
            setProducts(products.map(p => p.id === (editingProduct as Product).id ? (editingProduct as Product) : p));
        } else {
            setProducts([...products, { ...editingProduct, id: crypto.randomUUID() }]);
        }
        handleCloseModal();
    };

    const handleDelete = (id: string) => {
        if (window.confirm('Are you sure you want to delete this product?')) {
            setProducts(products.filter(p => p.id !== id));
        }
    };

    const StockStatus: React.FC<{product: Product}> = ({ product }) => {
        if (!product.trackStock) {
            return <span className="text-xs font-medium bg-blue-100 text-blue-800 px-2 py-1 rounded-full">Service</span>
        }
        if (product.stock <= 0) {
            return <span className="text-xs font-medium bg-red-100 text-red-800 px-2 py-1 rounded-full">Out of Stock</span>
        }
        if (product.stock <= product.lowStockThreshold) {
            return <span className="text-xs font-medium bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full">Low Stock</span>
        }
        return <span className="text-xs font-medium bg-green-100 text-green-800 px-2 py-1 rounded-full">In Stock</span>
    }

    return (
        <div className="space-y-6">
            <Header title="Products & Services">
                 <button onClick={() => handleOpenModal()} className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors">
                    + Add New Item
                </button>
            </Header>

            <Card>
                {products.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-slate-200">
                             <thead className="bg-slate-50">
                                <tr>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Item Name</th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">HSN/SAC</th>
                                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Price</th>
                                    <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">Stock</th>
                                    <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                                    <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                             <tbody className="bg-white divide-y divide-slate-200">
                                {products.map(product => (
                                    <tr key={product.id}>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">{product.name}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{product.hsn}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 text-right">{currencySymbol}{(product.price || 0).toFixed(2)}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 text-center">{product.trackStock ? product.stock : 'N/A'}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-center"><StockStatus product={product} /></td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-center space-x-2">
                                            <button onClick={() => handleOpenModal(product)} className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-100 rounded-full transition"><EditIcon /></button>
                                            <button onClick={() => handleDelete(product.id)} className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-100 rounded-full transition"><TrashIcon /></button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="text-center py-12">
                        <p className="text-slate-500">Your product and service catalog is empty.</p>
                        <p className="text-sm text-slate-400 mt-1">Click "Add New Item" to get started.</p>
                    </div>
                )}
            </Card>

            {isModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" aria-modal="true" role="dialog">
                    <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-md m-4 max-h-screen overflow-y-auto">
                        <h2 className="text-2xl font-bold text-slate-800 mb-6">{isEditing ? 'Edit Item' : 'Add New Item'}</h2>
                        <div className="space-y-4">
                            <div>
                                <label className="text-sm font-medium text-slate-600 mb-1 block">Item Name*</label>
                                <input type="text" value={editingProduct.name} onChange={e => handleChange('name', e.target.value)} className="w-full p-2 bg-slate-50 rounded-md border border-slate-200 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none"/>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-sm font-medium text-slate-600 mb-1 block">HSN/SAC</label>
                                    <input type="text" value={editingProduct.hsn} onChange={e => handleChange('hsn', e.target.value)} className="w-full p-2 bg-slate-50 rounded-md border border-slate-200 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none"/>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-slate-600 mb-1 block">GST Rate (%)</label>
                                    <select value={editingProduct.gstRate} onChange={e => handleChange('gstRate', parseInt(e.target.value))} className="w-full p-2 bg-slate-50 rounded-md border border-slate-200 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none">
                                        {GST_RATES.map(rate => <option key={rate} value={rate}>{rate}%</option>)}
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="text-sm font-medium text-slate-600 mb-1 block">Default Sale Price (Excl. GST)</label>
                                <input type="number" value={isNaN(editingProduct.price) ? '' : editingProduct.price} onChange={e => handleChange('price', parseFloat(e.target.value))} className="w-full p-2 bg-slate-50 rounded-md border border-slate-200 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none"/>
                            </div>
                            <div className="flex items-center pt-2">
                                <input type="checkbox" id="trackStock" checked={editingProduct.trackStock} onChange={e => handleChange('trackStock', e.target.checked)} className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500" />
                                <label htmlFor="trackStock" className="ml-2 block text-sm text-slate-700">Track stock for this item</label>
                            </div>
                            {editingProduct.trackStock && (
                                <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 rounded-lg border">
                                    <div>
                                        <label className="text-sm font-medium text-slate-600 mb-1 block">Current Stock</label>
                                        <input type="number" value={editingProduct.stock} onChange={e => handleChange('stock', parseInt(e.target.value))} className="w-full p-2 bg-white rounded-md border border-slate-200 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none"/>
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium text-slate-600 mb-1 block">Low Stock Alert</label>
                                        <input type="number" value={editingProduct.lowStockThreshold} onChange={e => handleChange('lowStockThreshold', parseInt(e.target.value))} className="w-full p-2 bg-white rounded-md border border-slate-200 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none"/>
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="flex justify-end gap-4 mt-8">
                            <button onClick={handleCloseModal} className="px-4 py-2 text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors">Cancel</button>
                            <button onClick={handleSave} className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors">Save Item</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default InventoryManager;
