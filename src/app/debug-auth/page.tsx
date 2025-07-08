'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { fetchGetWithAuth, fetchPostWithAuth } from '@/lib/fetch-with-auth';
import { CheckCircle, XCircle, AlertCircle, Loader2 } from 'lucide-react';

interface AuthStatus {
  authenticated: boolean;
  userId: string | null;
  userEmail: string | null;
  hasProfile: boolean;
  onboardingCompleted: boolean;
  sessionExists: boolean;
  accessTokenExists: boolean;
  cookieAnalysis: {
    hasCookies: boolean;
    cookieCount: number;
    hasSupabaseCookies: boolean;
  };
}

interface TestResult {
  name: string;
  status: 'pending' | 'success' | 'error';
  message: string;
  details?: any;
}

export default function AuthDebugPage() {
  const [authStatus, setAuthStatus] = useState<AuthStatus | null>(null);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isRunningTests, setIsRunningTests] = useState(false);
  const [storeUrl, setStoreUrl] = useState('https://test-store.tiendanube.com');

  const addTestResult = (result: TestResult) => {
    setTestResults(prev => [...prev, result]);
  };

  const checkAuthStatus = async () => {
    try {
      addTestResult({
        name: 'Authentication Status',
        status: 'pending',
        message: 'Checking authentication status...'
      });

      const response = await fetchGetWithAuth('/api/debug/auth-status');
      const data = await response.json();

      if (data.success) {
        setAuthStatus(data.data);
        addTestResult({
          name: 'Authentication Status',
          status: 'success',
          message: `Authenticated: ${data.data.authenticated}`,
          details: data.data
        });
      } else {
        addTestResult({
          name: 'Authentication Status',
          status: 'error',
          message: data.error || 'Failed to check auth status',
          details: data
        });
      }
    } catch (error) {
      addTestResult({
        name: 'Authentication Status',
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  const testCookieDiagnosis = async () => {
    try {
      addTestResult({
        name: 'Cookie Diagnosis',
        status: 'pending',
        message: 'Analyzing cookies and headers...'
      });

      const response = await fetchGetWithAuth('/api/debug/cookie-diagnosis');
      const data = await response.json();

      if (response.ok && data.success) {
        addTestResult({
          name: 'Cookie Diagnosis',
          status: 'success',
          message: `Cookies: ${data.data.cookieAnalysis.totalCookies}, Supabase: ${data.data.cookieAnalysis.supabaseCookies.length}, Auth: ${data.data.supabaseTest.hasUser ? 'YES' : 'NO'}`,
          details: data.data
        });
      } else {
        addTestResult({
          name: 'Cookie Diagnosis',
          status: 'error',
          message: data.error || `HTTP ${response.status}: ${response.statusText}`,
          details: data
        });
      }
    } catch (error) {
      addTestResult({
        name: 'Cookie Diagnosis',
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  const testStoreConnection = async () => {
    try {
      addTestResult({
        name: 'Store Connection Test',
        status: 'pending',
        message: 'Testing store connection...'
      });

      const response = await fetchPostWithAuth('/api/tiendanube/oauth/connect', {
        storeUrl: storeUrl,
        storeName: 'Test Store',
        context: 'configuration'
      });

      const data = await response.json();

      if (response.ok && data.success) {
        addTestResult({
          name: 'Store Connection Test',
          status: 'success',
          message: 'OAuth URL generated successfully! 🎉',
          details: { authUrl: data.data?.authUrl }
        });
      } else {
        addTestResult({
          name: 'Store Connection Test',
          status: 'error',
          message: data.error || `HTTP ${response.status}: ${response.statusText}`,
          details: data
        });
      }
    } catch (error) {
      addTestResult({
        name: 'Store Connection Test',
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  const testCookiePost = async () => {
    try {
      addTestResult({
        name: 'Cookie POST Test',
        status: 'pending',
        message: 'Testing POST endpoint with same logic as oauth/connect...'
      });

      const response = await fetchPostWithAuth('/api/debug/cookie-diagnosis', {
        storeUrl: storeUrl,
        storeName: 'Test Store',
        context: 'configuration'
      });

      const data = await response.json();

      if (response.ok && data.success) {
        addTestResult({
          name: 'Cookie POST Test',
          status: 'success',
          message: 'POST endpoint works! OAuth should work too! ✅',
          details: data.data
        });
      } else {
        addTestResult({
          name: 'Cookie POST Test',
          status: 'error',
          message: data.error || `HTTP ${response.status}: ${response.statusText}`,
          details: data
        });
      }
    } catch (error) {
      addTestResult({
        name: 'Cookie POST Test',
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  const runAllTests = async () => {
    setIsRunningTests(true);
    setTestResults([]);

    await checkAuthStatus();
    await new Promise(resolve => setTimeout(resolve, 500)); // Small delay

    await testCookieDiagnosis();
    await new Promise(resolve => setTimeout(resolve, 500)); // Small delay

    await testCookiePost();
    await new Promise(resolve => setTimeout(resolve, 500)); // Small delay

    await testStoreConnection();

    setIsRunningTests(false);
  };

  useEffect(() => {
    runAllTests();
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'pending':
        return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'bg-green-100 text-green-800';
      case 'error':
        return 'bg-red-100 text-red-800';
      case 'pending':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold">🔐 Authentication & Store Connection Test</h1>
          <p className="text-gray-600 mt-2">Testing authentication flow and store connection functionality</p>
        </div>

        {/* Auth Status Card */}
        {authStatus && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {authStatus.authenticated ? 
                  <CheckCircle className="h-5 w-5 text-green-500" /> : 
                  <XCircle className="h-5 w-5 text-red-500" />
                }
                Authentication Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm font-medium">Authenticated</p>
                  <Badge className={authStatus.authenticated ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                    {authStatus.authenticated ? 'Yes ✅' : 'No ❌'}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm font-medium">User ID</p>
                  <p className="text-sm text-gray-600 truncate">{authStatus.userId || 'None'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Email</p>
                  <p className="text-sm text-gray-600">{authStatus.userEmail || 'None'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Has Profile</p>
                  <Badge className={authStatus.hasProfile ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                    {authStatus.hasProfile ? 'Yes ✅' : 'No ❌'}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm font-medium">Onboarding</p>
                  <Badge className={authStatus.onboardingCompleted ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}>
                    {authStatus.onboardingCompleted ? 'Complete ✅' : 'Incomplete ⚠️'}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm font-medium">Auth Cookies</p>
                  <Badge className={authStatus.cookieAnalysis.hasSupabaseCookies ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                    {authStatus.cookieAnalysis.hasSupabaseCookies ? 'Present ✅' : 'Missing ❌'}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Store URL Input */}
        <Card>
          <CardHeader>
            <CardTitle>Store Connection Test Configuration</CardTitle>
            <CardDescription>Configure the store URL to test connection</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <input
                type="url"
                value={storeUrl}
                onChange={(e) => setStoreUrl(e.target.value)}
                placeholder="https://your-store.tiendanube.com"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <Button onClick={runAllTests} disabled={isRunningTests}>
                {isRunningTests ? 'Running...' : 'Run Tests'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Test Results */}
        <Card>
          <CardHeader>
            <CardTitle>Test Results</CardTitle>
            <CardDescription>Results from authentication and connection tests</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {testResults.map((result, index) => (
                <div key={index} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(result.status)}
                      <h3 className="font-medium">{result.name}</h3>
                    </div>
                    <Badge className={getStatusColor(result.status)}>
                      {result.status}
                    </Badge>
                  </div>
                  
                  <p className="text-sm text-gray-600 mt-2">{result.message}</p>
                  
                  {result.details && (
                    <details className="mt-2">
                      <summary className="text-sm font-medium cursor-pointer">View Details</summary>
                      <pre className="text-xs bg-gray-50 p-2 rounded mt-2 overflow-auto">
                        {JSON.stringify(result.details, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              ))}
              
              {testResults.length === 0 && !isRunningTests && (
                <p className="text-gray-500 text-center py-4">No tests run yet. Click &quot;Run Tests&quot; to start.</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Instructions */}
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>🔍 DIAGNÓSTICO COMPLETO:</strong> Si ves &quot;Authenticated: Yes&quot;, &quot;Cookie Diagnosis: success&quot;, &quot;Cookie POST Test: success&quot; y &quot;Store Connection Test: success&quot;, 
            entonces tu problema está 100% resuelto. Si &quot;Cookie POST Test&quot; funciona pero &quot;Store Connection Test&quot; falla, hay un bug específico en oauth/connect.
            Si algún test falla, los detalles te dirán exactamente qué arreglar.
          </AlertDescription>
        </Alert>

        {/* Quick Navigation */}
        <Card>
          <CardHeader>
            <CardTitle>🚀 Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2 flex-wrap">
              <Button 
                onClick={() => window.location.href = '/dashboard'}
                variant="outline"
              >
                ← Volver al Dashboard
              </Button>
              <Button 
                onClick={() => window.location.href = '/dashboard?tab=configuration'}
                variant="outline"
              >
                Ir a Configuración
              </Button>
              <Button 
                onClick={() => window.location.href = '/auth/signin'}
                variant="outline"
              >
                Login Again
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 