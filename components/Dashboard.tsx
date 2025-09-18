
import React, { useState, useMemo, useEffect, useRef } from 'react';
import type { InvoiceRecord, Product, PurchaseRecord, View } from '../types';
import { TransactionType, InvoiceStatus, PurchaseStatus } from '../types';
import Card from './Card';
import Header from './Header';

// @ts-ignore
const Chart = window.Chart;

interface DashboardProps {
  invoiceHistory: InvoiceRecord[];
  purchaseHistory: PurchaseRecord[];
  products: Product[];
  currencySymbol: string;
  setActiveView: (view: View) => void;
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


const Dashboard: React.FC<DashboardProps> = ({ invoiceHistory, purchaseHistory, products, currencySymbol, setActiveView }) => {
    const [endDate, setEndDate] = useState(new Date());
    const [startDate, setStartDate] = useState(() => {
        const d = new Date();
        d.setDate(1); // First day of the current month
        d.setHours(0,0,0,0);
        return d;
    });

    const incomeExpenseChartRef = useRef<HTMLCanvasElement>(null);
    const salesTrendChartRef = useRef<HTMLCanvasElement>(null);
    const incomeExpenseChartInstance = useRef<any>(null);
    const salesTrendChartInstance = useRef<any>(null);

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
            acc.totalInvoiced += invoice.calculationResult.totalNetAmount; // Use net amount for revenue
            if(invoice.status === InvoiceStatus.PAID) acc.totalCollected += invoice.totalAmount;
            else acc.totalOutstanding += invoice.totalAmount;
            acc.totalTax += invoice.calculationResult.totalGstAmount;
            return acc;
        }, { totalInvoiced: 0, totalCollected: 0, totalOutstanding: 0, totalTax: 0 });

        const purchases = filteredPurchases.reduce((acc, purchase) => {
            acc.totalPayables += purchase.totalAmount;
            acc.totalITCAvailable += purchase.calculationResult.totalGstAmount;
            acc.totalExpenses += purchase.calculationResult.totalNetAmount; // Use net amount for expenses
            return acc;
        }, { totalPayables: 0, totalITCAvailable: 0, totalExpenses: 0 });

        return { ...sales, ...purchases };
    }, [filteredInvoices, filteredPurchases]);

    const inventoryReport = useMemo(() => {
        const trackedProducts = products.filter(p => p.trackStock);
        return {
            lowStockItems: trackedProducts.filter(p => p.stock > 0 && p.stock <= p.lowStockThreshold).length,
            outOfStockItems: trackedProducts.filter(p => p.stock <= 0).length,
            totalStockValue: trackedProducts.reduce((sum, p) => sum + (p.stock * p.price), 0),
        }
    }, [products]);
    
    // Effect for charts
    useEffect(() => {
        Chart.defaults.font.family = 'sans-serif';
        Chart.defaults.plugins.legend.position = 'bottom';

        // Income vs Expense Chart
        if (incomeExpenseChartRef.current) {
            if (incomeExpenseChartInstance.current) {
                incomeExpenseChartInstance.current.destroy();
            }
            const ctx = incomeExpenseChartRef.current.getContext('2d');
            if (ctx) {
                incomeExpenseChartInstance.current = new Chart(ctx, {
                    type: 'bar',
                    data: {
                        labels: ['Financials'],
                        datasets: [
                            {
                                label: 'Total Income (Taxable)',
                                data: [financialReport.totalInvoiced],
                                backgroundColor: 'rgba(79, 70, 229, 0.7)',
                                borderColor: 'rgba(79, 70, 229, 1)',
                                borderWidth: 1
                            },
                            {
                                label: 'Total Expenses (Taxable)',
                                data: [financialReport.totalExpenses],
                                backgroundColor: 'rgba(239, 68, 68, 0.7)',
                                borderColor: 'rgba(239, 68, 68, 1)',
                                borderWidth: 1
                            }
                        ]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        scales: { y: { beginAtZero: true, ticks: { callback: value => formatCurrency(Number(value), currencySymbol) } } }
                    }
                });
            }
        }

        // Sales Trend Chart
        if (salesTrendChartRef.current) {
            if (salesTrendChartInstance.current) {
                salesTrendChartInstance.current.destroy();
            }

            const salesByMonth = new Map<string, number>();
            const sixMonthsAgo = new Date();
            sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
            sixMonthsAgo.setDate(1);
            
            for (let i = 0; i < 6; i++) {
                const d = new Date(sixMonthsAgo);
                d.setMonth(d.getMonth() + i);
                const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
                salesByMonth.set(monthKey, 0);
            }

            invoiceHistory.forEach(inv => {
                const invDate = new Date(inv.date);
                if (invDate >= sixMonthsAgo) {
                    const monthKey = `${invDate.getFullYear()}-${String(invDate.getMonth() + 1).padStart(2, '0')}`;
                    const currentSales = salesByMonth.get(monthKey) || 0;
                    salesByMonth.set(monthKey, currentSales + inv.calculationResult.totalNetAmount);
                }
            });

            const sortedMonths = Array.from(salesByMonth.keys()).sort();
            const chartLabels = sortedMonths.map(key => new Date(key + '-02').toLocaleString('default', { month: 'short', year: '2-digit' }));
            const chartData = sortedMonths.map(key => salesByMonth.get(key));

            const ctx = salesTrendChartRef.current.getContext('2d');
            if (ctx) {
                salesTrendChartInstance.current = new Chart(ctx, {
                    type: 'line',
                    data: {
                        labels: chartLabels,
                        datasets: [{
                            label: 'Monthly Sales (Taxable)',
                            data: chartData,
                            fill: true,
                            backgroundColor: 'rgba(79, 70, 229, 0.1)',
                            borderColor: 'rgba(79, 70, 229, 1)',
                            tension: 0.3
                        }]
                    },
                     options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        scales: { y: { beginAtZero: true, ticks: { callback: value => formatCurrency(Number(value), currencySymbol) } } }
                    }
                });
            }
        }

        return () => {
            if (incomeExpenseChartInstance.current) incomeExpenseChartInstance.current.destroy();
            if (salesTrendChartInstance.current) salesTrendChartInstance.current.destroy();
        }
    }, [financialReport, currencySymbol, invoiceHistory]); // Re-render charts when data changes


    const toInputDateString = (date: Date) => {
        return date.toISOString().split('T')[0];
    }
    
    return (
        <div className="space-y-8">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                 <div className="flex flex-wrap items-center gap-4">
                    <div className="flex items-center gap-2">
                        <label htmlFor="startDate" className="text-sm font-medium text-slate-600">From:</label>
                        <input type="date" id="startDate" value={toInputDateString(startDate)} onChange={e => setStartDate(new Date(e.target.value))} className="p-2 bg-white rounded-md border border-slate-300 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none"/>
                    </div>
                    <div className="flex items-center gap-2">
                         <label htmlFor="endDate" className="text-sm font-medium text-slate-600">To:</label>
                        <input type="date" id="endDate" value={toInputDateString(endDate)} onChange={e => setEndDate(new Date(e.target.value))} className="p-2 bg-white rounded-md border border-slate-300 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none"/>
                    </div>
                </div>
            </div>

            <div>
                <h3 className="text-lg font-semibold text-slate-600 tracking-wide mb-4">Quick Actions</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <button onClick={() => setActiveView('sales')} className="p-4 bg-indigo-600 text-white rounded-lg shadow hover:bg-indigo-700 text-center font-semibold transition-all">
                        New Invoice
                    </button>
                    <button onClick={() => setActiveView('purchases')} className="p-4 bg-rose-600 text-white rounded-lg shadow hover:bg-rose-700 text-center font-semibold transition-all">
                        Record Expense
                    </button>
                    <button onClick={() => setActiveView('clients')} className="p-4 bg-sky-600 text-white rounded-lg shadow hover:bg-sky-700 text-center font-semibold transition-all">
                        Add Client
                    </button>
                     <button onClick={() => setActiveView('inventory')} className="p-4 bg-emerald-600 text-white rounded-lg shadow hover:bg-emerald-700 text-center font-semibold transition-all">
                        Add Item
                    </button>
                </div>
            </div>


            <div>
                <h3 className="text-lg font-semibold text-slate-600 tracking-wide mb-4">Financial Snapshot</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <StatCard 
                        title="Total Receivables" 
                        value={formatCurrency(financialReport.totalOutstanding, currencySymbol)} 
                        description={`${filteredInvoices.filter(i => i.status === InvoiceStatus.UNPAID).length} unpaid invoices`}
                        progress={(financialReport.totalOutstanding / (financialReport.totalCollected + financialReport.totalOutstanding || 1)) * 100}
                        progressColor="bg-orange-500"
                    />
                     <StatCard 
                        title="Total Collected" 
                        value={formatCurrency(financialReport.totalCollected, currencySymbol)} 
                        description={`From ${filteredInvoices.filter(i => i.status === InvoiceStatus.PAID).length} paid invoices`}
                        progress={(financialReport.totalCollected / (financialReport.totalCollected + financialReport.totalOutstanding || 1)) * 100}
                        progressColor="bg-green-500"
                    />
                     <StatCard 
                        title="Total Payables" 
                        value={formatCurrency(financialReport.totalPayables, currencySymbol)} 
                        description={`${filteredPurchases.length} bills recorded`}
                         progressColor="bg-red-500"
                    />
                     <StatCard 
                        title="Input Tax Credit (ITC)" 
                        value={formatCurrency(financialReport.totalITCAvailable, currencySymbol)} 
                        description="Available GST credit"
                         progressColor="bg-blue-500"
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                    <h3 className="text-lg font-bold text-slate-700 mb-4">Income vs Expense</h3>
                    <div className="h-80"><canvas ref={incomeExpenseChartRef}></canvas></div>
                </Card>
                <Card>
                    <h3 className="text-lg font-bold text-slate-700 mb-4">6-Month Sales Trend</h3>
                    <div className="h-80"><canvas ref={salesTrendChartRef}></canvas></div>
                </Card>
            </div>
            
            <div>
                <h3 className="text-lg font-semibold text-slate-600 tracking-wide mb-4">Inventory Snapshot</h3>
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <StatCard title="Low Stock Items" value={String(inventoryReport.lowStockItems)} description="Needs reordering" />
                    <StatCard title="Out of Stock Items" value={String(inventoryReport.outOfStockItems)} description="Currently unavailable" />
                    <StatCard title="Total Stock Value" value={formatCurrency(inventoryReport.totalStockValue, currencySymbol)} description="Value of goods on hand" />
                </div>
            </div>

        </div>
    );
};

export default Dashboard;
