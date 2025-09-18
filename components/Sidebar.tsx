
import React from 'react';
import type { View } from '../types';

interface SidebarProps {
    activeView: View;
    setActiveView: (view: View) => void;
}

const NavLink: React.FC<{
    icon: React.ReactNode;
    label: string;
    isActive: boolean;
    onClick: () => void;
    isSubItem?: boolean;
}> = ({ icon, label, isActive, onClick, isSubItem = false }) => {
    const baseClasses = `flex items-center w-full px-4 py-3 text-sm font-medium rounded-lg transition-colors duration-200 ${isSubItem ? 'pl-11' : ''}`;
    const activeClasses = "bg-indigo-600 text-white";
    const inactiveClasses = "text-slate-300 hover:bg-slate-700 hover:text-white";

    return (
        <li>
            <a
                href="#"
                onClick={(e) => {
                    e.preventDefault();
                    onClick();
                }}
                className={`${baseClasses} ${isActive ? activeClasses : inactiveClasses}`}
                aria-current={isActive ? 'page' : undefined}
            >
                {icon && <span className="mr-3">{icon}</span>}
                <span>{label}</span>
            </a>
        </li>
    );
};

const DashboardIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
    </svg>
);
const SalesIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
);
const PurchasesIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
);
const ItemsIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
    </svg>
);
const ClientsIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
);
const VendorsIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
    </svg>
);
const ReportsIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
);
const GstFilingIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a2 2 0 01-2 2H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V12z" />
    </svg>
);
const RecurringIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h5M20 20v-5h-5M4 4l5 5M20 20l-5-5" />
    </svg>
);
const SettingsIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
);
const LogoIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" viewBox="0 0 20 20" fill="currentColor">
        <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
    </svg>
);


const Sidebar: React.FC<SidebarProps> = ({ activeView, setActiveView }) => {
    return (
        <aside className="w-64 flex-shrink-0 bg-slate-800 flex flex-col">
            <div className="h-16 flex items-center justify-center px-4 flex-shrink-0 border-b border-slate-700">
                 <div className="flex items-center space-x-3">
                    <LogoIcon />
                    <h1 className="text-xl font-bold text-white tracking-tight">
                        GST Pro
                    </h1>
                </div>
            </div>
            <nav className="flex-1 p-4 space-y-2">
                <ul>
                    <NavLink
                        icon={<DashboardIcon />}
                        label="Dashboard"
                        isActive={activeView === 'dashboard'}
                        onClick={() => setActiveView('dashboard')}
                    />
                    
                    <li className="pt-4 pb-2 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Operations</li>
                    
                    <NavLink
                        icon={<SalesIcon />}
                        label="Sales"
                        isActive={activeView === 'sales'}
                        onClick={() => setActiveView('sales')}
                    />
                     <NavLink
                        icon={<RecurringIcon />}
                        label="Recurring Invoices"
                        isActive={activeView === 'recurring_invoices'}
                        onClick={() => setActiveView('recurring_invoices')}
                        isSubItem={false}
                    />
                    <NavLink
                        icon={<PurchasesIcon />}
                        label="Purchases"
                        isActive={activeView === 'purchases'}
                        onClick={() => setActiveView('purchases')}
                    />
                    
                    <li className="pt-4 pb-2 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Compliance</li>
                    
                    <NavLink
                        icon={<ReportsIcon />}
                        label="Reports"
                        isActive={activeView === 'reports'}
                        onClick={() => setActiveView('reports')}
                    />
                     <NavLink
                        icon={<GstFilingIcon />}
                        label="GST Filing"
                        isActive={activeView === 'gst_filing'}
                        onClick={() => setActiveView('gst_filing')}
                    />

                     <li className="pt-4 pb-2 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Manage</li>
                    <NavLink
                        icon={<ItemsIcon />}
                        label="Items"
                        isActive={activeView === 'inventory'}
                        onClick={() => setActiveView('inventory')}
                    />
                    <NavLink
                        icon={<ClientsIcon />}
                        label="Clients"
                        isActive={activeView === 'clients'}
                        onClick={() => setActiveView('clients')}
                    />
                     <NavLink
                        icon={<VendorsIcon />}
                        label="Vendors"
                        isActive={activeView === 'vendors'}
                        onClick={() => setActiveView('vendors')}
                    />
                    <NavLink
                        icon={<SettingsIcon />}
                        label="Settings"
                        isActive={activeView === 'settings'}
                        onClick={() => setActiveView('settings')}
                    />
                </ul>
            </nav>
            <div className="p-4 text-xs text-slate-400 text-center">
                 © {new Date().getFullYear()} GST Pro
            </div>
        </aside>
    );
};

export default Sidebar;
