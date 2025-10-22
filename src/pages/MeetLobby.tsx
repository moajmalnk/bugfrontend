import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createMeeting, getMeeting } from "@/services/meetings";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Video, Users, Copy, Check, Plus, Clock, ExternalLink, Calendar } from "lucide-react";
import { toast } from "sonner";
import { ENV } from "@/lib/env";
import axios from "axios";

// Type definitions for Google Meet API response
interface GoogleMeetResponse {
  success: boolean;
  meetingUri?: string;
  spaceName?: string;
  meetingCode?: string;
  error?: string;
}

// Type definitions for running meetings
interface RunningMeeting {
  id: string;
  title: string;
  description: string;
  meetingUri: string;
  meetingCode: string;
  startTime: string;
  endTime: string;
  isActive: boolean;
  creator: string;
  attendees: Array<{
    email: string;
    displayName?: string;
    responseStatus: string;
  }>;
}

interface RunningMeetsResponse {
  success: boolean;
  runningMeetings: RunningMeeting[];
  completedMeetings: RunningMeeting[];
  runningCount: number;
  completedCount: number;
  timestamp: string;
  error?: string;
}

export default function MeetLobby() {
  const [title, setTitle] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [runningMeets, setRunningMeets] = useState<RunningMeeting[]>([]);
  const [completedMeets, setCompletedMeets] = useState<RunningMeeting[]>([]);
  const [loadingMeets, setLoadingMeets] = useState(false);
  const [showCompleted, setShowCompleted] = useState(false);
  const navigate = useNavigate();

  const handleCreate = async () => {
    setLoading(true);
    setError(null);
    try {
      // Get the JWT token from localStorage
      const token = localStorage.getItem("token");
      if (!token) {
        throw new Error("Please log in to create meetings");
      }

      // Call the Google Meet API endpoint
      const response = await axios.post(
        `${ENV.API_URL}/meet/create-space.php`,
        {
          meeting_title: title || "BugMeet Session"
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        }
      );

      const data = response.data as GoogleMeetResponse;
      if (data?.success && data?.meetingUri) {
        toast.success("Google Meet created successfully!");
        // Open the Google Meet link in a new tab
        window.open(data.meetingUri, '_blank');
      } else {
        setError(data?.error || "Failed to create Google Meet");
      }
    } catch (err: any) {
      const errorMessage = err?.response?.data?.error || err?.message || "Failed to create Google Meet";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async () => {
    if (!code.trim()) {
      setError("Please enter a meeting code");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      // Construct the Google Meet URL from the code
      const joinUrl = `https://meet.google.com/${code.toUpperCase()}`;
      toast.success("Redirecting to Google Meet...");
      // Redirect the current window to the Google Meet URL
      window.location.href = joinUrl;
    } catch (err: any) {
      setError("Failed to join meeting");
      toast.error("Failed to join meeting");
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  const fetchRunningMeets = async () => {
    setLoadingMeets(true);
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        throw new Error("Please log in to view meetings");
      }

      const response = await axios.get(
        `${ENV.API_URL}/meet/get-running-meets.php`,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        }
      );

      const data = response.data as RunningMeetsResponse;
      if (data?.success) {
        setRunningMeets(data.runningMeetings || []);
        setCompletedMeets(data.completedMeetings || []);
      } else {
        console.error("Failed to fetch running meets:", data?.error);
        // Check if it's a scope issue
        if (data?.error?.includes?.('insufficient authentication scopes') || 
            data?.error?.includes?.('ACCESS_TOKEN_SCOPE_INSUFFICIENT')) {
          setError("Please re-authorize your Google account to access calendar features. Your current token doesn't have the required permissions.");
        }
      }
    } catch (err: any) {
      console.error("Error fetching running meets:", err?.message);
      // Check if it's a scope issue from the error response
      if (err?.response?.data?.error?.includes?.('insufficient authentication scopes') ||
          err?.response?.data?.error?.includes?.('ACCESS_TOKEN_SCOPE_INSUFFICIENT')) {
        setError("Please re-authorize your Google account to access calendar features. Your current token doesn't have the required permissions.");
      }
    } finally {
      setLoadingMeets(false);
    }
  };

  const joinRunningMeet = (meetingUri: string) => {
    window.open(meetingUri, '_blank');
  };

  const copyMeetCode = (meetingCode: string) => {
    copyToClipboard(meetingCode);
  };

  const formatMeetingTime = (startTime: string, endTime: string) => {
    const start = new Date(startTime);
    const end = new Date(endTime);
    const now = new Date();
    
    const startStr = start.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
    const endStr = end.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
    
    if (now >= start && now <= end) {
      return `Live now • ${startStr} - ${endStr}`;
    } else if (now < start) {
      return `Starts at ${startStr}`;
    } else {
      return `Ended at ${endStr}`;
    }
  };

  // Fetch running meets on component mount
  useEffect(() => {
    fetchRunningMeets();
    
    // Refresh every 30 seconds
    const interval = setInterval(fetchRunningMeets, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-background px-3 py-4 sm:px-6 sm:py-6 md:px-8 lg:px-10 lg:py-8">
      <section className="max-w-7xl mx-auto space-y-6 sm:space-y-8">
        {/* Professional Header */}
        <div className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-50/50 via-transparent to-purple-50/50 dark:from-blue-950/20 dark:via-transparent dark:to-purple-950/20"></div>
          <div className="relative bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-6 sm:p-8">
            <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-6">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl shadow-lg">
                    <Video className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold bg-gradient-to-r from-gray-900 via-gray-800 to-gray-700 dark:from-white dark:via-gray-100 dark:to-gray-300 bg-clip-text text-transparent tracking-tight">
                      BugMeet
                    </h1>
                    <div className="h-1 w-20 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full mt-2"></div>
                  </div>
                </div>
                <p className="text-gray-600 dark:text-gray-400 text-base lg:text-lg font-medium max-w-2xl">
                  Professional video meetings for your development team
                </p>
              </div>
              
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/30 dark:to-purple-950/30 border border-blue-200 dark:border-blue-800 rounded-xl shadow-sm">
                  <div className="p-1.5 bg-blue-500 rounded-lg">
                    <Video className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                      Live
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-red-50/50 to-orange-50/50 dark:from-red-950/20 dark:to-orange-950/20 rounded-2xl"></div>
            <div className="relative bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border border-red-200/50 dark:border-red-700/50 rounded-2xl p-6">
              <Alert className="border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-800">
                <AlertDescription className="text-red-800 dark:text-red-300">
                  {error}
                </AlertDescription>
              </Alert>
            </div>
          </div>
        )}

        {/* Google Connection Status */}
        {error && (error.includes("Please connect your Google account") || 
                  error.includes("re-authorize your Google account")) && (
          <div className="relative overflow-hidden mb-6">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-50/50 to-indigo-50/50 dark:from-blue-950/20 dark:to-indigo-950/20 rounded-2xl"></div>
            <div className="relative bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border border-blue-200/50 dark:border-blue-700/50 rounded-2xl p-6 sm:p-8">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg">
                    <svg className="h-6 w-6 text-white" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {error.includes("re-authorize") ? "Google Account Re-authorization Required" : "Google Account Required"}
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400">
                      {error.includes("re-authorize") 
                        ? "Re-authorize your Google account to access calendar features for meeting management"
                        : "Connect your Google account to create and manage meetings"
                      }
                    </p>
                  </div>
                </div>
                <Button
                  onClick={async () => {
                    try {
                      // Get current user ID from JWT token
                      const token = localStorage.getItem("token");
                      if (!token) {
                        toast.error("Please log in first");
                        return;
                      }
                      
                      // Decode JWT to get user ID
                      const payload = JSON.parse(atob(token.split('.')[1]));
                      const userId = payload.user_id;
                      
                      // Check if we're in production or local
                      const isProduction = window.location.hostname !== 'localhost';
                      const reauthUrl = isProduction 
                        ? `https://bugbackend.bugricer.com/api/oauth/production-reauth.php?user_id=${userId}`
                        : `http://localhost/BugRicer/backend/api/oauth/admin-reauth.php`;
                      window.open(reauthUrl, '_blank');
                    } catch (error) {
                      console.error('Error getting user ID:', error);
                      toast.error("Error getting user information");
                    }
                  }}
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
                >
                  {error.includes("re-authorize") ? "Re-authorize Google Account" : "Connect Google Account"}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Currently Running Meets */}
        {runningMeets.length > 0 && (
          <div className="relative overflow-hidden mb-6">
            <div className="absolute inset-0 bg-gradient-to-r from-green-50/50 to-emerald-50/50 dark:from-green-950/20 dark:to-emerald-950/20 rounded-2xl"></div>
            <div className="relative bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border border-green-200/50 dark:border-green-700/50 rounded-2xl p-6 sm:p-8">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl shadow-lg">
                    <Calendar className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Currently Running Meets</h3>
                    <p className="text-gray-600 dark:text-gray-400">{runningMeets.length} active meeting{runningMeets.length !== 1 ? 's' : ''}</p>
                  </div>
                </div>
                <Button
                  onClick={fetchRunningMeets}
                  disabled={loadingMeets}
                  variant="outline"
                  size="sm"
                  className="border-green-600 text-green-600 hover:bg-green-50 dark:hover:bg-green-950/20"
                >
                  {loadingMeets ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Clock className="h-4 w-4" />
                  )}
                </Button>
              </div>
              
              <div className="grid gap-4">
                {runningMeets.map((meeting) => (
                  <div key={meeting.id} className="bg-white/60 dark:bg-gray-800/60 border border-gray-200/50 dark:border-gray-700/50 rounded-xl p-4 hover:shadow-md transition-all duration-300">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2">
                          <h4 className="font-semibold text-gray-900 dark:text-white truncate">
                            {meeting.title}
                          </h4>
                          {meeting.isActive && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300">
                              <div className="w-2 h-2 bg-red-500 rounded-full mr-1.5 animate-pulse"></div>
                              Live
                            </span>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400 mb-3">
                          <div className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            {formatMeetingTime(meeting.startTime, meeting.endTime)}
                          </div>
                          <div className="flex items-center gap-1">
                            <Users className="h-4 w-4" />
                            {meeting.attendees.length} attendee{meeting.attendees.length !== 1 ? 's' : ''}
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <code className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-sm font-mono">
                            {meeting.meetingCode}
                          </code>
                          <Button
                            onClick={() => copyMeetCode(meeting.meetingCode)}
                            size="sm"
                            variant="outline"
                            className="h-7 px-2"
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 ml-4">
                        <Button
                          onClick={() => joinRunningMeet(meeting.meetingUri)}
                          size="sm"
                          className="bg-green-600 hover:bg-green-700 text-white"
                        >
                          <ExternalLink className="h-4 w-4 mr-1" />
                          Join
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Completed Meets */}
        {completedMeets.length > 0 && (
          <div className="relative overflow-hidden mb-6">
            <div className="absolute inset-0 bg-gradient-to-r from-gray-50/50 to-slate-50/50 dark:from-gray-950/20 dark:to-slate-950/20 rounded-2xl"></div>
            <div className="relative bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-6 sm:p-8">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-gradient-to-br from-gray-500 to-slate-600 rounded-xl shadow-lg">
                    <Calendar className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Completed Meets</h3>
                    <p className="text-gray-600 dark:text-gray-400">{completedMeets.length} completed meeting{completedMeets.length !== 1 ? 's' : ''} in the last 7 days</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    onClick={() => setShowCompleted(!showCompleted)}
                    variant="outline"
                    size="sm"
                    className="border-gray-600 text-gray-600 hover:bg-gray-50 dark:hover:bg-gray-950/20"
                  >
                    {showCompleted ? 'Hide' : 'Show'} Details
                  </Button>
                  <Button
                    onClick={fetchRunningMeets}
                    disabled={loadingMeets}
                    variant="outline"
                    size="sm"
                    className="border-gray-600 text-gray-600 hover:bg-gray-50 dark:hover:bg-gray-950/20"
                  >
                    {loadingMeets ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Clock className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
              
              {showCompleted && (
                <div className="grid gap-3 max-h-96 overflow-y-auto">
                  {completedMeets.slice(0, 10).map((meeting) => (
                    <div key={meeting.id} className="bg-white/60 dark:bg-gray-800/60 border border-gray-200/50 dark:border-gray-700/50 rounded-lg p-4 hover:shadow-sm transition-all duration-300">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-2">
                            <h4 className="font-medium text-gray-900 dark:text-white truncate">
                              {meeting.title}
                            </h4>
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
                              Completed
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400 mb-2">
                            <div className="flex items-center gap-1">
                              <Clock className="h-4 w-4" />
                              {formatMeetingTime(meeting.startTime, meeting.endTime)}
                            </div>
                            <div className="flex items-center gap-1">
                              <Users className="h-4 w-4" />
                              {meeting.attendees.length} attendee{meeting.attendees.length !== 1 ? 's' : ''}
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <code className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-sm font-mono">
                              {meeting.meetingCode}
                            </code>
                            <Button
                              onClick={() => copyMeetCode(meeting.meetingCode)}
                              size="sm"
                              variant="outline"
                              className="h-7 px-2"
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2 ml-4">
                          <Button
                            onClick={() => joinRunningMeet(meeting.meetingUri)}
                            size="sm"
                            variant="outline"
                            className="border-gray-600 text-gray-600 hover:bg-gray-50 dark:hover:bg-gray-950/20"
                          >
                            <ExternalLink className="h-4 w-4 mr-1" />
                            View
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {completedMeets.length > 10 && (
                    <div className="text-center py-2 text-sm text-gray-500 dark:text-gray-400">
                      Showing 10 of {completedMeets.length} completed meetings
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-6 sm:gap-8">
          {/* Create Meeting */}
          <div className="relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 via-transparent to-indigo-50/50 dark:from-blue-950/20 dark:via-transparent dark:to-indigo-950/20 rounded-2xl"></div>
            <div className="relative bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-6 sm:p-8 shadow-lg hover:shadow-xl transition-all duration-300">
              <div className="flex items-center mb-6">
                <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg mr-4">
                  <Video className="h-6 w-6 text-white" />
                </div>
                <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-white">Start a new meeting</h2>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Meeting Title
                  </label>
                  <Input 
                    placeholder="Enter meeting title" 
                    value={title} 
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full h-12 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 rounded-xl shadow-sm hover:shadow-md transition-all duration-300"
                  />
                </div>
                <Button 
                  onClick={handleCreate} 
                  disabled={loading}
                  className="w-full h-12 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Plus className="mr-2 h-5 w-5" />
                      Create Meeting
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>

          {/* Join Meeting */}
          <div className="relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-green-50/50 via-transparent to-emerald-50/50 dark:from-green-950/20 dark:via-transparent dark:to-emerald-950/20 rounded-2xl"></div>
            <div className="relative bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-6 sm:p-8 shadow-lg hover:shadow-xl transition-all duration-300">
              <div className="flex items-center mb-6">
                <div className="p-3 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl shadow-lg mr-4">
                  <Users className="h-6 w-6 text-white" />
                </div>
                <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-white">Join with code</h2>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Meeting Code
                  </label>
                  <Input 
                    placeholder="Enter meeting code" 
                    value={code} 
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    className="w-full h-12 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 rounded-xl shadow-sm hover:shadow-md transition-all duration-300 font-mono text-center text-lg tracking-wider"
                  />
                </div>
                <Button 
                  variant="outline" 
                  onClick={handleJoin} 
                  disabled={loading || !code.trim()}
                  className="w-full h-12 bg-white dark:bg-gray-800 border-green-600 dark:border-green-700 text-green-600 dark:text-green-300 hover:bg-green-50 dark:hover:bg-green-950/20 hover:border-green-700 dark:hover:border-green-600 font-semibold shadow-sm hover:shadow-md transition-all duration-300"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Joining...
                    </>
                  ) : (
                    <>
                      <Users className="mr-2 h-5 w-5" />
                      Join Meeting
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced Features Section */}
        <div className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-gray-50/30 to-blue-50/30 dark:from-gray-800/30 dark:to-blue-900/30 rounded-2xl"></div>
          <div className="relative bg-white/70 dark:bg-gray-900/70 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-6 sm:p-8">
            <div className="text-center mb-8">
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-3">
                Professional Meeting Features
              </h2>
              <p className="text-gray-600 dark:text-gray-400 text-base lg:text-lg font-medium max-w-2xl mx-auto">
                Everything you need for productive team collaboration
              </p>
            </div>
            
            <div className="grid md:grid-cols-3 gap-6 sm:gap-8">
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-br from-purple-50/50 via-transparent to-blue-50/50 dark:from-purple-950/20 dark:via-transparent dark:to-blue-950/20 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <div className="relative bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-6 text-center shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105">
                  <div className="p-3 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl w-fit mx-auto mb-4 shadow-lg">
                    <Video className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2 text-lg">HD Video Quality</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Crystal clear video quality for seamless communication</p>
                </div>
              </div>
              
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-br from-orange-50/50 via-transparent to-red-50/50 dark:from-orange-950/20 dark:via-transparent dark:to-red-950/20 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <div className="relative bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-6 text-center shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105">
                  <div className="p-3 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl w-fit mx-auto mb-4 shadow-lg">
                    <Users className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2 text-lg">Team Collaboration</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Work together seamlessly with your development team</p>
                </div>
              </div>
              
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-br from-green-50/50 via-transparent to-emerald-50/50 dark:from-green-950/20 dark:via-transparent dark:to-emerald-950/20 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <div className="relative bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-6 text-center shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105">
                  <div className="p-3 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl w-fit mx-auto mb-4 shadow-lg">
                    <Copy className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2 text-lg">Easy Sharing</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Share meeting codes instantly with your team members</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}


