
import React, { useState, useMemo } from 'react';
import type { InvoiceRecord, PurchaseRecord, Product, ClientDetails, Vendor } from '../types';
import { InvoiceStatus, PurchaseStatus } from '../types';
import Card from './Card';

// @ts-ignore
const { jsPDF } = window.jspdf;

interface ReportsProps {
    invoiceHistory: InvoiceRecord[];
    purchaseHistory: PurchaseRecord[];
    products: Product[];
    clients: ClientDetails[];
    vendors: Vendor[];
    currencySymbol: string;
}

type ReportType = 'pnl' | 'salesByClient' | 'salesByItem' | 'purchaseByVendor' | 'purchaseByItem' | 'stockSummary';

const formatCurrency = (amount: number, symbol: string) => {
    return `${symbol}${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const Reports: React.FC<ReportsProps> = ({ invoiceHistory, purchaseHistory, products, clients, vendors, currencySymbol }) => {
    const [activeReport, setActiveReport] = useState<ReportType>('pnl');
    const [endDate, setEndDate] = useState(new Date());
    const [startDate, setStartDate] = useState(() => {
        const d = new Date();
        d.setDate(1);
        d.setHours(0, 0, 0, 0);
        return d;
    });

    const filterByDate = <T extends { date: string }>(records: T[]) => {
        return records.filter(rec => {
            const recDate = new Date(rec.date);
            const endOfDay = new Date(endDate);
            endOfDay.setHours(23, 59, 59, 999);
            return recDate >= startDate && recDate <= endOfDay;
        });
    };

    const filteredInvoices = useMemo(() => filterByDate(invoiceHistory), [invoiceHistory, startDate, endDate]);
    const filteredPurchases = useMemo(() => filterByDate(purchaseHistory), [purchaseHistory, startDate, endDate]);

    const reportData = useMemo(() => {
        const pnl = {
            revenue: filteredInvoices.filter(i => i.status === InvoiceStatus.PAID).reduce((sum, i) => sum + i.totalAmount, 0),
            expenses: filteredPurchases.reduce((sum, p) => sum + p.totalAmount, 0),
        };

        const salesByClient = filteredInvoices.reduce((acc, inv) => {
            const client = acc.get(inv.client.name) || { name: inv.client.name, total: 0, invoices: 0 };
            client.total += inv.totalAmount;
            client.invoices += 1;
            acc.set(inv.client.name, client);
            return acc;
        }, new Map<string, { name: string; total: number; invoices: number }>());

        const salesByItem = filteredInvoices.flatMap(i => i.items).reduce((acc, item) => {
            const existing = acc.get(item.description) || { name: item.description, quantity: 0, total: 0 };
            existing.quantity += item.quantity;
            existing.total += item.quantity * item.price; // This is taxable value
            acc.set(item.description, existing);
            return acc;
        }, new Map<string, { name: string; quantity: number; total: number }>());
        
        const purchaseByVendor = filteredPurchases.reduce((acc, p) => {
            const vendor = acc.get(p.vendor.name) || { name: p.vendor.name, total: 0, bills: 0 };
            vendor.total += p.totalAmount;
            vendor.bills += 1;
            acc.set(p.vendor.name, vendor);
            return acc;
        }, new Map<string, { name: string; total: number; bills: number }>());

        const purchaseByItem = filteredPurchases.flatMap(p => p.items).reduce((acc, item) => {
            const existing = acc.get(item.description) || { name: item.description, quantity: 0, total: 0 };
            existing.quantity += item.quantity;
            existing.total += item.quantity * item.price;
            acc.set(item.description, existing);
            return acc;
        }, new Map<string, { name: string; quantity: number; total: number }>());

        return { pnl, salesByClient, salesByItem, purchaseByVendor, purchaseByItem };
    }, [filteredInvoices, filteredPurchases]);

    const toInputDateString = (date: Date) => date.toISOString().split('T')[0];
    
    const handleExport = (format: 'csv' | 'pdf') => {
        const doc = new jsPDF();
        const title = `${activeReport.replace(/([A-Z])/g, ' $1')} Report`.toUpperCase();
        const dateRange = `From: ${startDate.toLocaleDateString('en-IN')} To: ${endDate.toLocaleDateString('en-IN')}`;
        
        let head: string[][] = [];
        let body: any[][] = [];
        let csvContent = "";
        
        switch(activeReport) {
            case 'pnl':
                head = [['Metric', 'Amount']];
                body = [
                    ['Total Revenue (Paid Invoices)', formatCurrency(reportData.pnl.revenue, currencySymbol)],
                    ['Total Expenses', formatCurrency(reportData.pnl.expenses, currencySymbol)],
                    ['Profit / Loss', formatCurrency(reportData.pnl.revenue - reportData.pnl.expenses, currencySymbol)]
                ];
                break;
            case 'salesByClient':
                head = [['Client Name', 'Invoices', 'Total Sales']];
                body = Array.from(reportData.salesByClient.values()).map(r => [r.name, r.invoices, formatCurrency(r.total, currencySymbol)]);
                break;
            case 'salesByItem':
                head = [['Item', 'Quantity Sold', 'Total Value']];
                body = Array.from(reportData.salesByItem.values()).map(r => [r.name, r.quantity, formatCurrency(r.total, currencySymbol)]);
                break;
            case 'purchaseByVendor':
                head = [['Vendor Name', 'Bills', 'Total Purchases']];
                body = Array.from(reportData.purchaseByVendor.values()).map(r => [r.name, r.bills, formatCurrency(r.total, currencySymbol)]);
                break;
            case 'purchaseByItem':
                head = [['Item', 'Quantity Purchased', 'Total Value']];
                body = Array.from(reportData.purchaseByItem.values()).map(r => [r.name, r.quantity, formatCurrency(r.total, currencySymbol)]);
                break;
            case 'stockSummary':
                head = [['Item Name', 'Current Stock', 'Stock Value', 'Status']];
                body = products.filter(p => p.trackStock).map(p => {
                    let status = "In Stock";
                    if (p.stock <= 0) status = "Out of Stock";
                    else if (p.stock <= p.lowStockThreshold) status = "Low Stock";
                    return [p.name, p.stock, formatCurrency(p.stock * p.price, currencySymbol), status];
                });
                break;
        }

        if (format === 'csv') {
            csvContent += head[0].join(',') + '\r\n';
            body.forEach(row => { csvContent += row.join(',') + '\r\n'; });
            const encodedUri = encodeURI("data:text/csv;charset=utf-8," + csvContent);
            const link = document.createElement("a");
            link.setAttribute("href", encodedUri);
            link.setAttribute("download", `${activeReport}_report.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } else { // PDF
            doc.setFontSize(18);
            doc.text(title, 14, 22);
            doc.setFontSize(11);
            doc.text(dateRange, 14, 30);
            doc.autoTable({ head, body, startY: 35, theme: 'grid' });
            doc.save(`${activeReport}_report.pdf`);
        }
    };


    const renderReport = () => {
        switch (activeReport) {
            case 'pnl':
                return (
                    <table className="min-w-full divide-y divide-slate-200">
                        <tbody className="bg-white divide-y divide-slate-200">
                            <tr>
                                <td className="px-6 py-4 font-medium">Total Revenue (Paid Invoices)</td>
                                <td className="px-6 py-4 text-right font-semibold text-green-600">{formatCurrency(reportData.pnl.revenue, currencySymbol)}</td>
                            </tr>
                            <tr>
                                <td className="px-6 py-4 font-medium">Total Expenses</td>
                                <td className="px-6 py-4 text-right font-semibold text-red-600">{formatCurrency(reportData.pnl.expenses, currencySymbol)}</td>
                            </tr>
                            <tr className="bg-slate-50">
                                <td className="px-6 py-4 font-bold text-lg">Profit / Loss</td>
                                <td className="px-6 py-4 text-right font-bold text-lg text-slate-800">{formatCurrency(reportData.pnl.revenue - reportData.pnl.expenses, currencySymbol)}</td>
                            </tr>
                        </tbody>
                    </table>
                );
            case 'salesByClient':
                return <ReportTable headers={['Client Name', 'Invoices', 'Total Sales']} data={Array.from(reportData.salesByClient.values()).map(r => [r.name, r.invoices, formatCurrency(r.total, currencySymbol)])} />;
            case 'salesByItem':
                 return <ReportTable headers={['Item', 'Quantity Sold', 'Total Value']} data={Array.from(reportData.salesByItem.values()).map(r => [r.name, r.quantity, formatCurrency(r.total, currencySymbol)])} />;
            case 'purchaseByVendor':
                return <ReportTable headers={['Vendor Name', 'Bills', 'Total Purchases']} data={Array.from(reportData.purchaseByVendor.values()).map(r => [r.name, r.bills, formatCurrency(r.total, currencySymbol)])} />;
            case 'purchaseByItem':
                 return <ReportTable headers={['Item', 'Quantity Purchased', 'Total Value']} data={Array.from(reportData.purchaseByItem.values()).map(r => [r.name, r.quantity, formatCurrency(r.total, currencySymbol)])} />;
            case 'stockSummary':
                 return <ReportTable headers={['Item Name', 'Current Stock', 'Stock Value', 'Status']} data={products.filter(p => p.trackStock).map(p => {
                    let status = "In Stock";
                    if (p.stock <= 0) status = "Out of Stock";
                    else if (p.stock <= p.lowStockThreshold) status = "Low Stock";
                    return [p.name, p.stock, formatCurrency(p.stock * p.price, currencySymbol), status];
                })} />;
            default:
                return <p>Select a report to view.</p>;
        }
    };
    
    const ReportTable: React.FC<{headers: string[], data: (string|number)[][]}> = ({headers, data}) => (
         <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                    <tr>{headers.map(h => <th key={h} className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">{h}</th>)}</tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-200">
                    {data.map((row, i) => <tr key={i}>{row.map((cell, j) => <td key={j} className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">{cell}</td>)}</tr>)}
                </tbody>
            </table>
        </div>
    );

    const reportOptions: { key: ReportType; label: string }[] = [
        { key: 'pnl', label: 'Profit & Loss' },
        { key: 'salesByClient', label: 'Sales by Client' },
        { key: 'salesByItem', label: 'Sales by Item' },
        { key: 'purchaseByVendor', label: 'Purchases by Vendor' },
        { key: 'purchaseByItem', label: 'Purchases by Item' },
        { key: 'stockSummary', label: 'Stock Summary' },
    ];

    return (
        <div className="space-y-6">
            {/* FIX: Removed Header component to use the main app header, fixing prop error. */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                <div className="lg:col-span-1">
                    <Card className="p-4">
                        <h3 className="font-semibold text-slate-700 mb-4 px-2">Select Report</h3>
                        <ul className="space-y-1">
                            {reportOptions.map(opt => (
                                <li key={opt.key}>
                                    <button 
                                        onClick={() => setActiveReport(opt.key)}
                                        className={`w-full text-left px-3 py-2 text-sm rounded-md font-medium transition-colors ${activeReport === opt.key ? 'bg-indigo-100 text-indigo-700' : 'text-slate-600 hover:bg-slate-100'}`}
                                    >
                                        {opt.label}
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </Card>
                </div>
                <div className="lg:col-span-3 space-y-6">
                    <Card>
                        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 p-4">
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
                            <div className="flex items-center gap-2">
                                <button onClick={() => handleExport('csv')} className="px-4 py-2 text-sm font-semibold text-indigo-600 bg-indigo-100 hover:bg-indigo-200 rounded-lg transition-colors">Export CSV</button>
                                <button onClick={() => handleExport('pdf')} className="px-4 py-2 text-sm font-semibold text-indigo-600 bg-indigo-100 hover:bg-indigo-200 rounded-lg transition-colors">Download PDF</button>
                            </div>
                        </div>
                    </Card>
                    <Card>
                       {renderReport()}
                    </Card>
                </div>
            </div>
        </div>
    );
};

export default Reports;
