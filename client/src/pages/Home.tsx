import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Leaf, PenTool, MessageSquareDot, ShieldCheck, Heart, ArrowRight } from 'lucide-react';
import api from '../lib/axios';
import { useAuth } from '../context/AuthContext';
import { Container } from '../components/ui/Container';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';

interface HomeProps {
  onNavigateToFeed: (openPost?: boolean) => void;
}

const Home: React.FC<HomeProps> = ({ onNavigateToFeed }) => {
  const [serverStatus, setServerStatus] = useState<'connecting' | 'online' | 'offline'>('connecting');
  const { anonId, isAuthenticated, logout, openAuthModal } = useAuth();

  useEffect(() => {
    api.get('/health')
      .then((res) => {
        if (res.data && res.data.status === 'ok') {
          setServerStatus('online');
        } else {
          setServerStatus('offline');
        }
      })
      .catch(() => {
        setServerStatus('offline');
      });
  }, []);

  // Animation constants for slow, gentle transitions
  const fadeInUp = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] }
  };

  const stagger = {
    animate: {
      transition: {
        staggerChildren: 0.15
      }
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-between selection:bg-primary/10 selection:text-primary-dark">
      {/* Header / Navbar */}
      <header className="border-b border-card-border/60 bg-background/80 backdrop-blur-md sticky top-0 z-45 transition-all duration-300">
        <Container size="lg" className="h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => onNavigateToFeed()}>
            <div className="w-8 h-8 rounded-lg bg-primary-light flex items-center justify-center text-primary">
              <Leaf className="w-5 h-5" />
            </div>
            <span className="font-semibold text-lg tracking-tight text-text-primary">
              Anon<span className="text-primary">Vent</span>
            </span>
          </div>

          <div className="flex items-center gap-4">
            {/* Server Status Pill (subtle check) */}
            <div className="hidden sm:inline-flex items-center gap-2 px-3 py-1 rounded-full bg-card-darker text-xs text-text-secondary font-medium border border-card-border/50">
              <span className="relative flex h-2 w-2">
                {serverStatus === 'online' ? (
                  <>
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                  </>
                ) : serverStatus === 'connecting' ? (
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-yellow-500 animate-pulse"></span>
                ) : (
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-red-400"></span>
                )}
              </span>
              <span>{serverStatus === 'online' ? 'Connected' : serverStatus === 'connecting' ? 'Connecting' : 'Offline'}</span>
            </div>

            {/* Session Actions & Identity Badges */}
            {isAuthenticated ? (
              <div className="flex items-center gap-3">
                <span className="inline-flex items-center px-3 py-1 rounded-full bg-primary-light text-primary text-xs font-semibold border border-primary/20 shadow-subtle">
                  Identity: {anonId}
                </span>
                <button
                  onClick={logout}
                  className="text-xs text-text-secondary hover:text-text-primary font-semibold transition-colors focus:outline-none"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <Button
                variant="secondary"
                onClick={openAuthModal}
                className="px-4 py-1.5 text-xs rounded-xl"
              >
                Sign In
              </Button>
            )}
          </div>
        </Container>
      </header>

      {/* Main Content */}
      <main className="flex-grow py-12 sm:py-20 flex flex-col justify-center">
        <Container size="lg">
          {/* Hero Section */}
          <motion.section 
            initial="initial"
            animate="animate"
            variants={stagger}
            className="text-center max-w-2xl mx-auto mb-20 sm:mb-28"
          >
            <motion.div variants={fadeInUp} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary-light text-primary text-sm font-medium tracking-wide mb-6">
              <Heart className="w-3.5 h-3.5 fill-primary" />
              <span>A safe space for your mind</span>
            </motion.div>

            <motion.h1 
              variants={fadeInUp}
              className="text-4xl sm:text-5xl font-semibold tracking-tight text-text-primary mb-6 leading-[1.2]"
            >
              A quiet place <br />
              <span className="text-primary font-normal italic">to be heard.</span>
            </motion.h1>

            <motion.p 
              variants={fadeInUp}
              className="text-text-secondary text-lg sm:text-xl font-light mb-10 leading-relaxed max-w-xl mx-auto"
            >
              Release your thoughts anonymously. No accounts, no names, no judgment. Just a calm space to breathe and let it out.
            </motion.p>

            <motion.div 
              variants={fadeInUp}
              className="flex flex-col sm:flex-row items-center justify-center gap-4"
            >
              <Button 
                variant="primary" 
                onClick={() => {
                  if (!isAuthenticated) {
                    openAuthModal();
                  } else {
                    onNavigateToFeed(true); // Navigate to feed and open post dialog
                  }
                }}
                className="w-full sm:w-auto"
              >
                Share what's on your mind
              </Button>
              <Button 
                variant="secondary" 
                onClick={() => onNavigateToFeed()}
                className="w-full sm:w-auto"
              >
                Browse anonymously
              </Button>
            </motion.div>
          </motion.section>

          {/* How It Works Section */}
          <motion.section 
            initial="initial"
            whileInView="animate"
            viewport={{ once: true, margin: "-100px" }}
            variants={stagger}
            className="mb-20 sm:mb-28"
          >
            <div className="text-center mb-12 sm:mb-16">
              <h2 className="text-2xl sm:text-3xl font-semibold text-text-primary mb-4">
                Three steps to peace of mind
              </h2>
              <p className="text-text-secondary max-w-sm mx-auto font-light text-sm">
                Simple, safe, and designed to ease your thoughts.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Step 1 */}
              <Card animate delay={0.1} className="flex flex-col items-center text-center">
                <div className="w-12 h-12 rounded-xl bg-primary-light text-primary flex items-center justify-center mb-6">
                  <PenTool className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-semibold text-text-primary mb-3">Write from the heart</h3>
                <p className="text-text-secondary text-sm leading-relaxed font-light">
                  Put your feelings into words. No name, profile, or identity leaks. Totally anonymous.
                </p>
              </Card>

              {/* Step 2 */}
              <Card animate delay={0.2} className="flex flex-col items-center text-center">
                <div className="w-12 h-12 rounded-xl bg-primary-light text-primary flex items-center justify-center mb-6">
                  <MessageSquareDot className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-semibold text-text-primary mb-3">Receive empathy</h3>
                <p className="text-text-secondary text-sm leading-relaxed font-light">
                  Other supportive members read your message and leave kind, caring responses without judgment.
                </p>
              </Card>

              {/* Step 3 */}
              <Card animate delay={0.3} className="flex flex-col items-center text-center">
                <div className="w-12 h-12 rounded-xl bg-primary-light text-primary flex items-center justify-center mb-6">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-semibold text-text-primary mb-3">Chat securely</h3>
                <p className="text-text-secondary text-sm leading-relaxed font-light">
                  Open a temporary, encrypted private chat room if you wish to connect deeper. Leave whenever you want.
                </p>
              </Card>
            </div>
          </motion.section>

          {/* Trust and Safety Section */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="max-w-3xl mx-auto mb-8"
          >
            <Card className="bg-primary-light border-primary/10 overflow-hidden relative p-8 sm:p-12">
              <div className="absolute right-0 top-0 w-24 h-24 bg-primary/5 rounded-full blur-2xl" />
              
              <div className="flex flex-col md:flex-row items-start md:items-center gap-6 justify-between relative z-10">
                <div className="max-w-md">
                  <h3 className="text-xl sm:text-2xl font-semibold text-primary-dark mb-2">
                    Your safety is our priority
                  </h3>
                  <p className="text-primary-dark text-sm leading-relaxed font-light">
                    No accounts required to browse. No names. No judgment. All spaces are monitored with automated filters and community flags to maintain a kind, respectful environment.
                  </p>
                </div>
                <div className="flex items-center gap-2 text-primary font-medium shrink-0 group hover:text-primary-hover cursor-pointer transition-colors" onClick={() => onNavigateToFeed()}>
                  <span>Learn about our safety rules</span>
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </div>
              </div>
            </Card>
          </motion.section>
        </Container>
      </main>

      {/* Footer */}
      <footer className="border-t border-card-border bg-card/60 py-8">
        <Container size="lg" className="flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
          <div>
            <div className="flex items-center justify-center sm:justify-start gap-1 text-sm font-semibold text-text-primary mb-1">
              <Leaf className="w-4 h-4 text-primary" />
              <span>AnonVent</span>
            </div>
            <p className="text-xs text-text-muted font-light">
              © {new Date().getFullYear()} AnonVent. All rights reserved.
            </p>
          </div>
          <div className="max-w-xs text-center sm:text-right">
            <p className="text-xs text-text-secondary font-light leading-relaxed">
              If you are in distress, you are not alone. Please reach out to a professional or visit a{' '}
              <a 
                href="https://findahelpline.com/" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="text-primary underline hover:text-primary-hover transition-colors font-medium"
              >
                free crisis helpline
              </a>.
            </p>
          </div>
        </Container>
      </footer>
    </div>
  );
};

export default Home;
