
import React, { useState, useEffect, useCallback } from 'react';
import type { View, Item, CalculationResult, BusinessDetails, ClientDetails, InvoiceRecord, QuotationRecord, Product, Vendor, PurchaseRecord, RecurringProfile, Settings } from './types';
import { CURRENCIES } from './constants';
import { PriceType, TransactionType, InvoiceStatus, ProfileStatus, BillingFrequency } from './types';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import GSTCalculator from './components/GSTCalculator';
import InventoryManager from './components/InventoryManager';
import ClientManager from './components/ClientManager';
import VendorManager from './components/VendorManager';
import PurchaseManager from './components/PurchaseManager';
import Reports from './components/Reports';
import GSTFiling from './components/GSTFiling';
import RecurringManager from './components/RecurringManager';
import SettingsComponent from './components/Settings';

const App: React.FC = () => {
    const [activeView, setActiveView] = useState<View>('dashboard');
    
    // Lifted State
    const [items, setItems] = useState<Item[]>([{ id: crypto.randomUUID(), description: '', hsn: '', quantity: 1, price: NaN, gstRate: 18 }]);
    const [results, setResults] = useState<CalculationResult | null>(null);
    const [businessDetails, setBusinessDetails] = useState<BusinessDetails>({ name: '', gstin: '', address: '', logo: '', terms: '', bankDetails: '' });
    const [savedClients, setSavedClients] = useState<ClientDetails[]>([]);
    const [invoiceHistory, setInvoiceHistory] = useState<InvoiceRecord[]>([]);
    const [quotationHistory, setQuotationHistory] = useState<QuotationRecord[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [currencyCode, setCurrencyCode] = useState<string>('INR');
    const [vendors, setVendors] = useState<Vendor[]>([]);
    const [purchaseHistory, setPurchaseHistory] = useState<PurchaseRecord[]>([]);
    const [recurringProfiles, setRecurringProfiles] = useState<RecurringProfile[]>([]);
    const [settings, setSettings] = useState<Settings>({ razorpayKeyId: '', razorpayKeySecret: '' });


    // Load data from localStorage on initial render
    useEffect(() => {
        const savedCurrencyCode = localStorage.getItem('gstCalculatorCurrencyCode');
        if (savedCurrencyCode && CURRENCIES.some(c => c.code === savedCurrencyCode)) {
            setCurrencyCode(savedCurrencyCode);
        }
        const savedBusinessDetails = localStorage.getItem('gstCalculatorBusinessDetails');
        if (savedBusinessDetails) setBusinessDetails(JSON.parse(savedBusinessDetails));

        const savedClientsData = localStorage.getItem('gstCalculatorClients');
        if (savedClientsData) setSavedClients(JSON.parse(savedClientsData));

        const savedInvoiceHistory = localStorage.getItem('gstCalculatorInvoiceHistory');
        if (savedInvoiceHistory) setInvoiceHistory(JSON.parse(savedInvoiceHistory));

        const savedQuotationHistory = localStorage.getItem('gstCalculatorQuotationHistory');
        if (savedQuotationHistory) setQuotationHistory(JSON.parse(savedQuotationHistory));

        const savedProducts = localStorage.getItem('gstCalculatorProducts');
        if (savedProducts) setProducts(JSON.parse(savedProducts));

        const savedVendors = localStorage.getItem('gstCalculatorVendors');
        if (savedVendors) setVendors(JSON.parse(savedVendors));

        const savedPurchases = localStorage.getItem('gstCalculatorPurchaseHistory');
        if (savedPurchases) setPurchaseHistory(JSON.parse(savedPurchases));
        
        const savedRecurringProfiles = localStorage.getItem('gstCalculatorRecurringProfiles');
        if (savedRecurringProfiles) setRecurringProfiles(JSON.parse(savedRecurringProfiles));

        const savedSettings = localStorage.getItem('gstCalculatorSettings');
        if (savedSettings) setSettings(JSON.parse(savedSettings));

    }, []);

    // Persist data to localStorage whenever it changes
    useEffect(() => { localStorage.setItem('gstCalculatorCurrencyCode', currencyCode); }, [currencyCode]);
    useEffect(() => { localStorage.setItem('gstCalculatorBusinessDetails', JSON.stringify(businessDetails)); }, [businessDetails]);
    useEffect(() => { localStorage.setItem('gstCalculatorClients', JSON.stringify(savedClients)); }, [savedClients]);
    useEffect(() => { localStorage.setItem('gstCalculatorInvoiceHistory', JSON.stringify(invoiceHistory)); }, [invoiceHistory]);
    useEffect(() => { localStorage.setItem('gstCalculatorQuotationHistory', JSON.stringify(quotationHistory)); }, [quotationHistory]);
    useEffect(() => { localStorage.setItem('gstCalculatorProducts', JSON.stringify(products)); }, [products]);
    useEffect(() => { localStorage.setItem('gstCalculatorVendors', JSON.stringify(vendors)); }, [vendors]);
    useEffect(() => { localStorage.setItem('gstCalculatorPurchaseHistory', JSON.stringify(purchaseHistory)); }, [purchaseHistory]);
    useEffect(() => { localStorage.setItem('gstCalculatorRecurringProfiles', JSON.stringify(recurringProfiles)); }, [recurringProfiles]);
    useEffect(() => { localStorage.setItem('gstCalculatorSettings', JSON.stringify(settings)); }, [settings]);


    // Core logic for generating recurring invoices on app load
    useEffect(() => {
        const today = new Date();
        today.setHours(0,0,0,0); // Compare against start of day
        let profilesToUpdate = JSON.parse(JSON.stringify(recurringProfiles)) as RecurringProfile[];
        let newInvoices: InvoiceRecord[] = [];
        let productsToUpdate = JSON.parse(JSON.stringify(products)) as Product[];
        let invoiceCounter = parseInt(localStorage.getItem('gstInvoiceCounter') || '0', 10);

        profilesToUpdate.forEach(profile => {
            if (profile.status === ProfileStatus.ACTIVE) {
                let nextDue = new Date(profile.nextDueDate);

                // Loop to catch up on any missed invoices
                while (nextDue <= today) {
                    if (profile.endDate && nextDue > new Date(profile.endDate)) {
                        profile.status = ProfileStatus.PAUSED;
                        break; // Stop if the end date is passed
                    }
                    
                    // 1. Generate Invoice
                    const totals = profile.items.reduce((acc, item) => {
                        const { quantity, price, gstRate } = item;
                        let itemNetAmount = 0, itemGstAmount = 0;
                        if (profile.priceType === PriceType.EXCLUSIVE) {
                            itemNetAmount = quantity * price;
                            itemGstAmount = itemNetAmount * (gstRate / 100);
                        } else {
                            const itemTotalAmount = quantity * price;
                            itemNetAmount = itemTotalAmount / (1 + (gstRate / 100));
                            itemGstAmount = itemTotalAmount - itemNetAmount;
                        }
                        acc.totalNetAmount += itemNetAmount;
                        const existingRate = acc.gstBreakdown.find(b => b.rate === gstRate);
                        if (existingRate) {
                            existingRate.taxableAmount += itemNetAmount;
                            existingRate.gstAmount += itemGstAmount;
                        } else {
                            acc.gstBreakdown.push({ rate: gstRate, taxableAmount: itemNetAmount, gstAmount: itemGstAmount });
                        }
                        return acc;
                    }, { totalNetAmount: 0, gstBreakdown: [] as any[] });

                    const grandTotal = totals.totalNetAmount + totals.gstBreakdown.reduce((sum, b) => sum + b.gstAmount, 0);

                    invoiceCounter++;
                    const newInvoice: InvoiceRecord = {
                        id: crypto.randomUUID(),
                        invoiceNumber: `INV-${invoiceCounter.toString().padStart(3, '0')}`,
                        client: profile.client,
                        business: businessDetails,
                        items: profile.items.map(i => ({...i, id: crypto.randomUUID()})),
                        date: nextDue.toISOString(),
                        totalAmount: grandTotal,
                        calculationResult: { totalNetAmount: totals.totalNetAmount, totalGstAmount: grandTotal - totals.totalNetAmount, grandTotal: grandTotal, gstBreakdown: totals.gstBreakdown },
                        transactionType: profile.transactionType,
                        priceType: profile.priceType,
                        status: InvoiceStatus.UNPAID,
                    };

                    if (settings.razorpayKeyId && settings.razorpayKeySecret) {
                        newInvoice.paymentLink = `https://rzp.io/i/${crypto.randomUUID().substring(0, 14)}`; // Simulated link
                    }
                    
                    newInvoices.push(newInvoice);

                    // 2. Update stock
                    newInvoice.items.forEach(item => {
                        const productIndex = productsToUpdate.findIndex(p => p.name.toLowerCase() === item.description.toLowerCase() && p.trackStock);
                        if (productIndex > -1) {
                            productsToUpdate[productIndex].stock -= item.quantity;
                        }
                    });

                    // 3. Update profile for next cycle
                    profile.lastGeneratedDate = nextDue.toISOString();
                    const newNextDue = new Date(nextDue);
                    if (profile.frequency === BillingFrequency.MONTHLY) newNextDue.setMonth(newNextDue.getMonth() + 1);
                    if (profile.frequency === BillingFrequency.QUARTERLY) newNextDue.setMonth(newNextDue.getMonth() + 3);
                    if (profile.frequency === BillingFrequency.YEARLY) newNextDue.setFullYear(newNextDue.getFullYear() + 1);
                    
                    profile.nextDueDate = newNextDue.toISOString();
                    nextDue = newNextDue;
                }
            }
        });

        if (newInvoices.length > 0) {
            setInvoiceHistory(prev => [...newInvoices, ...prev]);
            setProducts(productsToUpdate);
            setRecurringProfiles(profilesToUpdate);
            localStorage.setItem('gstInvoiceCounter', String(invoiceCounter));
        }
    }, []); // Run only once on mount

    const renderView = () => {
        const currentCurrency = CURRENCIES.find(c => c.code === currencyCode) || CURRENCIES[0];
        
        switch (activeView) {
            case 'dashboard':
                return <Dashboard 
                            invoiceHistory={invoiceHistory} 
                            purchaseHistory={purchaseHistory}
                            products={products} 
                            currencySymbol={currentCurrency.symbol} 
                        />;
            case 'sales':
                return <GSTCalculator 
                            items={items}
                            setItems={setItems}
                            results={results}
                            setResults={setResults}
                            businessDetails={businessDetails}
                            setBusinessDetails={setBusinessDetails}
                            savedClients={savedClients}
                            setSavedClients={setSavedClients}
                            invoiceHistory={invoiceHistory}
                            setInvoiceHistory={setInvoiceHistory}
                            quotationHistory={quotationHistory}
                            setQuotationHistory={setQuotationHistory}
                            products={products}
                            setProducts={setProducts}
                            currencyCode={currencyCode}
                            setCurrencyCode={setCurrencyCode}
                            settings={settings}
                        />;
            case 'recurring_invoices':
                return <RecurringManager
                            profiles={recurringProfiles}
                            setProfiles={setRecurringProfiles}
                            clients={savedClients}
                            products={products}
                            currencySymbol={currentCurrency.symbol}
                        />;
            case 'purchases':
                return <PurchaseManager 
                            vendors={vendors}
                            setVendors={setVendors}
                            products={products}
                            setProducts={setProducts}
                            purchaseHistory={purchaseHistory}
                            setPurchaseHistory={setPurchaseHistory}
                            currencySymbol={currentCurrency.symbol}
                        />;
            case 'inventory':
                return <InventoryManager products={products} setProducts={setProducts} currencySymbol={currentCurrency.symbol}/>;
            case 'clients':
                return <ClientManager clients={savedClients} setClients={setSavedClients} />;
            case 'vendors':
                return <VendorManager vendors={vendors} setVendors={setVendors} />;
            case 'reports':
                return <Reports 
                            invoiceHistory={invoiceHistory}
                            purchaseHistory={purchaseHistory}
                            products={products}
                            clients={savedClients}
                            vendors={vendors}
                            currencySymbol={currentCurrency.symbol}
                        />;
            case 'gst_filing':
                return <GSTFiling
                            invoiceHistory={invoiceHistory}
                            purchaseHistory={purchaseHistory}
                        />;
            case 'settings':
                return <SettingsComponent 
                            settings={settings} 
                            setSettings={setSettings} 
                        />;
            default:
                return <Dashboard 
                            invoiceHistory={invoiceHistory} 
                            purchaseHistory={purchaseHistory}
                            products={products} 
                            currencySymbol={currentCurrency.symbol} 
                        />;
        }
    };

    return (
        <div className="flex h-screen bg-white font-sans text-slate-800">
            <Sidebar activeView={activeView} setActiveView={setActiveView} />
            <main className="flex-1 flex flex-col overflow-hidden">
                <div className="flex-1 overflow-x-hidden overflow-y-auto bg-slate-50 p-6 sm:p-8">
                   {renderView()}
                </div>
            </main>
        </div>
    );
};

export default App;
