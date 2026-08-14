import React, { useEffect, useState } from 'react';
import { AlertCircle, Leaf } from 'lucide-react';
import api from '../lib/axios';
import { useAuth } from '../context/AuthContext';
import { Container } from '../components/ui/Container';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';

interface AdminProps {
  onNavigateToHome: () => void;
  onNavigateToFeed: () => void;
}

interface ReportType {
  _id: string;
  reporterId: { anonId: string };
  reportedUserId: { anonId: string };
  reportType: 'post' | 'message';
  targetId: string;
  reason: string;
  details?: string;
  status: string;
  createdAt: string;
}

interface FlaggedPostType {
  _id: string;
  authorAnonId: string;
  content: string;
  tags: string[];
  createdAt: string;
}

export const Admin: React.FC<AdminProps> = ({ onNavigateToHome, onNavigateToFeed }) => {
  const { isAdmin, isLoading: authLoading, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<'reports' | 'flagged'>('reports');
  const [reports, setReports] = useState<ReportType[]>([]);
  const [flaggedPosts, setFlaggedPosts] = useState<FlaggedPostType[]>([]);
  const [reportPage, setReportPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [dataLoading, setDataLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Security Redirect: if auth check finishes and they are not admin, send them away
  useEffect(() => {
    if (!authLoading && !isAdmin) {
      onNavigateToFeed();
    }
  }, [isAdmin, authLoading, onNavigateToFeed]);

  const fetchReports = async (page: number) => {
    try {
      setDataLoading(true);
      setError(null);
      const res = await api.get(`admin/reports?page=${page}&status=pending`);
      if (res.data) {
        setReports(res.data.reports);
        setTotalPages(res.data.totalPages);
      }
    } catch (err) {
      setError('Failed to load admin reports');
    } finally {
      setDataLoading(false);
    }
  };

  const fetchFlaggedPosts = async () => {
    try {
      setDataLoading(true);
      setError(null);
      const res = await api.get('admin/flagged-posts');
      if (res.data) {
        setFlaggedPosts(res.data);
      }
    } catch (err) {
      setError('Failed to load flagged posts');
    } finally {
      setDataLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && isAdmin) {
      if (activeTab === 'reports') {
        fetchReports(reportPage);
      } else {
        fetchFlaggedPosts();
      }
    }
  }, [activeTab, reportPage, authLoading, isAdmin]);

  const handleUpdateReportStatus = async (reportId: string, newStatus: 'reviewed' | 'actioned' | 'dismissed') => {
    try {
      await api.patch(`admin/reports/${reportId}`, { status: newStatus });
      setReports((prev) => prev.filter((r) => r._id !== reportId));
    } catch (err) {
      alert('Failed to update report status');
    }
  };

  const handleUnflagPost = async (postId: string) => {
    try {
      await api.patch(`admin/posts/${postId}/unflag`);
      setFlaggedPosts((prev) => prev.filter((p) => p._id !== postId));
    } catch (err) {
      alert('Failed to unflag post');
    }
  };

  const handleDeletePost = async (postId: string) => {
    if (!window.confirm('Are you sure you want to permanently delete this post? This cannot be undone.')) return;
    try {
      await api.delete(`admin/posts/${postId}`);
      setFlaggedPosts((prev) => prev.filter((p) => p._id !== postId));
    } catch (err) {
      alert('Failed to delete post');
    }
  };

  if (authLoading || !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-text-secondary">
        <div className="inline-block w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mr-2" />
        Authenticating admin session...
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col justify-between selection:bg-primary/10 selection:text-primary-dark">
      {/* Header */}
      <header className="border-b border-card-border/60 bg-background/80 backdrop-blur-md sticky top-0 z-40">
        <Container size="lg" className="h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={onNavigateToHome}>
            <div className="w-8 h-8 rounded-lg bg-primary-light flex items-center justify-center text-primary">
              <Leaf className="w-5 h-5" />
            </div>
            <span className="font-semibold text-lg tracking-tight text-text-primary">
              AnonVent <span className="text-xs text-red-500 font-semibold uppercase tracking-wider bg-red-50 border border-red-200 px-2 py-0.5 rounded-full ml-1">Admin</span>
            </span>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={onNavigateToFeed}
              className="text-xs text-text-secondary hover:text-text-primary font-semibold transition-colors focus:outline-none"
            >
              Public Feed
            </button>
            <button
              onClick={logout}
              className="text-xs text-text-secondary hover:text-text-primary font-semibold transition-colors focus:outline-none"
            >
              Sign Out
            </button>
          </div>
        </Container>
      </header>

      {/* Main Section */}
      <main className="flex-grow py-10 bg-background/40">
        <Container size="lg" className="space-y-8">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-text-primary">Moderator Dashboard</h1>
            <p className="text-sm text-text-secondary font-light mt-1">
              Review user report tickets and handle crisis-flagged problem stories.
            </p>
          </div>

          {/* Error alerts */}
          {error && (
            <div className="p-4 bg-red-50 border border-red-100 rounded-2xl text-sm text-red-600 flex items-start gap-2 max-w-2xl">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span className="font-semibold">{error}</span>
            </div>
          )}

          {/* Toggle Tab Bar */}
          <div className="flex border-b border-card-border gap-6">
            <button
              onClick={() => {
                setActiveTab('reports');
                setReportPage(1);
              }}
              className={`pb-3 text-sm font-semibold border-b-2 transition-all duration-200 ${
                activeTab === 'reports' ? 'border-primary text-primary' : 'border-transparent text-text-secondary hover:text-text-primary'
              }`}
            >
              Pending Reports ({activeTab === 'reports' && !dataLoading ? reports.length : '...'})
            </button>
            <button
              onClick={() => setActiveTab('flagged')}
              className={`pb-3 text-sm font-semibold border-b-2 transition-all duration-200 ${
                activeTab === 'flagged' ? 'border-primary text-primary' : 'border-transparent text-text-secondary hover:text-text-primary'
              }`}
            >
              Flagged Crisis Posts ({activeTab === 'flagged' && !dataLoading ? flaggedPosts.length : '...'})
            </button>
          </div>

          {/* Data Display Grids */}
          {dataLoading ? (
            <div className="text-center py-20 text-sm text-text-secondary">
              <div className="inline-block w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin mr-2" />
              Loading records...
            </div>
          ) : activeTab === 'reports' ? (
            /* Pending Reports Table */
            <div className="space-y-6">
              {reports.length === 0 ? (
                <Card className="p-12 text-center text-text-secondary font-light max-w-md mx-auto">
                  🎉 All report tickets are cleared. Excellent work!
                </Card>
              ) : (
                <div className="bg-card border border-card-border/60 rounded-2xl overflow-hidden shadow-subtle">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-card-darker/60 border-b border-card-border text-xs text-text-secondary font-semibold uppercase tracking-wider">
                          <th className="px-6 py-4">Reporter</th>
                          <th className="px-6 py-4">Reported User</th>
                          <th className="px-6 py-4">Type</th>
                          <th className="px-6 py-4">Reason</th>
                          <th className="px-6 py-4">Context Details</th>
                          <th className="px-6 py-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-card-border/40 text-xs text-text-primary">
                        {reports.map((report) => (
                          <tr key={report._id} className="hover:bg-background/25 transition-colors">
                            <td className="px-6 py-4 font-semibold">{report.reporterId?.anonId || 'Guest/Deleted'}</td>
                            <td className="px-6 py-4 font-semibold text-red-600">{report.reportedUserId?.anonId || 'Deleted'}</td>
                            <td className="px-6 py-4 capitalize">{report.reportType}</td>
                            <td className="px-6 py-4 capitalize font-semibold">{report.reason.replace(/-/g, ' ')}</td>
                            <td className="px-6 py-4 max-w-xs truncate font-light" title={report.details}>
                              {report.details || <span className="text-text-muted italic">None</span>}
                            </td>
                            <td className="px-6 py-4 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => handleUpdateReportStatus(report._id, 'dismissed')}
                                  className="px-2.5 py-1.5 rounded-lg border border-card-border text-[10px] font-semibold text-text-secondary bg-card-darker hover:bg-card transition-colors"
                                  title="Dismiss Report"
                                >
                                  Dismiss
                                </button>
                                <button
                                  onClick={() => handleUpdateReportStatus(report._id, 'reviewed')}
                                  className="px-2.5 py-1.5 rounded-lg border border-primary/20 text-[10px] font-semibold text-primary bg-primary-light hover:bg-primary/20 transition-colors"
                                  title="Mark Reviewed"
                                >
                                  Review
                                </button>
                                <button
                                  onClick={() => handleUpdateReportStatus(report._id, 'actioned')}
                                  className="px-2.5 py-1.5 rounded-lg border border-red-200 text-[10px] font-semibold text-red-600 bg-red-50/50 hover:bg-red-50 transition-colors"
                                  title="Mark Actioned"
                                >
                                  Actioned
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Pagination controls */}
              {totalPages > 1 && (
                <div className="flex justify-center items-center gap-3 pt-4">
                  <Button
                    variant="secondary"
                    disabled={reportPage === 1}
                    onClick={() => setReportPage((p) => p - 1)}
                    className="px-4 py-1.5 text-xs rounded-xl"
                  >
                    Previous
                  </Button>
                  <span className="text-xs text-text-secondary">
                    Page {reportPage} of {totalPages}
                  </span>
                  <Button
                    variant="secondary"
                    disabled={reportPage === totalPages}
                    onClick={() => setReportPage((p) => p + 1)}
                    className="px-4 py-1.5 text-xs rounded-xl"
                  >
                    Next
                  </Button>
                </div>
              )}
            </div>
          ) : (
            /* Flagged Crisis Posts List */
            <div className="space-y-6">
              {flaggedPosts.length === 0 ? (
                <Card className="p-12 text-center text-text-secondary font-light max-w-md mx-auto">
                  💚 No crisis-flagged posts require review right now.
                </Card>
              ) : (
                <div className="bg-card border border-card-border/60 rounded-2xl overflow-hidden shadow-subtle">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-card-darker/60 border-b border-card-border text-xs text-text-secondary font-semibold uppercase tracking-wider">
                          <th className="px-6 py-4">Author</th>
                          <th className="px-6 py-4">Story Content (Flagged)</th>
                          <th className="px-6 py-4">Tags</th>
                          <th className="px-6 py-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-card-border/40 text-xs text-text-primary">
                        {flaggedPosts.map((post) => (
                          <tr key={post._id} className="hover:bg-background/25 transition-colors">
                            <td className="px-6 py-4 font-semibold">{post.authorAnonId}</td>
                            <td className="px-6 py-4 max-w-md whitespace-pre-wrap font-light leading-relaxed">
                              {post.content}
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex gap-1.5">
                                {post.tags.map((t) => (
                                  <span key={t} className="px-2 py-0.5 rounded-full bg-card-darker border border-card-border text-[9px] font-semibold text-text-secondary">
                                    #{t}
                                  </span>
                                ))}
                              </div>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => handleUnflagPost(post._id)}
                                  className="px-2.5 py-1.5 rounded-lg border border-primary/20 text-[10px] font-semibold text-primary bg-primary-light hover:bg-primary/20 transition-colors"
                                  title="Unflag & Approve Post"
                                >
                                  Approve
                                </button>
                                <button
                                  onClick={() => handleDeletePost(post._id)}
                                  className="px-2.5 py-1.5 rounded-lg border border-red-200 text-[10px] font-semibold text-red-600 bg-red-50/50 hover:bg-red-50 transition-colors"
                                  title="Delete Post permanently"
                                >
                                  Delete
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
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
              <span>AnonVent Portal</span>
            </div>
            <p className="text-xs text-text-muted font-light">
              © {new Date().getFullYear()} AnonVent Admin.
            </p>
          </div>
        </Container>
      </footer>
    </div>
  );
};
export default Admin;
