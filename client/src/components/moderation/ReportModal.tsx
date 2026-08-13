import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, AlertTriangle, CheckCircle } from 'lucide-react';
import api from '../../lib/axios';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  reportType: 'post' | 'message';
  targetId: string;
}

const REASONS = [
  { value: 'harassment', label: 'Harassment or Abuse' },
  { value: 'spam', label: 'Spam or Advertising' },
  { value: 'self-harm-concern', label: 'Self-Harm Concern' },
  { value: 'inappropriate', label: 'Inappropriate Content' },
  { value: 'other', label: 'Other Concern' },
];

export const ReportModal: React.FC<ReportModalProps> = ({
  isOpen,
  onClose,
  reportType,
  targetId,
}) => {
  const [reason, setReason] = useState<string>('');
  const [details, setDetails] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isConfirmed, setIsConfirmed] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason) {
      setError('Please select a reason for reporting');
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      await api.post('/reports', {
        reportType,
        targetId,
        reason,
        details: details.trim(),
      });
      setIsConfirmed(true);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to submit report. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetAndClose = () => {
    setReason('');
    setDetails('');
    setIsConfirmed(false);
    setError(null);
    onClose();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleResetAndClose}
          className="absolute inset-0 bg-foreground/10 backdrop-blur-sm"
        />

        {/* Modal content */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 12 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-md relative z-10"
        >
          <Card className="shadow-premium border-card-border/80 relative p-6 sm:p-8">
            {/* Close button */}
            <button
              onClick={handleResetAndClose}
              className="absolute top-6 right-6 text-text-secondary hover:text-text-primary transition-colors focus:outline-none"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>

            {!isConfirmed ? (
              <>
                {/* Header */}
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-red-50 text-red-500 flex items-center justify-center">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-text-primary">Report {reportType}</h2>
                    <p className="text-xs text-text-secondary font-light">
                      Help keep AnonVent safe and supportive.
                    </p>
                  </div>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-5">
                  {error && (
                    <div className="p-3 bg-red-50/80 border border-red-100 rounded-xl text-xs text-red-600 font-semibold">
                      {error}
                    </div>
                  )}

                  {/* Reason List */}
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-text-primary tracking-wide block">
                      Why are you reporting this?
                    </label>
                    <div className="grid grid-cols-1 gap-2">
                      {REASONS.map((r) => {
                        const isSelected = reason === r.value;
                        return (
                          <button
                            type="button"
                            key={r.value}
                            onClick={() => setReason(r.value)}
                            className={`w-full px-4 py-2.5 rounded-xl text-xs text-left font-medium border transition-all duration-200 ${
                              isSelected
                                ? 'bg-primary/10 border-primary text-primary'
                                : 'bg-card border-card-border text-text-secondary hover:border-primary/20 hover:text-primary'
                            }`}
                          >
                            {r.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Optional details */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-text-primary tracking-wide block">
                      Additional Details <span className="text-text-muted font-normal">(optional, max 500)</span>
                    </label>
                    <textarea
                      rows={3}
                      maxLength={500}
                      value={details}
                      onChange={(e) => setDetails(e.target.value)}
                      placeholder="Provide any context that helps us review..."
                      className="w-full p-3 bg-background border border-card-border rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all text-text-primary resize-none font-light leading-relaxed"
                    />
                  </div>

                  <div className="flex justify-end gap-3 pt-2">
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={handleResetAndClose}
                      className="px-4 py-2 text-xs rounded-xl"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={isSubmitting || !reason}
                      className="px-5 py-2 text-xs rounded-xl font-semibold bg-red-600 hover:bg-red-700 text-white border-none"
                    >
                      {isSubmitting ? 'Submitting...' : 'Submit Report'}
                    </Button>
                  </div>
                </form>
              </>
            ) : (
              /* Success confirmation state */
              <div className="text-center py-6">
                <div className="w-12 h-12 rounded-full bg-green-50 text-green-500 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-semibold text-text-primary mb-2">Report Submitted</h3>
                <p className="text-sm text-text-secondary font-light mb-6">
                  Thanks — our team will look into this.
                </p>
                <Button
                  variant="primary"
                  onClick={handleResetAndClose}
                  className="px-6 py-2 text-xs rounded-xl"
                >
                  Okay
                </Button>
              </div>
            )}
          </Card>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
export default ReportModal;
