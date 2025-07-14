"use client";

import { Suspense } from 'react';
import { DashboardContent } from '@/components/dashboard/dashboard-content';

export default function DashboardPage() {
  // 🔴 DEBUG - PÁGINA PRINCIPAL DASHBOARD EJECUTÁNDOSE
  console.log('🔴🔴🔴 DASHBOARD PAGE SE ESTÁ EJECUTANDO! 🔴🔴🔴');
  console.log('🔴 About to render DashboardContent');
  
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg">🔴 Loading dashboard...</div>
      </div>
    }>
      <DashboardContent />
    </Suspense>
  );
} 