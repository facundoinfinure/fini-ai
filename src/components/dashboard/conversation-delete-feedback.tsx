/**
 * Conversation Delete Feedback Component
 * 
 * Provides clear visual feedback for conversation deletion
 * to ensure users know when deletions are successful
 */

import React, { useState, useEffect } from 'react';
import { CheckCircle, Trash2, AlertCircle, Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface DeleteFeedbackProps {
  conversationId: string | null;
  isDeleting: boolean;
  onDeleteSuccess: (conversationId: string) => void;
  onDeleteError: (error: string) => void;
}

export function ConversationDeleteFeedback({ 
  conversationId, 
  isDeleting, 
  onDeleteSuccess, 
  onDeleteError 
}: DeleteFeedbackProps) {
  const [showSuccess, setShowSuccess] = useState(false);
  const [lastDeletedId, setLastDeletedId] = useState<string | null>(null);

  useEffect(() => {
    if (!isDeleting && conversationId && conversationId !== lastDeletedId) {
      // Deletion completed successfully
      setShowSuccess(true);
      setLastDeletedId(conversationId);
      onDeleteSuccess(conversationId);
      
      // Hide success message after 3 seconds
      const timer = setTimeout(() => {
        setShowSuccess(false);
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [isDeleting, conversationId, lastDeletedId, onDeleteSuccess]);

  if (isDeleting) {
    return (
      <Alert className="fixed bottom-4 right-4 w-auto max-w-sm bg-blue-50 border-blue-200 z-50">
        <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
        <AlertDescription className="text-blue-800">
          Eliminando conversación...
        </AlertDescription>
      </Alert>
    );
  }

  if (showSuccess) {
    return (
      <Alert className="fixed bottom-4 right-4 w-auto max-w-sm bg-green-50 border-green-200 z-50">
        <CheckCircle className="h-4 w-4 text-green-600" />
        <AlertDescription className="text-green-800">
          ✅ Conversación eliminada correctamente
        </AlertDescription>
      </Alert>
    );
  }

  return null;
}

/**
 * Enhanced Delete Button with Confirmation
 */
interface DeleteButtonProps {
  conversationId: string;
  conversationTitle?: string;
  onDelete: (id: string) => Promise<void>;
  disabled?: boolean;
}

export function EnhancedDeleteButton({ 
  conversationId, 
  conversationTitle = 'esta conversación',
  onDelete, 
  disabled = false 
}: DeleteButtonProps) {
  const [isConfirming, setIsConfirming] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleClick = () => {
    if (!isConfirming) {
      setIsConfirming(true);
      // Auto-cancel confirmation after 3 seconds
      setTimeout(() => setIsConfirming(false), 3000);
    } else {
      handleConfirmedDelete();
    }
  };

  const handleConfirmedDelete = async () => {
    try {
      setIsDeleting(true);
      await onDelete(conversationId);
      // Success is handled by the parent component
    } catch (error) {
      console.error('Delete failed:', error);
      // Error handling in parent component
    } finally {
      setIsDeleting(false);
      setIsConfirming(false);
    }
  };

  if (isConfirming) {
    return (
      <div className="flex items-center gap-2">
        <button
          onClick={handleConfirmedDelete}
          disabled={isDeleting}
          className="flex items-center gap-1 px-2 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700 disabled:opacity-50"
        >
          {isDeleting ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <CheckCircle className="w-3 h-3" />
          )}
          Confirmar
        </button>
        <button
          onClick={() => setIsConfirming(false)}
          disabled={isDeleting}
          className="px-2 py-1 bg-gray-200 text-gray-800 rounded text-xs hover:bg-gray-300 disabled:opacity-50"
        >
          Cancelar
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={handleClick}
      disabled={disabled || isDeleting}
      className="flex items-center gap-1 px-2 py-1 text-red-600 hover:bg-red-50 rounded text-xs disabled:opacity-50 transition-colors"
      title={`Eliminar ${conversationTitle}`}
    >
      <Trash2 className="w-3 h-3" />
      Eliminar
    </button>
  );
}

/**
 * Bulk Delete Feedback
 */
interface BulkDeleteFeedbackProps {
  deletingCount: number;
  successCount: number;
  errorCount: number;
  onComplete: () => void;
}

export function BulkDeleteFeedback({ 
  deletingCount, 
  successCount, 
  errorCount, 
  onComplete 
}: BulkDeleteFeedbackProps) {
  const isActive = deletingCount > 0 || successCount > 0 || errorCount > 0;
  const isCompleted = deletingCount === 0 && (successCount > 0 || errorCount > 0);

  useEffect(() => {
    if (isCompleted) {
      const timer = setTimeout(() => {
        onComplete();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isCompleted, onComplete]);

  if (!isActive) return null;

  return (
    <Alert className="fixed bottom-4 right-4 w-auto max-w-sm z-50">
      {deletingCount > 0 ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
          <AlertDescription>
            Eliminando {deletingCount} conversación{deletingCount > 1 ? 'es' : ''}...
          </AlertDescription>
        </>
      ) : (
        <>
          {errorCount > 0 ? (
            <AlertCircle className="h-4 w-4 text-red-600" />
          ) : (
            <CheckCircle className="h-4 w-4 text-green-600" />
          )}
          <AlertDescription>
            {successCount > 0 && `✅ ${successCount} eliminada${successCount > 1 ? 's' : ''}`}
            {errorCount > 0 && ` ❌ ${errorCount} error${errorCount > 1 ? 'es' : ''}`}
          </AlertDescription>
        </>
      )}
    </Alert>
  );
} 