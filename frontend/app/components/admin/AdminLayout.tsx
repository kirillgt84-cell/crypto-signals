'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import Sidebar from './Sidebar';
import Header from './Header';

interface AdminLayoutProps {
  children: React.ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      
      <div className="ml-16 lg:ml-64 transition-all duration-300">
        <Header />
        
        <main className="p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
