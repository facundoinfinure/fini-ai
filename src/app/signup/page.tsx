"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { Loader2, Mail, Bot, Store, CheckCircle, Eye, EyeOff, ShoppingBag, BarChart3, MessageSquare, Users, TrendingUp, Zap } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";

interface PasswordRequirement {
  text: string;
  met: boolean;
}

export default function SignUpPage() {
  const router = useRouter();
  const { user, loading, signInWithEmail, signInWithGoogle } = useAuth();
  
  // Step management
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Form data
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Password validation
  const [passwordRequirements, setPasswordRequirements] = useState<PasswordRequirement[]>([
    { text: "Between 8 and 64 characters", met: false },
    { text: "At least one uppercase letter", met: false },
    { text: "At least one lowercase letter", met: false },
    { text: "At least one number", met: false },
    { text: "At least one special character", met: false },
  ]);

  // Redirect if user is already signed in
  useEffect(() => {
    if (user && !loading) {
      router.push("/onboarding");
    }
  }, [user, loading, router]);

  // Password validation
  useEffect(() => {
    const requirements = [
      { text: "Between 8 and 64 characters", met: password.length >= 8 && password.length <= 64 },
      { text: "At least one uppercase letter", met: /[A-Z]/.test(password) },
      { text: "At least one lowercase letter", met: /[a-z]/.test(password) },
      { text: "At least one number", met: /\d/.test(password) },
      { text: "At least one special character", met: /[!@#$%^&*(),.?":{}|<>]/.test(password) },
    ];
    setPasswordRequirements(requirements);
  }, [password]);

  const isPasswordValid = passwordRequirements.every(req => req.met);
  const passwordStrength = passwordRequirements.filter(req => req.met).length;

  const getPasswordStrengthColor = () => {
    if (passwordStrength <= 2) return 'bg-red-500';
    if (passwordStrength <= 3) return 'bg-yellow-500';
    if (passwordStrength <= 4) return 'bg-blue-500';
    return 'bg-green-500';
  };

  const getPasswordStrengthText = () => {
    if (passwordStrength <= 2) return 'Weak';
    if (passwordStrength <= 3) return 'Fair';
    if (passwordStrength <= 4) return 'Good';
    return 'Strong';
  };

  // Show loading while checking auth state
  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  const handleGoogleSignUp = async () => {
    setIsLoading(true);
    setError("");
    setSuccess("");
    
    const result = await signInWithGoogle();
    
    if (!result.success) {
      setError(result.error || "Error signing up with Google");
      setIsLoading(false);
    }
    // If successful, the auth hook will handle the redirect
  };

  const handleTiendaNubeSignUp = () => {
    // TODO: Implement Tienda Nube connection logic
    console.log('[INFO] Tienda Nube connection will be implemented soon');
    setError("Feature coming soon");
  };

  const handleNextStep = () => {
    if (currentStep === 1 && email) {
      setCurrentStep(2);
      setError("");
    }
  };

  const handleBackStep = () => {
    if (currentStep === 2) {
      setCurrentStep(1);
      setError("");
    }
  };

  const handleEmailSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    setSuccess("");

    if (!email) {
      setError("Please enter your email");
      setIsLoading(false);
      return;
    }

    const result = await signInWithEmail(email);

    if (result.success) {
      setSuccess("Email sent! Check your inbox to complete your registration.");
      setEmail("");
      setCurrentStep(1);
    } else {
      setError(result.error || "Error sending email");
    }
    
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-white flex">
      {/* Left side - Sign up form */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center px-4 sm:px-6 lg:px-12 xl:px-16">
        {/* Header */}
        <div className="flex items-center mb-8">
          <div className="p-2 bg-gray-900 rounded-lg">
            <Bot className="h-5 w-5 text-white" />
          </div>
          <div className="ml-3">
            <h1 className="text-lg font-semibold text-gray-900">Fini AI</h1>
          </div>
        </div>

        <div className="max-w-sm w-full mx-auto lg:mx-0">
          {/* Main title */}
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">
              Create your account
            </h2>
            <p className="text-gray-600">
              Start with Fini AI for free
            </p>
          </div>

          {/* Error Alert */}
          {error && (
            <Alert variant="destructive" className="mb-6">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Success Alert */}
          {success && (
            <Alert className="mb-6 border-green-200 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">{success}</AlertDescription>
            </Alert>
          )}

          {/* Social Sign Up Options */}
          <div className="space-y-3 mb-6">
            {/* Google Sign Up */}
            <Button
              onClick={handleGoogleSignUp}
              disabled={isLoading}
              variant="outline"
              className="w-full h-12 text-left justify-start font-medium border-gray-300 hover:bg-gray-50"
            >
              <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continue with Google
            </Button>

            {/* Tienda Nube Sign Up */}
            <Button
              onClick={handleTiendaNubeSignUp}
              disabled={isLoading}
              variant="outline"
              className="w-full h-12 text-left justify-start font-medium border-gray-300 hover:bg-gray-50"
            >
              <Store className="w-5 h-5 mr-3" />
              Continue with Tienda Nube
            </Button>
          </div>

          {/* Divider */}
          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-gray-300" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="bg-white px-2 text-gray-500">or</span>
            </div>
          </div>

          {/* Step-based form */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  Email address
                </label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your.email@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-12"
                  autoComplete="email"
                />
              </div>
              <Button
                onClick={handleNextStep}
                className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-medium"
                disabled={!email}
              >
                Continue
              </Button>
            </div>
          )}

          {currentStep === 2 && (
            <form onSubmit={handleEmailSignUp} className="space-y-4">
              <div>
                <label htmlFor="email-step2" className="block text-sm font-medium text-gray-700 mb-1">
                  Email address
                </label>
                <Input
                  id="email-step2"
                  type="email"
                  value={email}
                  disabled
                  className="h-12 bg-gray-50"
                />
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-medium"
              >
                {isLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Mail className="mr-2 h-4 w-4" />
                )}
                Send verification email
              </Button>
              
              <Button
                type="button"
                variant="outline"
                onClick={handleBackStep}
                className="w-full h-12"
                disabled={isLoading}
              >
                Back
              </Button>
            </form>
          )}

          {/* Sign in link */}
          <div className="mt-6 text-center">
            <span className="text-gray-600">Already have an account? </span>
            <Link
              href="/auth/signin"
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              Sign in
            </Link>
          </div>
        </div>
      </div>

      {/* Right side - Benefits illustration */}
      <div className="hidden lg:flex lg:w-1/2 bg-gray-50 relative overflow-hidden">
        <div className="flex flex-col justify-center px-12 py-16 relative z-10">
          <div className="max-w-md">
            <h2 className="text-3xl font-bold text-gray-900 mb-8 leading-tight">
              Connect your store and start getting insights instantly
            </h2>
            
            {/* Feature highlights */}
            <div className="space-y-6">
              <div className="flex items-start">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center mr-4 flex-shrink-0">
                  <Store className="h-4 w-4 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">Easy Store Connection</h3>
                  <p className="text-gray-600 text-sm">Connect your Tienda Nube store in seconds</p>
                </div>
              </div>

              <div className="flex items-start">
                <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center mr-4 flex-shrink-0">
                  <MessageSquare className="h-4 w-4 text-green-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">WhatsApp Integration</h3>
                  <p className="text-gray-600 text-sm">Chat with your store data through WhatsApp</p>
                </div>
              </div>

              <div className="flex items-start">
                <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center mr-4 flex-shrink-0">
                  <BarChart3 className="h-4 w-4 text-purple-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">Smart Analytics</h3>
                  <p className="text-gray-600 text-sm">Get AI-powered insights about your business</p>
                </div>
              </div>

              <div className="flex items-start">
                <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center mr-4 flex-shrink-0">
                  <TrendingUp className="h-4 w-4 text-orange-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">Growth Recommendations</h3>
                  <p className="text-gray-600 text-sm">Receive personalized suggestions to grow your business</p>
                </div>
              </div>
            </div>

            {/* Trust indicators */}
            <div className="mt-12 pt-6 border-t border-gray-200">
              <p className="text-sm text-gray-500 mb-4">Join thousands of businesses</p>
              <div className="flex items-center space-x-6">
                <div className="flex items-center">
                  <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                  <span className="text-sm text-gray-600">Free to start</span>
                </div>
                <div className="flex items-center">
                  <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                  <span className="text-sm text-gray-600">No credit card required</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Background decoration */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full blur-3xl opacity-50"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-green-100 to-blue-100 rounded-full blur-3xl opacity-50"></div>
      </div>
    </div>
  );
} 