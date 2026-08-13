import React, { useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import { Send, LogOut, ArrowLeft, ShieldAlert, Flag } from 'lucide-react';
import api from '../lib/axios';
import ReportModal from '../components/moderation/ReportModal';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { Container } from '../components/ui/Container';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';

interface ChatRoomProps {
  roomId: string;
  onNavigateToInbox: () => void;
}

interface MessageType {
  _id: string;
  roomId: string;
  senderAnonId: string;
  content: string;
  createdAt: string;
}

export const ChatRoom: React.FC<ChatRoomProps> = ({ roomId, onNavigateToInbox }) => {
  const { anonId, isAuthenticated } = useAuth();
  const { socket, isConnected, isReconnecting } = useSocket();
  const [messages, setMessages] = useState<MessageType[]>([]);
  const [inputText, setInputText] = useState<string>('');
  const [otherParticipantAnonId, setOtherParticipantAnonId] = useState<string>('Someone');
  const [isOtherTyping, setIsOtherTyping] = useState<boolean>(false);
  const [roomStatus, setRoomStatus] = useState<string>('active');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Moderation state
  const [isReportModalOpen, setIsReportModalOpen] = useState<boolean>(false);
  const [reportTargetId, setReportTargetId] = useState<string>('');
  const [reportType, setReportType] = useState<'post' | 'message'>('message');

  const handleOpenReportModal = (type: 'post' | 'message', targetId: string) => {
    setReportType(type);
    setReportTargetId(targetId);
    setIsReportModalOpen(true);
  };

  const handleBlockUser = async () => {
    const confirmText = "You won't see each other's posts or messages anymore. This can't be undone from here.";
    if (!window.confirm(confirmText)) return;
    try {
      await api.post('/blocks', { roomId });
      alert('User blocked successfully.');
      onNavigateToInbox();
    } catch (err) {
      alert('Failed to block user. Please try again.');
    }
  };

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Fetch chat history
  const fetchHistory = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await api.get(`/chat/rooms/${roomId}/messages`);
      if (response.data) {
        setRoomStatus(response.data.status);
        setMessages(response.data.messages);
        
        // Find other participant anonId
        const otherAnon = response.data.participantAnonIds.find((id: string) => id !== anonId);
        if (otherAnon) {
          setOtherParticipantAnonId(otherAnon);
        }
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Access denied: You cannot view this room.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchHistory();
    }
  }, [roomId, isAuthenticated, anonId]);

  // Connect socket and listen to events
  useEffect(() => {
    if (!socket || roomStatus !== 'active') return;

    socket.emit('join_room', { roomId });

    socket.on('receive_message', (message: MessageType) => {
      if (message.roomId === roomId) {
        setMessages((prev) => [...prev, message]);
      }
    });

    socket.on('user_typing', ({ roomId: typingRoomId }) => {
      if (typingRoomId === roomId) {
        setIsOtherTyping(true);
      }
    });

    socket.on('user_stop_typing', ({ roomId: typingRoomId }) => {
      if (typingRoomId === roomId) {
        setIsOtherTyping(false);
      }
    });

    socket.on('error_message', ({ message }) => {
      alert(message);
    });

    return () => {
      socket.off('receive_message');
      socket.off('user_typing');
      socket.off('user_stop_typing');
      socket.off('error_message');
    };
  }, [socket, roomId, roomStatus]);

  // Scroll to bottom when messages load or change
  useEffect(() => {
    scrollToBottom();
  }, [messages, isOtherTyping]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputText(e.target.value);

    if (!socket || roomStatus !== 'active') return;

    // Emit typing event
    socket.emit('typing', { roomId });

    // Clear previous timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set timeout to stop typing indicator after 1.5 seconds of inactivity
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('stop_typing', { roomId });
    }, 1500);
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !socket || roomStatus !== 'active') return;

    // Send message via socket
    socket.emit('send_message', { roomId, content: inputText.trim() });
    
    // Stop typing immediately
    socket.emit('stop_typing', { roomId });
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    setInputText('');
  };

  const handleEndChat = async () => {
    if (!window.confirm('Are you sure you want to end this conversation permanently? This room will be closed.')) return;
    try {
      await api.post(`/chat/rooms/${roomId}/close`);
      setRoomStatus('closed');
      onNavigateToInbox();
    } catch (err) {
      alert('Failed to end conversation. You may not be authorized.');
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-between selection:bg-primary/10 selection:text-primary-dark bg-background/20">
      {/* Header */}
      <header className="border-b border-card-border/60 bg-background/80 backdrop-blur-md sticky top-0 z-40 transition-all duration-300">
        <Container size="md" className="h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={onNavigateToInbox}
              className="text-text-secondary hover:text-text-primary p-1.5 rounded-lg hover:bg-card-darker transition-colors focus:outline-none"
              title="Back to inbox"
            >
              <ArrowLeft className="w-5.5 h-5.5" />
            </button>
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-text-primary">
                Chat with {otherParticipantAnonId}
              </span>
              <span className="text-[10px] text-text-secondary font-medium leading-none mt-0.5">
                {roomStatus === 'closed' ? 'Conversation closed' : 'Active Anonymous Session'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {roomStatus === 'active' && (
              <>
                <button
                  onClick={handleBlockUser}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-red-200 text-[11px] font-semibold text-red-600 bg-red-50/50 hover:bg-red-50 transition-colors focus:outline-none"
                  title="Block user"
                >
                  <ShieldAlert className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Block</span>
                </button>
                <button
                  onClick={handleEndChat}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-card-border text-[11px] font-semibold text-text-secondary bg-card-darker hover:bg-card transition-colors focus:outline-none"
                  title="End Conversation"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">End Chat</span>
                </button>
              </>
            )}
          </div>
        </Container>
      </header>

      {/* Main Chat Area */}
      <main className="flex-grow flex flex-col bg-background/40 relative">
        {/* Reconnect Banner */}
        {isReconnecting && (
          <div className="bg-yellow-50 text-yellow-700 text-xs py-1.5 text-center font-medium border-b border-yellow-100 sticky top-0 z-10">
            ⚠️ Connection lost. Reconnecting...
          </div>
        )}

        <div className="flex-grow overflow-y-auto max-h-[calc(100vh-140px)] flex flex-col justify-end">
          <Container size="md" className="py-6 flex flex-col space-y-4">
            {isLoading ? (
              <div className="text-center py-20 text-sm text-text-secondary">
                <div className="inline-block w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin mr-2" />
                Loading message history...
              </div>
            ) : error ? (
              <Card className="max-w-md mx-auto p-6 border-red-100 bg-red-50/20 text-center">
                <p className="text-sm font-medium text-red-600 mb-4">{error}</p>
                <Button variant="secondary" onClick={onNavigateToInbox} className="px-4 py-2 text-xs">
                  Return to Inbox
                </Button>
              </Card>
            ) : messages.length === 0 ? (
              <div className="text-center py-20 text-xs text-text-muted font-semibold max-w-xs mx-auto">
                No messages yet. Send a warm greeting to start your conversation.
              </div>
            ) : (
              <div className="flex flex-col space-y-3">
                {messages.map((msg) => {
                  const isMe = msg.senderAnonId === anonId;
                  return (
                    <motion.div
                      key={msg._id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3 }}
                      className={`flex flex-col max-w-[75%] ${isMe ? 'self-end' : 'self-start'}`}
                    >
                      <div
                        className={`p-3.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap shadow-subtle border ${
                          isMe
                            ? 'bg-primary text-background border-primary/20 rounded-tr-sm rounded-br-2xl'
                            : 'bg-card text-text-primary border-card-border rounded-tl-sm rounded-bl-2xl'
                        }`}
                      >
                        {msg.content}
                      </div>
                      <div className={`flex items-center gap-1.5 mt-1 px-1 ${isMe ? 'self-end' : 'self-start'} text-text-muted`}>
                        <span className="text-[9px] font-medium">
                          {formatDistanceToNow(new Date(msg.createdAt), { addSuffix: true })}
                        </span>
                        {!isMe && (
                          <button
                            onClick={() => handleOpenReportModal('message', msg._id)}
                            className="hover:text-red-500 transition-colors focus:outline-none"
                            title="Report message"
                          >
                            <Flag className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </motion.div>
                  );
                })}

                {/* Live Typing Alert */}
                {isOtherTyping && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex self-start max-w-[70%]"
                  >
                    <div className="p-3 bg-card-darker text-text-secondary border border-card-border/60 rounded-2xl rounded-tl-sm rounded-bl-2xl text-xs font-semibold flex items-center gap-1.5 shadow-subtle">
                      <span className="inline-flex gap-0.5">
                        <span className="w-1.5 h-1.5 bg-text-secondary rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                        <span className="w-1.5 h-1.5 bg-text-secondary rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                        <span className="w-1.5 h-1.5 bg-text-secondary rounded-full animate-bounce" style={{ animationDelay: '0.3s' }} />
                      </span>
                      <span>{otherParticipantAnonId} is writing...</span>
                    </div>
                  </motion.div>
                )}

                <div ref={messagesEndRef} />
              </div>
            )}
          </Container>
        </div>

        {/* Input Bar */}
        {!error && !isLoading && (
          <div className="border-t border-card-border bg-card/90 backdrop-blur-md py-4">
            <Container size="md">
              {roomStatus === 'closed' ? (
                <div className="text-center py-2 text-xs text-text-muted font-semibold bg-card-darker rounded-xl border border-card-border/60">
                  🔒 This conversation has been ended permanently.
                </div>
              ) : (
                <form onSubmit={handleSendMessage} className="flex gap-2">
                  <input
                    type="text"
                    required
                    value={inputText}
                    onChange={handleInputChange}
                    placeholder="Type an empathetic message..."
                    className="flex-grow px-4 py-3 bg-background border border-card-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all text-text-primary font-light"
                  />
                  <Button
                    type="submit"
                    disabled={!inputText.trim() || !isConnected}
                    className="px-5 py-3 rounded-xl flex items-center justify-center shrink-0"
                  >
                    <Send className="w-4 h-4 text-background" />
                  </Button>
                </form>
              )}
            </Container>
          </div>
        )}
      </main>

      <ReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        reportType={reportType}
        targetId={reportTargetId}
      />
    </div>
  );
};
export default ChatRoom;
