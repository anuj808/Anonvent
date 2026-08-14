import React, { useEffect, useLayoutEffect, useState, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { isSameDay, format, isToday, isYesterday } from 'date-fns';
import { Send, LogOut, ArrowLeft, ShieldAlert, Flag, MoreVertical } from 'lucide-react';
import api from '../lib/axios';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { Container } from '../components/ui/Container';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import ReportModal from '../components/moderation/ReportModal';

interface MessageType {
  _id: string;
  roomId: string;
  senderAnonId: string;
  content: string;
  createdAt: string;
}

interface ChatRoomProps {
  roomId: string;
  onNavigateToInbox: () => void;
}

const decodeStoredMessageContent = (content: string) => {
  if (typeof document === 'undefined') return content;
  const textarea = document.createElement('textarea');
  textarea.innerHTML = content;
  return textarea.value;
};

// Helpers for hash-based visual identity
const getAvatarColor = (anonId: string) => {
  if (!anonId) return 'from-stone-300 to-stone-400';
  let hash = 0;
  for (let i = 0; i < anonId.length; i++) {
    hash = anonId.charCodeAt(i) + ((hash << 5) - hash);
  }
  const gradients = [
    'from-[#A3B899] to-[#607264]', // Sage
    'from-[#D2C5E3] to-[#9C8EB9]', // Soft lavender
    'from-[#BEE3DB] to-[#89B0A5]', // Dusty teal
    'from-[#E8D7F1] to-[#D3BCCC]', // Lavender blush
    'from-[#F7D6C8] to-[#E2B19D]', // Peach/Cream
    'from-[#C8D6E5] to-[#8395A7]', // Stone/Slate
  ];
  const index = Math.abs(hash) % gradients.length;
  return gradients[index];
};

const getAvatarInitials = (name: string) => {
  if (!name) return 'An';
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();
};

const getMessageDateGroupLabel = (dateString: string) => {
  const date = new Date(dateString);
  if (isToday(date)) return 'Today';
  if (isYesterday(date)) return 'Yesterday';
  return format(date, 'MMMM d, yyyy');
};

export const ChatRoom: React.FC<ChatRoomProps> = ({ roomId, onNavigateToInbox }) => {
  const { anonId, isAuthenticated } = useAuth();
  const { socket, isConnected, isReconnecting } = useSocket();
  const [messages, setMessages] = useState<MessageType[]>([]);
  const [otherParticipantAnonId, setOtherParticipantAnonId] = useState<string | null>(null);
  const [otherParticipantDisplayName, setOtherParticipantDisplayName] = useState<string | null>(null);
  const [isOtherTyping, setIsOtherTyping] = useState<boolean>(false);
  const [inputText, setInputText] = useState<string>('');
  const [roomStatus, setRoomStatus] = useState<string>('active');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isLoadingOlder, setIsLoadingOlder] = useState<boolean>(false);
  const [messagePage, setMessagePage] = useState<number>(1);
  const [hasMoreMessages, setHasMoreMessages] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Dropdown states
  const [isMenuOpen, setIsMenuOpen] = useState<boolean>(false);

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
      await api.post('blocks', { roomId });
      alert('User blocked successfully.');
      onNavigateToInbox();
    } catch (err) {
      alert('Failed to block user. Please try again.');
    }
  };

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messageScrollRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const shouldScrollToBottomRef = useRef<boolean>(false);
  const pendingScrollAnchorRef = useRef<{ height: number; top: number } | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Fetch chat history
  const fetchHistory = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await api.get(`chat/rooms/${roomId}/messages?page=1&limit=30`);
      if (response.data) {
        setRoomStatus(response.data.status);
        setMessages(response.data.messages);
        setMessagePage(1);
        setHasMoreMessages(!!response.data.pagination?.hasMore);
        shouldScrollToBottomRef.current = true;
        
        // Find other participant anonId
        const otherIndex = response.data.participantAnonIds.findIndex((id: string) => id !== anonId);
        const otherAnon = response.data.participantAnonIds[otherIndex];
        const otherDisplay = response.data.participantDisplayNames?.[otherIndex];
        if (otherAnon) {
          setOtherParticipantAnonId(otherAnon);
        }
        if (otherDisplay) {
          setOtherParticipantDisplayName(otherDisplay);
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

  const fetchOlderMessages = async () => {
    if (!hasMoreMessages || isLoadingOlder || isLoading || !messageScrollRef.current) return;

    try {
      setIsLoadingOlder(true);
      const scrollElement = messageScrollRef.current;
      pendingScrollAnchorRef.current = {
        height: scrollElement.scrollHeight,
        top: scrollElement.scrollTop,
      };

      const nextPage = messagePage + 1;
      const response = await api.get(`chat/rooms/${roomId}/messages?page=${nextPage}&limit=30`);
      if (response.data) {
        setMessages((prev) => [...response.data.messages, ...prev]);
        setMessagePage(nextPage);
        setHasMoreMessages(!!response.data.pagination?.hasMore);
      }
    } catch (err) {
      alert('Failed to load older messages. Please try again.');
      pendingScrollAnchorRef.current = null;
    } finally {
      setIsLoadingOlder(false);
    }
  };

  const handleMessageScroll = () => {
    const scrollElement = messageScrollRef.current;
    if (!scrollElement || scrollElement.scrollTop > 48) return;
    fetchOlderMessages();
  };

  // Connect socket and listen to events
  useEffect(() => {
    if (!socket || roomStatus !== 'active') return;

    socket.emit('join_room', { roomId });

    socket.on('receive_message', (message: MessageType) => {
      if (message.roomId === roomId) {
        shouldScrollToBottomRef.current = true;
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

  useLayoutEffect(() => {
    const anchor = pendingScrollAnchorRef.current;
    const scrollElement = messageScrollRef.current;
    if (anchor && scrollElement) {
      scrollElement.scrollTop = scrollElement.scrollHeight - anchor.height + anchor.top;
      pendingScrollAnchorRef.current = null;
      return;
    }

    if (shouldScrollToBottomRef.current) {
      scrollToBottom();
      shouldScrollToBottomRef.current = false;
    }
  }, [messages]);

  useEffect(() => {
    if (isOtherTyping) {
      scrollToBottom();
    }
  }, [isOtherTyping]);

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
      await api.post(`chat/rooms/${roomId}/close`);
      setRoomStatus('closed');
      onNavigateToInbox();
    } catch (err) {
      alert('Failed to end conversation. You may not be authorized.');
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-between selection:bg-primary/10 selection:text-primary-dark bg-[#FAFAFA]">
      {/* Header */}
      <header className="border-b border-card-border/60 bg-background/80 backdrop-blur-md sticky top-0 z-40 transition-all duration-300">
        <Container size="md" className="h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={onNavigateToInbox}
              className="text-text-secondary hover:text-text-primary p-1.5 rounded-lg hover:bg-card-darker transition-colors focus:outline-none"
              title="Back to inbox"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            
            <div className="flex items-center gap-2.5">
              <div className={`w-9 h-9 rounded-full bg-gradient-to-tr ${getAvatarColor(otherParticipantAnonId || '')} flex items-center justify-center text-white text-[11px] font-bold shadow-sm shrink-0`}>
                {getAvatarInitials(otherParticipantDisplayName || otherParticipantAnonId || '')}
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-text-primary">
                  {otherParticipantDisplayName || otherParticipantAnonId || 'Anonymous Peer'}
                </span>
                <span className="text-[10px] text-text-secondary font-light leading-none mt-1">
                  {roomStatus === 'closed' ? (
                    'Conversation ended'
                  ) : (
                    <span className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                      Active now
                    </span>
                  )}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {roomStatus === 'active' && (
              <div className="relative">
                <button
                  onClick={() => setIsMenuOpen(!isMenuOpen)}
                  className="p-2 rounded-xl text-text-secondary hover:text-text-primary hover:bg-card-darker transition-colors focus:outline-none"
                  title="Conversation settings"
                >
                  <MoreVertical className="w-5 h-5" />
                </button>
                
                <AnimatePresence>
                  {isMenuOpen && (
                    <>
                      {/* Backdrop overlay to close menu */}
                      <div className="fixed inset-0 z-40" onClick={() => setIsMenuOpen(false)} />
                      
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: -10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: -10 }}
                        transition={{ duration: 0.15 }}
                        className="absolute right-0 mt-2 w-48 bg-card border border-card-border shadow-md rounded-2xl py-2 z-50 overflow-hidden"
                      >
                        <button
                          onClick={() => {
                            setIsMenuOpen(false);
                            handleBlockUser();
                          }}
                          className="w-full text-left px-4 py-2.5 text-xs text-red-600 hover:bg-red-50/50 font-semibold transition-colors flex items-center gap-2"
                        >
                          <ShieldAlert className="w-4 h-4" />
                          Block User
                        </button>
                        <button
                          onClick={() => {
                            setIsMenuOpen(false);
                            handleEndChat();
                          }}
                          className="w-full text-left px-4 py-2.5 text-xs text-text-primary hover:bg-card-darker font-semibold transition-colors flex items-center gap-2"
                        >
                          <LogOut className="w-4 h-4" />
                          End Chat
                        </button>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>
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

        <div
          ref={messageScrollRef}
          onScroll={handleMessageScroll}
          className="flex-grow overflow-y-auto max-h-[calc(100vh-140px)]"
        >
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
              <div className="flex flex-col items-center justify-center py-16 text-center space-y-3">
                <div className={`w-14 h-14 rounded-full bg-gradient-to-tr ${getAvatarColor(otherParticipantAnonId || '')} flex items-center justify-center text-white text-base font-bold shadow-md`}>
                  {getAvatarInitials(otherParticipantDisplayName || otherParticipantAnonId || '')}
                </div>
                <h4 className="text-sm font-semibold text-text-primary">{otherParticipantDisplayName || otherParticipantAnonId || 'Anonymous Peer'}</h4>
                <p className="text-xs text-text-secondary font-light max-w-[240px] leading-relaxed">
                  Say hello — you're both anonymous here in this peaceful space.
                </p>
              </div>
            ) : (
              <div className="flex flex-col space-y-2">
                {hasMoreMessages && (
                  <button
                    onClick={fetchOlderMessages}
                    disabled={isLoadingOlder}
                    className="self-center text-[11px] font-semibold text-text-secondary hover:text-primary disabled:opacity-60 transition-colors focus:outline-none py-2"
                  >
                    {isLoadingOlder ? 'Loading older messages...' : 'Load older messages'}
                  </button>
                )}
                {messages.map((msg, index) => {
                  const isMe = msg.senderAnonId === anonId;
                  const currentDateLabel = getMessageDateGroupLabel(msg.createdAt);
                  const prevMessage = index > 0 ? messages[index - 1] : null;
                  const showDateSeparator = !prevMessage || !isSameDay(new Date(msg.createdAt), new Date(prevMessage.createdAt));

                  return (
                    <React.Fragment key={msg._id}>
                      {showDateSeparator && (
                        <div className="flex justify-center my-4">
                          <span className="text-[10px] font-semibold text-text-muted bg-card-darker border border-card-border/40 px-3 py-1 rounded-full uppercase tracking-wider select-none">
                            {currentDateLabel}
                          </span>
                        </div>
                      )}
                      
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.2 }}
                        className={`group flex flex-col max-w-[75%] ${isMe ? 'self-end' : 'self-start'}`}
                      >
                        <div
                          className={`py-2.5 px-4 text-sm leading-relaxed whitespace-pre-wrap ${
                            isMe
                              ? 'bg-[#607264] text-white rounded-2xl rounded-tr-sm rounded-br-2xl'
                              : 'bg-card text-text-primary border border-card-border/40 rounded-2xl rounded-tl-sm rounded-bl-2xl shadow-subtle'
                          }`}
                        >
                          {decodeStoredMessageContent(msg.content)}
                        </div>
                        <div className={`flex items-center gap-1.5 mt-1 px-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-text-muted ${isMe ? 'self-end' : 'self-start'}`}>
                          <span className="text-[9px] font-medium">
                            {format(new Date(msg.createdAt), 'h:mm a')}
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
                    </React.Fragment>
                  );
                })}

                {/* Live Typing Alert */}
                {isOtherTyping && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex self-start mt-2"
                  >
                    <div className="flex items-center gap-1 bg-card border border-card-border/40 px-4 py-3 rounded-2xl rounded-tl-sm w-16 justify-center shadow-subtle">
                      <span className="w-1.5 h-1.5 bg-text-secondary rounded-full animate-bounce shrink-0" style={{ animationDelay: '0ms' }} />
                      <span className="w-1.5 h-1.5 bg-text-secondary rounded-full animate-bounce shrink-0" style={{ animationDelay: '150ms' }} />
                      <span className="w-1.5 h-1.5 bg-text-secondary rounded-full animate-bounce shrink-0" style={{ animationDelay: '300ms' }} />
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
                <form onSubmit={handleSendMessage} className="flex items-center bg-background border border-card-border/60 rounded-full px-4 py-1.5 gap-2 w-full shadow-subtle">
                  <input
                    type="text"
                    required
                    value={inputText}
                    onChange={handleInputChange}
                    placeholder="Type an empathetic message..."
                    className="flex-grow bg-transparent border-none py-2 text-sm focus:outline-none text-text-primary font-light placeholder-text-muted"
                  />
                  <AnimatePresence>
                    {inputText.trim() && (
                      <motion.button
                        type="submit"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        disabled={!isConnected}
                        className="p-2 rounded-full bg-primary text-background flex items-center justify-center shrink-0 hover:bg-primary-hover active:scale-95 transition-all duration-150 focus:outline-none"
                      >
                        <Send className="w-3.5 h-3.5" />
                      </motion.button>
                    )}
                  </AnimatePresence>
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
