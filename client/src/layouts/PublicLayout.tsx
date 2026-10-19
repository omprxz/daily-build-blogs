import React from 'react';
import { Outlet } from 'react-router-dom';
import { Navbar } from '../components/Navbar.js';
import { Footer } from '../components/Footer.js';

export const PublicLayout: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col editorial-bg-ambient text-ink-900 dark:text-ink-100 transition-colors duration-200">
      <Navbar />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
};
