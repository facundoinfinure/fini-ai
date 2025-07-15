"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import StripePricingTable from "@/components/dashboard/stripe-pricing-table";
import { motion, AnimatePresence } from "framer-motion";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  CheckCircle, 
  ArrowRight, 
  Sparkles, 
  Users, 
  BarChart3, 
  MessageSquare,
  Zap,
  Crown,
  ExternalLink,
  ChevronRight
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function OnboardingPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [currentStep, setCurrentStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Form data
  const [email, setEmail] = useState("");
  const [workEmail, setWorkEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [selectedPlan, setSelectedPlan] = useState<"basic" | "pro">("pro"); // Default to Pro like Qatalog recommends
  const [showPricingDetails, setShowPricingDetails] = useState(false);

  // Check if user is authenticated and handle onboarding state
  useEffect(() => {
    if (loading) return;
    
    if (!user) {
      router.push("/auth/signin");
      return;
    }

    // Check if user has already completed onboarding
    checkOnboardingStatus();
    
    // Initialize user data
    if (user) {
      setEmail(user.email || "");
      setWorkEmail(user.email || "");
      setFullName(user.user_metadata?.full_name || user.user_metadata?.name || "");
    }
  }, [user, loading, router]);

  const checkOnboardingStatus = async () => {
    try {
      const response = await fetch("/api/user/complete-onboarding", { method: 'GET' });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data?.completed) {
          // User has already completed onboarding, redirect to dashboard
          router.push("/dashboard");
          return;
        }
      }
    } catch (error) {
      console.error('[ERROR] Error checking onboarding status:', error);
    }
  };

  const handleContinue = () => {
    if (currentStep === 0) {
      // Email validation step (similar to Qatalog)
      if (!workEmail.trim() || !workEmail.includes('@')) {
        setError('Please enter a valid work email');
        return;
      }
      setError('');
      setCurrentStep(1);
    } else if (currentStep === 1) {
      // Go to trial signup
      setCurrentStep(2);
    }
  };

  const handleSkipToSetup = () => {
    // Complete onboarding and go to guided setup
    completeOnboardingAndRedirect();
  };

  const completeOnboardingAndRedirect = async () => {
    setIsLoading(true);
    
    try {
      // Mark onboarding as completed
      const response = await fetch('/api/user/complete-onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: fullName.trim(),
          workEmail: workEmail.trim(),
          selectedPlan,
          skipPayment: true // For now, allow skipping payment
        })
      });

      if (response.ok) {
        // Redirect to dashboard with guided setup
        router.push('/dashboard?guided=true');
      } else {
        setError('Failed to complete setup. Please try again.');
      }
    } catch (error) {
      console.error('[ERROR] Error completing onboarding:', error);
      setError('Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStripePlanSelected = (plan: 'basic' | 'pro', billing: 'monthly' | 'annual') => {
    console.log('[INFO] Stripe plan selected:', { plan, billing });
    setSelectedPlan(plan);
    // Stripe handles payment, then redirects back
  };

  // Show loading while checking auth
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Setting up your account...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header - Similar to Qatalog */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-gradient-to-r from-gray-900 to-gray-700 rounded-lg flex items-center justify-center mr-3">
                <span className="text-white font-bold text-sm">F</span>
              </div>
              <div>
                <h1 className="text-lg font-semibold text-gray-900">Fini AI</h1>
              </div>
            </div>
            {currentStep < 2 && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleSkipToSetup}
                className="text-gray-600 hover:text-gray-900"
              >
                Skip to setup
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex items-center justify-center min-h-[calc(100vh-64px)] py-12">
        <div className="w-full max-w-md mx-auto px-6">
          <AnimatePresence mode="wait">
            {/* Step 0: Work Email Entry - Similar to Qatalog */}
            {currentStep === 0 && (
              <motion.div
                key="step-0"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="text-center"
              >
                <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl mb-6">
                  <Sparkles className="w-8 h-8 text-white" />
                </div>
                
                <h1 className="text-2xl font-bold text-gray-900 mb-3">
                  Please enter your work email
                </h1>
                
                <p className="text-gray-600 mb-8">
                  We'll send you a magic link
                </p>

                {error && (
                  <Alert variant="destructive" className="mb-6">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <div className="space-y-4">
                  <Input
                    type="email"
                    placeholder="jane@company.com"
                    value={workEmail}
                    onChange={(e) => setWorkEmail(e.target.value)}
                    className="text-center text-lg h-12"
                    autoFocus
                  />
                  
                  <Button 
                    onClick={handleContinue}
                    className="w-full h-12 text-lg bg-gray-900 hover:bg-gray-800"
                    disabled={!workEmail.trim()}
                  >
                    Continue
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>
                </div>

                <p className="text-xs text-gray-500 mt-8">
                  By continuing, you agree to our Terms of Service and Privacy Policy
                </p>
              </motion.div>
            )}

            {/* Step 1: Welcome Message */}
            {currentStep === 1 && (
              <motion.div
                key="step-1"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="text-center"
              >
                <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-green-500 to-blue-500 rounded-2xl mb-6">
                  <CheckCircle className="w-8 h-8 text-white" />
                </div>
                
                <h1 className="text-2xl font-bold text-gray-900 mb-3">
                  Perfect! Let's get started
                </h1>
                
                <p className="text-gray-600 mb-8">
                  Choose your plan to unlock AI-powered analytics for your store
                </p>

                {/* Quick Features Preview */}
                <div className="grid grid-cols-2 gap-4 mb-8">
                  <div className="p-4 bg-white rounded-lg border border-gray-200">
                    <MessageSquare className="w-6 h-6 text-blue-600 mx-auto mb-2" />
                    <p className="text-sm font-medium text-gray-900">WhatsApp Analytics</p>
                    <p className="text-xs text-gray-500">Get insights via chat</p>
                  </div>
                  <div className="p-4 bg-white rounded-lg border border-gray-200">
                    <BarChart3 className="w-6 h-6 text-green-600 mx-auto mb-2" />
                    <p className="text-sm font-medium text-gray-900">Real-time Data</p>
                    <p className="text-xs text-gray-500">Live store metrics</p>
                  </div>
                  <div className="p-4 bg-white rounded-lg border border-gray-200">
                    <Zap className="w-6 h-6 text-purple-600 mx-auto mb-2" />
                    <p className="text-sm font-medium text-gray-900">AI Agents</p>
                    <p className="text-xs text-gray-500">Smart automation</p>
                  </div>
                  <div className="p-4 bg-white rounded-lg border border-gray-200">
                    <Users className="w-6 h-6 text-orange-600 mx-auto mb-2" />
                    <p className="text-sm font-medium text-gray-900">Team Access</p>
                    <p className="text-xs text-gray-500">Collaborate easily</p>
                  </div>
                </div>
                
                <Button 
                  onClick={handleContinue}
                  className="w-full h-12 text-lg bg-blue-600 hover:bg-blue-700"
                >
                  Choose Your Plan
                  <ChevronRight className="w-5 h-5 ml-2" />
                </Button>

                <Button 
                  variant="ghost" 
                  onClick={handleSkipToSetup}
                  className="w-full mt-3 text-gray-600"
                >
                  Start free trial instead
                </Button>
              </motion.div>
            )}

            {/* Step 2: Plan Selection - Similar to Qatalog trial page */}
            {currentStep === 2 && (
              <motion.div
                key="step-2"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="w-full max-w-2xl mx-auto"
              >
                <div className="text-center mb-8">
                  <h1 className="text-3xl font-bold text-gray-900 mb-3">
                    Start your free trial
                  </h1>
                  <p className="text-gray-600">
                    To get started, enter your card details.
                  </p>
                </div>

                {/* Plan Selection Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                  {/* Basic Plan */}
                  <Card className={`relative cursor-pointer transition-all duration-200 ${
                    selectedPlan === 'basic' ? 'ring-2 ring-blue-600 shadow-lg' : 'hover:shadow-md'
                  }`} onClick={() => setSelectedPlan('basic')}>
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-lg">Basic Plan</CardTitle>
                          <CardDescription>Perfect for getting started</CardDescription>
                        </div>
                        <Badge variant="secondary">7 days free</Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="mb-4">
                        <span className="text-2xl font-bold">$29.99</span>
                        <span className="text-gray-600">/month</span>
                      </div>
                      <ul className="space-y-2 text-sm text-gray-600">
                        <li className="flex items-center">
                          <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                          1 store connection
                        </li>
                        <li className="flex items-center">
                          <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                          Basic analytics
                        </li>
                        <li className="flex items-center">
                          <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                          WhatsApp integration
                        </li>
                        <li className="flex items-center">
                          <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                          Email support
                        </li>
                      </ul>
                    </CardContent>
                  </Card>

                  {/* Pro Plan - Recommended */}
                  <Card className={`relative cursor-pointer transition-all duration-200 ${
                    selectedPlan === 'pro' ? 'ring-2 ring-blue-600 shadow-lg' : 'hover:shadow-md'
                  }`} onClick={() => setSelectedPlan('pro')}>
                    <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                      <Badge className="bg-blue-600 text-white">
                        <Crown className="w-3 h-3 mr-1" />
                        Recommended
                      </Badge>
                    </div>
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-lg">Pro Plan</CardTitle>
                          <CardDescription>For growing businesses</CardDescription>
                        </div>
                        <Badge variant="secondary">7 days free</Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="mb-4">
                        <span className="text-2xl font-bold">$49.99</span>
                        <span className="text-gray-600">/month</span>
                      </div>
                      <ul className="space-y-2 text-sm text-gray-600">
                        <li className="flex items-center">
                          <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                          Up to 5 stores
                        </li>
                        <li className="flex items-center">
                          <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                          Advanced analytics & AI
                        </li>
                        <li className="flex items-center">
                          <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                          Multi-agent system
                        </li>
                        <li className="flex items-center">
                          <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                          Priority support
                        </li>
                      </ul>
                    </CardContent>
                  </Card>
                </div>

                {/* Stripe Pricing Table */}
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <StripePricingTable 
                    onPlanSelected={handleStripePlanSelected}
                    showCustomPricing={false}
                  />
                </div>

                {/* Alternative: Skip to setup */}
                <div className="text-center mt-8">
                  <p className="text-gray-600 mb-4">
                    Want to explore first?
                  </p>
                  <Button 
                    variant="outline"
                    onClick={handleSkipToSetup}
                    disabled={isLoading}
                    className="w-full"
                  >
                    {isLoading ? 'Setting up...' : 'Start with free features'}
                    <ExternalLink className="w-4 h-4 ml-2" />
                  </Button>
                </div>

                {/* Trust indicators */}
                <div className="flex justify-center items-center space-x-8 mt-8 text-xs text-gray-500">
                  <div className="flex items-center">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    No charges till trial ends
                  </div>
                  <div className="flex items-center">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Cancel anytime
                  </div>
                </div>

                {error && (
                  <Alert variant="destructive" className="mt-6">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Footer - Qatalog style */}
      <div className="fixed bottom-0 left-0 right-0 bg-gray-900 text-white p-4">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div className="flex items-center">
            <div className="w-6 h-6 bg-white rounded-md flex items-center justify-center mr-3">
              <span className="text-gray-900 font-bold text-xs">F</span>
            </div>
            <span className="font-medium">Fini AI</span>
          </div>
          <div className="text-sm text-gray-400">
            curated by{" "}
            <span className="text-white font-medium">AI Analytics</span>
          </div>
        </div>
      </div>
    </div>
  );
} 