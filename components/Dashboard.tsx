
import React, { useState, useMemo } from 'react';
import type { InvoiceRecord, Product, PurchaseRecord } from '../types';
import { TransactionType, InvoiceStatus, PurchaseStatus } from '../types';
import Card from './Card';
import Header from './Header';

interface DashboardProps {
  invoiceHistory: InvoiceRecord[];
  purchaseHistory: PurchaseRecord[];
  products: Product[];
  currencySymbol: string;
}

const formatCurrency = (amount: number, symbol: string) => {
  return `${symbol}${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const StatCard: React.FC<{ title: string; value: string; description?: string, progress?: number, progressColor?: string }> = ({ title, value, description, progress, progressColor = 'bg-green-500' }) => (
    <div className="bg-white p-6 rounded-xl shadow border border-slate-200">
        <div className="flex justify-between items-start">
            <h3 className="text-base font-medium text-slate-600 truncate">{title}</h3>
        </div>
        <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900">{value}</p>
        <p className="text-sm text-slate-500 mt-1 truncate">{description}</p>
        {progress !== undefined && (
            <div className="w-full bg-slate-200 rounded-full h-1.5 mt-4">
                <div className={`${progressColor} h-1.5 rounded-full`} style={{ width: `${progress}%` }}></div>
            </div>
        )}
    </div>
);


const Dashboard: React.FC<DashboardProps> = ({ invoiceHistory, purchaseHistory, products, currencySymbol }) => {
    const [endDate, setEndDate] = useState(new Date());
    const [startDate, setStartDate] = useState(() => {
        const d = new Date();
        d.setDate(1); // First day of the current month
        d.setHours(0,0,0,0);
        return d;
    });

    // FIX: Made filterByDate generic to preserve the full type of records being filtered, resolving subsequent type errors.
    const filterByDate = <T extends { date: string }>(records: T[]) => {
         return records.filter(rec => {
            const recDate = new Date(rec.date);
            const endOfDay = new Date(endDate);
            endOfDay.setHours(23, 59, 59, 999);
            return recDate >= startDate && recDate <= endOfDay;
        });
    }

    const filteredInvoices = useMemo(() => filterByDate(invoiceHistory), [invoiceHistory, startDate, endDate]);
    const filteredPurchases = useMemo(() => filterByDate(purchaseHistory), [purchaseHistory, startDate, endDate]);
    
    const financialReport = useMemo(() => {
        const sales = filteredInvoices.reduce((acc, invoice) => {
            acc.totalInvoiced += invoice.totalAmount;
            if(invoice.status === InvoiceStatus.PAID) acc.totalCollected += invoice.totalAmount;
            else acc.totalOutstanding += invoice.totalAmount;
            acc.totalTax += invoice.calculationResult.totalGstAmount;
            invoice.calculationResult.gstBreakdown.forEach(breakdown => {
                const isIntra = invoice.transactionType === TransactionType.INTRA_STATE;
                const cgst = isIntra ? breakdown.gstAmount / 2 : 0;
                const sgst = isIntra ? breakdown.gstAmount / 2 : 0;
                const igst = !isIntra ? breakdown.gstAmount : 0;
                const current = acc.gstRateSummary.get(breakdown.rate) || { taxable: 0, cgst: 0, sgst: 0, igst: 0 };
                current.taxable += breakdown.taxableAmount;
                current.cgst += cgst;
                current.sgst += sgst;
                current.igst += igst;
                acc.gstRateSummary.set(breakdown.rate, current);
            });
            return acc;
        }, {
            totalInvoiced: 0, totalCollected: 0, totalOutstanding: 0, totalTax: 0,
            gstRateSummary: new Map<number, { taxable: number; cgst: number; sgst: number; igst: number }>(),
        });

        const purchases = filteredPurchases.reduce((acc, purchase) => {
            acc.totalPayables += purchase.totalAmount;
            acc.totalITCAvailable += purchase.calculationResult.totalGstAmount;
            return acc;
        }, { totalPayables: 0, totalITCAvailable: 0 });

        const totals = {
            totalCGST: Array.from(sales.gstRateSummary.values()).reduce((sum, item) => sum + item.cgst, 0),
            totalSGST: Array.from(sales.gstRateSummary.values()).reduce((sum, item) => sum + item.sgst, 0),
            totalIGST: Array.from(sales.gstRateSummary.values()).reduce((sum, item) => sum + item.igst, 0),
        }

        return { ...sales, ...purchases, ...totals };
    }, [filteredInvoices, filteredPurchases]);

    const inventoryReport = useMemo(() => {
        const trackedProducts = products.filter(p => p.trackStock);
        return {
            lowStockItems: trackedProducts.filter(p => p.stock > 0 && p.stock <= p.lowStockThreshold).length,
            outOfStockItems: trackedProducts.filter(p => p.stock <= 0).length,
            totalStockValue: trackedProducts.reduce((sum, p) => sum + (p.stock * p.price), 0),
        }
    }, [products]);


    const handleExportCSV = () => {
        let csvContent = "data:text/csv;charset=utf-8,";
        csvContent += "Rate (%),Taxable Value,CGST,SGST,IGST,Total Tax\r\n";

        Array.from(financialReport.gstRateSummary.entries())
            .sort((a, b) => a[0] - b[0])
            .forEach(([rate, data]) => {
                const totalTax = data.cgst + data.sgst + data.igst;
                const row = [rate, data.taxable.toFixed(2), data.cgst.toFixed(2), data.sgst.toFixed(2), data.igst.toFixed(2), totalTax.toFixed(2)].join(",");
                csvContent += row + "\r\n";
            });
        
        const totalTaxable = Array.from(financialReport.gstRateSummary.values()).reduce((sum, item) => sum + item.taxable, 0);
        const totalRow = ["Total", totalTaxable.toFixed(2), financialReport.totalCGST.toFixed(2), financialReport.totalSGST.toFixed(2), financialReport.totalIGST.toFixed(2), financialReport.totalTax.toFixed(2)].join(",");
        csvContent += totalRow + "\r\n";

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `gst_summary_${startDate.toISOString().split('T')[0]}_to_${endDate.toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const toInputDateString = (date: Date) => {
        return date.toISOString().split('T')[0];
    }
    
    return (
        <div className="space-y-6">
            <Header title="Dashboard">
                 <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <label htmlFor="startDate" className="text-sm font-medium text-slate-600">From:</label>
                        <input type="date" id="startDate" value={toInputDateString(startDate)} onChange={e => setStartDate(new Date(e.target.value))} className="p-2 bg-white rounded-md border border-slate-300 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none"/>
                    </div>
                    <div className="flex items-center gap-2">
                         <label htmlFor="endDate" className="text-sm font-medium text-slate-600">To:</label>
                        <input type="date" id="endDate" value={toInputDateString(endDate)} onChange={e => setEndDate(new Date(e.target.value))} className="p-2 bg-white rounded-md border border-slate-300 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none"/>
                    </div>
                </div>
            </Header>

            <h3 className="text-lg font-semibold text-slate-600 tracking-wide">Financial Snapshot</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard 
                    title="Total Receivables" 
                    value={formatCurrency(financialReport.totalOutstanding, currencySymbol)} 
                    description={`${filteredInvoices.filter(i => i.status === InvoiceStatus.UNPAID).length} unpaid invoices`}
                    progress={(financialReport.totalOutstanding / (financialReport.totalInvoiced || 1)) * 100}
                    progressColor="bg-orange-500"
                />
                 <StatCard 
                    title="Total Collected" 
                    value={formatCurrency(financialReport.totalCollected, currencySymbol)} 
                    description={`Total invoiced: ${formatCurrency(financialReport.totalInvoiced, currencySymbol)}`}
                    progress={(financialReport.totalCollected / (financialReport.totalInvoiced || 1)) * 100}
                    progressColor="bg-green-500"
                />
                 <StatCard 
                    title="Total Payables" 
                    value={formatCurrency(financialReport.totalPayables, currencySymbol)} 
                    description={`${filteredPurchases.length} bills to be paid`}
                     progressColor="bg-red-500"
                />
                 <StatCard 
                    title="Input Tax Credit (ITC)" 
                    value={formatCurrency(financialReport.totalITCAvailable, currencySymbol)} 
                    description="Available GST credit"
                     progressColor="bg-blue-500"
                />
            </div>
            
            <h3 className="text-lg font-semibold text-slate-600 tracking-wide">Inventory Snapshot</h3>
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <StatCard title="Low Stock Items" value={String(inventoryReport.lowStockItems)} description="Needs reordering" />
                <StatCard title="Out of Stock Items" value={String(inventoryReport.outOfStockItems)} description="Currently unavailable" />
                <StatCard title="Total Stock Value" value={formatCurrency(inventoryReport.totalStockValue, currencySymbol)} description="Value of goods on hand" />
            </div>

            <Card>
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-slate-700">GST Summary for Filing (Sales)</h2>
                    <button 
                        onClick={handleExportCSV}
                        disabled={filteredInvoices.length === 0}
                        className="px-4 py-2 text-sm font-semibold text-indigo-600 bg-indigo-100 hover:bg-indigo-200 rounded-lg transition-colors disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed"
                    >
                        Export to CSV
                    </button>
                </div>
                {filteredInvoices.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-slate-200">
                            <thead className="bg-slate-50">
                                <tr>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Rate</th>
                                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Taxable Value</th>
                                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">CGST</th>
                                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">SGST</th>
                                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">IGST</th>
                                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Total Tax</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-slate-200">
                                {Array.from(financialReport.gstRateSummary.entries()).sort((a,b) => a[0] - b[0]).map(([rate, data]) => (
                                    <tr key={rate}>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">{rate}%</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 text-right">{formatCurrency(data.taxable, currencySymbol)}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 text-right">{formatCurrency(data.cgst, currencySymbol)}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 text-right">{formatCurrency(data.sgst, currencySymbol)}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 text-right">{formatCurrency(data.igst, currencySymbol)}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700 font-semibold text-right">{formatCurrency(data.cgst + data.sgst + data.igst, currencySymbol)}</td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot className="bg-slate-100">
                                <tr>
                                    <th scope="row" className="px-6 py-3 text-left text-sm font-bold text-slate-700">Total</th>
                                    <td className="px-6 py-3 text-right text-sm font-bold text-slate-700">{formatCurrency(Array.from(financialReport.gstRateSummary.values()).reduce((sum, item) => sum + item.taxable, 0), currencySymbol)}</td>
                                    <td className="px-6 py-3 text-right text-sm font-bold text-slate-700">{formatCurrency(financialReport.totalCGST, currencySymbol)}</td>
                                    <td className="px-6 py-3 text-right text-sm font-bold text-slate-700">{formatCurrency(financialReport.totalSGST, currencySymbol)}</td>
                                    <td className="px-6 py-3 text-right text-sm font-bold text-slate-700">{formatCurrency(financialReport.totalIGST, currencySymbol)}</td>
                                    <td className="px-6 py-3 text-right text-sm font-bold text-slate-700">{formatCurrency(financialReport.totalTax, currencySymbol)}</td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                ) : (
                    <div className="text-center py-12">
                        <p className="text-slate-500">No invoice data found for the selected period.</p>
                        <p className="text-sm text-slate-400 mt-1">Try adjusting the dates or generate a new invoice.</p>
                    </div>
                )}
            </Card>
        </div>
    );
};

export default Dashboard;
