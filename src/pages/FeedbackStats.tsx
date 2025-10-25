import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';
import { feedbackService, type FeedbackStats } from '@/services/feedbackService';
import { toast } from '@/hooks/use-toast';
import { useUndoDelete } from '@/hooks/useUndoDelete';
import { 
  Star, 
  Users, 
  MessageCircle, 
  TrendingUp, 
  RefreshCw,
  Smile,
  Frown,
  Meh,
  ThumbsUp,
  Heart,
  Lock,
  BarChart3,
  Trash2
} from 'lucide-react';

const RATING_EMOJIS = ['😠', '😢', '😐', '😊', '🤩'];
const RATING_LABELS = ['Very Dissatisfied', 'Dissatisfied', 'Neutral', 'Satisfied', 'Very Satisfied'];

export default function FeedbackStats() {
  const { currentUser } = useAuth();
  const [stats, setStats] = useState<FeedbackStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [feedbackToDelete, setFeedbackToDelete] = useState<string | null>(null);

  // Undo delete hook
  const {
    isCountingDown,
    timeLeft,
    startCountdown,
    cancelCountdown,
    confirmDelete: confirmDeleteFeedback,
  } = useUndoDelete({
    duration: 10,
    onConfirm: async () => {
      if (feedbackToDelete) {
        try {
          await feedbackService.deleteFeedback(feedbackToDelete);
          toast({
            title: 'Feedback Deleted',
            description: 'The feedback has been permanently deleted.',
            variant: 'default',
          });
          // Refresh stats
          fetchStats();
        } catch (error) {
          console.error('Error deleting feedback:', error);
          toast({
            title: 'Delete Failed',
            description: 'Failed to delete the feedback. Please try again.',
            variant: 'destructive',
          });
        }
        setFeedbackToDelete(null);
      }
    },
    onUndo: () => {
      toast({
        title: 'Delete Cancelled',
        description: 'The feedback deletion has been cancelled.',
        variant: 'default',
      });
      setFeedbackToDelete(null);
    },
  });

  // Check if user is admin
  if (currentUser?.role !== 'admin') {
    return (
      <main className="min-h-[calc(100vh-4rem)] bg-background px-3 py-4 sm:px-6 sm:py-6 md:px-8 lg:px-10 lg:py-8">
        <section className="max-w-7xl mx-auto space-y-6 sm:space-y-8">
          <div className="relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 via-indigo-50/30 to-purple-50/50 dark:from-blue-950/20 dark:via-indigo-950/10 dark:to-purple-950/20 rounded-2xl"></div>
            <div className="relative bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-12 text-center">
              <div className="mx-auto w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center shadow-2xl mb-6">
                <Lock className="h-10 w-10 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">Access Denied</h1>
              <p className="text-lg text-gray-600 dark:text-gray-400 mb-8 max-w-md mx-auto">
                You need admin privileges to view feedback statistics.
              </p>
            </div>
          </div>
        </section>
      </main>
    );
  }

  const fetchStats = async () => {
    try {
      setIsLoading(true);
      const data = await feedbackService.getFeedbackStats();
      setStats(data);
    } catch (error) {
      console.error('Error fetching feedback stats:', error);
      toast({
        title: "Error",
        description: "Failed to load feedback statistics.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteClick = (feedbackId: string) => {
    setFeedbackToDelete(feedbackId);
    startCountdown();
    toast({
      title: 'Feedback Deletion Started',
      description: `Feedback will be deleted in ${timeLeft} seconds. Click "Undo" to cancel.`,
      variant: 'default',
      action: (
        <Button
          variant="outline"
          size="sm"
          onClick={cancelCountdown}
          className="text-xs"
        >
          Undo ({timeLeft}s)
        </Button>
      ),
    });
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const getRatingColor = (rating: number) => {
    switch (rating) {
      case 5: return 'text-green-600';
      case 4: return 'text-blue-600';
      case 3: return 'text-yellow-600';
      case 2: return 'text-orange-600';
      case 1: return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getRatingIcon = (rating: number) => {
    switch (rating) {
      case 5: return <Heart className="h-4 w-4 text-green-600" />;
      case 4: return <ThumbsUp className="h-4 w-4 text-blue-600" />;
      case 3: return <Meh className="h-4 w-4 text-yellow-600" />;
      case 2: return <Frown className="h-4 w-4 text-orange-600" />;
      case 1: return <Frown className="h-4 w-4 text-red-600" />;
      default: return <Star className="h-4 w-4 text-gray-600" />;
    }
  };

  if (isLoading) {
    return (
      <main className="min-h-[calc(100vh-4rem)] bg-background px-3 py-4 sm:px-6 sm:py-6 md:px-8 lg:px-10 lg:py-8">
        <section className="max-w-7xl mx-auto space-y-6 sm:space-y-8">
          <div className="relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 via-indigo-50/30 to-purple-50/50 dark:from-blue-950/20 dark:via-indigo-950/10 dark:to-purple-950/20 rounded-2xl"></div>
            <div className="relative bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-12 text-center">
              <div className="mx-auto w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center shadow-2xl mb-6">
                <RefreshCw className="h-10 w-10 text-white animate-spin" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">Loading Statistics</h1>
              <p className="text-lg text-gray-600 dark:text-gray-400 mb-8 max-w-md mx-auto">
                Fetching feedback statistics...
              </p>
            </div>
          </div>
        </section>
      </main>
    );
  }

  if (!stats) {
    return (
      <main className="min-h-[calc(100vh-4rem)] bg-background px-3 py-4 sm:px-6 sm:py-6 md:px-8 lg:px-10 lg:py-8">
        <section className="max-w-7xl mx-auto space-y-6 sm:space-y-8">
          <div className="relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 via-indigo-50/30 to-purple-50/50 dark:from-blue-950/20 dark:via-indigo-950/10 dark:to-purple-950/20 rounded-2xl"></div>
            <div className="relative bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-12 text-center">
              <div className="mx-auto w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center shadow-2xl mb-6">
                <MessageCircle className="h-10 w-10 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">No Data Available</h1>
              <p className="text-lg text-gray-600 dark:text-gray-400 mb-8 max-w-md mx-auto">
                No feedback has been submitted yet.
              </p>
              <Button 
                onClick={fetchStats} 
                variant="outline"
                size="lg"
                className="h-12 px-6 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:border-blue-300 dark:hover:border-blue-700 text-gray-700 dark:text-gray-300 hover:text-blue-700 dark:hover:text-blue-300 font-semibold shadow-sm hover:shadow-md transition-all duration-300"
              >
                <RefreshCw className="h-5 w-5 mr-2" />
                Refresh
              </Button>
            </div>
          </div>
        </section>
      </main>
    );
  }

  const { statistics, recent_feedback } = stats;
  const totalSubmissions = statistics.total_submissions;
  const averageRating = statistics.average_rating ? parseFloat(statistics.average_rating.toString()) : null;

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-background px-3 py-4 sm:px-6 sm:py-6 md:px-8 lg:px-10 lg:py-8">
      <section className="max-w-7xl mx-auto space-y-6 sm:space-y-8">
        {/* Professional Header */}
        <div className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-purple-50/50 via-transparent to-indigo-50/50 dark:from-purple-950/20 dark:via-transparent dark:to-indigo-950/20"></div>
          <div className="relative bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-6 sm:p-8">
            <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-6">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl shadow-lg">
                    <BarChart3 className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold bg-gradient-to-r from-gray-900 via-gray-800 to-gray-700 dark:from-white dark:via-gray-100 dark:to-gray-300 bg-clip-text text-transparent tracking-tight">
                      Feedbacks
                    </h1>
                    <div className="h-1 w-20 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-full mt-2"></div>
                  </div>
                </div>
                <p className="text-gray-600 dark:text-gray-400 text-base lg:text-lg font-medium max-w-2xl">
                  User feedback and satisfaction metrics
                </p>
              </div>
              
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-950/30 dark:to-indigo-950/30 border border-purple-200 dark:border-purple-800 rounded-xl shadow-sm">
                    <div className="p-1.5 bg-purple-500 rounded-lg">
                      <Users className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-purple-700 dark:text-purple-300">
                        {totalSubmissions}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="group relative overflow-hidden rounded-2xl border border-gray-200/50 dark:border-gray-700/50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm shadow-lg hover:shadow-2xl transition-all duration-500 transform hover:scale-[1.02] hover:-translate-y-1">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 via-transparent to-indigo-50/50 dark:from-blue-950/20 dark:via-transparent dark:to-indigo-950/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <div className="relative p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg">
                  <Users className="h-5 w-5 text-white" />
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold text-gray-900 dark:text-white">
                    {totalSubmissions}
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                    Total Feedback
                  </p>
                </div>
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                User submissions
              </div>
            </div>
          </div>

          <div className="group relative overflow-hidden rounded-2xl border border-gray-200/50 dark:border-gray-700/50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm shadow-lg hover:shadow-2xl transition-all duration-500 transform hover:scale-[1.02] hover:-translate-y-1">
            <div className="absolute inset-0 bg-gradient-to-br from-yellow-50/50 via-transparent to-orange-50/50 dark:from-yellow-950/20 dark:via-transparent dark:to-orange-950/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <div className="relative p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-gradient-to-br from-yellow-500 to-orange-600 rounded-xl shadow-lg">
                  <Star className="h-5 w-5 text-white" />
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold text-gray-900 dark:text-white">
                    {averageRating ? averageRating.toFixed(1) : 'N/A'}
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                    Average Rating
                  </p>
                </div>
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                Out of 5.0 stars
              </div>
            </div>
          </div>

          <div className="group relative overflow-hidden rounded-2xl border border-gray-200/50 dark:border-gray-700/50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm shadow-lg hover:shadow-2xl transition-all duration-500 transform hover:scale-[1.02] hover:-translate-y-1">
            <div className="absolute inset-0 bg-gradient-to-br from-green-50/50 via-transparent to-emerald-50/50 dark:from-green-950/20 dark:via-transparent dark:to-emerald-950/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <div className="relative p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl shadow-lg">
                  <MessageCircle className="h-5 w-5 text-white" />
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold text-gray-900 dark:text-white">
                    {statistics.text_feedback_count}
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                    Text Feedback
                  </p>
                </div>
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {totalSubmissions > 0 
                  ? `${Math.round((parseInt(String(statistics.text_feedback_count)) / totalSubmissions) * 100)}% of total`
                  : 'No submissions yet'
                }
              </div>
            </div>
          </div>

          <div className="group relative overflow-hidden rounded-2xl border border-gray-200/50 dark:border-gray-700/50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm shadow-lg hover:shadow-2xl transition-all duration-500 transform hover:scale-[1.02] hover:-translate-y-1">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-50/50 via-transparent to-pink-50/50 dark:from-purple-950/20 dark:via-transparent dark:to-pink-950/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <div className="relative p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl shadow-lg">
                  <TrendingUp className="h-5 w-5 text-white" />
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold text-gray-900 dark:text-white">
                    {totalSubmissions > 0 
                      ? `${Math.round(((parseInt(String(statistics.five_star_count)) + parseInt(String(statistics.four_star_count))) / totalSubmissions) * 100)}%`
                      : 'N/A'
                    }
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                    Satisfaction
                  </p>
                </div>
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                4+ star ratings
              </div>
            </div>
          </div>
        </div>

        {/* Rating Distribution */}
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-gray-50/30 to-purple-50/30 dark:from-gray-800/30 dark:to-purple-900/30 rounded-2xl"></div>
          <div className="relative bg-white/70 dark:bg-gray-900/70 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-6">
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-6">
                <div className="p-1.5 bg-purple-500 rounded-lg">
                  <BarChart3 className="h-4 w-4 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Rating Distribution</h3>
              </div>
              
              <div className="space-y-6">
                {[5, 4, 3, 2, 1].map((rating) => {
                  const countKey = `${rating === 5 ? 'five' : rating === 4 ? 'four' : rating === 3 ? 'three' : rating === 2 ? 'two' : 'one'}_star_count` as keyof typeof statistics;
                  const count = parseInt(String(statistics[countKey])) || 0;
                  const percentage = totalSubmissions > 0 ? (count / totalSubmissions) * 100 : 0;
                  
                  return (
                    <div key={rating} className="group relative overflow-hidden rounded-xl border border-gray-200/50 dark:border-gray-700/50 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm shadow-sm hover:shadow-lg transition-all duration-300 p-4">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-3 w-24">
                          <span className="text-3xl">{RATING_EMOJIS[rating - 1]}</span>
                          <div className="flex items-center gap-1">
                            {getRatingIcon(rating)}
                            <span className="text-sm font-bold text-gray-900 dark:text-white">{rating}</span>
                          </div>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between text-sm mb-2">
                            <span className="font-semibold text-gray-700 dark:text-gray-300">{count} responses</span>
                            <span className="text-gray-500 dark:text-gray-400 font-medium">{percentage.toFixed(1)}%</span>
                          </div>
                          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
                            <div 
                              className={`h-3 rounded-full transition-all duration-500 ease-out ${
                                rating >= 4 ? 'bg-gradient-to-r from-green-500 to-emerald-600' : 
                                rating === 3 ? 'bg-gradient-to-r from-yellow-500 to-orange-500' : 
                                'bg-gradient-to-r from-red-500 to-pink-600'
                              }`}
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Recent Feedback */}
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-gray-50/30 to-indigo-50/30 dark:from-gray-800/30 dark:to-indigo-900/30 rounded-2xl"></div>
          <div className="relative bg-white/70 dark:bg-gray-900/70 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-6">
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-6">
                <div className="p-1.5 bg-indigo-500 rounded-lg">
                  <MessageCircle className="h-4 w-4 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Feedback</h3>
              </div>
              
              {recent_feedback.length === 0 ? (
                <div className="relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-gray-50/50 via-blue-50/30 to-indigo-50/50 dark:from-gray-800/50 dark:via-blue-950/20 dark:to-indigo-950/20 rounded-xl"></div>
                  <div className="relative bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-xl p-8 text-center">
                    <div className="mx-auto w-16 h-16 bg-gradient-to-br from-gray-400 to-gray-500 rounded-full flex items-center justify-center shadow-lg mb-4">
                      <MessageCircle className="h-8 w-8 text-white" />
                    </div>
                    <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No Recent Feedback</h4>
                    <p className="text-gray-600 dark:text-gray-400">No recent feedback available</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {recent_feedback.map((feedback, index) => (
                    <div key={feedback.id} className="group relative overflow-hidden rounded-xl border border-gray-200/50 dark:border-gray-700/50 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm shadow-sm hover:shadow-lg transition-all duration-300 p-5">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2">
                            <span className="text-2xl">{RATING_EMOJIS[feedback.rating - 1]}</span>
                            {getRatingIcon(feedback.rating)}
                          </div>
                          <div>
                            <div className="font-semibold text-gray-900 dark:text-white">{feedback.username}</div>
                            <Badge 
                              variant="secondary" 
                              className="text-xs px-2 py-1 bg-gradient-to-r from-indigo-100 to-purple-100 dark:from-indigo-900/30 dark:to-purple-900/30 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-700"
                            >
                              {feedback.role}
                            </Badge>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-sm text-gray-500 dark:text-gray-400 font-medium">
                            {new Date(feedback.submitted_at).toLocaleDateString()}
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteClick(feedback.id)}
                            className="h-8 px-3 text-xs font-medium bg-white dark:bg-gray-800 border-red-200 dark:border-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 hover:border-red-300 dark:hover:border-red-700 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 transition-all duration-200 hover:shadow-md"
                          >
                            <Trash2 className="h-3 w-3 mr-1" />
                            Delete
                          </Button>
                        </div>
                      </div>
                      
                      {feedback.feedback_text && (
                        <div className="bg-gradient-to-r from-gray-50/50 to-indigo-50/30 dark:from-gray-700/30 dark:to-indigo-900/20 rounded-lg p-4 border border-gray-200/30 dark:border-gray-600/30">
                          <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{feedback.feedback_text}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
