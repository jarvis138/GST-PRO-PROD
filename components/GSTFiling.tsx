
import React, { useState, useMemo } from 'react';
import type { InvoiceRecord, PurchaseRecord } from '../types';
import { TransactionType, PriceType } from '../types';
import Card from './Card';

interface GSTFilingProps {
    invoiceHistory: InvoiceRecord[];
    purchaseHistory: PurchaseRecord[];
}

const formatCurrency = (amount: number, symbol: string = '₹') => {
    return `${symbol}${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const exportToCSV = (headers: string[], data: (string | number)[][], filename: string) => {
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += headers.join(',') + '\r\n';
    data.forEach(rowArray => {
        const row = rowArray.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',');
        csvContent += row + '\r\n';
    });
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${filename}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

const ReportTable: React.FC<{ headers: string[], data: (string | number)[][] }> = ({ headers, data }) => (
    <div className="overflow-x-auto">
        {data.length > 0 ? (
            <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                    <tr>{headers.map(h => <th key={h} className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">{h}</th>)}</tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-200">
                    {data.map((row, i) => <tr key={i}>{row.map((cell, j) => <td key={j} className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">{cell}</td>)}</tr>)}
                </tbody>
            </table>
        ) : (
            <div className="text-center py-8"><p className="text-slate-500">No data available for the selected period.</p></div>
        )}
    </div>
);


const GSTFiling: React.FC<GSTFilingProps> = ({ invoiceHistory, purchaseHistory }) => {
    const [month, setMonth] = useState(new Date().getMonth());
    const [year, setYear] = useState(new Date().getFullYear());

    const { startDate, endDate } = useMemo(() => {
        const start = new Date(year, month, 1);
        const end = new Date(year, month + 1, 0);
        end.setHours(23, 59, 59, 999);
        return { startDate: start, endDate: end };
    }, [month, year]);

    const filteredInvoices = useMemo(() => invoiceHistory.filter(rec => new Date(rec.date) >= startDate && new Date(rec.date) <= endDate), [invoiceHistory, startDate, endDate]);
    const filteredPurchases = useMemo(() => purchaseHistory.filter(rec => new Date(rec.date) >= startDate && new Date(rec.date) <= endDate), [purchaseHistory, startDate, endDate]);

    const gstr1Data = useMemo(() => {
        const b2bInvoices = filteredInvoices.filter(inv => inv.client.gstin);
        
        const b2cSummary = filteredInvoices
            .filter(inv => !inv.client.gstin)
            .flatMap(inv => inv.calculationResult.gstBreakdown)
            .reduce((acc, { rate, taxableAmount }) => {
                const current = acc.get(rate) || { taxable: 0 };
                current.taxable += taxableAmount;
                acc.set(rate, current);
                return acc;
            }, new Map<number, { taxable: number }>());

        const hsnSummary = filteredInvoices
            .flatMap(inv => inv.items.map(item => ({ item, parentInvoice: inv })))
            .reduce((acc, { item, parentInvoice }) => {
                const hsn = item.hsn || 'N/A';
                const { quantity, price, gstRate } = item;
                
                let taxableValue = (priceType: PriceType) => {
                    if (priceType === PriceType.EXCLUSIVE) return quantity * price;
                    return (quantity * price) / (1 + (gstRate / 100));
                };
                const tv = taxableValue(parentInvoice.priceType);
                const totalTax = tv * (gstRate / 100);

                const current = acc.get(hsn) || { description: item.description, quantity: 0, taxableValue: 0, totalTax: 0 };
                current.quantity += quantity;
                current.taxableValue += tv;
                current.totalTax += totalTax;
                acc.set(hsn, current);
                return acc;
            }, new Map<string, { description: string, quantity: number, taxableValue: number, totalTax: number }>());
            
        return { b2bInvoices, b2cSummary, hsnSummary };
    }, [filteredInvoices]);

    const gstr3bData = useMemo(() => {
        const sales = filteredInvoices.reduce((acc, inv) => {
            acc.taxableValue += inv.calculationResult.totalNetAmount;
            inv.calculationResult.gstBreakdown.forEach(bd => {
                if (inv.transactionType === TransactionType.INTER_STATE) acc.igst += bd.gstAmount;
                else { acc.cgst += bd.gstAmount / 2; acc.sgst += bd.gstAmount / 2; }
            });
            return acc;
        }, { taxableValue: 0, igst: 0, cgst: 0, sgst: 0 });

        const purchasesITC = filteredPurchases.reduce((acc, pur) => {
            pur.calculationResult.gstBreakdown.forEach(bd => {
                if (pur.transactionType === TransactionType.INTER_STATE) acc.igst += bd.gstAmount;
                else { acc.cgst += bd.gstAmount / 2; acc.sgst += bd.gstAmount / 2; }
            });
            return acc;
        }, { igst: 0, cgst: 0, sgst: 0 });

        return { sales, purchasesITC };
    }, [filteredInvoices, filteredPurchases]);

    const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);
    const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

    return (
        <div className="space-y-6">
            {/* FIX: Removed Header component to use the main app header, fixing prop error. */}

            <Card>
                <div className="flex flex-col sm:flex-row sm:items-center sm:gap-4 p-4 border-b border-slate-200">
                    <label htmlFor="month-select" className="font-semibold text-slate-700">Filing Period:</label>
                    <div className="flex items-center gap-2 mt-2 sm:mt-0">
                        <select id="month-select" value={month} onChange={e => setMonth(parseInt(e.target.value))} className="p-2 bg-white rounded-md border border-slate-300 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none">
                            {months.map((m, i) => <option key={i} value={i}>{m}</option>)}
                        </select>
                         <select id="year-select" value={year} onChange={e => setYear(parseInt(e.target.value))} className="p-2 bg-white rounded-md border border-slate-300 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none">
                            {years.map(y => <option key={y} value={y}>{y}</option>)}
                        </select>
                    </div>
                </div>
            </Card>

            <Card>
                <h2 className="text-xl font-bold text-slate-700 p-6">GSTR-3B Summary</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-slate-200 border border-slate-200">
                    <div className="bg-white p-6">
                        <h3 className="font-semibold text-slate-800 mb-4">3.1 Details of Outward Supplies (Sales)</h3>
                        <ReportTable headers={['Description', 'Taxable Value', 'IGST', 'CGST', 'SGST']} data={[
                            ['Outward taxable supplies', formatCurrency(gstr3bData.sales.taxableValue), formatCurrency(gstr3bData.sales.igst), formatCurrency(gstr3bData.sales.cgst), formatCurrency(gstr3bData.sales.sgst)]
                        ]}/>
                    </div>
                     <div className="bg-white p-6">
                        <h3 className="font-semibold text-slate-800 mb-4">4. Eligible ITC (Purchases)</h3>
                        <ReportTable headers={['Description', 'IGST', 'CGST', 'SGST']} data={[
                            ['All other ITC', formatCurrency(gstr3bData.purchasesITC.igst), formatCurrency(gstr3bData.purchasesITC.cgst), formatCurrency(gstr3bData.purchasesITC.sgst)]
                        ]}/>
                    </div>
                </div>
            </Card>
            
            <Card>
                <div className="flex justify-between items-center mb-4 p-6 border-b border-slate-200">
                    <h2 className="text-xl font-bold text-slate-700">GSTR-1: B2B Invoices</h2>
                    <button onClick={() => exportToCSV(['Invoice #', 'Date', 'Client GSTIN', 'Taxable Value', 'Total Tax'], gstr1Data.b2bInvoices.map(inv => [inv.invoiceNumber, new Date(inv.date).toLocaleDateString('en-IN'), inv.client.gstin, inv.calculationResult.totalNetAmount, inv.calculationResult.totalGstAmount]), `GSTR1_B2B_${year}_${month+1}`)} className="px-4 py-2 text-sm font-semibold text-indigo-600 bg-indigo-100 hover:bg-indigo-200 rounded-lg">Export CSV</button>
                </div>
                <ReportTable headers={['Invoice #', 'Date', 'Client Name', 'Client GSTIN', 'Taxable Value', 'Total Tax']} data={gstr1Data.b2bInvoices.map(inv => [inv.invoiceNumber, new Date(inv.date).toLocaleDateString('en-IN'), inv.client.name, inv.client.gstin, formatCurrency(inv.calculationResult.totalNetAmount), formatCurrency(inv.calculationResult.totalGstAmount)])}/>
            </Card>
            
             <Card>
                <div className="flex justify-between items-center mb-4 p-6 border-b border-slate-200">
                    <h2 className="text-xl font-bold text-slate-700">GSTR-1: B2C Summary</h2>
                    <button onClick={() => exportToCSV(['Rate', 'Taxable Value'], Array.from(gstr1Data.b2cSummary.entries()).map(([rate, data]) => [rate, data.taxable.toFixed(2)]), `GSTR1_B2C_${year}_${month+1}`)} className="px-4 py-2 text-sm font-semibold text-indigo-600 bg-indigo-100 hover:bg-indigo-200 rounded-lg">Export CSV</button>
                </div>
                <ReportTable headers={['GST Rate (%)', 'Total Taxable Value']} data={Array.from(gstr1Data.b2cSummary.entries()).map(([rate, data]) => [`${rate}%`, formatCurrency(data.taxable)])}/>
            </Card>

             <Card>
                <div className="flex justify-between items-center mb-4 p-6 border-b border-slate-200">
                    <h2 className="text-xl font-bold text-slate-700">GSTR-1: HSN/SAC Summary</h2>
                    {/* FIX: Corrected a bug where 'hsn' was used without being defined in the scope of the map function for CSV export. Changed from .values() to .entries() to get both HSN code and data. */}
                    <button onClick={() => exportToCSV(['HSN/SAC', 'Description', 'Quantity', 'Taxable Value', 'Total Tax'], Array.from(gstr1Data.hsnSummary.entries()).map(([hsn, h]) => [hsn, h.description, h.quantity, h.taxableValue.toFixed(2), h.totalTax.toFixed(2)]), `GSTR1_HSN_${year}_${month+1}`)} className="px-4 py-2 text-sm font-semibold text-indigo-600 bg-indigo-100 hover:bg-indigo-200 rounded-lg">Export CSV</button>
                </div>
                <ReportTable headers={['HSN/SAC', 'Description', 'Total Quantity', 'Total Taxable Value', 'Total Tax']} data={Array.from(gstr1Data.hsnSummary.entries()).map(([hsn, data]) => [hsn, data.description, data.quantity, formatCurrency(data.taxableValue), formatCurrency(data.totalTax)])}/>
            </Card>
        </div>
    );
};

export default GSTFiling;
