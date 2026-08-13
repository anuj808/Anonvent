import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ShieldAlert, KeyRound, Mail, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';

export const AuthModal: React.FC = () => {
  const { isAuthModalOpen, closeAuthModal, login, register } = useAuth();
  const [isLogin, setIsLogin] = useState<boolean>(true);
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  if (!isAuthModalOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      if (isLogin) {
        await login(email, password);
      } else {
        await register(email, password);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'An unexpected error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleMode = () => {
    setIsLogin(!isLogin);
    setError(null);
    setEmail('');
    setPassword('');
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={closeAuthModal}
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
              onClick={closeAuthModal}
              className="absolute top-6 right-6 text-text-secondary hover:text-text-primary transition-colors focus:outline-none"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header */}
            <div className="text-center mb-8">
              <div className="w-12 h-12 rounded-xl bg-primary-light text-primary flex items-center justify-center mx-auto mb-4">
                <KeyRound className="w-6 h-6" />
              </div>
              <h2 className="text-2xl font-semibold text-text-primary mb-2">
                {isLogin ? 'Welcome Back' : 'Create Anonymous Key'}
              </h2>
              <p className="text-sm text-text-secondary font-light max-w-[280px] mx-auto leading-relaxed">
                {isLogin
                  ? 'Access your anonymous account and saved vents.'
                  : 'Set up private credentials to write, listen, and connect.'}
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-3.5 bg-red-50/80 border border-red-100 text-red-600 rounded-xl text-xs flex items-start gap-2"
                >
                  <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                  <span className="font-semibold">{error}</span>
                </motion.div>
              )}

              {/* Email */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-text-primary tracking-wide block">
                  Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-text-secondary">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full pl-10 pr-4 py-3 bg-background border border-card-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all text-text-primary"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-text-primary tracking-wide block">
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-text-secondary">
                    <KeyRound className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-10 py-3 bg-background border border-card-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all text-text-primary"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-text-secondary hover:text-text-primary focus:outline-none"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {!isLogin && (
                  <p className="text-[11px] text-text-secondary font-light">
                    Must be at least 8 characters.
                  </p>
                )}
              </div>

              {/* Security Privacy Microcopy */}
              <div className="p-3.5 bg-primary-light border border-primary/10 rounded-xl text-[11px] text-text-secondary leading-relaxed font-normal">
                🔒 We only ever show others your generated **Anonymous ID** (e.g. Anon_a7f3e), never your email. We do not require names or profiles.
              </div>

              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3.5 text-sm font-semibold tracking-wide"
              >
                {isSubmitting
                  ? 'Verifying...'
                  : isLogin
                  ? 'Sign In'
                  : 'Generate Anonymous Key'}
              </Button>
            </form>

            {/* Toggle Mode */}
            <div className="text-center mt-6 pt-5 border-t border-card-border/60">
              <button
                onClick={toggleMode}
                className="text-xs text-primary font-semibold hover:underline focus:outline-none"
              >
                {isLogin
                  ? "New to AnonVent? Create an anonymous key"
                  : 'Already have a key? Sign in'}
              </button>
            </div>
          </Card>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
export default AuthModal;
