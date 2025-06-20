"use client";

import { useState, useEffect, useCallback } from 'react';
import type { StoreDetails } from '@/types/store';

interface StoreStatus {
  isConnected: boolean;
  store: StoreDetails | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useStore(): StoreStatus {
  const [store, setStore] = useState<StoreDetails | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStoreStatus = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/dashboard/store-status');
      if (!response.ok) {
        throw new Error('Failed to fetch store status');
      }
      const data = await response.json();
      setIsConnected(data.isConnected);
      setStore(data.store);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
      setIsConnected(false);
      setStore(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStoreStatus();
  }, [fetchStoreStatus]);

  return { isConnected, store, isLoading, error, refetch: fetchStoreStatus };
} 