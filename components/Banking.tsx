
import React, { useState, useMemo } from 'react';
import type { BankTransaction, InvoiceRecord, PurchaseRecord, Vendor } from '../types';
import { TransactionStatus, InvoiceStatus, PurchaseStatus, TransactionType, PriceType } from '../types';
import Card from './Card';

// @ts-ignore
const XLSX = window.XLSX;

interface BankingProps {
    bankTransactions: BankTransaction[];
    setBankTransactions: React.Dispatch<React.SetStateAction<BankTransaction[]>>;
    invoiceHistory: InvoiceRecord[];
    setInvoiceHistory: React.Dispatch<React.SetStateAction<InvoiceRecord[]>>;
    purchaseHistory: PurchaseRecord[];
    setPurchaseHistory: React.Dispatch<React.SetStateAction<PurchaseRecord[]>>;
    currencySymbol: string;
    vendors: Vendor[];
}

const formatCurrency = (amount: number, symbol: string) => {
  return `${symbol}${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const Banking: React.FC<BankingProps> = ({
    bankTransactions, setBankTransactions,
    invoiceHistory, setInvoiceHistory,
    purchaseHistory, setPurchaseHistory,
    currencySymbol, vendors
}) => {

    const [selectedTx, setSelectedTx] = useState<BankTransaction | null>(null);
    const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
    const [expenseDetails, setExpenseDetails] = useState({ description: '', vendorId: '' });

    const handleImportStatement = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        const processData = (data: any[]) => {
            try {
                // FIX: Add explicit return type `BankTransaction | null` to the map callback to ensure correct type inference.
                // This resolves an issue where properties were inferred too broadly (e.g., 'type' as string) or too narrowly (e.g., 'id' as a template literal),
                // which caused mismatches with the `BankTransaction` interface and invalidated the type guard in the subsequent `.filter()`.
                // Also, ensure `description` is a string.
                const newTransactions: BankTransaction[] = data.map((row): BankTransaction | null => {
                    const date = row.Date || row.date;
                    const description = row.Description || row.description || row.Narration || row.narration;
                    const credit = parseFloat(row.Credit || row.credit || '0');
                    const debit = parseFloat(row.Debit || row.debit || '0');
                    
                    if (!date || !description || (credit === 0 && debit === 0)) return null;
                    
                    return {
                        id: crypto.randomUUID(),
                        date: new Date(date).toISOString(),
                        description: String(description),
                        amount: credit > 0 ? credit : debit,
                        type: credit > 0 ? 'CREDIT' : 'DEBIT',
                        status: TransactionStatus.UNRECONCILED,
                    };
                }).filter((tx): tx is BankTransaction => tx !== null);

                if (window.confirm(`Found ${newTransactions.length} transactions. Do you want to add them?`)) {
                    setBankTransactions(prev => [...prev, ...newTransactions]);
                }
            } catch (error) {
                alert('Failed to parse the file. Please ensure it has columns like "Date", "Description", "Credit", and "Debit".');
            }
        };

        reader.onload = (e) => {
            const data = e.target?.result;
            const workbook = XLSX.read(data, { type: 'array' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const json = XLSX.utils.sheet_to_json(worksheet);
            processData(json);
        };
        reader.readAsArrayBuffer(file);
        event.target.value = ''; // Reset file input
    };
    
    const unreconciledTransactions = useMemo(() => bankTransactions.filter(tx => tx.status === TransactionStatus.UNRECONCILED).sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime()), [bankTransactions]);

    const potentialMatches = useMemo(() => {
        if (!selectedTx) return { invoices: [], purchases: [] };

        const tolerance = 0.01; // For floating point comparisons

        if (selectedTx.type === 'CREDIT') {
            const matchingInvoices = invoiceHistory.filter(inv => 
                inv.status === InvoiceStatus.UNPAID && Math.abs(inv.totalAmount - selectedTx.amount) < tolerance
            );
            return { invoices: matchingInvoices, purchases: [] };
        } else { // DEBIT
            const matchingPurchases = purchaseHistory.filter(p => 
                p.status === PurchaseStatus.UNPAID && Math.abs(p.totalAmount - selectedTx.amount) < tolerance
            );
            return { invoices: [], purchases: matchingPurchases };
        }
    }, [selectedTx, invoiceHistory, purchaseHistory]);
    
    const handleReconcile = (txId: string, recordId: string, type: 'invoice' | 'purchase') => {
        setBankTransactions(prev => prev.map(tx => tx.id === txId ? {...tx, status: TransactionStatus.RECONCILED} : tx));
        
        if (type === 'invoice') {
            setInvoiceHistory(prev => prev.map(inv => inv.id === recordId ? {...inv, status: InvoiceStatus.PAID, paymentDate: new Date().toISOString(), reconciliationStatus: TransactionStatus.RECONCILED, reconciledDate: new Date().toISOString() } : inv));
        } else {
            setPurchaseHistory(prev => prev.map(p => p.id === recordId ? {...p, status: PurchaseStatus.PAID, reconciliationStatus: TransactionStatus.RECONCILED, reconciledDate: new Date().toISOString()} : p));
        }
        
        setSelectedTx(null);
    };

    const handleCreateExpense = () => {
        if (!selectedTx || !expenseDetails.description || !expenseDetails.vendorId) return;

        const vendor = vendors.find(v => v.id === expenseDetails.vendorId);
        if (!vendor) return;

        const newPurchase: PurchaseRecord = {
            id: crypto.randomUUID(),
            billNumber: `EXP-${new Date().toISOString().slice(0,10)}`,
            vendor,
            date: selectedTx.date,
            items: [{
                id: crypto.randomUUID(),
                description: expenseDetails.description,
                hsn: 'N/A',
                quantity: 1,
                price: selectedTx.amount,
                gstRate: 0,
            }],
            totalAmount: selectedTx.amount,
            priceType: PriceType.EXCLUSIVE,
            transactionType: TransactionType.INTRA_STATE, // Assumption
            calculationResult: {
                totalNetAmount: selectedTx.amount,
                totalGstAmount: 0,
                grandTotal: selectedTx.amount,
                gstBreakdown: []
            },
            status: PurchaseStatus.PAID,
            reconciliationStatus: TransactionStatus.RECONCILED,
            reconciledDate: new Date().toISOString()
        };
        
        setPurchaseHistory(prev => [newPurchase, ...prev]);
        setBankTransactions(prev => prev.map(tx => tx.id === selectedTx.id ? {...tx, status: TransactionStatus.RECONCILED} : tx));
        
        setIsExpenseModalOpen(false);
        setSelectedTx(null);
        setExpenseDetails({ description: '', vendorId: '' });
    };

    return (
        <div className="space-y-6">
            {/* FIX: Replaced the Header component with a div for action buttons to conform to the app layout and fix prop errors. */}
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                 <div></div>
                 <div>
                    <input type="file" id="statement-upload" className="hidden" accept=".csv, .xlsx" onChange={handleImportStatement} />
                    <label htmlFor="statement-upload" className="cursor-pointer px-4 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700">
                        + Import Statement
                    </label>
                 </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-5">
                    <Card>
                        <h2 className="text-lg font-bold text-slate-700 mb-4">Unreconciled Transactions ({unreconciledTransactions.length})</h2>
                        <div className="max-h-[60vh] overflow-y-auto">
                            <ul className="divide-y divide-slate-100">
                                {unreconciledTransactions.map(tx => (
                                    <li key={tx.id} onClick={() => setSelectedTx(tx)} className={`p-3 rounded-lg cursor-pointer ${selectedTx?.id === tx.id ? 'bg-indigo-100' : 'hover:bg-slate-50'}`}>
                                        <div className="flex justify-between items-center">
                                            <div className="max-w-xs truncate">
                                                <p className="font-medium text-sm text-slate-800">{tx.description}</p>
                                                <p className="text-xs text-slate-500">{new Date(tx.date).toLocaleDateString('en-IN')}</p>
                                            </div>
                                            <p className={`text-sm font-semibold ${tx.type === 'CREDIT' ? 'text-green-600' : 'text-red-600'}`}>
                                                {formatCurrency(tx.amount, currencySymbol)}
                                            </p>
                                        </div>
                                    </li>
                                ))}
                                {unreconciledTransactions.length === 0 && (
                                    <li className="p-3 text-center text-slate-500 text-sm">No unreconciled transactions.</li>
                                )}
                            </ul>
                        </div>
                    </Card>
                </div>
                <div className="lg:col-span-7">
                    <Card className="min-h-[68vh]">
                        {selectedTx ? (
                            <div>
                                <h2 className="text-lg font-bold text-slate-700 mb-2">Matching Transactions for:</h2>
                                <div className="p-4 bg-slate-100 rounded-lg mb-6">
                                    <div className="flex justify-between items-center">
                                        <p className="font-semibold text-indigo-700">{selectedTx.description}</p>
                                        <p className={`font-bold text-xl ${selectedTx.type === 'CREDIT' ? 'text-green-700' : 'text-red-700'}`}>{formatCurrency(selectedTx.amount, currencySymbol)}</p>
                                    </div>
                                </div>
                                
                                {potentialMatches.invoices.length > 0 && (
                                    <div>
                                        <h3 className="font-semibold text-slate-600 mb-2">Suggested Invoices</h3>
                                        <ul className="divide-y divide-slate-200 border rounded-lg">
                                            {potentialMatches.invoices.map(inv => (
                                                <li key={inv.id} className="p-3 flex justify-between items-center">
                                                    <div>
                                                        <p className="font-medium text-slate-800">{inv.client.name} - {inv.invoiceNumber}</p>
                                                        <p className="text-sm text-slate-500">Dated: {new Date(inv.date).toLocaleDateString('en-IN')}</p>
                                                    </div>
                                                    <button onClick={() => handleReconcile(selectedTx.id, inv.id, 'invoice')} className="px-3 py-1 text-sm font-semibold text-white bg-green-600 hover:bg-green-700 rounded-lg">Reconcile</button>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                                {potentialMatches.purchases.length > 0 && (
                                    <div>
                                        <h3 className="font-semibold text-slate-600 mb-2">Suggested Purchases</h3>
                                        <ul className="divide-y divide-slate-200 border rounded-lg">
                                            {potentialMatches.purchases.map(p => (
                                                <li key={p.id} className="p-3 flex justify-between items-center">
                                                    <div>
                                                        <p className="font-medium text-slate-800">{p.vendor.name} - {p.billNumber}</p>
                                                        <p className="text-sm text-slate-500">Dated: {new Date(p.date).toLocaleDateString('en-IN')}</p>
                                                    </div>
                                                    <button onClick={() => handleReconcile(selectedTx.id, p.id, 'purchase')} className="px-3 py-1 text-sm font-semibold text-white bg-green-600 hover:bg-green-700 rounded-lg">Reconcile</button>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}

                                {potentialMatches.invoices.length === 0 && potentialMatches.purchases.length === 0 && (
                                    <div className="text-center py-8">
                                        <p className="text-slate-500 mb-4">No matching transactions found.</p>
                                        { selectedTx.type === 'DEBIT' &&
                                            <button onClick={() => setIsExpenseModalOpen(true)} className="px-4 py-2 text-sm font-semibold text-indigo-600 bg-indigo-100 hover:bg-indigo-200 rounded-lg">
                                                Create Expense Manually
                                            </button>
                                        }
                                    </div>
                                )}

                            </div>
                        ) : (
                            <div className="flex h-full items-center justify-center">
                                <p className="text-slate-500">Select a transaction to begin reconciliation.</p>
                            </div>
                        )}
                    </Card>
                </div>
            </div>

             {isExpenseModalOpen && selectedTx && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-md m-4">
                        <h2 className="text-2xl font-bold text-slate-800 mb-6">Create Expense</h2>
                        <div className="space-y-4">
                            <div>
                                <label className="text-sm font-medium text-slate-600 mb-1 block">Description*</label>
                                <input type="text" value={expenseDetails.description} onChange={e => setExpenseDetails(p => ({...p, description: e.target.value}))} placeholder="e.g., Bank Charges, Office Supplies" className="w-full p-2 bg-slate-50 rounded-md border"/>
                            </div>
                            <div>
                                <label className="text-sm font-medium text-slate-600 mb-1 block">Vendor*</label>
                                 <select value={expenseDetails.vendorId} onChange={e => setExpenseDetails(p => ({...p, vendorId: e.target.value}))} className="w-full p-2 bg-slate-50 rounded-md border">
                                    <option value="">-- Select a vendor --</option>
                                    {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                                </select>
                                <p className="text-xs text-slate-400 mt-1">Select a vendor or add one in the Vendors section if needed.</p>
                            </div>
                        </div>
                        <div className="flex justify-end gap-4 mt-8">
                            <button onClick={() => setIsExpenseModalOpen(false)} className="px-4 py-2 text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg">Cancel</button>
                            <button onClick={handleCreateExpense} className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700">Create & Reconcile</button>
                        </div>
                    </div>
                 </div>
            )}

        </div>
    );
};

export default Banking;
