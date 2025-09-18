
import React, { useState, useEffect, useCallback } from 'react';
import { GST_RATES } from '../constants';
import { PriceType, TransactionType, PurchaseStatus } from '../types';
import type { CalculationResult, PurchaseItem, GstBreakdownDetail, Vendor, Product, PurchaseRecord } from '../types';
import Card from './Card';
import ResultDisplay from './ResultDisplay';
import Header from './Header';

const TrashIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clipRule="evenodd" />
    </svg>
);

const StatusBadge: React.FC<{ status: PurchaseStatus }> = ({ status }) => {
    const baseClasses = "px-2.5 py-0.5 text-xs font-semibold rounded-full";
    if (status === PurchaseStatus.PAID) {
        return <span className={`${baseClasses} bg-green-100 text-green-800`}>Paid</span>;
    }
    return <span className={`${baseClasses} bg-red-100 text-red-800`}>Unpaid</span>;
};

interface PurchaseManagerProps {
    vendors: Vendor[];
    setVendors: React.Dispatch<React.SetStateAction<Vendor[]>>;
    products: Product[];
    setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
    purchaseHistory: PurchaseRecord[];
    setPurchaseHistory: React.Dispatch<React.SetStateAction<PurchaseRecord[]>>;
    currencySymbol: string;
}

const PurchaseManager: React.FC<PurchaseManagerProps> = ({
    vendors, setVendors, products, setProducts, purchaseHistory, setPurchaseHistory, currencySymbol
}) => {
    const [items, setItems] = useState<PurchaseItem[]>([{ id: crypto.randomUUID(), description: '', hsn: '', quantity: 1, price: NaN, gstRate: 18 }]);
    const [results, setResults] = useState<CalculationResult | null>(null);
    const [priceType, setPriceType] = useState<PriceType>(PriceType.EXCLUSIVE);
    const [transactionType, setTransactionType] = useState<TransactionType>(TransactionType.INTRA_STATE);
    const [errors, setErrors] = useState<Record<string, string>>({});
    
    const initialVendorDetails: Vendor = { id: '', name: '', gstin: '', address: '' };
    const [vendorDetails, setVendorDetails] = useState<Vendor>(initialVendorDetails);
    const [selectedVendorId, setSelectedVendorId] = useState<string>('');
    const [billNumber, setBillNumber] = useState('');
    const [billDate, setBillDate] = useState(new Date().toISOString().split('T')[0]);
    
    const handleItemChange = (id: string, field: keyof PurchaseItem, value: string | number) => {
        const strValue = String(value);
        const fieldKey = `${id}-${field}`;
        
        if (field === 'quantity' || field === 'price') {
             if (strValue && !/^\d*\.?\d*$/.test(strValue)) {
                setErrors(prev => ({ ...prev, [fieldKey]: 'Please enter a valid number.' }));
                return;
            }
            setErrors(prev => { const newErrors = { ...prev }; delete newErrors[fieldKey]; return newErrors; });
            const numValue = parseFloat(strValue);
            setItems(prev => prev.map(item => item.id === id ? { ...item, [field]: isNaN(numValue) ? NaN : numValue } : item));
        } else {
             setItems(prev => prev.map(item => item.id === id ? { ...item, [field]: value } : item));
        }
    };
    
    const handleSelectVendor = (vendorId: string) => {
        setSelectedVendorId(vendorId);
        if (vendorId === '') {
            setVendorDetails(initialVendorDetails);
        } else {
            const selected = vendors.find(v => v.id === vendorId);
            if (selected) setVendorDetails(selected);
        }
    };

    const handleAddItem = () => {
        setItems([...items, { id: crypto.randomUUID(), description: '', hsn: '', quantity: 1, price: NaN, gstRate: 18 }]);
    };

    const handleRemoveItem = (id: string) => {
        setItems(items.filter(item => item.id !== id));
    };
    
    const calculate = useCallback(() => {
        if (Object.keys(errors).length > 0) {
            setResults(null);
            return;
        }

        const totals = items.reduce((acc, item) => {
            const quantity = Number(item.quantity) || 0;
            const price = Number(item.price) || 0;
            const rate = Number(item.gstRate) || 0;
            if (quantity <= 0 || price <= 0) return acc;

            let itemNetAmount = 0, itemGstAmount = 0;
            if (priceType === PriceType.EXCLUSIVE) {
                itemNetAmount = quantity * price;
                itemGstAmount = itemNetAmount * (rate / 100);
            } else {
                const itemTotalAmount = quantity * price;
                itemNetAmount = itemTotalAmount / (1 + (rate / 100));
                itemGstAmount = itemTotalAmount - itemNetAmount;
            }
            acc.totalNetAmount += itemNetAmount;
            acc.totalGstAmount += itemGstAmount;

            const existingRate = acc.gstBreakdown.find(b => b.rate === rate);
            if (existingRate) {
                existingRate.taxableAmount += itemNetAmount;
                existingRate.gstAmount += itemGstAmount;
            } else {
                acc.gstBreakdown.push({ rate, taxableAmount: itemNetAmount, gstAmount: itemGstAmount });
            }
            return acc;
        }, { totalNetAmount: 0, totalGstAmount: 0, grandTotal: 0, gstBreakdown: [] as GstBreakdownDetail[] });

        totals.grandTotal = totals.totalNetAmount + totals.totalGstAmount;
        setResults(totals);
    }, [items, priceType, errors, setResults]);

    useEffect(() => {
        calculate();
    }, [calculate]);
    
    const handleRecordPurchase = () => {
        if (!results || !billNumber || !selectedVendorId) {
            alert("Please fill in the bill number and select a vendor.");
            return;
        }

        const newRecord: PurchaseRecord = {
            id: crypto.randomUUID(),
            billNumber: billNumber,
            vendor: { ...vendorDetails },
            items: [...items],
            date: new Date(billDate).toISOString(),
            totalAmount: results.grandTotal,
            calculationResult: results,
            transactionType: transactionType,
            priceType: priceType,
            status: PurchaseStatus.UNPAID,
        };

        setPurchaseHistory([newRecord, ...purchaseHistory]);
        
        // Add stock
        setProducts(currentProducts => {
            const updatedProducts = [...currentProducts];
            newRecord.items.forEach(item => {
                const productIndex = updatedProducts.findIndex(p => p.name.toLowerCase() === item.description.toLowerCase() && p.trackStock);
                if (productIndex > -1) {
                    updatedProducts[productIndex].stock += item.quantity;
                }
            });
            return updatedProducts;
        });

        // Reset form
        setItems([{ id: crypto.randomUUID(), description: '', hsn: '', quantity: 1, price: NaN, gstRate: 18 }]);
        setBillNumber('');
        setVendorDetails(initialVendorDetails);
        setSelectedVendorId('');
    };
    
    return (
        <div className="space-y-6">
            <Header title="Record Purchase / Expense" />

            <Card>
                <div className="space-y-6">
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                         <div className="space-y-4">
                            <h3 className="text-lg font-semibold text-slate-700">Bill From (Vendor)</h3>
                            <div>
                                <label htmlFor="vendor-select" className="text-sm font-medium text-slate-600 mb-1 block">Select Vendor</label>
                                <select id="vendor-select" value={selectedVendorId} onChange={e => handleSelectVendor(e.target.value)} className="w-full p-2 bg-slate-100 rounded-md border border-slate-200 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none">
                                    <option value="">-- Select a Vendor --</option>
                                    {vendors.map(vendor => <option key={vendor.id} value={vendor.id}>{vendor.name}</option>)}
                                </select>
                            </div>
                            <p className="text-sm text-slate-600 p-4 bg-slate-50 rounded-lg">
                                <strong>{vendorDetails.name || 'No vendor selected'}</strong><br/>
                                {vendorDetails.address}<br/>
                                GSTIN: {vendorDetails.gstin || 'N/A'}
                            </p>
                        </div>
                        <div className="space-y-4">
                            <h3 className="text-lg font-semibold text-slate-700">Bill Details</h3>
                            <div>
                               <label className="text-sm font-medium text-slate-600 mb-1 block">Bill Number*</label>
                               <input type="text" value={billNumber} onChange={e => setBillNumber(e.target.value)} placeholder="Enter vendor's bill number" className="w-full p-2 bg-slate-100 rounded-md border border-slate-200 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none" />
                            </div>
                            <div>
                               <label className="text-sm font-medium text-slate-600 mb-1 block">Bill Date*</label>
                               <input type="date" value={billDate} onChange={e => setBillDate(e.target.value)} className="w-full p-2 bg-slate-100 rounded-md border border-slate-200 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none" />
                            </div>
                        </div>
                   </div>
                   
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="text-sm font-medium text-slate-600 mb-2 block">Pricing Type</label>
                            <div className="flex bg-slate-100 p-1 rounded-lg"><button onClick={() => setPriceType(PriceType.EXCLUSIVE)} className={`w-1/2 py-2 px-4 text-sm font-semibold rounded-md transition-colors duration-200 ${priceType === PriceType.EXCLUSIVE ? 'bg-white shadow text-indigo-700' : 'text-slate-500 hover:bg-slate-200'}`}>Exclusive</button><button onClick={() => setPriceType(PriceType.INCLUSIVE)} className={`w-1/2 py-2 px-4 text-sm font-semibold rounded-md transition-colors duration-200 ${priceType === PriceType.INCLUSIVE ? 'bg-white shadow text-indigo-700' : 'text-slate-500 hover:bg-slate-200'}`}>Inclusive</button></div>
                        </div>
                        <div>
                            <label className="text-sm font-medium text-slate-600 mb-2 block">Supply Type</label>
                            <div className="flex bg-slate-100 p-1 rounded-lg"><button onClick={() => setTransactionType(TransactionType.INTRA_STATE)} className={`w-1/2 py-2 px-4 text-sm font-semibold rounded-md transition-colors duration-200 ${transactionType === TransactionType.INTRA_STATE ? 'bg-white shadow text-indigo-700' : 'text-slate-500 hover:bg-slate-200'}`}>Intra-State</button><button onClick={() => setTransactionType(TransactionType.INTER_STATE)} className={`w-1/2 py-2 px-4 text-sm font-semibold rounded-md transition-colors duration-200 ${transactionType === TransactionType.INTER_STATE ? 'bg-white shadow text-indigo-700' : 'text-slate-500 hover:bg-slate-200'}`}>Inter-State</button></div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold text-slate-700 border-b pb-2">Items Purchased</h3>
                        {items.map((item) => {
                            const qtyError = errors[`${item.id}-quantity`];
                            const priceError = errors[`${item.id}-price`];
                            return (
                                <div key={item.id} className="grid grid-cols-12 gap-2 items-start border-b border-slate-100 pb-4">
                                    <div className="col-span-12 md:col-span-3">
                                        <input type="text" value={item.description} onChange={(e) => handleItemChange(item.id, 'description', e.target.value)} placeholder="Item Description" className="w-full p-2 bg-slate-100 rounded-md border border-slate-200 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none" />
                                    </div>
                                    <div className="col-span-6 md:col-span-2">
                                        <input type="text" value={item.hsn} onChange={(e) => handleItemChange(item.id, 'hsn', e.target.value)} placeholder="HSN/SAC" className="w-full p-2 bg-slate-100 rounded-md border border-slate-200 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none" />
                                    </div>
                                    <div className="col-span-6 md:col-span-2">
                                        <input type="text" inputMode="decimal" value={isNaN(item.quantity) ? '' : item.quantity} onChange={(e) => handleItemChange(item.id, 'quantity', e.target.value)} placeholder="Qty" className={`w-full p-2 bg-slate-100 rounded-md border ${qtyError ? 'border-red-500' : 'border-slate-200'}`} />
                                    </div>
                                    <div className="col-span-6 md:col-span-2">
                                        <div className="relative"><span className="absolute inset-y-0 left-0 flex items-center pl-2 text-slate-500 text-sm">{currencySymbol}</span><input type="text" inputMode="decimal" value={isNaN(item.price) ? '' : item.price} onChange={(e) => handleItemChange(item.id, 'price', e.target.value)} placeholder="Price" className={`w-full pl-6 p-2 bg-slate-100 rounded-md border ${priceError ? 'border-red-500' : 'border-slate-200'}`}/></div>
                                    </div>
                                    <div className="col-span-6 md:col-span-2">
                                        <select value={item.gstRate} onChange={(e) => handleItemChange(item.id, 'gstRate', e.target.value)} className="w-full p-2 bg-slate-100 rounded-md border border-slate-200 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none">{GST_RATES.map(rate => <option key={rate} value={rate}>{rate}%</option>)}</select>
                                    </div>
                                    <div className="col-span-12 md:col-span-1 text-right self-center">
                                        {items.length > 1 && (<button onClick={() => handleRemoveItem(item.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-100 rounded-full transition" aria-label="Remove item"><TrashIcon /></button>)}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                    <div><button onClick={handleAddItem} className="w-full sm:w-auto px-4 py-2 text-sm font-semibold text-indigo-600 bg-indigo-100 hover:bg-indigo-200 rounded-lg transition-colors">+ Add Another Item</button></div>
                </div>
            </Card>

            <Card className="min-h-[240px]">
              <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-4 gap-4">
                  <div>
                      <h2 className="text-xl font-bold text-slate-700">Bill Summary</h2>
                  </div>
                  <button 
                      onClick={handleRecordPurchase}
                      disabled={!results || results.grandTotal <= 0 || !selectedVendorId || !billNumber}
                      className="px-5 py-2.5 text-sm font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors"
                  >
                      Save Purchase
                  </button>
              </div>
              <ResultDisplay results={results} currencySymbol={currencySymbol} transactionType={transactionType}/>
            </Card>
            
             {purchaseHistory.length > 0 && (
                <Card>
                    <h2 className="text-xl font-bold text-slate-700 mb-4">Recent Purchases</h2>
                     <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-slate-200">
                             <thead className="bg-slate-50">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Date</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Bill #</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Vendor</th>
                                    <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Amount</th>
                                    <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                                </tr>
                            </thead>
                             <tbody className="bg-white divide-y divide-slate-200">
                                {purchaseHistory.slice(0, 10).map(rec => (
                                    <tr key={rec.id} className="hover:bg-slate-50">
                                        <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-500">{new Date(rec.date).toLocaleDateString('en-IN')}</td>
                                        <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-indigo-600">{rec.billNumber}</td>
                                        <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-800">{rec.vendor.name}</td>
                                        <td className="px-4 py-4 whitespace-nowrap text-sm text-right font-semibold">{currencySymbol}{rec.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                        <td className="px-4 py-4 whitespace-nowrap text-sm text-center"><StatusBadge status={rec.status} /></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Card>
            )}
        </div>
    );
};

export default PurchaseManager;
