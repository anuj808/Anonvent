import React, { useEffect, useState } from 'react';
import { MessageSquare, Leaf, AlertCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import api from '../lib/axios';
import { useAuth } from '../context/AuthContext';
import { Container } from '../components/ui/Container';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';

interface InboxProps {
  onNavigateToHome: () => void;
  onNavigateToFeed: () => void;
  onNavigateToChat: (roomId: string) => void;
}

interface ChatRoomType {
  _id: string;
  status: string;
  otherParticipantAnonId: string;
  otherParticipantDisplayName?: string;
  lastMessage: {
    content: string;
    createdAt: string;
  } | null;
  createdAt: string;
}

export const Inbox: React.FC<InboxProps> = ({
  onNavigateToHome,
  onNavigateToFeed,
  onNavigateToChat,
}) => {
  const { anonId, displayName, isAuthenticated, logout } = useAuth();
  const [rooms, setRooms] = useState<ChatRoomType[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchRooms = async () => {
    try {
      setIsLoading(true);
      const res = await api.get('chat/rooms');
      if (res.data) {
        setRooms(res.data);
      }
    } catch (error) {
      console.error('Error fetching chat rooms:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchRooms();
    }
  }, [isAuthenticated]);

  return (
    <div className="min-h-screen flex flex-col justify-between selection:bg-primary/10 selection:text-primary-dark">
      {/* Header */}
      <header className="border-b border-card-border/60 bg-background/80 backdrop-blur-md sticky top-0 z-40 transition-all duration-300">
        <Container size="lg" className="h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={onNavigateToHome}>
            <div className="w-8 h-8 rounded-lg bg-primary-light flex items-center justify-center text-primary">
              <Leaf className="w-5 h-5" />
            </div>
            <span className="font-semibold text-lg tracking-tight text-text-primary">
              Anon<span className="text-primary">Vent</span>
            </span>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={onNavigateToFeed}
              className="text-xs text-text-secondary hover:text-text-primary font-semibold transition-colors focus:outline-none"
            >
              Feed
            </button>
            <span className="inline-flex items-center px-3 py-1 rounded-full bg-primary-light text-primary text-xs font-semibold border border-primary/20 shadow-subtle">
              Identity: {displayName || anonId}
            </span>
            <button
              onClick={logout}
              className="text-xs text-text-secondary hover:text-text-primary font-semibold transition-colors focus:outline-none"
            >
              Sign Out
            </button>
          </div>
        </Container>
      </header>

      {/* Main Container */}
      <main className="flex-grow py-10 bg-background/40">
        <Container size="lg" className="space-y-8">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-text-primary">Your Inbox</h1>
            <p className="text-sm text-text-secondary font-light mt-1">
              Ongoing private conversations. Completely anonymous.
            </p>
          </div>

          {isLoading ? (
            <div className="text-center py-20 text-sm text-text-secondary">
              <div className="inline-block w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin mr-2" />
              Loading conversations...
            </div>
          ) : rooms.length === 0 ? (
            <div className="py-20 text-center max-w-sm mx-auto">
              <AlertCircle className="w-10 h-10 text-primary/60 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-text-primary mb-2">No conversations yet</h3>
              <p className="text-sm text-text-secondary font-light mb-6">
                Respond to posts on the feed to start a 1:1 chat room.
              </p>
              <Button variant="primary" onClick={onNavigateToFeed} className="px-5 py-2 rounded-xl text-xs">
                Go to Feed
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 max-w-2xl mx-auto">
              {rooms.map((room) => {
                const isClosed = room.status === 'closed';
                return (
                  <Card
                    key={room._id}
                    onClick={() => onNavigateToChat(room._id)}
                    className="cursor-pointer border-card-border/60 hover:shadow-soft hover:border-primary/20 transition-all duration-300 relative group p-6"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-4">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                          isClosed ? 'bg-card-darker text-text-muted' : 'bg-primary-light text-primary'
                        }`}>
                          <MessageSquare className="w-5 h-5" />
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-text-primary">
                              {room.otherParticipantDisplayName || room.otherParticipantAnonId}
                            </span>
                            {isClosed && (
                              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-card-darker text-text-muted border border-card-border/50">
                                Closed
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-text-secondary font-light line-clamp-1 pr-6 leading-relaxed">
                            {room.lastMessage ? room.lastMessage.content : 'No messages yet'}
                          </p>
                        </div>
                      </div>

                      {room.lastMessage && (
                        <span className="text-[11px] text-text-muted font-medium shrink-0 pt-0.5">
                          {formatDistanceToNow(new Date(room.lastMessage.createdAt), { addSuffix: true })}
                        </span>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
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
export default Inbox;
