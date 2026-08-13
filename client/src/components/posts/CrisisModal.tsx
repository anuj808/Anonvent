import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HeartHandshake, X } from 'lucide-react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';

interface CrisisModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CrisisModal: React.FC<CrisisModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-foreground/10 backdrop-blur-sm"
        />

        {/* Modal card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 12 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-md relative z-10"
        >
          <Card className="shadow-premium border-card-border/80 relative">
            {/* Close Button */}
            <button
              onClick={onClose}
              className="absolute top-6 right-6 text-muted hover:text-foreground transition-colors focus:outline-none"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header */}
            <div className="text-center mb-6">
              <div className="w-12 h-12 rounded-xl bg-primary-light text-primary flex items-center justify-center mx-auto mb-4">
                <HeartHandshake className="w-6 h-6" />
              </div>
              <h2 className="text-xl font-semibold text-foreground mb-2">We are glad you shared.</h2>
              <p className="text-sm text-muted/80 font-light leading-relaxed">
                Thank you for letting it out. Your post has been submitted.
              </p>
            </div>

            {/* Resources list */}
            <div className="space-y-4">
              <p className="text-sm text-muted/90 font-light leading-relaxed">
                It sounds like you might be going through a very heavy moment. Please know that you do not have to carry it all by yourself, and support is always available.
              </p>

              <div className="p-4 bg-primary-light border border-primary/10 rounded-xl space-y-2">
                <span className="text-xs font-semibold text-primary block tracking-wide uppercase">Free & Anonymous Support</span>
                <p className="text-sm text-foreground font-medium">
                  National Crisis Lifeline: <span className="text-primary-dark">Call or Text 988</span> (US/Canada)
                </p>
                <p className="text-xs text-muted/80 font-light leading-relaxed">
                  Available 24/7. It's completely free, confidential, and anonymous.
                </p>
              </div>

              <div className="text-xs text-muted/70 font-light text-center leading-relaxed">
                If you are outside the US or Canada, you can locate your local helpline at{' '}
                <a
                  href="https://findahelpline.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline hover:text-primary-hover font-medium transition-colors"
                >
                  findahelpline.com
                </a>.
              </div>
            </div>

            <Button
              variant="primary"
              onClick={onClose}
              className="w-full mt-6 py-3 text-sm font-semibold"
            >
              I understand, thank you
            </Button>
          </Card>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
export default CrisisModal;
