"use client";

import { Suspense } from 'react';
import { DashboardContent } from '@/components/dashboard/dashboard-content';

export default function DashboardPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg">Loading dashboard...</div>
      </div>
    }>
      <DashboardContent />
    </Suspense>
  );
} 