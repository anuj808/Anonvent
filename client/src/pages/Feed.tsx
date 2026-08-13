import React, { useEffect, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import { Trash2, MessageSquare, Plus, Leaf, AlertCircle, Flag } from 'lucide-react';
import api from '../lib/axios';
import { useAuth } from '../context/AuthContext';
import ReportModal from '../components/moderation/ReportModal';
import { ALLOWED_TAGS } from '../lib/constants';
import { Container } from '../components/ui/Container';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import CreatePostModal from '../components/posts/CreatePostModal';
import CrisisModal from '../components/posts/CrisisModal';

interface PostType {
  _id: string;
  authorAnonId: string;
  content: string;
  tags: string[];
  status: string;
  createdAt: string;
}

interface FeedProps {
  onNavigateToHome: () => void;
  onNavigateToInbox: () => void;
  onNavigateToChat: (roomId: string) => void;
  onNavigateToAdmin: () => void;
  initialOpenPost?: boolean;
  clearInitialOpenPost?: () => void;
}

export const Feed: React.FC<FeedProps> = ({
  onNavigateToHome,
  onNavigateToInbox,
  onNavigateToChat,
  onNavigateToAdmin,
  initialOpenPost,
  clearInitialOpenPost,
}) => {
  const { anonId, isAuthenticated, logout, openAuthModal, isAdmin } = useAuth();
  const [posts, setPosts] = useState<PostType[]>([]);
  const [page, setPage] = useState<number>(1);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isPostingModalOpen, setIsPostingModalOpen] = useState<boolean>(false);
  const [isCrisisModalOpen, setIsCrisisModalOpen] = useState<boolean>(false);
  const [serverStatus, setServerStatus] = useState<'connecting' | 'online' | 'offline'>('connecting');

  // Moderation state
  const [isReportModalOpen, setIsReportModalOpen] = useState<boolean>(false);
  const [reportTargetId, setReportTargetId] = useState<string>('');
  const [reportType, setReportType] = useState<'post' | 'message'>('post');

  const handleOpenReportModal = (type: 'post' | 'message', targetId: string) => {
    setReportType(type);
    setReportTargetId(targetId);
    setIsReportModalOpen(true);
  };

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

  // Fetch posts from API
  const fetchPosts = async (pageNum: number, tagFilter: string | null, append: boolean = false) => {
    try {
      setIsLoading(true);
      const tagQuery = tagFilter ? `&tag=${tagFilter}` : '';
      const response = await api.get(`/posts?page=${pageNum}${tagQuery}`);
      
      if (response.data) {
        if (append) {
          setPosts((prev) => [...prev, ...response.data]);
        } else {
          setPosts(response.data);
        }
        
        if (response.data.length < 20) {
          setHasMore(false);
        } else {
          setHasMore(true);
        }
      }
    } catch (error) {
      console.error('Failed to fetch posts');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts(1, selectedTag, false);
    setPage(1);
  }, [selectedTag]);

  // Auto-open post modal if redirected from Hero CTA
  useEffect(() => {
    if (initialOpenPost) {
      setIsPostingModalOpen(true);
      if (clearInitialOpenPost) clearInitialOpenPost();
    }
  }, [initialOpenPost, clearInitialOpenPost]);

  const handleStartChat = async (postId: string) => {
    if (!isAuthenticated) {
      openAuthModal();
      return;
    }
    try {
      const response = await api.post('/chat/start', { postId });
      if (response.data && response.data.roomId) {
        onNavigateToChat(response.data.roomId);
      }
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to start conversation');
    }
  };

  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchPosts(nextPage, selectedTag, true);
  };

  const handleTagSelect = (tag: string | null) => {
    setSelectedTag(tag);
  };

  const handleCreatePostSuccess = (crisisResourceShown: boolean) => {
    fetchPosts(1, selectedTag, false);
    setPage(1);
    
    if (crisisResourceShown) {
      setIsCrisisModalOpen(true);
    }
  };

  const handleDeletePost = async (postId: string) => {
    if (!window.confirm('Are you sure you want to remove this post?')) return;
    try {
      await api.delete(`/posts/${postId}`);
      setPosts((prev) => prev.filter((p) => p._id !== postId));
    } catch (error) {
      alert('Failed to delete post. You may not be authorized.');
    }
  };

  const handleCreatePostTrigger = () => {
    if (!isAuthenticated) {
      openAuthModal();
    } else {
      setIsPostingModalOpen(true);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-between selection:bg-primary/10 selection:text-primary-dark">
      {/* Navbar */}
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
            {/* Status check */}
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

            {isAuthenticated ? (
              <div className="flex items-center gap-3">
                {isAdmin && (
                  <button
                    onClick={onNavigateToAdmin}
                    className="text-xs text-red-500 font-semibold hover:text-red-700 hover:underline transition-colors focus:outline-none mr-2"
                  >
                    Admin
                  </button>
                )}
                <button
                  onClick={onNavigateToInbox}
                  className="text-xs text-text-secondary hover:text-text-primary font-semibold transition-colors focus:outline-none mr-2"
                >
                  Inbox
                </button>
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

      {/* Main Container */}
      <main className="flex-grow py-10 bg-background/40">
        <Container size="lg" className="space-y-10">
          
          {/* Feed Title & Share Trigger */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight text-text-primary">The Feed</h1>
              <p className="text-sm text-text-secondary font-light mt-1">
                Read, listen, and share anonymous vents in a peaceful space.
              </p>
            </div>
            <Button
              variant="primary"
              onClick={handleCreatePostTrigger}
              className="w-full sm:w-auto px-5 py-2.5 text-xs rounded-xl font-semibold flex items-center justify-center gap-2 shadow-soft"
            >
              <Plus className="w-4 h-4" />
              <span>Share what's on your mind</span>
            </Button>
          </div>

          {/* Tag Filter Bar */}
          <div className="py-2 border-y border-card-border/45 overflow-x-auto scrollbar-none">
            <div className="flex gap-2 min-w-max">
              <button
                onClick={() => handleTagSelect(null)}
                className={`px-4 py-1.5 rounded-full text-xs font-medium border transition-all duration-200 ${
                  selectedTag === null
                    ? 'bg-primary border-primary text-background'
                    : 'bg-card border-card-border text-text-secondary hover:border-primary/30 hover:text-primary'
                }`}
              >
                All posts
              </button>
              {ALLOWED_TAGS.map((tag) => (
                <button
                  key={tag}
                  onClick={() => handleTagSelect(tag)}
                  className={`px-4 py-1.5 rounded-full text-xs font-medium border transition-all duration-200 capitalize ${
                    selectedTag === tag
                      ? 'bg-primary border-primary text-background'
                      : 'bg-card border-card-border text-text-secondary hover:border-primary/30 hover:text-primary'
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          {/* Posts List */}
          <div className="space-y-6">
            {posts.length === 0 && !isLoading ? (
              <div className="py-20 text-center max-w-sm mx-auto">
                <AlertCircle className="w-10 h-10 text-primary/60 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-text-primary mb-2">
                  {selectedTag ? `No posts in #${selectedTag}` : "It's quiet here right now"}
                </h3>
                <p className="text-sm text-text-secondary font-light mb-6">
                  {selectedTag 
                    ? "Be the first to share a post in this category." 
                    : "Be the first to share what is on your mind today."}
                </p>
                <Button
                  variant="primary"
                  onClick={handleCreatePostTrigger}
                  className="px-5 py-2 rounded-xl text-xs"
                >
                  Create a post
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-6 max-w-2xl mx-auto">
                <AnimatePresence mode="popLayout">
                  {posts.map((post) => {
                    const isOwnPost = isAuthenticated && post.authorAnonId === anonId;
                    return (
                      <Card
                        key={post._id}
                        animate
                        className="relative border-card-border/60 hover:shadow-soft transition-all duration-300"
                      >
                        {/* Post Header */}
                        <div className="flex items-center justify-between gap-4 mb-4">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-primary-light text-primary border border-primary/20">
                              {post.authorAnonId}
                            </span>
                            <span className="text-[11px] text-text-muted font-medium">
                              {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}
                            </span>
                          </div>

                          {/* Delete / Report Trigger */}
                          {isOwnPost ? (
                            <button
                              onClick={() => handleDeletePost(post._id)}
                              className="text-text-secondary hover:text-red-600 p-1 rounded-lg hover:bg-red-50/50 transition-colors focus:outline-none"
                              title="Delete post"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          ) : (
                            isAuthenticated && (
                              <button
                                onClick={() => handleOpenReportModal('post', post._id)}
                                className="text-text-secondary hover:text-red-500 p-1 rounded-lg hover:bg-red-50/50 transition-colors focus:outline-none"
                                title="Report post"
                              >
                                <Flag className="w-3.5 h-3.5" />
                              </button>
                            )
                          )}
                        </div>

                        {/* Post Content */}
                        <p className="text-sm text-text-primary font-light leading-relaxed whitespace-pre-wrap mb-5">
                          {post.content}
                        </p>

                        {/* Post Footer */}
                        <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-card-border/40">
                          {/* Tags */}
                          <div className="flex flex-wrap gap-1.5">
                            {post.tags.map((tag) => (
                              <span
                                key={tag}
                                className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-card-darker text-text-secondary border border-card-border/50 capitalize"
                              >
                                #{tag}
                              </span>
                            ))}
                          </div>

                          {/* Action Button */}
                          <button
                            onClick={() => handleStartChat(post._id)}
                            className="inline-flex items-center gap-1.5 text-xs text-primary hover:text-primary-hover font-semibold transition-colors focus:outline-none"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                            <span>Listen & Respond</span>
                          </button>
                        </div>
                      </Card>
                    );
                  })}
                </AnimatePresence>
              </div>
            )}

            {/* Loading Indicator */}
            {isLoading && (
              <div className="text-center py-6 text-sm text-text-secondary">
                <div className="inline-block w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin mr-2" />
                Loading posts...
              </div>
            )}

            {/* Load More Button */}
            {!isLoading && hasMore && posts.length > 0 && (
              <div className="text-center pt-6">
                <Button
                  variant="secondary"
                  onClick={handleLoadMore}
                  className="px-6 py-2 rounded-xl text-xs font-semibold"
                >
                  Load older posts
                </Button>
              </div>
            )}
          </div>
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

      {/* Modals */}
      <CreatePostModal
        isOpen={isPostingModalOpen}
        onClose={() => setIsPostingModalOpen(false)}
        onSuccess={handleCreatePostSuccess}
      />

      <CrisisModal
        isOpen={isCrisisModalOpen}
        onClose={() => setIsCrisisModalOpen(false)}
      />

      <ReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        reportType={reportType}
        targetId={reportTargetId}
      />
    </div>
  );
};
export default Feed;
