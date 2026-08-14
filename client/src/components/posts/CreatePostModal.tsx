import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, PenTool, Info } from 'lucide-react';
import api from '../../lib/axios';
import { ALLOWED_TAGS } from '../../lib/constants';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';

interface CreatePostModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (crisisResourceShown: boolean) => void;
}

export const CreatePostModal: React.FC<CreatePostModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [content, setContent] = useState<string>('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleTagToggle = (tag: string) => {
    setError(null);
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter((t) => t !== tag));
    } else {
      if (selectedTags.length >= 3) {
        setError('You can choose up to 3 tags only.');
        return;
      }
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedContent = content.trim();
    if (trimmedContent.length < 10) {
      setError('Please write at least 10 characters to share.');
      return;
    }
    if (trimmedContent.length > 1000) {
      setError('Please shorten your post to less than 1000 characters.');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await api.post('posts', {
        content: trimmedContent,
        tags: selectedTags,
      });

      // Clear state
      setContent('');
      setSelectedTags([]);
      onClose();

      // Trigger success callback (e.g. show crisis modal if appropriate)
      if (response.data) {
        onSuccess(response.data.crisisResourceShown);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to submit post. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

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

        {/* Modal Content */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 12 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-lg relative z-10"
        >
          <Card className="shadow-premium border-card-border/80 relative p-6 sm:p-8">
            {/* Close Button */}
            <button
              onClick={onClose}
              className="absolute top-6 right-6 text-text-secondary hover:text-text-primary transition-colors focus:outline-none"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-primary-light text-primary flex items-center justify-center">
                <PenTool className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-text-primary">Share anonymously</h2>
                <p className="text-xs text-text-secondary font-light">
                  Speak your mind. We will keep your email safe.
                </p>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="p-3.5 bg-red-50/80 border border-red-100 rounded-xl text-xs text-red-600 flex items-start gap-2">
                  <Info className="w-4 h-4 shrink-0 mt-0.5" />
                  <span className="font-semibold">{error}</span>
                </div>
              )}

              {/* Textarea */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-xs font-semibold text-text-primary tracking-wide">
                  <span>Your Story</span>
                  <span className={`font-semibold ${content.length > 950 ? 'text-red-500' : 'text-text-muted'}`}>
                    {content.length}/1000
                  </span>
                </div>
                <textarea
                  required
                  rows={6}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Breathe in, let it out. What is on your mind today?"
                  className="w-full p-4 bg-background border border-card-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all text-text-primary resize-none font-light leading-relaxed"
                />
              </div>

              {/* Tags Selector */}
              <div className="space-y-2">
                <span className="text-xs font-semibold text-text-primary tracking-wide block">
                  Tags <span className="text-[11px] text-text-muted font-normal">(select up to 3)</span>
                </span>
                <div className="flex flex-wrap gap-2">
                  {ALLOWED_TAGS.map((tag) => {
                    const isSelected = selectedTags.includes(tag);
                    return (
                      <button
                        type="button"
                        key={tag}
                        onClick={() => handleTagToggle(tag)}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all duration-200 ${
                          isSelected
                            ? 'bg-primary border-primary text-background shadow-sm'
                            : 'bg-card border-card-border text-text-secondary hover:border-primary/30 hover:text-primary'
                        }`}
                      >
                        {tag}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={onClose}
                  className="px-5 py-2.5 text-xs rounded-xl"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting || content.trim().length < 10}
                  className="px-6 py-2.5 text-xs rounded-xl font-semibold"
                >
                  {isSubmitting ? 'Sharing...' : 'Share Anonymously'}
                </Button>
              </div>
            </form>
          </Card>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
export default CreatePostModal;
