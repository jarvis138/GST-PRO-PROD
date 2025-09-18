import React from 'react';
import type { CalculationResult, GstBreakdownDetail } from '../types';
import { TransactionType } from '../types';

interface ResultDisplayProps {
  results: CalculationResult | null;
  currencySymbol?: string;
  transactionType: TransactionType;
}

const formatCurrency = (amount: number, symbol: string) => {
  return `${symbol}${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const ResultDisplay: React.FC<ResultDisplayProps> = ({ results, currencySymbol = '₹', transactionType }) => {
  if (!results || results.grandTotal === 0) {
    return (
      <div className="text-center p-8 bg-slate-100 rounded-lg">
        <p className="text-slate-500">Enter item details to see the calculation.</p>
      </div>
    );
  }

  const { totalNetAmount, grandTotal, gstBreakdown } = results;

  const renderGstBreakdown = (detail: GstBreakdownDetail) => {
    const { rate, gstAmount, taxableAmount } = detail;
    if (transactionType === TransactionType.INTRA_STATE) {
      const halfGst = gstAmount / 2;
      const halfRate = rate / 2;
      return (
        <React.Fragment key={`gst-rate-${rate}`}>
          <div className="flex justify-between items-center py-2 border-b border-slate-100">
            <span className="text-slate-600 text-sm">CGST @ {halfRate}%</span>
            <span className="font-medium text-slate-700">{formatCurrency(halfGst, currencySymbol)}</span>
          </div>
          <div className="flex justify-between items-center py-2 border-b border-slate-200">
            <span className="text-slate-600 text-sm">SGST @ {halfRate}%</span>
            <span className="font-medium text-slate-700">{formatCurrency(halfGst, currencySymbol)}</span>
          </div>
        </React.Fragment>
      );
    } else { // INTER_STATE
      return (
        <div key={`gst-rate-${rate}`} className="flex justify-between items-center py-3 border-b border-slate-200">
          <span className="text-slate-600">IGST @ {rate}%</span>
          <span className="font-medium text-slate-800 text-lg">{formatCurrency(gstAmount, currencySymbol)}</span>
        </div>
      );
    }
  };


  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center py-3 border-b border-slate-200">
        <span className="text-slate-600">Total Taxable Value</span>
        <span className="font-medium text-slate-800 text-lg">{formatCurrency(totalNetAmount, currencySymbol)}</span>
      </div>
      
      {gstBreakdown.sort((a,b) => a.rate - b.rate).map(renderGstBreakdown)}

      <div className="flex justify-between items-center pt-4 bg-indigo-50 text-indigo-800 -mx-6 px-6 py-4 rounded-b-xl">
        <span className="font-bold text-lg">Grand Total</span>
        <span className="font-bold text-2xl tracking-tight">{formatCurrency(grandTotal, currencySymbol)}</span>
      </div>
    </div>
  );
};

export default ResultDisplay;
