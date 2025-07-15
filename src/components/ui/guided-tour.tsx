"use client";

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ArrowRight, Sparkles, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface GuidedTourStep {
  id: string;
  title: string;
  description: string;
  targetElement?: string; // CSS selector
  position?: 'top' | 'bottom' | 'left' | 'right';
  action?: {
    type: 'click' | 'navigate';
    target: string;
    label: string;
  };
}

interface GuidedTourProps {
  isActive: boolean;
  onComplete: () => void;
  onDismiss: () => void;
}

const tourSteps: GuidedTourStep[] = [
  {
    id: 'welcome',
    title: "Welcome to Fini AI!",
    description: "Let's get you set up in just a few simple steps. We'll help you connect your store and start getting AI-powered insights.",
    position: 'bottom'
  },
  {
    id: 'connect-store',
    title: "Let's start by connecting your store",
    description: "Click the Settings tab to connect your Tienda Nube store. This is the foundation for all your analytics.",
    targetElement: '[data-tour="settings-tab"]',
    position: 'right',
    action: {
      type: 'click',
      target: 'settings-tab',
      label: 'Go to Settings'
    }
  },
  {
    id: 'store-connection',
    title: "Connect your first store",
    description: "Click 'Connect Store' to link your Tienda Nube account. We'll automatically sync your products, orders, and customer data.",
    targetElement: '[data-tour="connect-store-button"]',
    position: 'top',
    action: {
      type: 'click',
      target: 'connect-store',
      label: 'Connect Store'
    }
  },
  {
    id: 'whatsapp-setup',
    title: "Configure WhatsApp (Optional)",
    description: "Set up WhatsApp to receive analytics directly on your phone. You can skip this for now and set it up later.",
    targetElement: '[data-tour="whatsapp-section"]',
    position: 'top'
  },
  {
    id: 'explore-chat',
    title: "Ready to explore!",
    description: "Once your store is connected, head to the Chat tab to start asking questions about your business. Try asking 'What are my top products?'",
    action: {
      type: 'navigate',
      target: '/dashboard?tab=chat',
      label: 'Try the Chat'
    }
  }
];

export function GuidedTour({ isActive, onComplete, onDismiss }: GuidedTourProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [targetPosition, setTargetPosition] = useState({ x: 0, y: 0 });

  const currentStep = tourSteps[currentStepIndex];

  useEffect(() => {
    if (isActive) {
      setIsVisible(true);
      updateTooltipPosition();
    } else {
      setIsVisible(false);
    }
  }, [isActive, currentStepIndex]);

  useEffect(() => {
    const handleResize = () => {
      if (isVisible) {
        updateTooltipPosition();
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isVisible, currentStep]);

  const updateTooltipPosition = () => {
    if (currentStep.targetElement) {
      const target = document.querySelector(currentStep.targetElement);
      if (target) {
        const rect = target.getBoundingClientRect();
        setTargetPosition({
          x: rect.left + rect.width / 2,
          y: rect.top + rect.height / 2
        });
      }
    } else {
      // Center of screen for non-targeted steps
      setTargetPosition({
        x: window.innerWidth / 2,
        y: window.innerHeight / 3
      });
    }
  };

  const handleNext = () => {
    if (currentStepIndex < tourSteps.length - 1) {
      setCurrentStepIndex(currentStepIndex + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(currentStepIndex - 1);
    }
  };

  const handleComplete = () => {
    setIsVisible(false);
    onComplete();
  };

  const handleDismiss = () => {
    setIsVisible(false);
    onDismiss();
  };

  const handleActionClick = () => {
    if (currentStep.action) {
      if (currentStep.action.type === 'click') {
        const target = document.querySelector(`[data-tour="${currentStep.action.target}"]`);
        if (target) {
          (target as HTMLElement).click();
        }
      } else if (currentStep.action.type === 'navigate') {
        window.location.href = currentStep.action.target;
      }
    }
    handleNext();
  };

  const getTooltipPosition = () => {
    const tooltipWidth = 320;
    const tooltipHeight = 200;
    const margin = 20;

    let x = targetPosition.x - tooltipWidth / 2;
    let y = targetPosition.y;

    // Adjust position based on step position
    switch (currentStep.position) {
      case 'top':
        y = targetPosition.y - tooltipHeight - margin;
        break;
      case 'bottom':
        y = targetPosition.y + margin;
        break;
      case 'left':
        x = targetPosition.x - tooltipWidth - margin;
        y = targetPosition.y - tooltipHeight / 2;
        break;
      case 'right':
        x = targetPosition.x + margin;
        y = targetPosition.y - tooltipHeight / 2;
        break;
      default:
        y = targetPosition.y + margin;
    }

    // Keep tooltip within viewport
    x = Math.max(margin, Math.min(x, window.innerWidth - tooltipWidth - margin));
    y = Math.max(margin, Math.min(y, window.innerHeight - tooltipHeight - margin));

    return { x, y };
  };

  if (!isVisible) return null;

  const tooltipPosition = getTooltipPosition();

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 pointer-events-none">
        {/* Overlay */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/20 pointer-events-auto"
          onClick={handleDismiss}
        />

        {/* Spotlight effect */}
        {currentStep.targetElement && (
          <div className="absolute inset-0">
            <div
              className="absolute bg-white/10 rounded-lg pointer-events-none"
              style={{
                left: targetPosition.x - 60,
                top: targetPosition.y - 60,
                width: 120,
                height: 120,
                boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.3)'
              }}
            />
          </div>
        )}

        {/* Tooltip */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 10 }}
          className="absolute pointer-events-auto"
          style={{
            left: tooltipPosition.x,
            top: tooltipPosition.y,
            width: 320
          }}
        >
          <Card className="shadow-2xl border-blue-200">
            <CardContent className="p-6">
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Sparkles className="w-4 h-4 text-blue-600" />
                  </div>
                  <div className="text-sm text-gray-500">
                    Step {currentStepIndex + 1} of {tourSteps.length}
                  </div>
                </div>
                <button
                  onClick={handleDismiss}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Content */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {currentStep.title}
                </h3>
                <p className="text-gray-600 text-sm leading-relaxed">
                  {currentStep.description}
                </p>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between">
                <div className="flex space-x-2">
                  {currentStepIndex > 0 && (
                    <Button variant="outline" size="sm" onClick={handlePrevious}>
                      Previous
                    </Button>
                  )}
                </div>

                <div className="flex space-x-2">
                  {currentStep.action ? (
                    <Button size="sm" onClick={handleActionClick} className="bg-blue-600 hover:bg-blue-700">
                      {currentStep.action.label}
                      <ArrowRight className="w-3 h-3 ml-1" />
                    </Button>
                  ) : (
                    <Button size="sm" onClick={handleNext} className="bg-blue-600 hover:bg-blue-700">
                      {currentStepIndex === tourSteps.length - 1 ? 'Get Started' : 'Next'}
                      {currentStepIndex === tourSteps.length - 1 ? (
                        <CheckCircle className="w-3 h-3 ml-1" />
                      ) : (
                        <ArrowRight className="w-3 h-3 ml-1" />
                      )}
                    </Button>
                  )}
                </div>
              </div>

              {/* Progress dots */}
              <div className="flex justify-center space-x-1 mt-4">
                {tourSteps.map((_, index) => (
                  <div
                    key={index}
                    className={`w-2 h-2 rounded-full ${
                      index === currentStepIndex ? 'bg-blue-600' : 'bg-gray-300'
                    }`}
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </AnimatePresence>
  );
} 