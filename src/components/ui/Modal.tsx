import React, { useEffect, useCallback, useRef } from 'react';
import { X } from 'lucide-react';
import { cn } from '../../utils/cn';

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

/* ─── Modal overlay + centering ────────────────────────────────── */
interface ModalProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  /** Close when clicking the backdrop. Default: true */
  closeOnBackdrop?: boolean;
}

export const Modal = ({ open, onClose, children, closeOnBackdrop = true }: ModalProps) => {
  const contentRef = useRef<HTMLDivElement>(null);

  // Escape to close + Tab/Shift+Tab kept inside the dialog (focus trap).
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      if (e.key !== 'Tab') return;

      const container = contentRef.current;
      if (!container) return;
      const focusables = Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
      if (focusables.length === 0) {
        e.preventDefault();
        container.focus();
        return;
      }
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement as HTMLElement | null;

      if (e.shiftKey) {
        if (active === first || !container.contains(active)) {
          e.preventDefault();
          last.focus();
        }
      } else if (active === last || !container.contains(active)) {
        e.preventDefault();
        first.focus();
      }
    },
    [onClose]
  );

  useEffect(() => {
    if (!open) return;
    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [open, handleKeyDown]);

  // Move focus into the dialog on open, restore it to the trigger on close.
  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const container = contentRef.current;
    const focusables = container?.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
    (focusables && focusables.length > 0 ? focusables[0] : container)?.focus();
    return () => previouslyFocused?.focus?.();
  }, [open]);

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
      {/* Content floats above backdrop. dvh, not vh: on mobile Safari vh
          ignores the browser chrome, so a 90vh modal clips behind the toolbar. */}
      <div ref={contentRef} tabIndex={-1} className="relative z-10 w-full max-w-2xl max-h-[90dvh] overflow-y-auto outline-none">
        {children}
      </div>
    </div>
  );
};
Modal.displayName = "Modal";

/* ─── Modal content container (neo-brutalist card) ─────────────── */
type ModalContentProps = React.HTMLAttributes<HTMLDivElement>;

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
