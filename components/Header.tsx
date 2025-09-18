
import React from 'react';

interface HeaderProps {
    title: string;
    onMenuClick: () => void;
}

const MenuIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
    </svg>
);


const Header: React.FC<HeaderProps> = ({ title, onMenuClick }) => {
  return (
    <header className="flex-shrink-0 bg-white border-b border-slate-200">
        <div className="flex items-center justify-between h-16 px-4 sm:px-6 lg:px-8">
            <div className="flex items-center">
                 <button 
                    onClick={onMenuClick}
                    className="lg:hidden mr-4 text-slate-500 hover:text-slate-700"
                    aria-label="Open sidebar"
                 >
                    <MenuIcon />
                </button>
                <h1 className="text-xl font-bold text-slate-800 tracking-tight">
                    {title}
                </h1>
            </div>
        </div>
    </header>
  );
};

export default Header;
