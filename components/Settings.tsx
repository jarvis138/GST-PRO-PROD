
import React, { useState } from 'react';
import type { Settings, ClientDetails, Vendor, Product, InvoiceRecord, PurchaseRecord, User, CustomField } from '../types';
import { UserRole, Template } from '../types';
import Card from './Card';

// @ts-ignore
const { jsPDF } = window.jspdf;
// @ts-ignore
const XLSX = window.XLSX;

interface SettingsProps {
    settings: Settings;
    setSettings: React.Dispatch<React.SetStateAction<Settings>>;
    clients: ClientDetails[];
    setClients: React.Dispatch<React.SetStateAction<ClientDetails[]>>;
    vendors: Vendor[];
    setVendors: React.Dispatch<React.SetStateAction<Vendor[]>>;
    products: Product[];
    setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
    invoiceHistory: InvoiceRecord[];
    purchaseHistory: PurchaseRecord[];
    users: User[];
    setUsers: React.Dispatch<React.SetStateAction<User[]>>;
    currentUser: User | null;
}

const SettingsComponent: React.FC<SettingsProps> = ({ 
    settings, setSettings,
    clients, setClients,
    vendors, setVendors,
    products, setProducts,
    invoiceHistory, purchaseHistory,
    users, setUsers, currentUser
}) => {
    
    const initialUserState: Omit<User, 'id'> = { name: '', email: '', role: UserRole.SALESPERSON };
    const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);
    const [newUser, setNewUser] = useState(initialUserState);

    const handleChange = (field: keyof Settings, value: any) => {
        setSettings(prev => ({ ...prev, [field]: value }));
    };
    
    const handleCustomFieldChange = (id: 'customField1' | 'customField2', field: keyof CustomField, value: string | boolean) => {
        setSettings(prev => ({
            ...prev,
            customFields: prev.customFields.map(cf => cf.id === id ? { ...cf, [field]: value } : cf)
        }));
    };

    const handleInviteUser = () => {
        if (!newUser.name || !newUser.email) {
            alert("Please provide a name and email for the new user.");
            return;
        }
        setUsers([...users, { ...newUser, id: crypto.randomUUID() }]);
        setIsTeamModalOpen(false);
        setNewUser(initialUserState);
    };

    const handleDeleteUser = (userId: string) => {
        if (users.length <= 1) {
            alert("You cannot delete the only user in the system.");
            return;
        }
        if (currentUser?.id === userId) {
            alert("You cannot delete yourself.");
            return;
        }
        if (window.confirm("Are you sure you want to remove this user?")) {
            setUsers(users.filter(u => u.id !== userId));
        }
    };


    const downloadCSV = (content: string, fileName: string) => {
        const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", fileName);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const downloadTemplate = (type: 'clients' | 'vendors' | 'products', format: 'csv' | 'excel') => {
        let headers: string[] = [];
        if (type === 'clients') headers = ['name', 'gstin', 'address'];
        if (type === 'vendors') headers = ['name', 'gstin', 'address'];
        if (type === 'products') headers = ['name', 'hsn', 'price', 'gstRate', 'trackStock', 'stock', 'lowStockThreshold'];
        
        if (format === 'csv') {
            downloadCSV(headers.join(','), `${type}_template.csv`);
        } else { // Excel
            const ws = XLSX.utils.aoa_to_sheet([headers]);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Template');
            XLSX.writeFile(wb, `${type}_template.xlsx`);
        }
    };

    const handleImport = (event: React.ChangeEvent<HTMLInputElement>, type: 'clients' | 'vendors' | 'products') => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();

        const processData = (data: any[]) => {
            try {
                if (type === 'clients') {
                    const newClients: ClientDetails[] = data.map(d => ({ id: crypto.randomUUID(), name: d.name || '', gstin: d.gstin || '', address: d.address || '' }));
                    if(window.confirm(`Found ${newClients.length} clients. This will replace all existing clients. Proceed?`)) setClients(newClients);
                }
                if (type === 'vendors') {
                    const newVendors: Vendor[] = data.map(d => ({ id: crypto.randomUUID(), name: d.name || '', gstin: d.gstin || '', address: d.address || '' }));
                    if(window.confirm(`Found ${newVendors.length} vendors. This will replace all existing vendors. Proceed?`)) setVendors(newVendors);
                }
                if (type === 'products') {
                    const newProducts: Product[] = data.map(d => ({
                        id: crypto.randomUUID(),
                        name: d.name || '',
                        hsn: d.hsn || '',
                        price: parseFloat(d.price) || 0,
                        gstRate: parseInt(d.gstRate) || 18,
                        trackStock: String(d.trackStock)?.toLowerCase() === 'true',
                        stock: parseInt(d.stock) || 0,
                        lowStockThreshold: parseInt(d.lowStockThreshold) || 0,
                    }));
                     if(window.confirm(`Found ${newProducts.length} products. This will replace all existing products. Proceed?`)) setProducts(newProducts);
                }
                 alert('Import successful!');
            } catch (error) {
                console.error("Import error:", error);
                alert('An error occurred during import. Please check the file format and try again.');
            }
        };

        if (file.name.endsWith('.csv')) {
            reader.onload = (e) => {
                const text = e.target?.result as string;
                const rows = text.split('\n').filter(row => row.trim() !== '');
                const headers = rows.shift()?.trim().split(',').map(h => h.trim().replace(/"/g, '')) || [];
                
                const data = rows.map(row => {
                    const values = row.split(','); // Naive CSV parsing
                    return headers.reduce((obj, header, index) => {
                        obj[header] = values[index]?.trim().replace(/"/g, '');
                        return obj;
                    }, {} as any);
                });
                processData(data);
            };
            reader.readAsText(file);
        } else if (file.name.endsWith('.xlsx')) {
            reader.onload = (e) => {
                const data = e.target?.result;
                const workbook = XLSX.read(data, { type: 'array' });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const json = XLSX.utils.sheet_to_json(worksheet);
                processData(json);
            };
            reader.readAsArrayBuffer(file);
        } else {
            alert("Unsupported file type. Please upload a CSV or XLSX file.");
        }

        event.target.value = ''; // Reset file input
    };
    
    const handleExport = (type: 'clients' | 'vendors' | 'products' | 'invoices' | 'purchases', format: 'csv' | 'excel' | 'pdf') => {
        let headers: string[] = [];
        let jsonData: any[] = [];
        const filename = `${type}_export`;

        switch(type) {
            case 'clients':
                headers = ['Name', 'GSTIN', 'Address'];
                jsonData = clients.map(c => ({ 'Name': c.name, 'GSTIN': c.gstin, 'Address': c.address }));
                break;
            case 'vendors':
                headers = ['Name', 'GSTIN', 'Address'];
                jsonData = vendors.map(v => ({ 'Name': v.name, 'GSTIN': v.gstin, 'Address': v.address }));
                break;
            case 'products':
                headers = ['Name', 'HSN/SAC', 'Price', 'GST Rate', 'Track Stock', 'Stock', 'Low Stock Threshold'];
                jsonData = products.map(p => ({ 'Name': p.name, 'HSN/SAC': p.hsn, 'Price': p.price, 'GST Rate': p.gstRate, 'Track Stock': p.trackStock, 'Stock': p.stock, 'Low Stock Threshold': p.lowStockThreshold }));
                break;
            case 'invoices':
                headers = ['Invoice #', 'Date', 'Status', 'Client Name', 'Client GSTIN', 'Total Amount', 'Taxable Amount', 'Tax Amount', 'Item', 'HSN/SAC', 'Qty', 'Rate', 'GST %'];
                jsonData = invoiceHistory.flatMap(inv => 
                    inv.items.map(item => ({
                        'Invoice #': inv.invoiceNumber, 'Date': new Date(inv.date).toLocaleDateString('en-CA'), 'Status': inv.status, 'Client Name': inv.client.name, 'Client GSTIN': inv.client.gstin,
                        'Total Amount': inv.totalAmount, 'Taxable Amount': inv.calculationResult.totalNetAmount, 'Tax Amount': inv.calculationResult.totalGstAmount,
                        'Item': item.description, 'HSN/SAC': item.hsn, 'Qty': item.quantity, 'Rate': item.price, 'GST %': item.gstRate
                    }))
                );
                break;
            case 'purchases':
                 headers = ['Bill #', 'Date', 'Status', 'Vendor Name', 'Vendor GSTIN', 'Total Amount', 'Taxable Amount', 'Tax Amount', 'Item', 'HSN/SAC', 'Qty', 'Rate', 'GST %'];
                jsonData = purchaseHistory.flatMap(p => 
                    p.items.map(item => ({
                        'Bill #': p.billNumber, 'Date': new Date(p.date).toLocaleDateString('en-CA'), 'Status': p.status, 'Vendor Name': p.vendor.name, 'Vendor GSTIN': p.vendor.gstin,
                        'Total Amount': p.totalAmount, 'Taxable Amount': p.calculationResult.totalNetAmount, 'Tax Amount': p.calculationResult.totalGstAmount,
                        'Item': item.description, 'HSN/SAC': item.hsn, 'Qty': item.quantity, 'Rate': item.price, 'GST %': item.gstRate
                    }))
                );
                break;
        }

        if (format === 'csv') {
            const escapeCSV = (val: any) => `"${String(val ?? '').replace(/"/g, '""')}"`;
            const csvContent = [
                headers.join(','),
                ...jsonData.map(row => headers.map(header => escapeCSV(row[header])).join(','))
            ].join('\n');
            downloadCSV(csvContent, `${filename}.csv`);
        } else if (format === 'excel') {
            const ws = XLSX.utils.json_to_sheet(jsonData, { header: headers });
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Data");
            XLSX.writeFile(wb, `${filename}.xlsx`);
        } else { // PDF
            const doc = new jsPDF({ orientation: headers.length > 6 ? 'landscape' : 'portrait' });
            const tableData = jsonData.map(row => headers.map(header => row[header] ?? ''));
            doc.autoTable({
                head: [headers],
                body: tableData,
                styles: { fontSize: 8 },
                headStyles: { fillColor: [79, 70, 229] }, // Indigo
            });
            doc.save(`${filename}.pdf`);
        }
    };

    const ExportRow: React.FC<{ label: string; onExport: (format: 'csv' | 'excel' | 'pdf') => void; }> = ({ label, onExport }) => (
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 p-3 bg-slate-50 rounded-lg border">
            <p className="text-sm font-medium text-slate-700">{label}</p>
            <div className="flex items-center gap-2">
                <button onClick={() => onExport('csv')} className="px-3 py-1 text-xs font-semibold text-indigo-700 bg-indigo-100 hover:bg-indigo-200 rounded-md">CSV</button>
                <button onClick={() => onExport('excel')} className="px-3 py-1 text-xs font-semibold text-green-700 bg-green-100 hover:bg-green-200 rounded-md">Excel</button>
                <button onClick={() => onExport('pdf')} className="px-3 py-1 text-xs font-semibold text-red-700 bg-red-100 hover:bg-red-200 rounded-md">PDF</button>
            </div>
        </div>
    );

    const ImportRow: React.FC<{ label: string; onTemplateClick: (format: 'csv' | 'excel') => void; onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void; }> = ({ label, onTemplateClick, onFileChange }) => (
        <div>
            <label className="text-sm font-medium text-slate-700 block mb-2">{label}</label>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                <div className="flex-shrink-0 flex items-center gap-2">
                    <span className="text-xs text-slate-500">Templates:</span>
                    <button onClick={() => onTemplateClick('csv')} className="px-3 py-1.5 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-md">CSV</button>
                    <button onClick={() => onTemplateClick('excel')} className="px-3 py-1.5 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-md">Excel</button>
                </div>
                <input 
                    type="file" 
                    accept=".csv, .xlsx"
                    onChange={onFileChange}
                    className="block w-full text-sm text-slate-500 file:mr-4 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                />
            </div>
        </div>
    );

    return (
        <div className="space-y-6">
            {/* FIX: Removed Header component to use the main app header, fixing prop error. */}
            
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

            {currentUser?.role === UserRole.ADMIN && (
                 <Card>
                    <div className="max-w-2xl">
                        <h2 className="text-xl font-bold text-slate-700">Document & Branding</h2>
                        <p className="text-sm text-slate-500 mt-1 mb-6">
                            Customize the appearance of your invoices, quotes, and other documents.
                        </p>

                        <div className="space-y-6">
                            <div>
                                <h3 className="text-base font-semibold text-slate-600 mb-3">Template</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <label className={`relative block border-2 rounded-lg p-4 cursor-pointer ${settings.template === Template.CLASSIC ? 'border-indigo-600' : 'border-slate-300'}`}>
                                        <input type="radio" name="template" value={Template.CLASSIC} checked={settings.template === Template.CLASSIC} onChange={() => handleChange('template', Template.CLASSIC)} className="sr-only" />
                                        <div className="text-sm font-semibold">Classic</div>
                                        <div className="text-xs text-slate-500">A clean, traditional layout.</div>
                                        <div className="absolute top-2 right-2 h-5 w-5 rounded-full border-2 flex items-center justify-center ${settings.template === Template.CLASSIC ? 'border-indigo-600 bg-indigo-600' : 'border-slate-400'}">
                                            {settings.template === Template.CLASSIC && <div className="h-2 w-2 bg-white rounded-full"></div>}
                                        </div>
                                    </label>
                                    <label className={`relative block border-2 rounded-lg p-4 cursor-pointer ${settings.template === Template.MODERN ? 'border-indigo-600' : 'border-slate-300'}`}>
                                        <input type="radio" name="template" value={Template.MODERN} checked={settings.template === Template.MODERN} onChange={() => handleChange('template', Template.MODERN)} className="sr-only" />
                                        <div className="text-sm font-semibold">Modern</div>
                                        <div className="text-xs text-slate-500">Stylish layout with a color banner.</div>
                                         <div className="absolute top-2 right-2 h-5 w-5 rounded-full border-2 flex items-center justify-center ${settings.template === Template.MODERN ? 'border-indigo-600 bg-indigo-600' : 'border-slate-400'}">
                                            {settings.template === Template.MODERN && <div className="h-2 w-2 bg-white rounded-full"></div>}
                                        </div>
                                    </label>
                                </div>
                            </div>

                             <div>
                                <label htmlFor="accentColor" className="text-base font-semibold text-slate-600 mb-3 block">Accent Color</label>
                                <div className="flex items-center gap-3">
                                    <input 
                                        id="accentColor"
                                        type="color" 
                                        value={settings.accentColor} 
                                        onChange={e => handleChange('accentColor', e.target.value)} 
                                        className="w-10 h-10 p-1 bg-white border rounded-md cursor-pointer"
                                    />
                                    <span className="text-sm text-slate-500">This color will be used in headers and highlights on your documents.</span>
                                </div>
                            </div>
                            
                            <div>
                                <h3 className="text-base font-semibold text-slate-600 mb-3">Custom Fields</h3>
                                <p className="text-xs text-slate-500 mb-4">Add up to two custom fields to your sales documents (e.g., PO Number, Project Code).</p>
                                <div className="space-y-4">
                                    {settings.customFields.map(field => (
                                        <div key={field.id} className="flex items-center gap-4 p-3 bg-slate-50 rounded-lg">
                                            <input 
                                                type="checkbox" 
                                                checked={field.enabled} 
                                                onChange={e => handleCustomFieldChange(field.id, 'enabled', e.target.checked)} 
                                                className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                                            />
                                            <div className="flex-1">
                                                 <input 
                                                    type="text" 
                                                    value={field.label} 
                                                    onChange={e => handleCustomFieldChange(field.id, 'label', e.target.value)} 
                                                    placeholder="Enter field label"
                                                    className="w-full p-2 bg-white rounded-md border border-slate-200 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none disabled:bg-slate-100"
                                                    disabled={!field.enabled}
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </Card>
            )}

            {currentUser?.role === UserRole.ADMIN && (
                <Card>
                    <div className="flex justify-between items-center mb-4">
                        <div>
                            <h2 className="text-xl font-bold text-slate-700">Team Management</h2>
                            <p className="text-sm text-slate-500 mt-1">Invite and manage team members and their roles.</p>
                        </div>
                        <button onClick={() => setIsTeamModalOpen(true)} className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700">
                            + Invite User
                        </button>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-slate-200">
                             <thead className="bg-slate-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Name</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Email</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Role</th>
                                    <th className="px-6 py-3 text-center text-xs font-medium text-slate-500 uppercase">Actions</th>
                                </tr>
                            </thead>
                             <tbody className="bg-white divide-y divide-slate-200">
                                {users.map(user => (
                                    <tr key={user.id}>
                                        <td className="px-6 py-4 text-sm font-medium text-slate-900">{user.name}</td>
                                        <td className="px-6 py-4 text-sm text-slate-500">{user.email}</td>
                                        <td className="px-6 py-4 text-sm text-slate-500"><span className="px-2 py-1 text-xs font-semibold rounded-full bg-slate-100 text-slate-700">{user.role}</span></td>
                                        <td className="px-6 py-4 text-sm text-center">
                                            <button onClick={() => handleDeleteUser(user.id)} className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-100 rounded-full disabled:opacity-50 disabled:cursor-not-allowed" disabled={currentUser?.id === user.id}>
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clipRule="evenodd" /></svg>
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Card>
            )}

            <Card>
                 <h2 className="text-xl font-bold text-slate-700">Data Management</h2>
                 <p className="text-sm text-slate-500 mt-1 mb-6">
                    Import your existing data to get started quickly, or export your data for backup and analysis.
                 </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-12">
                    <div>
                        <h3 className="text-lg font-semibold text-slate-600 border-b pb-2 mb-4">Import Data</h3>
                        <div className="space-y-6">
                            <ImportRow label="Import Clients from CSV / Excel" onTemplateClick={(format) => downloadTemplate('clients', format)} onFileChange={(e) => handleImport(e, 'clients')} />
                            <ImportRow label="Import Vendors from CSV / Excel" onTemplateClick={(format) => downloadTemplate('vendors', format)} onFileChange={(e) => handleImport(e, 'vendors')} />
                            <ImportRow label="Import Products from CSV / Excel" onTemplateClick={(format) => downloadTemplate('products', format)} onFileChange={(e) => handleImport(e, 'products')} />
                        </div>
                    </div>
                     <div>
                        <h3 className="text-lg font-semibold text-slate-600 border-b pb-2 mb-4">Export Data</h3>
                        <div className="space-y-3">
                            <ExportRow label="Export Clients" onExport={(format) => handleExport('clients', format)} />
                            <ExportRow label="Export Vendors" onExport={(format) => handleExport('vendors', format)} />
                            <ExportRow label="Export Products" onExport={(format) => handleExport('products', format)} />
                            <ExportRow label="Export Sales Invoices" onExport={(format) => handleExport('invoices', format)} />
                            <ExportRow label="Export Purchase Bills" onExport={(format) => handleExport('purchases', format)} />
                        </div>
                    </div>
                </div>
            </Card>

            {isTeamModalOpen && (
                 <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" aria-modal="true" role="dialog">
                    <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-md m-4">
                        <h2 className="text-2xl font-bold text-slate-800 mb-6">Invite New User</h2>
                        <div className="space-y-4">
                            <div>
                                <label className="text-sm font-medium text-slate-600 mb-1 block">Full Name*</label>
                                <input type="text" value={newUser.name} onChange={e => setNewUser(p => ({...p, name: e.target.value}))} className="w-full p-2 bg-slate-50 rounded-md border"/>
                            </div>
                             <div>
                                <label className="text-sm font-medium text-slate-600 mb-1 block">Email*</label>
                                <input type="email" value={newUser.email} onChange={e => setNewUser(p => ({...p, email: e.target.value}))} className="w-full p-2 bg-slate-50 rounded-md border"/>
                            </div>
                            <div>
                                <label className="text-sm font-medium text-slate-600 mb-1 block">Role</label>
                                <select value={newUser.role} onChange={e => setNewUser(p => ({...p, role: e.target.value as UserRole}))} className="w-full p-2 bg-slate-50 rounded-md border">
                                    <option value={UserRole.SALESPERSON}>Salesperson</option>
                                    <option value={UserRole.ACCOUNTANT}>Accountant</option>
                                    <option value={UserRole.ADMIN}>Admin</option>
                                </select>
                            </div>
                        </div>
                        <div className="flex justify-end gap-4 mt-8">
                            <button onClick={() => setIsTeamModalOpen(false)} className="px-4 py-2 text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg">Cancel</button>
                            <button onClick={handleInviteUser} className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700">Send Invite</button>
                        </div>
                    </div>
                 </div>
            )}

        </div>
    );
};

export default SettingsComponent;
