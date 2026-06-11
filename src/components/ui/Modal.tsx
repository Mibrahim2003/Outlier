import React, { useEffect, useCallback } from 'react';
import { X } from 'lucide-react';
import { cn } from '../../utils/cn';

/* ─── Modal overlay + centering ────────────────────────────────── */
interface ModalProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  /** Close when clicking the backdrop. Default: true */
  closeOnBackdrop?: boolean;
}

export const Modal = ({ open, onClose, children, closeOnBackdrop = true }: ModalProps) => {
  const handleEscape = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    },
    [onClose]
  );

  useEffect(() => {
    if (open) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [open, handleEscape]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-ink/60 backdrop-blur-sm"
        onClick={closeOnBackdrop ? onClose : undefined}
      />
      {/* Content floats above backdrop */}
      <div className="relative z-10 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {children}
      </div>
    </div>
  );
};
Modal.displayName = "Modal";

/* ─── Modal content container (neo-brutalist card) ─────────────── */
interface ModalContentProps extends React.HTMLAttributes<HTMLDivElement> {}

export const ModalContent = ({ className, ...props }: ModalContentProps) => (
  <div
    className={cn(
      "bg-white border-4 border-ink shadow-[8px_8px_0px_#1A1A1A]",
      className
    )}
    {...props}
  />
);
ModalContent.displayName = "ModalContent";

/* ─── Modal header (title + close button) ──────────────────────── */
interface ModalHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  onClose?: () => void;
}

export const ModalHeader = ({ className, onClose, children, ...props }: ModalHeaderProps) => (
  <div
    className={cn(
      "p-6 border-b-4 border-ink bg-primary-container flex items-center justify-between",
      className
    )}
    {...props}
  >
    <div className="flex-1">{children}</div>
    {onClose && (
      <button
        onClick={onClose}
        className="shrink-0 w-10 h-10 border-3 border-ink bg-white flex items-center justify-center hover:bg-ink hover:text-white transition-colors"
        aria-label="Close modal"
      >
        <X size={18} strokeWidth={3} />
      </button>
    )}
  </div>
);
ModalHeader.displayName = "ModalHeader";

/* ─── Modal body ───────────────────────────────────────────────── */
export const ModalBody = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("p-6", className)} {...props} />
);
ModalBody.displayName = "ModalBody";

/* ─── Modal footer ─────────────────────────────────────────────── */
export const ModalFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn("p-4 border-t-3 border-ink flex items-center justify-end gap-3", className)}
    {...props}
  />
);
ModalFooter.displayName = "ModalFooter";
