// components/LoadingIndicator.tsx
import React from 'react';
import { Loader2, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LoadingIndicatorProps {
  loading?: boolean;
  success?: boolean;
  error?: string | null;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  children?: React.ReactNode;
}

export const LoadingIndicator: React.FC<LoadingIndicatorProps> = ({
  loading = false,
  success = false,
  error = null,
  size = 'md',
  className,
  children
}) => {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6'
  };
  
  if (loading) {
    return (
      <div className={cn('flex items-center gap-2', className)}>
        <Loader2 className={cn('animate-spin text-blue-500', sizeClasses[size])} />
        {children && <span className="text-sm text-gray-600">{children}</span>}
      </div>
    );
  }
  
  if (success) {
    return (
      <div className={cn('flex items-center gap-2', className)}>
        <CheckCircle className={cn('text-green-500', sizeClasses[size])} />
        {children && <span className="text-sm text-green-600">{children}</span>}
      </div>
    );
  }
  
  if (error) {
    return (
      <div className={cn('flex items-center gap-2', className)}>
        <XCircle className={cn('text-red-500', sizeClasses[size])} />
        {children && <span className="text-sm text-red-600">{children}</span>}
      </div>
    );
  }
  
  return null;
};

interface LoadingButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean;
  success?: boolean;
  error?: string | null;
  loadingText?: string;
  successText?: string;
  errorText?: string;
  children: React.ReactNode;
}

export const LoadingButton: React.FC<LoadingButtonProps> = ({
  loading = false,
  success = false,
  error = null,
  loadingText,
  successText,
  errorText,
  children,
  className,
  disabled,
  ...props
}) => {
  const getButtonContent = () => {
    if (loading) {
      return (
        <>
          <Loader2 className="h-4 w-4 animate-spin mr-2" />
          {loadingText || children}
        </>
      );
    }
    
    if (success) {
      return (
        <>
          <CheckCircle className="h-4 w-4 mr-2" />
          {successText || children}
        </>
      );
    }
    
    if (error) {
      return (
        <>
          <XCircle className="h-4 w-4 mr-2" />
          {errorText || children}
        </>
      );
    }
    
    return children;
  };
  
  const getButtonVariant = () => {
    if (success) return 'bg-green-500 hover:bg-green-600 text-white';
    if (error) return 'bg-red-500 hover:bg-red-600 text-white';
    return '';
  };
  
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center px-4 py-2 rounded-md font-medium transition-colors',
        'focus:outline-none focus:ring-2 focus:ring-offset-2',
        getButtonVariant(),
        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {getButtonContent()}
    </button>
  );
};

interface LoadingCardProps {
  loading?: boolean;
  error?: string | null;
  className?: string;
  children: React.ReactNode;
}

export const LoadingCard: React.FC<LoadingCardProps> = ({
  loading = false,
  error = null,
  className,
  children
}) => {
  if (loading) {
    return (
      <div className={cn('p-6 text-center', className)}>
        <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-500 mb-4" />
        <p className="text-gray-600">Cargando datos...</p>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className={cn('p-6 text-center', className)}>
        <XCircle className="h-8 w-8 mx-auto text-red-500 mb-4" />
        <p className="text-red-600 mb-2">Error al cargar datos</p>
        <p className="text-sm text-gray-500">{error}</p>
      </div>
    );
  }
  
  return <div className={className}>{children}</div>;
};

interface LoadingOverlayProps {
  loading?: boolean;
  message?: string;
  className?: string;
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  loading = false,
  message = 'Cargando...',
  className
}) => {
  if (!loading) return null;
  
  return (
    <div className={cn(
      'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50',
      className
    )}>
      <div className="bg-white rounded-lg p-6 flex flex-col items-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500 mb-4" />
        <p className="text-gray-700">{message}</p>
      </div>
    </div>
  );
};

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  className
}) => {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8',
    xl: 'h-12 w-12'
  };
  
  return (
    <Loader2 className={cn('animate-spin text-blue-500', sizeClasses[size], className)} />
  );
};
