import { useState, useEffect } from 'react';
import { MessageCircle } from 'lucide-react';
import { AuthProvider } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import { useAuth } from './context/AuthContext';
import Home from './pages/Home';
import Feed from './pages/Feed';
import Inbox from './pages/Inbox';
import ChatRoom from './pages/ChatRoom';
import Admin from './pages/Admin';
import AuthModal from './components/auth/AuthModal';

function AppContent() {
  const { isAuthenticated } = useAuth();
  const [view, setView] = useState<'home' | 'feed' | 'inbox' | 'chat' | 'admin'>('home');
  const [autoOpenPostModal, setAutoOpenPostModal] = useState<boolean>(false);
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null);

  // Sync state with URL paths for simple, routerless routing
  useEffect(() => {
    const handleLocationRouting = () => {
      const path = window.location.pathname;
      if (path === '/admin') {
        setView('admin');
      } else if (path.startsWith('/chat/')) {
        const id = path.replace('/chat/', '');
        if (id) {
          setActiveRoomId(id);
          setView('chat');
        } else {
          setView('feed');
        }
      } else if (path === '/inbox') {
        setActiveRoomId(null);
        setView('inbox');
      } else if (path === '/feed') {
        setActiveRoomId(null);
        setView('feed');
      } else {
        setActiveRoomId(null);
        setView('home');
      }
    };

    handleLocationRouting();
    window.addEventListener('popstate', handleLocationRouting);
    return () => window.removeEventListener('popstate', handleLocationRouting);
  }, []);

  const navigateToFeed = (openPost: boolean = false) => {
    window.history.pushState({}, '', '/feed');
    setAutoOpenPostModal(openPost);
    setView('feed');
  };

  const navigateToHome = () => {
    window.history.pushState({}, '', '/');
    setView('home');
  };

  const navigateToInbox = () => {
    window.history.pushState({}, '', '/inbox');
    setActiveRoomId(null);
    setView('inbox');
  };

  const navigateToChat = (roomId: string) => {
    window.history.pushState({}, '', `/chat/${roomId}`);
    setActiveRoomId(roomId);
    setView('chat');
  };

  const navigateToAdmin = () => {
    window.history.pushState({}, '', '/admin');
    setView('admin');
  };

  return (
    <>
      {view === 'home' && (
        <Home onNavigateToFeed={navigateToFeed} />
      )}
      {view === 'feed' && (
        <Feed 
          onNavigateToHome={navigateToHome} 
          onNavigateToInbox={navigateToInbox}
          onNavigateToChat={navigateToChat}
          onNavigateToAdmin={navigateToAdmin}
          initialOpenPost={autoOpenPostModal} 
          clearInitialOpenPost={() => setAutoOpenPostModal(false)} 
        />
      )}
      {view === 'inbox' && (
        <Inbox
          onNavigateToHome={navigateToHome}
          onNavigateToFeed={() => navigateToFeed(false)}
          onNavigateToChat={navigateToChat}
        />
      )}
      {view === 'chat' && activeRoomId && (
        <ChatRoom
          roomId={activeRoomId}
          onNavigateToInbox={navigateToInbox}
        />
      )}
      {view === 'admin' && (
        <Admin
          onNavigateToHome={navigateToHome}
          onNavigateToFeed={() => navigateToFeed(false)}
        />
      )}
      <AuthModal />
      {isAuthenticated && view !== 'inbox' && (
        <button
          onClick={navigateToInbox}
          className="fixed bottom-6 left-6 z-50 p-4 rounded-full bg-card text-primary border border-card-border shadow-lg hover:bg-primary-light hover:scale-105 active:scale-95 transition-all duration-200 flex items-center justify-center focus:outline-none"
          title="Open inbox"
          aria-label="Open inbox"
        >
          <MessageCircle className="w-5 h-5" />
        </button>
      )}
    </>
  );
}

function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <AppContent />
      </SocketProvider>
    </AuthProvider>
  );
}

export default App;
