import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, useMotionValue, useReducedMotion, useSpring, useTransform } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import { Trash2, MessageSquare, Plus, Leaf, AlertCircle, Flag, X, ChevronLeft, ChevronRight } from 'lucide-react';
import api from '../lib/axios';
import { useAuth } from '../context/AuthContext';
import ReportModal from '../components/moderation/ReportModal';
import { ALLOWED_TAGS } from '../lib/constants';
import { Container } from '../components/ui/Container';
import { Button } from '../components/ui/Button';
import CreatePostModal from '../components/posts/CreatePostModal';
import CrisisModal from '../components/posts/CrisisModal';

interface PostType {
  _id: string;
  authorAnonId: string;
  authorDisplayName?: string;
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

// Helpers for hash-based visual identity
const getAvatarColor = (anonId: string) => {
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

// Pulsing skeleton card loader component
const SkeletonCard = () => (
  <div className="bg-card border border-card-border/50 rounded-2xl p-6 space-y-4 animate-pulse w-full max-w-2xl mx-auto">
    <div className="flex items-center gap-3">
      <div className="w-9 h-9 rounded-full bg-card-darker" />
      <div className="space-y-1.5 flex-grow">
        <div className="h-3 bg-card-darker rounded w-24" />
        <div className="h-2 bg-card-darker rounded w-16" />
      </div>
    </div>
    <div className="space-y-2">
      <div className="h-3.5 bg-card-darker rounded w-full" />
      <div className="h-3.5 bg-card-darker rounded w-11/12" />
      <div className="h-3.5 bg-card-darker rounded w-2/3" />
    </div>
    <div className="flex justify-between items-center pt-4 border-t border-card-border/30">
      <div className="flex gap-1.5">
        <div className="h-5 bg-card-darker rounded-full w-12" />
        <div className="h-5 bg-card-darker rounded-full w-12" />
      </div>
      <div className="h-7 bg-card-darker rounded-xl w-32" />
    </div>
  </div>
);

// Stagger entry configurations
const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.06,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      type: 'spring',
      stiffness: 90,
      damping: 14,
    },
  },
};

const CARD_OFFSETS = [
  { x: -22, y: 0, rotate: -1.5 },
  { x: 26, y: -10, rotate: 1.2 },
  { x: -8, y: -4, rotate: -0.6 },
  { x: 18, y: -16, rotate: 0.8 },
  { x: -28, y: -8, rotate: 1.1 },
  { x: 10, y: -12, rotate: -1 },
];

const getCardOffset = (index: number) => CARD_OFFSETS[index % CARD_OFFSETS.length];

const getNeighborTransform = (index: number, activeIndex: number | null, reducedMotion: boolean) => {
  if (activeIndex === null || reducedMotion) return { x: 0, scale: 1 };
  const distance = Math.abs(index - activeIndex);
  if (distance === 0) return { x: 0, scale: 1.025 };
  if (distance === 1) return { x: index < activeIndex ? -10 : 10, scale: 0.988 };
  if (distance === 2) return { x: index < activeIndex ? -5 : 5, scale: 0.995 };
  return { x: 0, scale: 1 };
};

interface FeedPostCardProps {
  post: PostType;
  index: number;
  isOwnPost: boolean;
  isAuthenticated: boolean;
  activeIndex: number | null;
  reducedMotion: boolean;
  onOpen: (post: PostType) => void;
  onHoverStart: (index: number) => void;
  onHoverEnd: () => void;
  onStartChat: (postId: string) => void;
  onDeletePost: (postId: string) => void;
  onOpenReportModal: (type: 'post' | 'message', targetId: string) => void;
}

const FeedPostCard: React.FC<FeedPostCardProps> = ({
  post,
  index,
  isOwnPost,
  isAuthenticated,
  activeIndex,
  reducedMotion,
  onOpen,
  onHoverStart,
  onHoverEnd,
  onStartChat,
  onDeletePost,
  onOpenReportModal,
}) => {
  const offset = getCardOffset(index);
  const neighborTransform = getNeighborTransform(index, activeIndex, reducedMotion);
  const idleY = reducedMotion ? 0 : index % 2 === 0 ? -4 : 4;
  const baseMargin = index === 0 ? 'mt-0' : '-mt-3 sm:-mt-5 lg:-mt-7';

  return (
    <motion.article
      variants={itemVariants}
      layout
      className={`relative w-full ${baseMargin}`}
      style={{
        zIndex: activeIndex === index ? 30 : postsLayerIndex(index),
      }}
      animate={{
        x: reducedMotion ? 0 : offset.x + neighborTransform.x,
        y: reducedMotion ? 0 : [offset.y, offset.y + idleY, offset.y],
        rotate: reducedMotion ? 0 : offset.rotate,
        scale: neighborTransform.scale,
      }}
      transition={{
        x: { type: 'spring', stiffness: 170, damping: 24 },
        scale: { type: 'spring', stiffness: 180, damping: 22 },
        rotate: { type: 'spring', stiffness: 120, damping: 24 },
        y: reducedMotion
          ? { duration: 0 }
          : {
              duration: 5.8 + (index % 4) * 0.8,
              repeat: Infinity,
              repeatType: 'mirror',
              ease: 'easeInOut',
              delay: (index % 5) * 0.35,
            },
      }}
      onHoverStart={() => onHoverStart(index)}
      onHoverEnd={onHoverEnd}
    >
      <motion.div
        layoutId={`post-card-${post._id}`}
        onClick={() => onOpen(post)}
        role="button"
        tabIndex={0}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            onOpen(post);
          }
        }}
        className="group relative cursor-pointer overflow-hidden rounded-2xl border border-card-border/65 bg-card/95 p-5 shadow-premium outline-none backdrop-blur-sm transition-colors duration-300 hover:border-primary/25 focus-visible:ring-2 focus-visible:ring-primary/35 sm:p-6"
        whileHover={
          reducedMotion
            ? undefined
            : {
                y: -10,
                scale: 1.018,
                boxShadow: '0 30px 65px -28px rgba(59, 71, 62, 0.34), 0 12px 30px -18px rgba(0, 0, 0, 0.22)',
              }
        }
        whileTap={reducedMotion ? undefined : { scale: 0.992 }}
        transition={{ type: 'spring', stiffness: 210, damping: 24 }}
      >
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/7 via-transparent to-[#D2C5E3]/10 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
        <PostCardContent
          post={post}
          isOwnPost={isOwnPost}
          canReport={isAuthenticated && !isOwnPost}
          isPreview
          onStartChat={onStartChat}
          onDeletePost={onDeletePost}
          onOpenReportModal={onOpenReportModal}
        />
      </motion.div>
    </motion.article>
  );
};

const postsLayerIndex = (index: number) => 20 - (index % 10);

interface PostCardContentProps {
  post: PostType;
  isOwnPost: boolean;
  canReport: boolean;
  isPreview?: boolean;
  onStartChat: (postId: string) => void;
  onDeletePost: (postId: string) => void;
  onOpenReportModal: (type: 'post' | 'message', targetId: string) => void;
}

const PostCardContent: React.FC<PostCardContentProps> = ({
  post,
  isOwnPost,
  canReport,
  isPreview = false,
  onStartChat,
  onDeletePost,
  onOpenReportModal,
}) => {
  const contentClasses = isPreview
    ? 'line-clamp-[8] max-h-72 overflow-hidden'
    : 'max-h-[48vh] overflow-y-auto pr-1';

  return (
    <div className="relative">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className={`w-9 h-9 rounded-full bg-gradient-to-tr ${getAvatarColor(post.authorAnonId)} flex shrink-0 items-center justify-center text-[11px] font-bold text-white shadow-sm`}>
            {getAvatarInitials(post.authorDisplayName || post.authorAnonId)}
          </div>
          <div className="flex min-w-0 flex-col">
            <span className="truncate text-xs font-semibold leading-none text-text-primary">
              {post.authorDisplayName || post.authorAnonId}
            </span>
            <span className="mt-1 text-[10px] font-light text-text-muted">
              {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}
            </span>
          </div>
        </div>

        {isOwnPost ? (
          <button
            onClick={(event) => {
              event.stopPropagation();
              onDeletePost(post._id);
            }}
            className="rounded-xl p-1.5 text-text-secondary transition-colors hover:bg-red-50/50 hover:text-red-600 focus:outline-none focus:ring-2 focus:ring-red-200"
            title="Delete post"
            aria-label="Delete post"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        ) : canReport ? (
          <button
            onClick={(event) => {
              event.stopPropagation();
              onOpenReportModal('post', post._id);
            }}
            className="rounded-xl p-1.5 text-text-secondary transition-colors hover:bg-red-50/50 hover:text-red-500 focus:outline-none focus:ring-2 focus:ring-red-200"
            title="Report post"
            aria-label="Report post"
          >
            <Flag className="w-3.5 h-3.5" />
          </button>
        ) : null}
      </div>

      <p className={`mb-5 whitespace-pre-wrap text-[15px] font-light leading-relaxed text-text-primary ${contentClasses}`}>
        {post.content}
      </p>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-card-border/40 pt-4">
        <div className="flex flex-wrap gap-1.5">
          {post.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full border border-card-border/30 bg-card-darker px-2.5 py-0.5 text-[10px] font-medium capitalize text-text-secondary"
            >
              #{tag}
            </span>
          ))}
        </div>

        <button
          onClick={(event) => {
            event.stopPropagation();
            onStartChat(post._id);
          }}
          className="inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold text-primary transition-all duration-200 hover:bg-primary/5 hover:text-primary-hover focus:outline-none focus:ring-2 focus:ring-primary/25"
        >
          <MessageSquare className="w-3.5 h-3.5" />
          <span>Listen & Respond</span>
        </button>
      </div>
    </div>
  );
};

export const Feed: React.FC<FeedProps> = ({
  onNavigateToHome,
  onNavigateToInbox,
  onNavigateToChat,
  onNavigateToAdmin,
  initialOpenPost,
  clearInitialOpenPost,
}) => {
  const { anonId, displayName, isAuthenticated, logout, openAuthModal, isAdmin } = useAuth();
  const [posts, setPosts] = useState<PostType[]>([]);
  const [page, setPage] = useState<number>(1);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isPostingModalOpen, setIsPostingModalOpen] = useState<boolean>(false);
  const [isCrisisModalOpen, setIsCrisisModalOpen] = useState<boolean>(false);
  const [serverStatus, setServerStatus] = useState<'connecting' | 'online' | 'offline'>('connecting');
  const [activeCardIndex, setActiveCardIndex] = useState<number | null>(null);
  const [expandedPostId, setExpandedPostId] = useState<string | null>(null);
  const shouldReduceMotion = useReducedMotion();
  const reduceMotion = Boolean(shouldReduceMotion);
  const spotlightX = useMotionValue(50);
  const spotlightY = useMotionValue(40);
  const smoothSpotlightX = useSpring(spotlightX, { stiffness: 55, damping: 24, mass: 0.45 });
  const smoothSpotlightY = useSpring(spotlightY, { stiffness: 55, damping: 24, mass: 0.45 });
  const spotlightLeft = useTransform(smoothSpotlightX, (value) => `${value}%`);
  const spotlightTop = useTransform(smoothSpotlightY, (value) => `${value}%`);
  const spotlightFrame = useRef<number | null>(null);
  const pendingSpotlight = useRef<{ x: number; y: number } | null>(null);

  // Moderation state
  const [isReportModalOpen, setIsReportModalOpen] = useState<boolean>(false);
  const [reportTargetId, setReportTargetId] = useState<string>('');
  const [reportType, setReportType] = useState<'post' | 'message'>('post');

  const handleOpenReportModal = (type: 'post' | 'message', targetId: string) => {
    setReportType(type);
    setReportTargetId(targetId);
    setIsReportModalOpen(true);
  };

  const expandedIndex = useMemo(
    () => posts.findIndex((post) => post._id === expandedPostId),
    [posts, expandedPostId],
  );
  const expandedPost = expandedIndex >= 0 ? posts[expandedIndex] : null;

  const handleFeedPointerMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (reduceMotion || event.pointerType !== 'mouse') return;
      const bounds = event.currentTarget.getBoundingClientRect();
      pendingSpotlight.current = {
        x: ((event.clientX - bounds.left) / bounds.width) * 100,
        y: ((event.clientY - bounds.top) / bounds.height) * 100,
      };
      if (spotlightFrame.current !== null) return;
      spotlightFrame.current = window.requestAnimationFrame(() => {
        if (pendingSpotlight.current) {
          spotlightX.set(pendingSpotlight.current.x);
          spotlightY.set(pendingSpotlight.current.y);
        }
        spotlightFrame.current = null;
      });
    },
    [reduceMotion, spotlightX, spotlightY],
  );

  const closeExpandedPost = useCallback(() => setExpandedPostId(null), []);

  const navigateExpandedPost = useCallback(
    (direction: 1 | -1) => {
      if (!posts.length || expandedIndex < 0) return;
      const nextIndex = (expandedIndex + direction + posts.length) % posts.length;
      setExpandedPostId(posts[nextIndex]._id);
    },
    [expandedIndex, posts],
  );

  useEffect(() => {
    api.get('health')
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
      const response = await api.get(`posts?page=${pageNum}${tagQuery}`);
      
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
      console.error('Failed to fetch posts:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts(1, selectedTag, false);
    setPage(1);
  }, [selectedTag]);

  useEffect(() => {
    if (expandedPostId && !posts.some((post) => post._id === expandedPostId)) {
      setExpandedPostId(null);
    }
  }, [expandedPostId, posts]);

  useEffect(() => {
    if (!expandedPost) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeExpandedPost();
      if (event.key === 'ArrowRight') navigateExpandedPost(1);
      if (event.key === 'ArrowLeft') navigateExpandedPost(-1);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [closeExpandedPost, expandedPost, navigateExpandedPost]);

  useEffect(() => {
    return () => {
      if (spotlightFrame.current !== null) {
        window.cancelAnimationFrame(spotlightFrame.current);
      }
    };
  }, []);

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
      const response = await api.post('chat/start', { postId });
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
      await api.delete(`posts/${postId}`);
      setPosts((prev) => prev.filter((p) => p._id !== postId));
    } catch {
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
                  Identity: {displayName || anonId}
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
      <main className="flex-grow py-8 bg-background/40">
        <Container size="lg" className="space-y-8">
          
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
              className="hidden sm:inline-flex px-5 py-2.5 text-xs rounded-xl font-semibold items-center gap-2 shadow-soft"
            >
              <Plus className="w-4 h-4" />
              <span>Share what's on your mind</span>
            </Button>
          </div>

          {/* Tag Filter Bar */}
          <div className="py-2 border-y border-card-border/45 overflow-x-auto scrollbar-none">
            <div className="flex gap-2 min-w-max px-1">
              <button
                onClick={() => handleTagSelect(null)}
                className={`px-4 py-1.5 rounded-full text-xs font-semibold tracking-wide border transition-all duration-200 ${
                  selectedTag === null
                    ? 'bg-primary border-primary text-background shadow-subtle scale-105'
                    : 'bg-card border-card-border text-text-secondary hover:border-primary/40 hover:text-primary'
                }`}
              >
                All posts
              </button>
              {ALLOWED_TAGS.map((tag) => (
                <button
                  key={tag}
                  onClick={() => handleTagSelect(tag)}
                  className={`px-4 py-1.5 rounded-full text-xs font-semibold tracking-wide border transition-all duration-200 capitalize ${
                    selectedTag === tag
                      ? 'bg-primary border-primary text-background shadow-subtle scale-105'
                      : 'bg-card border-card-border text-text-secondary hover:border-primary/40 hover:text-primary'
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          {/* Posts List / Skeleton Loading Container */}
          <div className="space-y-6">
            {isLoading && posts.length === 0 ? (
              <div className="space-y-5 w-full">
                <SkeletonCard />
                <SkeletonCard />
                <SkeletonCard />
              </div>
            ) : posts.length === 0 && !isLoading ? (
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
              <motion.div
                onPointerMove={handleFeedPointerMove}
                onPointerLeave={() => setActiveCardIndex(null)}
                className="relative mx-auto min-h-[620px] max-w-4xl overflow-hidden rounded-2xl border border-card-border/35 bg-card/20 px-3 py-8 sm:px-8 sm:py-12 lg:px-12"
              >
                {!reduceMotion && (
                  <motion.div
                    aria-hidden="true"
                    className="pointer-events-none absolute h-80 w-80 rounded-full bg-primary/12 blur-3xl"
                    style={{
                      left: spotlightLeft,
                      top: spotlightTop,
                      x: '-50%',
                      y: '-50%',
                    }}
                  />
                )}
                <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-background/35 to-transparent" />
                <motion.div
                  variants={containerVariants}
                  initial="hidden"
                  animate="show"
                  className="relative mx-auto flex w-full max-w-2xl flex-col pb-10 sm:pb-16"
                >
                  <AnimatePresence mode="popLayout">
                    {posts.map((post, index) => {
                      const isOwnPost = isAuthenticated && post.authorAnonId === anonId;
                      return (
                        <FeedPostCard
                          key={post._id}
                          post={post}
                          index={index}
                          isOwnPost={isOwnPost}
                          isAuthenticated={isAuthenticated}
                          activeIndex={activeCardIndex}
                          reducedMotion={reduceMotion}
                          onOpen={(nextPost) => setExpandedPostId(nextPost._id)}
                          onHoverStart={setActiveCardIndex}
                          onHoverEnd={() => setActiveCardIndex(null)}
                          onStartChat={handleStartChat}
                          onDeletePost={handleDeletePost}
                          onOpenReportModal={handleOpenReportModal}
                        />
                      );
                    })}
                  </AnimatePresence>
                </motion.div>
              </motion.div>
            )}

            {/* Load More Trigger */}
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

            {/* Inline Loading Spinners on Pagination scroll */}
            {isLoading && posts.length > 0 && (
              <div className="text-center py-6 text-sm text-text-secondary">
                <div className="inline-block w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin mr-2" />
                Loading older stories...
              </div>
            )}
          </div>
        </Container>
      </main>

      <AnimatePresence>
        {expandedPost && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-text-primary/30 px-4 py-6 backdrop-blur-md sm:px-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeExpandedPost}
          >
            <motion.div
              layoutId={`post-card-${expandedPost._id}`}
              role="dialog"
              aria-modal="true"
              aria-label="Expanded post"
              className="relative max-h-[88vh] w-full max-w-2xl overflow-hidden rounded-2xl border border-card-border bg-card p-5 shadow-[0_38px_90px_-34px_rgba(30,37,43,0.55)] outline-none sm:p-7"
              onClick={(event) => event.stopPropagation()}
              drag={reduceMotion ? false : 'x'}
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.12}
              onDragEnd={(_, info) => {
                if (Math.abs(info.offset.x) > 90) {
                  navigateExpandedPost(info.offset.x < 0 ? 1 : -1);
                }
              }}
              transition={{ type: 'spring', stiffness: 210, damping: 25 }}
            >
              <button
                onClick={closeExpandedPost}
                className="absolute right-4 top-4 z-10 rounded-full border border-card-border bg-card/90 p-2 text-text-secondary shadow-subtle transition-colors hover:bg-card-darker hover:text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                aria-label="Close expanded post"
                title="Close"
              >
                <X className="h-4 w-4" />
              </button>

              {posts.length > 1 && (
                <div className="absolute bottom-4 right-4 z-10 flex items-center gap-2">
                  <button
                    onClick={() => navigateExpandedPost(-1)}
                    className="rounded-full border border-card-border bg-card/90 p-2 text-text-secondary shadow-subtle transition-colors hover:bg-primary-light hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                    aria-label="Previous post"
                    title="Previous post"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => navigateExpandedPost(1)}
                    className="rounded-full border border-card-border bg-card/90 p-2 text-text-secondary shadow-subtle transition-colors hover:bg-primary-light hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                    aria-label="Next post"
                    title="Next post"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              )}

              <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-primary/8 to-transparent" />
              <div className="relative pb-12 pr-8 sm:pr-10">
                <PostCardContent
                  post={expandedPost}
                  isOwnPost={isAuthenticated && expandedPost.authorAnonId === anonId}
                  canReport={isAuthenticated && expandedPost.authorAnonId !== anonId}
                  onStartChat={handleStartChat}
                  onDeletePost={handleDeletePost}
                  onOpenReportModal={handleOpenReportModal}
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile Floating Action Button */}
      <button
        onClick={handleCreatePostTrigger}
        className="fixed bottom-6 right-6 z-40 p-4 rounded-full bg-primary text-background shadow-lg hover:bg-primary-hover hover:scale-105 active:scale-95 transition-all duration-200 sm:hidden flex items-center justify-center focus:outline-none"
        title="Share what's on your mind"
      >
        <Plus className="w-6 h-6" />
      </button>

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
