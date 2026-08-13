import { useState, useEffect } from 'react';
import { AuthProvider } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import Home from './pages/Home';
import Feed from './pages/Feed';
import Inbox from './pages/Inbox';
import ChatRoom from './pages/ChatRoom';
import Admin from './pages/Admin';
import AuthModal from './components/auth/AuthModal';

function AppContent() {
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
      } else {
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
