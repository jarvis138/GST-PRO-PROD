
import React from 'react';

const Footer: React.FC = () => {
  return (
    <footer className="w-full text-center p-4">
      <p className="text-sm text-slate-500">
        © {new Date().getFullYear()} GST Calculator Pro. Built for modern businesses.
      </p>
    </footer>
  );
};

export default Footer;
