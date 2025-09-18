
import React from 'react';

interface HeaderProps {
    title: string;
    children?: React.ReactNode;
}

const Header: React.FC<HeaderProps> = ({ title, children }) => {
  return (
    <header className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-800 tracking-tight">
          {title}
        </h1>
      </div>
      <div className="flex items-center gap-2">
        {children}
      </div>
    </header>
  );
};

export default Header;
