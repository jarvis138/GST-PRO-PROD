
import React, { useState, useEffect, useCallback, ChangeEvent } from 'react';
import { GST_RATES, CURRENCIES } from '../constants';
import { PriceType, TransactionType, InvoiceStatus } from '../types';
import type { CalculationResult, Item, GstBreakdownDetail, BusinessDetails, ClientDetails, InvoiceRecord, QuotationRecord, LogisticsDetails, Product, Settings } from '../types';
import Card from './Card';
import ResultDisplay from './ResultDisplay';
import Header from './Header';


// @ts-ignore
const { jsPDF } = window.jspdf;

const TrashIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clipRule="evenodd" />
    </svg>
);
const ConvertIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
    </svg>
);


const PLACEHOLDER_EXAMPLES = [
    'e.g., Laptop',
    'e.g., Service Fee',
    'e.g., Product XYZ',
    'e.g., Consulting Charges',
];

const StatusBadge: React.FC<{ status: InvoiceStatus }> = ({ status }) => {
    const baseClasses = "px-2.5 py-0.5 text-xs font-semibold rounded-full";
    if (status === InvoiceStatus.PAID) {
        return <span className={`${baseClasses} bg-green-100 text-green-800`}>Paid</span>;
    }
    return <span className={`${baseClasses} bg-red-100 text-red-800`}>Unpaid</span>;
};

interface GSTCalculatorProps {
    items: Item[];
    setItems: React.Dispatch<React.SetStateAction<Item[]>>;
    results: CalculationResult | null;
    setResults: React.Dispatch<React.SetStateAction<CalculationResult | null>>;
    businessDetails: BusinessDetails;
    setBusinessDetails: React.Dispatch<React.SetStateAction<BusinessDetails>>;
    savedClients: ClientDetails[];
    setSavedClients: React.Dispatch<React.SetStateAction<ClientDetails[]>>;
    invoiceHistory: InvoiceRecord[];
    setInvoiceHistory: React.Dispatch<React.SetStateAction<InvoiceRecord[]>>;
    quotationHistory: QuotationRecord[];
    setQuotationHistory: React.Dispatch<React.SetStateAction<QuotationRecord[]>>;
    products: Product[];
    setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
    currencyCode: string;
    setCurrencyCode: React.Dispatch<React.SetStateAction<string>>;
    settings: Settings;
}


const GSTCalculator: React.FC<GSTCalculatorProps> = ({
    items, setItems, results, setResults, businessDetails, setBusinessDetails,
    savedClients, setSavedClients, invoiceHistory, setInvoiceHistory,
    quotationHistory, setQuotationHistory, products, setProducts,
    currencyCode, setCurrencyCode, settings
}) => {
    const [documentType, setDocumentType] = useState<'invoice' | 'quotation'>('invoice');
    const [priceType, setPriceType] = useState<PriceType>(PriceType.EXCLUSIVE);
    const [transactionType, setTransactionType] = useState<TransactionType>(TransactionType.INTRA_STATE);
    const [errors, setErrors] = useState<Record<string, string>>({});

    const initialClientDetails: ClientDetails = { id: '', name: '', gstin: '', address: '' };
    const [clientDetails, setClientDetails] = useState<ClientDetails>(initialClientDetails);
    const [selectedClientId, setSelectedClientId] = useState<string>('');
    
    const initialLogisticsDetails: LogisticsDetails = { transporterName: '', transporterId: '', vehicleNumber: '', ewayBillNumber: '' };
    const [logisticsDetails, setLogisticsDetails] = useState<LogisticsDetails>(initialLogisticsDetails);
    
    const [invoiceNumber, setInvoiceNumber] = useState('');
    const [quotationNumber, setQuotationNumber] = useState('');
    
    const [itemSearchQuery, setItemSearchQuery] = useState<Record<string, string>>({});
    const [openActionMenu, setOpenActionMenu] = useState<string | null>(null);

    useEffect(() => {
        const nextInvoiceNum = (parseInt(localStorage.getItem('gstInvoiceCounter') || '0', 10) + 1).toString().padStart(3, '0');
        setInvoiceNumber(`INV-${nextInvoiceNum}`);

        const nextQuotationNum = (parseInt(localStorage.getItem('gstQuotationCounter') || '0', 10) + 1).toString().padStart(3, '0');
        setQuotationNumber(`QTN-${nextQuotationNum}`);
    }, [invoiceHistory, quotationHistory]);


    const handleItemChange = (id: string, field: keyof Item, value: string | number) => {
        const strValue = String(value);
        const fieldKey = `${id}-${field}`;
        
        if (field === 'description') {
            setItemSearchQuery(prev => ({ ...prev, [id]: strValue }));
        }

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
    
    const handleProductSelect = (itemId: string, product: Product) => {
        setItems(prevItems => prevItems.map(item => 
            item.id === itemId ? {
                ...item,
                description: product.name,
                hsn: product.hsn,
                price: product.price,
                gstRate: product.gstRate,
            } : item
        ));
        setItemSearchQuery(prev => ({...prev, [itemId]: ''}));
    };
    
    const handleSaveClient = () => {
        if (!clientDetails.name) return; // Basic validation
        const existingClient = savedClients.find(c => c.id === clientDetails.id);
        if (existingClient) {
            // Update existing client
            setSavedClients(savedClients.map(c => c.id === clientDetails.id ? clientDetails : c));
        } else {
            // Add new client
            const newClient = { ...clientDetails, id: crypto.randomUUID() };
            setSavedClients([...savedClients, newClient]);
            setClientDetails(newClient);
            setSelectedClientId(newClient.id);
        }
    };

    const handleSelectClient = (clientId: string) => {
        setSelectedClientId(clientId);
        if (clientId === '') {
            setClientDetails(initialClientDetails);
        } else {
            const selected = savedClients.find(c => c.id === clientId);
            if (selected) {
                setClientDetails(selected);
            }
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
    
     const handleLogoUpload = (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setBusinessDetails(prev => ({ ...prev, logo: reader.result as string }));
            };
            reader.readAsDataURL(file);
        }
    };
    
    const handleUpdateInvoiceStatus = (invoiceId: string, newStatus: InvoiceStatus) => {
        setInvoiceHistory(prevHistory => 
            prevHistory.map(inv => 
                inv.id === invoiceId 
                    ? { ...inv, status: newStatus, paymentDate: newStatus === InvoiceStatus.PAID ? new Date().toISOString() : undefined }
                    : inv
            )
        );
    };

    const generateDocumentPdf = (
        data: InvoiceRecord | QuotationRecord,
        docType: 'invoice' | 'quotation' | 'proforma' | 'challan'
    ) => {
        const { business, client, items, calculationResult: results, priceType, transactionType, date } = data;
        const logistics = (data as InvoiceRecord).logistics;
        const docNumber = (data as InvoiceRecord).invoiceNumber || (data as QuotationRecord).quotationNumber;
        const paymentLink = (data as InvoiceRecord).paymentLink;

        const doc = new jsPDF();
        const currencySymbol = CURRENCIES.find(c => c.code === currencyCode)?.symbol || '₹';
        const formatDate = (date: Date) => [date.getDate().toString().padStart(2, '0'), (date.getMonth() + 1).toString().padStart(2, '0'), date.getFullYear()].join('/');
        
        if (business.logo) {
            try {
                const img = new Image();
                img.src = business.logo;
                const imgProps = doc.getImageProperties(img.src);
                const imgWidth = 30;
                const imgHeight = (imgProps.height * imgWidth) / imgProps.width;
                doc.addImage(business.logo, 'PNG', 14, 15, imgWidth, imgHeight);
            } catch (e) { console.error("Error adding logo to PDF:", e); }
        }

        let docTitle = 'Tax Invoice';
        let docNumberLabel = 'Invoice No:';
        let tableColumn = ["#", "Item", "HSN/SAC", "Qty", "Rate", "Total", "GST %", "GST Amt"];
        switch(docType) {
            case 'quotation': docTitle = 'Quotation'; docNumberLabel = 'Quotation No:'; break;
            case 'proforma': docTitle = 'Proforma Invoice'; docNumberLabel = 'Proforma No:'; break;
            case 'challan': 
                docTitle = 'Delivery Challan'; 
                docNumberLabel = 'Challan No:'; 
                tableColumn = ["#", "Item Description", "HSN/SAC", "Quantity"];
                break;
        }

        doc.setFontSize(20);
        doc.setFont("helvetica", "bold");
        doc.text(docTitle, 200, 20, { align: 'right' });

        let startY = business.logo ? 50 : 30;
        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.text("Billed From:", 14, startY);
        doc.setFont("helvetica", "normal");
        doc.text(business.name, 14, startY + 5);
        doc.text(business.address, 14, startY + 10, { maxWidth: 80 });
        doc.text(`GSTIN: ${business.gstin}`, 14, startY + 25);

        doc.setFont("helvetica", "bold");
        doc.text("Billed To:", 110, startY);
        doc.setFont("helvetica", "normal");
        doc.text(client.name, 110, startY + 5);
        doc.text(client.address, 110, startY + 10, { maxWidth: 80 });
        doc.text(`GSTIN: ${client.gstin}`, 110, startY + 25);

        doc.setFontSize(10);
        doc.text(`${docNumberLabel} ${docNumber}`, 200, startY + 5, { align: 'right' });
        doc.text(`Date: ${formatDate(new Date(date))}`, 200, startY + 10, { align: 'right' });
        
        const tableRows: any[][] = [];
        items.forEach((item, index) => {
            const quantity = Number(item.quantity) || 0;
            const price = Number(item.price) || 0;
            const rate = Number(item.gstRate) || 0;
            if (quantity <= 0 && docType !== 'challan') return;
            if (quantity <= 0 || (price <= 0 && docType !== 'challan')) return;

            if (docType === 'challan') {
                tableRows.push([index + 1, item.description, item.hsn, quantity.toFixed(2)]);
            } else {
                let itemNetAmount = 0, itemGstAmount = 0, itemPrice = 0;
                if (priceType === PriceType.EXCLUSIVE) {
                    itemNetAmount = quantity * price;
                    itemGstAmount = itemNetAmount * (rate / 100);
                    itemPrice = price;
                } else {
                    const itemTotalAmount = quantity * price;
                    itemNetAmount = itemTotalAmount / (1 + (rate / 100));
                    itemGstAmount = itemTotalAmount - itemNetAmount;
                    itemPrice = itemNetAmount / quantity;
                }
                tableRows.push([index + 1, item.description, item.hsn, quantity.toFixed(2), `${currencySymbol}${itemPrice.toFixed(2)}`, `${currencySymbol}${itemNetAmount.toFixed(2)}`, `${rate}%`, `${currencySymbol}${itemGstAmount.toFixed(2)}`]);
            }
        });

        doc.autoTable({ head: [tableColumn], body: tableRows, startY: startY + 35, theme: 'grid', headStyles: { fillColor: [22, 160, 133] }, styles: { fontSize: 8 } });

        let finalY = (doc as any).lastAutoTable.finalY;
        if (docType !== 'challan') {
            const format = (val: number) => `${currencySymbol}${val.toFixed(2)}`;
            doc.setFontSize(10);
            let yPos = finalY + 10;
            doc.text("Total Taxable Value:", 140, yPos);
            doc.text(format(results.totalNetAmount), 200, yPos, { align: 'right' });
            yPos += 7;

            results.gstBreakdown.forEach(breakdown => {
                if (transactionType === TransactionType.INTRA_STATE) {
                    doc.text(`CGST @ ${breakdown.rate / 2}%:`, 140, yPos);
                    doc.text(format(breakdown.gstAmount / 2), 200, yPos, { align: 'right' });
                    yPos += 7;
                    doc.text(`SGST @ ${breakdown.rate / 2}%:`, 140, yPos);
                    doc.text(format(breakdown.gstAmount / 2), 200, yPos, { align: 'right' });
                } else {
                    doc.text(`IGST @ ${breakdown.rate}%:`, 140, yPos);
                    doc.text(format(breakdown.gstAmount), 200, yPos, { align: 'right' });
                }
                yPos += 7;
            });

            doc.setFont("helvetica", "bold");
            doc.text("Grand Total:", 140, yPos);
            doc.text(format(results.grandTotal), 200, yPos, { align: 'right' });
            finalY = yPos + 10;
        }
        
        if (docType === 'challan' && logistics) {
            let yPos = finalY + 10;
            doc.setFontSize(10);
            doc.setFont("helvetica", "bold");
            doc.text("Dispatch Details:", 14, yPos);
            yPos += 7;
            doc.setFont("helvetica", "normal");
            doc.text(`Transporter: ${logistics.transporterName || 'N/A'}`, 14, yPos);
            doc.text(`Vehicle No: ${logistics.vehicleNumber || 'N/A'}`, 110, yPos);
            yPos += 5;
            doc.text(`Transporter ID: ${logistics.transporterId || 'N/A'}`, 14, yPos);
            doc.text(`E-Way Bill No: ${logistics.ewayBillNumber || 'N/A'}`, 110, yPos);
            finalY = yPos;
        }

        doc.setFontSize(8);
        doc.setFont("helvetica", "normal");
        let yPosAfterBank = finalY;
        if(business.terms && docType !== 'challan') {
            doc.setFont("helvetica", "bold");
            doc.text("Terms & Conditions:", 14, finalY + 10);
            doc.setFont("helvetica", "normal");
            doc.text(business.terms, 14, finalY + 14, { maxWidth: 180 });
            yPosAfterBank = finalY + 20;
        }
        if(business.bankDetails && docType !== 'challan') {
            doc.setFont("helvetica", "bold");
            doc.text("Bank Details for Payment:", 14, yPosAfterBank + 10);
            doc.setFont("helvetica", "normal");
            doc.text(business.bankDetails, 14, yPosAfterBank + 14, { maxWidth: 180 });
        }
        
        if (paymentLink && (docType === 'invoice' || docType === 'proforma')) {
            doc.setFillColor(79, 70, 229); // indigo-600
            doc.roundedRect(138, finalY + 10, 62, 10, 3, 3, 'F');
            doc.setTextColor(255, 255, 255);
            doc.setFont("helvetica", "bold");
            doc.text("PAY NOW", 200, finalY + 16, { align: 'right' });
            doc.link(138, finalY + 10, 62, 10, { url: paymentLink });
            doc.setTextColor(0, 0, 0);
        }

        doc.save(`${docTitle}-${docNumber}-${client.name || 'details'}.pdf`);
    };

    const handleGenerateCurrentDocument = () => {
        if (!results) return;

        if (documentType === 'invoice') {
             const newRecord: InvoiceRecord = {
                id: crypto.randomUUID(),
                invoiceNumber: invoiceNumber,
                client: { ...clientDetails },
                business: { ...businessDetails },
                items: [...items],
                date: new Date().toISOString(),
                totalAmount: results.grandTotal,
                calculationResult: results,
                transactionType: transactionType,
                priceType: priceType,
                status: InvoiceStatus.UNPAID,
                logistics: { ...logisticsDetails }
            };

            if (settings.razorpayKeyId && settings.razorpayKeySecret) {
                newRecord.paymentLink = `https://rzp.io/i/${crypto.randomUUID().substring(0, 14)}`; // Simulated link
            }

            generateDocumentPdf(newRecord, 'invoice');
            setInvoiceHistory([newRecord, ...invoiceHistory]);
            
            // Deduct stock
            setProducts(currentProducts => {
                const updatedProducts = [...currentProducts];
                newRecord.items.forEach(item => {
                    const productIndex = updatedProducts.findIndex(p => p.name.toLowerCase() === item.description.toLowerCase() && p.trackStock);
                    if (productIndex > -1) {
                        updatedProducts[productIndex].stock -= item.quantity;
                    }
                });
                return updatedProducts;
            });

            const currentNum = parseInt(localStorage.getItem('gstInvoiceCounter') || '0', 10);
            const nextNum = currentNum + 1;
            localStorage.setItem('gstInvoiceCounter', String(nextNum));
            setInvoiceNumber(`INV-${(nextNum + 1).toString().padStart(3, '0')}`);
        } else {
             const newRecord: QuotationRecord = {
                id: crypto.randomUUID(),
                quotationNumber: quotationNumber,
                client: { ...clientDetails },
                business: { ...businessDetails },
                items: [...items],
                date: new Date().toISOString(),
                totalAmount: results.grandTotal,
                calculationResult: results,
                transactionType: transactionType,
                priceType: priceType,
            };
            generateDocumentPdf(newRecord, 'quotation');
            setQuotationHistory([newRecord, ...quotationHistory]);
            const currentNum = parseInt(localStorage.getItem('gstQuotationCounter') || '0', 10);
            const nextNum = currentNum + 1;
            localStorage.setItem('gstQuotationCounter', String(nextNum));
            setQuotationNumber(`QTN-${(nextNum + 1).toString().padStart(3, '0')}`);
        }
    };

    const handleConvertToInvoice = (quoteId: string) => {
        const quote = quotationHistory.find(q => q.id === quoteId);
        if (quote) {
            setDocumentType('invoice');
            setItems(quote.items.map(item => ({...item, id: crypto.randomUUID()}))); // New IDs to avoid key conflicts
            setClientDetails(quote.client);
            setSelectedClientId(quote.client.id);
            setPriceType(quote.priceType);
            setTransactionType(quote.transactionType);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };
    
    const filteredProducts = (query: string) => {
        if (!query) return [];
        return products.filter(p => p.name.toLowerCase().includes(query.toLowerCase())).slice(0, 5);
    };

    const currentCurrency = CURRENCIES.find(c => c.code === currencyCode) || CURRENCIES[0];

    const DetailInput: React.FC<{label: string, value: string, onChange: (val: string) => void, placeholder: string, disabled?: boolean}> = ({ label, value, onChange, placeholder, disabled }) => (
        <div>
            <label className="text-sm font-medium text-slate-600 mb-1 block">{label}</label>
            <input type="text" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} disabled={disabled} className="w-full p-2 bg-slate-100 rounded-md border border-slate-200 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none disabled:bg-slate-200 disabled:text-slate-500" />
        </div>
    );
    
    const DetailTextarea: React.FC<{label: string, value: string, onChange: (val: string) => void, placeholder: string, disabled?: boolean}> = ({ label, value, onChange, placeholder, disabled }) => (
        <div>
            <label className="text-sm font-medium text-slate-600 mb-1 block">{label}</label>
            <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={3} disabled={disabled} className="w-full p-2 bg-slate-100 rounded-md border border-slate-200 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none disabled:bg-slate-200 disabled:text-slate-500" />
        </div>
    );
    
    return (
        <div className="space-y-6">
            <Header title="Sales & Invoicing" />

            <Card>
                <div className="flex bg-slate-100 p-1 rounded-lg mb-6 max-w-sm mx-auto">
                    <button onClick={() => setDocumentType('invoice')} className={`w-1/2 py-2 px-4 text-sm font-semibold rounded-md transition-all duration-200 ${documentType === 'invoice' ? 'bg-white shadow text-indigo-700' : 'text-slate-500 hover:bg-slate-200'}`} aria-pressed={documentType === 'invoice'}>
                        Create Invoice
                    </button>
                    <button onClick={() => setDocumentType('quotation')} className={`w-1/2 py-2 px-4 text-sm font-semibold rounded-md transition-all duration-200 ${documentType === 'quotation' ? 'bg-white shadow text-indigo-700' : 'text-slate-500 hover:bg-slate-200'}`} aria-pressed={documentType === 'quotation'}>
                        Create Quotation
                    </button>
                </div>

                <div className="space-y-6">
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                        <div className="space-y-4">
                            <h3 className="text-lg font-semibold text-slate-700">Billed From</h3>
                            <DetailInput label="Business Name" placeholder="Your Company Name" value={businessDetails.name} onChange={val => setBusinessDetails(p => ({...p, name: val}))} />
                            <DetailInput label="Your GSTIN" placeholder="Your GST Identification Number" value={businessDetails.gstin} onChange={val => setBusinessDetails(p => ({...p, gstin: val}))} />
                            <DetailTextarea label="Business Address" placeholder="Your Street, City, State" value={businessDetails.address} onChange={val => setBusinessDetails(p => ({...p, address: val}))} />
                             <DetailTextarea label="Terms & Conditions" placeholder="e.g., Payment due within 15 days." value={businessDetails.terms} onChange={val => setBusinessDetails(p => ({...p, terms: val}))} />
                             <DetailTextarea label="Bank Details" placeholder="Your Bank Name, A/C No, IFSC" value={businessDetails.bankDetails} onChange={val => setBusinessDetails(p => ({...p, bankDetails: val}))} />
                            <div>
                                <label className="text-sm font-medium text-slate-600 mb-1 block">Company Logo</label>
                                {businessDetails.logo ? (
                                    <div className="flex items-center gap-4">
                                        <img src={businessDetails.logo} alt="Company Logo" className="h-12 w-auto border p-1 rounded-md" />
                                        <button onClick={() => setBusinessDetails(p => ({...p, logo: ''}))} className="text-sm text-red-600 hover:underline">Remove</button>
                                    </div>
                                ) : (
                                    <input type="file" accept="image/*" onChange={handleLogoUpload} className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100" />
                                )}
                            </div>
                        </div>
                         <div className="space-y-4">
                            <h3 className="text-lg font-semibold text-slate-700">Billed To</h3>
                            <div>
                                <label htmlFor="client-select" className="text-sm font-medium text-slate-600 mb-1 block">Select Client</label>
                                <select id="client-select" value={selectedClientId} onChange={e => handleSelectClient(e.target.value)} className="w-full p-2 bg-slate-100 rounded-md border border-slate-200 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none">
                                    <option value="">+ Add New Client</option>
                                    {savedClients.map(client => <option key={client.id} value={client.id}>{client.name}</option>)}
                                </select>
                            </div>
                            <DetailInput label="Client Name" placeholder="Client's Company Name" value={clientDetails.name} onChange={val => setClientDetails(p => ({...p, name: val}))} disabled={!!selectedClientId} />
                            <DetailInput label="Client's GSTIN" placeholder="Client's GST Identification Number" value={clientDetails.gstin} onChange={val => setClientDetails(p => ({...p, gstin: val}))} disabled={!!selectedClientId} />
                            <DetailTextarea label="Client's Address" placeholder="Client's Street, City, State" value={clientDetails.address} onChange={val => setClientDetails(p => ({...p, address: val}))} disabled={!!selectedClientId} />
                             { !selectedClientId && clientDetails.name && <button onClick={handleSaveClient} className="px-4 py-2 text-sm font-semibold text-indigo-600 bg-indigo-100 hover:bg-indigo-200 rounded-lg transition-colors">Save Client</button> }
                        </div>
                   </div>

                   {documentType === 'invoice' && (
                        <details className="border-t pt-4" onToggle={(e) => e.currentTarget.open && setLogisticsDetails(initialLogisticsDetails)}>
                            <summary className="font-semibold text-slate-700 cursor-pointer hover:text-indigo-600 transition-colors">
                                Logistics & Dispatch Details (Optional)
                            </summary>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 mt-4">
                                <DetailInput label="Transporter Name" placeholder="e.g., Delhivery" value={logisticsDetails.transporterName} onChange={val => setLogisticsDetails(p => ({...p, transporterName: val}))} />
                                <DetailInput label="Transporter ID (GSTIN)" placeholder="Transporter's GSTIN" value={logisticsDetails.transporterId} onChange={val => setLogisticsDetails(p => ({...p, transporterId: val}))} />
                                <DetailInput label="Vehicle Number" placeholder="e.g., DL01AB1234" value={logisticsDetails.vehicleNumber} onChange={val => setLogisticsDetails(p => ({...p, vehicleNumber: val}))} />
                                <DetailInput label="E-Way Bill Number" placeholder="12-digit number" value={logisticsDetails.ewayBillNumber} onChange={val => setLogisticsDetails(p => ({...p, ewayBillNumber: val}))} />
                            </div>
                        </details>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="text-sm font-medium text-slate-600 mb-2 block">Pricing Type</label>
                            <div className="flex bg-slate-100 p-1 rounded-lg"><button onClick={() => setPriceType(PriceType.EXCLUSIVE)} className={`w-1/2 py-2 px-4 text-sm font-semibold rounded-md transition-colors duration-200 ${priceType === PriceType.EXCLUSIVE ? 'bg-white shadow text-indigo-700' : 'text-slate-500 hover:bg-slate-200'}`} aria-pressed={priceType === PriceType.EXCLUSIVE}>Exclusive</button><button onClick={() => setPriceType(PriceType.INCLUSIVE)} className={`w-1/2 py-2 px-4 text-sm font-semibold rounded-md transition-colors duration-200 ${priceType === PriceType.INCLUSIVE ? 'bg-white shadow text-indigo-700' : 'text-slate-500 hover:bg-slate-200'}`} aria-pressed={priceType === PriceType.INCLUSIVE}>Inclusive</button></div>
                        </div>
                        <div>
                            <label className="text-sm font-medium text-slate-600 mb-2 block">Supply Type</label>
                            <div className="flex bg-slate-100 p-1 rounded-lg"><button onClick={() => setTransactionType(TransactionType.INTRA_STATE)} className={`w-1/2 py-2 px-4 text-sm font-semibold rounded-md transition-colors duration-200 ${transactionType === TransactionType.INTRA_STATE ? 'bg-white shadow text-indigo-700' : 'text-slate-500 hover:bg-slate-200'}`} aria-pressed={transactionType === TransactionType.INTRA_STATE}>Intra-State</button><button onClick={() => setTransactionType(TransactionType.INTER_STATE)} className={`w-1/2 py-2 px-4 text-sm font-semibold rounded-md transition-colors duration-200 ${transactionType === TransactionType.INTER_STATE ? 'bg-white shadow text-indigo-700' : 'text-slate-500 hover:bg-slate-200'}`} aria-pressed={transactionType === TransactionType.INTER_STATE}>Inter-State</button></div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold text-slate-700 border-b pb-2">Items</h3>
                        {items.map((item, index) => {
                            const qtyError = errors[`${item.id}-quantity`];
                            const priceError = errors[`${item.id}-price`];
                            const searchResults = filteredProducts(itemSearchQuery[item.id] || '');
                            
                            const productInStock = products.find(p => p.name.toLowerCase() === item.description.toLowerCase() && p.trackStock);

                            return (
                                <div key={item.id} className="grid grid-cols-12 gap-2 items-start border-b border-slate-100 pb-4">
                                    <div className="col-span-12 md:col-span-3 relative">
                                        <label htmlFor={`desc-${item.id}`} className="sr-only">Item Description</label>
                                        <input id={`desc-${item.id}`} type="text" value={item.description} onChange={(e) => handleItemChange(item.id, 'description', e.target.value)} placeholder={PLACEHOLDER_EXAMPLES[index % PLACEHOLDER_EXAMPLES.length]} className="w-full p-2 bg-slate-100 rounded-md border border-slate-200 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none" autoComplete="off" />
                                         {productInStock && <span className="text-xs text-slate-500 mt-1 block">{productInStock.stock} in stock</span>}
                                        {searchResults.length > 0 && itemSearchQuery[item.id] && (
                                            <ul className="absolute z-10 w-full bg-white border border-slate-200 rounded-md mt-1 shadow-lg max-h-60 overflow-auto">
                                                {searchResults.map(p => (
                                                    <li key={p.id} onClick={() => handleProductSelect(item.id, p)} className="p-2 text-sm hover:bg-indigo-50 cursor-pointer">{p.name} <span className="text-xs text-slate-400">({p.trackStock ? `${p.stock} in stock` : 'Service'})</span></li>
                                                ))}
                                            </ul>
                                        )}
                                    </div>
                                    <div className="col-span-6 md:col-span-2">
                                        <label htmlFor={`hsn-${item.id}`} className="sr-only">HSN/SAC</label>
                                        <input id={`hsn-${item.id}`} type="text" value={item.hsn} onChange={(e) => handleItemChange(item.id, 'hsn', e.target.value)} placeholder="HSN/SAC" className="w-full p-2 bg-slate-100 rounded-md border border-slate-200 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none" />
                                    </div>
                                    <div className="col-span-6 md:col-span-2">
                                        <label htmlFor={`qty-${item.id}`} className="sr-only">Quantity</label>
                                        <input id={`qty-${item.id}`} type="text" inputMode="decimal" value={isNaN(item.quantity) ? '' : item.quantity} onChange={(e) => handleItemChange(item.id, 'quantity', e.target.value)} placeholder="Qty" className={`w-full p-2 bg-slate-100 rounded-md border focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none ${qtyError ? 'border-red-500' : 'border-slate-200'}`} aria-invalid={!!qtyError} aria-describedby={qtyError ? `qty-error-${item.id}` : undefined}/>
                                        {qtyError && <p id={`qty-error-${item.id}`} role="alert" className="text-xs text-red-600 mt-1">{qtyError}</p>}
                                    </div>
                                    <div className="col-span-6 md:col-span-2">
                                        <label htmlFor={`price-${item.id}`} className="sr-only">Price</label>
                                        <div className="relative"><span className="absolute inset-y-0 left-0 flex items-center pl-2 text-slate-500 text-sm" aria-hidden="true">{currentCurrency.symbol}</span><input id={`price-${item.id}`} type="text" inputMode="decimal" value={isNaN(item.price) ? '' : item.price} onChange={(e) => handleItemChange(item.id, 'price', e.target.value)} placeholder="Price" className={`w-full pl-6 p-2 bg-slate-100 rounded-md border focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none ${priceError ? 'border-red-500' : 'border-slate-200'}`} aria-invalid={!!priceError} aria-describedby={priceError ? `price-error-${item.id}` : undefined}/></div>
                                        {priceError && <p id={`price-error-${item.id}`} role="alert" className="text-xs text-red-600 mt-1">{priceError}</p>}
                                    </div>
                                    <div className="col-span-6 md:col-span-2">
                                        <label htmlFor={`gst-${item.id}`} className="sr-only">GST Rate</label>
                                        <select id={`gst-${item.id}`} value={item.gstRate} onChange={(e) => handleItemChange(item.id, 'gstRate', e.target.value)} className="w-full p-2 bg-slate-100 rounded-md border border-slate-200 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none">{GST_RATES.map(rate => <option key={rate} value={rate}>{rate}%</option>)}</select>
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
              <div className="flex flex-col sm:flex-row justify-between sm:items-start mb-4 gap-4">
                  <div>
                      <h2 className="text-xl font-bold text-slate-700">Calculation Summary</h2>
                      <p className="text-sm text-slate-500">Review totals before generating the document.</p>
                  </div>
                  <div className="flex items-center gap-2">
                     <DetailInput label={`${documentType === 'invoice' ? 'Invoice' : 'Quotation'} Number`} placeholder={documentType === 'invoice' ? 'e.g., INV-001' : 'e.g., QTN-001'} value={documentType === 'invoice' ? invoiceNumber : quotationNumber} onChange={documentType === 'invoice' ? setInvoiceNumber : setQuotationNumber} />
                     <button 
                          onClick={handleGenerateCurrentDocument}
                          disabled={!results || results.grandTotal <= 0}
                          className="self-end px-5 py-2.5 text-sm font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors"
                      >
                          {`Generate ${documentType === 'invoice' ? 'Invoice' : 'Quotation'}`}
                      </button>
                  </div>
              </div>
              <ResultDisplay results={results} currencySymbol={currentCurrency.symbol} transactionType={transactionType}/>
            </Card>
            
            {quotationHistory.length > 0 && (
                <Card>
                    <h2 className="text-xl font-bold text-slate-700 mb-4">Recent Quotations</h2>
                    <div className="space-y-2">
                        <div className="grid grid-cols-5 gap-4 text-sm font-semibold text-slate-600 px-4">
                            <span>Quote #</span>
                            <span>Client</span>
                            <span className="text-right">Date</span>
                            <span className="text-right">Amount</span>
                            <span className="text-center">Actions</span>
                        </div>
                        <ul className="divide-y divide-slate-100">
                            {quotationHistory.slice(0, 10).map(rec => (
                                <li key={rec.id} className="grid grid-cols-5 gap-4 p-4 items-center hover:bg-slate-50 rounded-lg">
                                    <span className="font-medium text-indigo-600">{rec.quotationNumber}</span>
                                    <span>{rec.client.name}</span>
                                    <span className="text-right text-slate-500">{new Date(rec.date).toLocaleDateString('en-IN')}</span>
                                    <span className="text-right font-semibold">{currentCurrency.symbol}{rec.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                    <div className="text-center">
                                        <button onClick={() => handleConvertToInvoice(rec.id)} className="inline-flex items-center px-3 py-1 text-xs font-semibold text-indigo-700 bg-indigo-100 hover:bg-indigo-200 rounded-full transition-colors">
                                            <ConvertIcon /> Convert to Invoice
                                        </button>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </div>
                </Card>
            )}

            {invoiceHistory.length > 0 && (
                <Card>
                    <h2 className="text-xl font-bold text-slate-700 mb-4">Recent Invoices</h2>
                    <div className="space-y-2">
                        <div className="grid grid-cols-6 gap-4 text-sm font-semibold text-slate-600 px-4">
                            <span>Invoice #</span>
                            <span>Client</span>
                            <span className="text-right">Date</span>
                            <span className="text-right">Amount</span>
                            <span className="text-center">Status</span>
                            <span className="text-center">Actions</span>
                        </div>
                        <ul className="divide-y divide-slate-100">
                            {invoiceHistory.slice(0, 10).map(rec => (
                                <li key={rec.id} className="grid grid-cols-6 gap-4 p-4 items-center hover:bg-slate-50 rounded-lg">
                                    <span className="font-medium text-indigo-600">{rec.invoiceNumber}</span>
                                    <span>{rec.client.name}</span>
                                    <span className="text-right text-slate-500">{new Date(rec.date).toLocaleDateString('en-IN')}</span>
                                    <span className="text-right font-semibold">{currentCurrency.symbol}{rec.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                    <span className="text-center"><StatusBadge status={rec.status} /></span>
                                    <td className="text-center relative">
                                        <button onClick={() => setOpenActionMenu(openActionMenu === rec.id ? null : rec.id)} className="px-3 py-1 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors">Actions ▼</button>
                                        {openActionMenu === rec.id && (
                                            <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-10 border border-slate-200 text-left" onMouseLeave={() => setOpenActionMenu(null)}>
                                                <ul className="py-1 text-sm text-slate-700">
                                                    <li><button onClick={() => { generateDocumentPdf(rec, 'invoice'); setOpenActionMenu(null); }} className="w-full text-left px-4 py-2 hover:bg-slate-100">Download Invoice</button></li>
                                                    <li><button onClick={() => { generateDocumentPdf(rec, 'proforma'); setOpenActionMenu(null); }} className="w-full text-left px-4 py-2 hover:bg-slate-100">Proforma Invoice</button></li>
                                                    <li><button onClick={() => { generateDocumentPdf(rec, 'challan'); setOpenActionMenu(null); }} className="w-full text-left px-4 py-2 hover:bg-slate-100">Delivery Challan</button></li>
                                                    {rec.paymentLink && (
                                                        <>
                                                            <li className="border-t my-1"></li>
                                                            <li><button onClick={() => { navigator.clipboard.writeText(rec.paymentLink!); setOpenActionMenu(null); }} className="w-full text-left px-4 py-2 hover:bg-slate-100">Copy Payment Link</button></li>
                                                        </>
                                                    )}
                                                    <li className="border-t my-1"></li>
                                                    <li><button onClick={() => { const newStatus = rec.status === InvoiceStatus.PAID ? InvoiceStatus.UNPAID : InvoiceStatus.PAID; handleUpdateInvoiceStatus(rec.id, newStatus); setOpenActionMenu(null); }} className="w-full text-left px-4 py-2 hover:bg-slate-100">Mark as {rec.status === InvoiceStatus.PAID ? 'Unpaid' : 'Paid'}</button></li>
                                                    {rec.paymentLink && rec.status === InvoiceStatus.UNPAID && (
                                                        <li><button onClick={() => { handleUpdateInvoiceStatus(rec.id, InvoiceStatus.PAID); setOpenActionMenu(null); }} className="w-full text-left px-4 py-2 hover:bg-slate-100 text-green-600 font-semibold">Simulate Client Payment</button></li>
                                                    )}
                                                </ul>
                                            </div>
                                        )}
                                    </td>
                                </li>
                            ))}
                        </ul>
                    </div>
                </Card>
            )}
        </div>
    );
};

export default GSTCalculator;
