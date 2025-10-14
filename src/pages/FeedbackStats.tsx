import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';
import { feedbackService, type FeedbackStats } from '@/services/feedbackService';
import { toast } from '@/hooks/use-toast';
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
  Heart
} from 'lucide-react';

const RATING_EMOJIS = ['😠', '😢', '😐', '😊', '🤩'];
const RATING_LABELS = ['Very Dissatisfied', 'Dissatisfied', 'Neutral', 'Satisfied', 'Very Satisfied'];

export default function FeedbackStats() {
  const { currentUser } = useAuth();
  const [stats, setStats] = useState<FeedbackStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check if user is admin
  if (currentUser?.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
          <p className="text-gray-600">You need admin privileges to view feedback statistics.</p>
        </div>
      </div>
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
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-gray-600">Loading feedback statistics...</p>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <MessageCircle className="h-12 w-12 mx-auto mb-4 text-gray-400" />
          <h1 className="text-xl font-semibold text-gray-900 mb-2">No Data Available</h1>
          <p className="text-gray-600 mb-4">No feedback has been submitted yet.</p>
          <Button onClick={fetchStats} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>
    );
  }

  const { statistics, recent_feedback } = stats;
  const totalSubmissions = statistics.total_submissions;
  const averageRating = statistics.average_rating ? parseFloat(statistics.average_rating.toString()) : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Feedback Statistics</h1>
          <p className="text-gray-600 mt-1">User feedback and satisfaction metrics</p>
        </div>
        <Button onClick={fetchStats} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Feedback</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalSubmissions}</div>
            <p className="text-xs text-muted-foreground">
              User submissions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Rating</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {averageRating ? averageRating.toFixed(1) : 'N/A'}
            </div>
            <p className="text-xs text-muted-foreground">
              Out of 5.0 stars
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Text Feedback</CardTitle>
            <MessageCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {statistics.text_feedback_count}
            </div>
            <p className="text-xs text-muted-foreground">
              {totalSubmissions > 0 
                ? `${Math.round((parseInt(String(statistics.text_feedback_count)) / totalSubmissions) * 100)}% of total`
                : 'No submissions yet'
              }
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Satisfaction</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {totalSubmissions > 0 
                ? `${Math.round(((parseInt(String(statistics.five_star_count)) + parseInt(String(statistics.four_star_count))) / totalSubmissions) * 100)}%`
                : 'N/A'
              }
            </div>
            <p className="text-xs text-muted-foreground">
              4+ star ratings
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Rating Distribution */}
      <Card>
        <CardHeader>
          <CardTitle>Rating Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[5, 4, 3, 2, 1].map((rating) => {
              const count = parseInt(String(statistics[`${rating}_star_count` as keyof typeof statistics])) || 0;
              const percentage = totalSubmissions > 0 ? (count / totalSubmissions) * 100 : 0;
              
              return (
                <div key={rating} className="flex items-center gap-4">
                  <div className="flex items-center gap-2 w-20">
                    <span className="text-2xl">{RATING_EMOJIS[rating - 1]}</span>
                    <span className="text-sm font-medium">{rating}</span>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span>{count} responses</span>
                      <span className="text-muted-foreground">{percentage.toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full transition-all duration-300 ${
                          rating >= 4 ? 'bg-green-500' : 
                          rating === 3 ? 'bg-yellow-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Recent Feedback */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Feedback</CardTitle>
        </CardHeader>
        <CardContent>
          {recent_feedback.length === 0 ? (
            <div className="text-center py-8">
              <MessageCircle className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p className="text-gray-600">No recent feedback available</p>
            </div>
          ) : (
            <div className="space-y-4">
              {recent_feedback.map((feedback, index) => (
                <div key={index} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1">
                        <span className="text-xl">{RATING_EMOJIS[feedback.rating - 1]}</span>
                        {getRatingIcon(feedback.rating)}
                      </div>
                      <div>
                        <div className="font-medium">{feedback.username}</div>
                        <Badge variant="secondary" className="text-xs">
                          {feedback.role}
                        </Badge>
                      </div>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {new Date(feedback.submitted_at).toLocaleDateString()}
                    </div>
                  </div>
                  
                  {feedback.feedback_text && (
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-sm text-gray-700">{feedback.feedback_text}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
