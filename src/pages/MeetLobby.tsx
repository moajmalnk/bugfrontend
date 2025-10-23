import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { createMeeting, getMeeting } from "@/services/meetings";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Video, Users, Copy, Check, Plus, Clock, ExternalLink, Calendar, Search, Filter, X, User, Shield, Code, TestTube, Mail, Eye, BarChart3, UserCheck, Timer, Trash2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { ENV } from "@/lib/env";
import axios from "axios";
import { useAuth } from "@/context/AuthContext";
import { useUndoDelete } from "@/hooks/useUndoDelete";

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

// Team member interfaces
interface TeamMember {
  email: string;
  role: 'admin' | 'developer' | 'tester';
}

interface TeamMembersResponse {
  success: boolean;
  emails: string[];
  error?: string;
}

// Meeting details interfaces
interface ParticipantSession {
  participant: {
    email: string;
    displayName: string;
    role: string;
  };
  sessionId: string;
  joinTime: string;
  leaveTime: string;
  duration: number;
  durationFormatted: string;
  status: 'active' | 'completed';
}

interface MeetingDetails {
  id: string;
  title: string;
  description: string;
  startTime: string;
  endTime: string;
  creator: string;
  meetingUri: string | null;
  meetingCode: string | null;
  participants: Array<{
    email: string;
    displayName: string;
    responseStatus: string;
    role: string;
  }>;
  sessionAnalytics: ParticipantSession[];
}

interface MeetingDetailsResponse {
  success: boolean;
  meetingDetails: MeetingDetails;
  timestamp: string;
  error?: string;
}

interface DeleteMeetingResponse {
  success: boolean;
  message?: string;
  deletedMeetingId?: string;
  timestamp?: string;
  error?: string;
}

// Skeleton Loading Components
const MeetingSkeleton = () => (
  <div className="group relative overflow-hidden rounded-2xl border border-gray-200/60 dark:border-gray-800/60 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm animate-pulse">
    <div className="relative p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start space-x-4 flex-1 min-w-0">
          <div className="w-8 h-8 bg-gray-300 dark:bg-gray-700 rounded-full"></div>
          <div className="flex-1 min-w-0 space-y-3">
            <div className="h-5 bg-gray-300 dark:bg-gray-700 rounded w-3/4"></div>
            <div className="flex items-center gap-4">
              <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-24"></div>
              <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-20"></div>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-6 bg-gray-300 dark:bg-gray-700 rounded w-20"></div>
              <div className="h-6 w-6 bg-gray-300 dark:bg-gray-700 rounded"></div>
            </div>
          </div>
        </div>
        <div className="h-8 bg-gray-300 dark:bg-gray-700 rounded w-16"></div>
      </div>
    </div>
  </div>
);

const TabSkeleton = () => (
  <div className="flex items-center gap-2 animate-pulse">
    <div className="h-4 w-4 bg-gray-300 dark:bg-gray-700 rounded"></div>
    <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-16"></div>
    <div className="h-5 w-5 bg-gray-300 dark:bg-gray-700 rounded-full"></div>
  </div>
);

export default function MeetLobby() {
  const { currentUser } = useAuth();
  const [title, setTitle] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [runningMeets, setRunningMeets] = useState<RunningMeeting[]>([]);
  const [completedMeets, setCompletedMeets] = useState<RunningMeeting[]>([]);
  const [loadingMeets, setLoadingMeets] = useState(false);
  const [showCompleted, setShowCompleted] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get("tab") || "my-meets";
  const [activeTab, setActiveTab] = useState(initialTab);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [creatorFilter, setCreatorFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<"create" | "join">("create");
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [activeRoleTab, setActiveRoleTab] = useState<"all" | "admin" | "developer" | "tester">("all");
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [meetingDetails, setMeetingDetails] = useState<MeetingDetails | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [selectedMeetingId, setSelectedMeetingId] = useState<string | null>(null);
  const [deletingMeetingId, setDeletingMeetingId] = useState<string | null>(null);
  const [deletedMeeting, setDeletedMeeting] = useState<RunningMeeting | null>(null);
  const navigate = useNavigate();

  // Undo delete functionality
  const undoDelete = useUndoDelete({
    duration: 10,
    onConfirm: () => {
      // Actually delete the meeting from Google Calendar
      if (deletedMeeting) {
        performActualDelete(deletedMeeting.id);
        setDeletedMeeting(null);
      }
    },
    onUndo: () => {
      // Restore the meeting to the list
      if (deletedMeeting) {
        if (deletedMeeting.isActive) {
          setRunningMeets(prev => [deletedMeeting, ...prev]);
        } else {
          setCompletedMeets(prev => [deletedMeeting, ...prev]);
        }
        setDeletedMeeting(null);
        toast.success("Meeting deletion cancelled");
      }
    }
  });

  const handleCreate = async () => {
    setLoading(true);
    setError(null);
    
    // Optimistic UI update - immediately show the meeting in the list
    const optimisticMeeting: RunningMeeting = {
      id: `temp-${Date.now()}`,
      title: title || "BugMeet Session",
      description: "Creating meeting...",
      meetingUri: "",
      meetingCode: "Loading...",
      startTime: new Date().toISOString(),
      endTime: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // 1 hour from now
      isActive: true,
      creator: "You",
      attendees: []
    };

    // Add optimistic meeting to the list immediately
    setRunningMeets(prev => [optimisticMeeting, ...prev]);
    
    try {
      // Get the JWT token from localStorage
      const token = localStorage.getItem("token");
      if (!token) {
        throw new Error("Please log in to create meetings");
      }

      console.log("🔄 Creating new meeting...");
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
      console.log("📊 Create meeting response:", data);
      
      if (data?.success && data?.meetingUri) {
        toast.success("Google Meet created successfully!");
        console.log("✅ Meeting created successfully, refreshing meetings list...");
        
        // Clear the title input and close modal
        setTitle("");
        setIsModalOpen(false);
        
        // Open the Google Meet link in a new tab
        window.open(data.meetingUri, '_blank');
        
        // Refresh the meetings list immediately to get the real data
        fetchRunningMeets(true);
      } else {
        // Remove optimistic meeting on failure
        setRunningMeets(prev => prev.filter(meeting => meeting.id !== optimisticMeeting.id));
        setError(data?.error || "Failed to create Google Meet");
      }
    } catch (err: any) {
      // Remove optimistic meeting on failure
      setRunningMeets(prev => prev.filter(meeting => meeting.id !== optimisticMeeting.id));
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
      // Clear the code input and close modal
      setCode("");
      setIsModalOpen(false);
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

  // Cache for API responses
  const [cache, setCache] = useState<{
    data: RunningMeetsResponse | null;
    timestamp: number;
  }>({ data: null, timestamp: 0 });

  // Request deduplication
  const [pendingRequest, setPendingRequest] = useState<Promise<any> | null>(null);

  const fetchRunningMeets = useCallback(async (forceRefresh = false) => {
    // Check cache first (5 minute cache)
    const now = Date.now();
    const cacheAge = now - cache.timestamp;
    const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

    if (!forceRefresh && cache.data && cacheAge < CACHE_DURATION) {
      console.log("🚀 Using cached data");
      setRunningMeets(cache.data.runningMeetings || []);
      setCompletedMeets(cache.data.completedMeetings || []);
      setIsInitialLoad(false);
      return;
    }

    // Prevent multiple simultaneous requests
    if (pendingRequest && !forceRefresh) {
      console.log("⏳ Waiting for existing request...");
      try {
        await pendingRequest;
        return;
      } catch (error) {
        console.log("❌ Pending request failed, proceeding with new request");
      }
    }

    if (loadingMeets && !forceRefresh) {
      console.log("Already loading meets, skipping duplicate request");
      return;
    }

    setLoadingMeets(true);
    const requestPromise = (async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        throw new Error("Please log in to view meetings");
      }

        console.log("🔄 Fetching running meets...");
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
        console.log("📊 API Response:", data);
        
      if (data?.success) {
          const runningMeetings = data.runningMeetings || [];
          const completedMeetings = data.completedMeetings || [];
          
          console.log(`✅ Loaded ${runningMeetings.length} running meetings and ${completedMeetings.length} completed meetings`);
          
          // Update cache
          setCache({ data, timestamp: now });
          
          setRunningMeets(runningMeetings);
          setCompletedMeets(completedMeetings);
          setIsInitialLoad(false);
          
          // Clear any previous errors on successful fetch
          if (error && error.includes("Failed to fetch meetings")) {
            setError(null);
          }
      } else {
          console.error("❌ Failed to fetch running meets:", data?.error);
        // Check if it's a scope issue
        if (data?.error?.includes?.('insufficient authentication scopes') || 
            data?.error?.includes?.('ACCESS_TOKEN_SCOPE_INSUFFICIENT')) {
          setError("Please re-authorize your Google account to access calendar features. Your current token doesn't have the required permissions.");
        } else {
          setError(data?.error || "Failed to fetch meetings");
        }
      }
    } catch (err: any) {
        console.error("❌ Error fetching running meets:", err?.message);
      // Check if it's a scope issue from the error response
      if (err?.response?.data?.error?.includes?.('insufficient authentication scopes') ||
          err?.response?.data?.error?.includes?.('ACCESS_TOKEN_SCOPE_INSUFFICIENT')) {
        setError("Please re-authorize your Google account to access calendar features. Your current token doesn't have the required permissions.");
        } else {
          setError("Failed to fetch meetings. Please try again.");
      }
        throw err;
    } finally {
      setLoadingMeets(false);
        setPendingRequest(null);
      }
    })();

    setPendingRequest(requestPromise);
    return requestPromise;
  }, [cache, loadingMeets, error]);

  const joinRunningMeet = (meetingUri: string) => {
    window.open(meetingUri, '_blank');
  };

  const copyMeetCode = (meetingCode: string) => {
    copyToClipboard(meetingCode);
  };

  const fetchMeetingDetails = async (meetingId: string) => {
    setLoadingDetails(true);
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        throw new Error("Please log in to view meeting details");
      }

      console.log("🔄 Fetching meeting details for ID:", meetingId);
      const response = await axios.get(
        `${ENV.API_URL}/meet/get-meeting-details.php?meeting_id=${meetingId}`,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        }
      );

      const data = response.data as MeetingDetailsResponse;
      console.log("📊 Meeting details response:", data);
      
      if (data?.success && data?.meetingDetails) {
        setMeetingDetails(data.meetingDetails);
        setIsDetailsModalOpen(true);
      } else {
        throw new Error(data?.error || "Failed to fetch meeting details");
      }
    } catch (err: any) {
      console.error("❌ Error fetching meeting details:", err?.message);
      const errorMessage = err?.response?.data?.error || err?.message || "Failed to fetch meeting details";
      toast.error(errorMessage);
    } finally {
      setLoadingDetails(false);
    }
  };

  const openMeetingDetails = (meetingId: string) => {
    setSelectedMeetingId(meetingId);
    fetchMeetingDetails(meetingId);
  };

  const closeDetailsModal = () => {
    setIsDetailsModalOpen(false);
    setMeetingDetails(null);
    setSelectedMeetingId(null);
  };

  const deleteMeeting = async (meetingId: string) => {
    if (!currentUser || currentUser.role !== 'admin') {
      toast.error("Only admins can delete meetings");
      return;
    }

    // Find the meeting to delete
    const meetingToDelete = [...runningMeets, ...completedMeets].find(meeting => meeting.id === meetingId);
    if (!meetingToDelete) {
      toast.error("Meeting not found");
      return;
    }

    // Store the meeting for potential undo
    setDeletedMeeting(meetingToDelete);
    
    // Remove from UI immediately (optimistic update)
    setRunningMeets(prev => prev.filter(meeting => meeting.id !== meetingId));
    setCompletedMeets(prev => prev.filter(meeting => meeting.id !== meetingId));
    
    // Start the countdown (toast removed for cleaner UX)
    
    // Start the countdown
    undoDelete.startCountdown();
  };

  const performActualDelete = async (meetingId: string) => {
    setDeletingMeetingId(meetingId);
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        throw new Error("Please log in to delete meetings");
      }

      console.log("🔄 Actually deleting meeting with ID:", meetingId);
      const response = await axios.delete(
        `${ENV.API_URL}/meet/delete-meeting.php?meeting_id=${meetingId}`,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        }
      );

      const data = response.data as DeleteMeetingResponse;
      console.log("📊 Delete meeting response:", data);
      
      if (data?.success) {
        toast.success("Meeting permanently deleted");
      } else {
        throw new Error(data?.error || "Failed to delete meeting");
      }
    } catch (err: any) {
      console.error("❌ Error deleting meeting:", err?.message);
      const errorMessage = err?.response?.data?.error || err?.message || "Failed to delete meeting";
      toast.error(errorMessage);
      
      // Restore the meeting if deletion failed
      if (deletedMeeting) {
        if (deletedMeeting.isActive) {
          setRunningMeets(prev => [deletedMeeting, ...prev]);
        } else {
          setCompletedMeets(prev => [deletedMeeting, ...prev]);
        }
      }
    } finally {
      setDeletingMeetingId(null);
    }
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

  // Optimized filtered meetings with useMemo - sorted by latest first
  const filteredMeetings = useMemo(() => {
    let filtered = [...runningMeets, ...completedMeets];
    
    // Filter by tab
    if (activeTab === "my-meets") {
      filtered = runningMeets;
    } else if (activeTab === "shared-meets") {
      filtered = completedMeets;
    }
    
    // Apply search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(meeting => 
        meeting.title.toLowerCase().includes(searchLower) ||
        meeting.meetingCode.toLowerCase().includes(searchLower) ||
        meeting.creator.toLowerCase().includes(searchLower)
      );
    }
    
    // Apply status filter
    if (statusFilter !== "all") {
      if (statusFilter === "live") {
        filtered = filtered.filter(meeting => meeting.isActive);
      } else if (statusFilter === "completed") {
        filtered = filtered.filter(meeting => !meeting.isActive);
      }
    }
    
    // Apply creator filter
    if (creatorFilter !== "all") {
      filtered = filtered.filter(meeting => meeting.creator === creatorFilter);
    }
    
    // Apply date filter
    if (dateFilter !== "all") {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const thisWeek = new Date(today);
      thisWeek.setDate(thisWeek.getDate() - 7);
      const thisMonth = new Date(today);
      thisMonth.setMonth(thisMonth.getMonth() - 1);
      
      filtered = filtered.filter(meeting => {
        const meetingDate = new Date(meeting.startTime);
        switch (dateFilter) {
          case "today":
            return meetingDate >= today;
          case "yesterday":
            return meetingDate >= yesterday && meetingDate < today;
          case "this-week":
            return meetingDate >= thisWeek;
          case "this-month":
            return meetingDate >= thisMonth;
          default:
            return true;
        }
      });
    }
    
    // Sort by latest first (newest meetings at the top)
    return filtered.sort((a, b) => {
      const dateA = new Date(a.startTime);
      const dateB = new Date(b.startTime);
      return dateB.getTime() - dateA.getTime(); // Descending order (latest first)
    });
  }, [runningMeets, completedMeets, activeTab, searchTerm, statusFilter, creatorFilter, dateFilter]);

  // Get unique creators for filter
  const uniqueCreators = useMemo(() => {
    const allMeetings = [...runningMeets, ...completedMeets];
    const creators = allMeetings
      .map(meeting => meeting.creator)
      .filter(Boolean)
      .filter((creator, index, arr) => arr.indexOf(creator) === index);
    return creators.sort();
  }, [runningMeets, completedMeets]);

  // Get tab counts with better reliability
  const getTabCount = (tabType: string) => {
    const runningCount = runningMeets?.length || 0;
    const completedCount = completedMeets?.length || 0;
    
    console.log(`📊 Tab counts - Running: ${runningCount}, Completed: ${completedCount}`);
    
    switch (tabType) {
      case "my-meets":
        return runningCount;
      case "shared-meets":
        return completedCount;
      default:
        return 0;
    }
  };

  // Debug function to log current state
  const debugState = () => {
    console.log("🔍 Current Meeting State:", {
      runningMeets: runningMeets.length,
      completedMeets: completedMeets.length,
      loadingMeets,
      error,
      activeTab
    });
  };

  // Check for OAuth success/error parameters
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const googleConnected = urlParams.get('google_connected');
    const googleError = urlParams.get('google_error');
    
    if (googleConnected === 'true') {
      toast.success("Google account connected successfully! You can now create and manage meetings.");
      // Clear the URL parameters
      window.history.replaceState({}, document.title, window.location.pathname);
      // Clear any existing error state
      setError(null);
      // Refresh meetings after a short delay to ensure token is saved
      setTimeout(() => {
        fetchRunningMeets();
      }, 1000);
    } else if (googleError) {
      setError(`Google connection failed: ${decodeURIComponent(googleError)}`);
      // Clear the URL parameters
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  // Fetch running meets on component mount with progressive loading
  useEffect(() => {
    console.log("🚀 Component mounted, fetching initial meetings...");
    
    // Immediate fetch for fast loading
    fetchRunningMeets();
    
    // Background refresh every 30 seconds (reduced frequency for better performance)
    const interval = setInterval(() => {
      console.log("🔄 Background refresh...");
      fetchRunningMeets();
    }, 60000); // Increased to 1 minute for better performance
    
    return () => {
      console.log("🧹 Cleaning up meeting refresh interval");
      clearInterval(interval);
    };
  }, [fetchRunningMeets]);

  // Fetch team members from all three endpoints
  const fetchTeamMembers = useCallback(async () => {
    setLoadingUsers(true);
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        throw new Error("Please log in to view team members");
      }

      console.log("🔄 Fetching team members...");
      
      // Fetch all three types of users in parallel
      const [adminsResponse, developersResponse, testersResponse] = await Promise.all([
        axios.get(`${ENV.API_URL}/get_all_admins.php`, {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        }),
        axios.get(`${ENV.API_URL}/get_all_developers.php`, {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        }),
        axios.get(`${ENV.API_URL}/get_all_testers.php`, {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        })
      ]);

      const adminsData = adminsResponse.data as TeamMembersResponse;
      const developersData = developersResponse.data as TeamMembersResponse;
      const testersData = testersResponse.data as TeamMembersResponse;

      console.log("📊 Team members response:", { adminsData, developersData, testersData });

      // Combine all team members with their roles
      const allTeamMembers: TeamMember[] = [
        ...(adminsData.emails || []).map(email => ({ email, role: 'admin' as const })),
        ...(developersData.emails || []).map(email => ({ email, role: 'developer' as const })),
        ...(testersData.emails || []).map(email => ({ email, role: 'tester' as const }))
      ];

      setTeamMembers(allTeamMembers);
      console.log(`✅ Loaded ${allTeamMembers.length} team members (${adminsData.emails?.length || 0} admins, ${developersData.emails?.length || 0} developers, ${testersData.emails?.length || 0} testers)`);
    } catch (err: any) {
      console.error("❌ Error fetching team members:", err?.message);
      // Fallback to empty array on error
      setTeamMembers([]);
    } finally {
      setLoadingUsers(false);
    }
  }, []);

  // Fetch team members when create modal opens
  useEffect(() => {
    if (isModalOpen && modalType === "create" && teamMembers.length === 0) {
      fetchTeamMembers();
    }
  }, [isModalOpen, modalType, teamMembers.length, fetchTeamMembers]);

  // Add a manual refresh function that can be called from the UI
  const handleRefresh = () => {
    console.log("🔄 Manual refresh triggered");
    fetchRunningMeets(true);
  };

  // Modal handlers
  const openCreateModal = () => {
    setModalType("create");
    setIsModalOpen(true);
    setError(null);
  };

  const openJoinModal = () => {
    setModalType("join");
    setIsModalOpen(true);
    setError(null);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setTitle("");
    setCode("");
    setSelectedUsers([]);
    setActiveRoleTab("all");
    setError(null);
  };

  // Helper functions for user selection
  const toggleUserSelection = (email: string) => {
    setSelectedUsers(prev => 
      prev.includes(email) 
        ? prev.filter(e => e !== email)
        : [...prev, email]
    );
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin':
        return <Shield className="h-4 w-4" />;
      case 'developer':
        return <Code className="h-4 w-4" />;
      case 'tester':
        return <TestTube className="h-4 w-4" />;
      default:
        return <User className="h-4 w-4" />;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
      case 'developer':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
      case 'tester':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300';
    }
  };

  const getSelectedUsers = () => {
    return teamMembers.filter(member => selectedUsers.includes(member.email));
  };

  // Filter team members by role
  const getFilteredTeamMembers = () => {
    if (activeRoleTab === "all") {
      return teamMembers;
    }
    return teamMembers.filter(member => member.role === activeRoleTab);
  };

  // Get role counts
  const getRoleCounts = () => {
    return {
      all: teamMembers.length,
      admin: teamMembers.filter(m => m.role === 'admin').length,
      developer: teamMembers.filter(m => m.role === 'developer').length,
      tester: teamMembers.filter(m => m.role === 'tester').length
    };
  };

  // Debug state changes
  useEffect(() => {
    console.log("📊 Meeting state changed:", {
      runningMeets: runningMeets.length,
      completedMeets: completedMeets.length,
      loadingMeets,
      error: error ? error.substring(0, 50) + "..." : null
    });
  }, [runningMeets, completedMeets, loadingMeets, error]);

  // Add window focus listener to refresh data when user returns to tab (optimized)
  useEffect(() => {
    let focusTimeout: NodeJS.Timeout;
    
    const handleFocus = () => {
      // Debounce focus events to prevent multiple rapid refreshes
      clearTimeout(focusTimeout);
      focusTimeout = setTimeout(() => {
        console.log("👁️ Window focused, refreshing meetings...");
        fetchRunningMeets(true);
      }, 1000); // 1 second delay to prevent rapid refreshes
    };

    window.addEventListener('focus', handleFocus);
    return () => {
      window.removeEventListener('focus', handleFocus);
      clearTimeout(focusTimeout);
    };
  }, [fetchRunningMeets]);

  // Keep tab in sync with URL changes (back/forward navigation)
  useEffect(() => {
    const urlTab = searchParams.get("tab") || "my-meets";
    if (urlTab !== activeTab) setActiveTab(urlTab);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

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
              
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
                <Button
                  onClick={openCreateModal}
                  className="h-12 px-6 bg-gradient-to-r from-blue-600 to-purple-700 hover:from-blue-700 hover:to-purple-800 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
                >
                  <Plus className="h-5 w-5 mr-2" />
                  New Meet
                </Button>
                
                {/* <Button
                  onClick={openJoinModal}
                  variant="outline"
                  className="h-12 px-6 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:bg-green-50 dark:hover:bg-green-900/20 hover:border-green-300 dark:hover:border-green-700 text-gray-700 dark:text-gray-300 hover:text-green-700 dark:hover:text-green-300 font-semibold shadow-sm hover:shadow-md transition-all duration-300"
                >
                  <Users className="h-5 w-5 mr-2" />
                  Join
                </Button> */}
              
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/30 dark:to-purple-950/30 border border-blue-200 dark:border-blue-800 rounded-xl shadow-sm">
                  <div className="p-1.5 bg-blue-500 rounded-lg">
                    <Video className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                        {runningMeets.length + completedMeets.length}
                      </div>
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

        {/* Meetings Tabs */}
        <Tabs 
          value={activeTab} 
          onValueChange={(val) => {
            setActiveTab(val);
            setSearchParams((prev) => {
              const p = new URLSearchParams(prev);
              p.set("tab", val);
              return p as any;
            });
          }} 
          className="w-full"
        >
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-gray-50/50 to-blue-50/50 dark:from-gray-800/50 dark:to-blue-900/50 rounded-2xl"></div>
            <div className="relative bg-white/60 dark:bg-gray-900/60 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-2">
              <TabsList className="grid w-full grid-cols-2 h-14 bg-transparent p-1">
                <TabsTrigger
                  value="my-meets"
                  className="text-sm sm:text-base font-semibold data-[state=active]:bg-white data-[state=active]:shadow-lg data-[state=active]:border data-[state=active]:border-gray-200 dark:data-[state=active]:bg-gray-800 dark:data-[state=active]:border-gray-700 rounded-xl transition-all duration-300"
                >
                  <Video className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                  <span className="hidden sm:inline">My Meets</span>
                  <span className="sm:hidden">My</span>
                  {loadingMeets && isInitialLoad ? (
                    <div className="ml-2 h-5 w-5 bg-gray-300 dark:bg-gray-700 rounded-full animate-pulse"></div>
                  ) : (
                    <span className="ml-2 px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-xs font-bold">
                      {getTabCount("my-meets")}
                    </span>
                  )}
                </TabsTrigger>
                <TabsTrigger
                  value="shared-meets"
                  className="text-sm sm:text-base font-semibold data-[state=active]:bg-white data-[state=active]:shadow-lg data-[state=active]:border data-[state=active]:border-gray-200 dark:data-[state=active]:bg-gray-800 dark:data-[state=active]:border-gray-700 rounded-xl transition-all duration-300"
                >
                  <Users className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                  <span className="hidden sm:inline">Shared Meets</span>
                  <span className="sm:hidden">Shared</span>
                  {loadingMeets && isInitialLoad ? (
                    <div className="ml-2 h-5 w-5 bg-gray-300 dark:bg-gray-700 rounded-full animate-pulse"></div>
                  ) : (
                    <span className="ml-2 px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full text-xs font-bold">
                      {getTabCount("shared-meets")}
                            </span>
                          )}
                </TabsTrigger>
              </TabsList>
                          </div>
                        </div>
                        
          <TabsContent value={activeTab} className="space-y-6 sm:space-y-8">
            {/* Search and Filter Controls */}
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-gray-50/30 to-blue-50/30 dark:from-gray-800/30 dark:to-blue-900/30 rounded-2xl"></div>
              <div className="relative bg-white/70 dark:bg-gray-900/70 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-6">
                <div className="flex items-center gap-2 mb-4">
                  <div className="p-1.5 bg-blue-500 rounded-lg">
                    <Search className="h-4 w-4 text-white" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Search & Filter</h3>
                </div>
                <div className="flex flex-col lg:flex-row gap-4">
                  {/* Search Bar */}
                  <div className="flex-1 relative group">
                    <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                    <input
                      type="text"
                      placeholder="Search meetings by title, code, or creator..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-12 pr-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 text-sm font-medium transition-all duration-300 shadow-sm hover:shadow-md"
                    />
                  </div>
                  
                  {/* Filter Controls */}
                  <div className="flex flex-col sm:flex-row gap-3">
                    {/* Status Filter */}
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="p-1.5 bg-purple-500 rounded-lg shrink-0">
                        <Filter className="h-4 w-4 text-white" />
                      </div>
                      <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="w-full sm:w-[140px] h-11 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 rounded-xl shadow-sm hover:shadow-md transition-all duration-300">
                          <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent position="popper" className="z-[60]">
                          <SelectItem value="all">All Status</SelectItem>
                          <SelectItem value="live">Live</SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Date Filter */}
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="p-1.5 bg-orange-500 rounded-lg shrink-0">
                        <Calendar className="h-4 w-4 text-white" />
                      </div>
                      <Select value={dateFilter} onValueChange={setDateFilter}>
                        <SelectTrigger className="w-full sm:w-[140px] h-11 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 rounded-xl shadow-sm hover:shadow-md transition-all duration-300">
                          <SelectValue placeholder="Date" />
                        </SelectTrigger>
                        <SelectContent position="popper" className="z-[60]">
                          <SelectItem value="all">All Dates</SelectItem>
                          <SelectItem value="today">Today</SelectItem>
                          <SelectItem value="yesterday">Yesterday</SelectItem>
                          <SelectItem value="this-week">This Week</SelectItem>
                          <SelectItem value="this-month">This Month</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    {/* Clear Filters Button */}
                    {(searchTerm || statusFilter !== "all" || creatorFilter !== "all" || dateFilter !== "all") && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSearchTerm("");
                          setStatusFilter("all");
                          setCreatorFilter("all");
                          setDateFilter("all");
                        }}
                        className="h-11 px-4 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 rounded-xl shadow-sm hover:shadow-md transition-all duration-300 font-medium"
                      >
                        Clear
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Meetings Content */}
            <div className="space-y-4">
              {loadingMeets && isInitialLoad ? (
                <div className="space-y-4">
                  <MeetingSkeleton />
                  <MeetingSkeleton />
                  <MeetingSkeleton />
                  </div>
              ) : loadingMeets ? (
                <div className="flex items-center justify-center py-8">
                  <div className="flex items-center gap-3">
                    <Clock className="h-5 w-5 animate-spin text-blue-500" />
                    <span className="text-sm text-gray-600 dark:text-gray-400">Updating meetings...</span>
                  </div>
                </div>
              ) : filteredMeetings.length === 0 ? (
                <div className="relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 via-indigo-50/30 to-purple-50/50 dark:from-blue-950/20 dark:via-indigo-950/10 dark:to-purple-950/20 rounded-2xl"></div>
                  <div className="relative bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-12 text-center">
                    <div className="mx-auto w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center shadow-2xl mb-6">
                      <Video className="h-10 w-10 text-white" />
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                      {activeTab === "my-meets" ? "No meetings found" : "No shared meetings"}
                    </h3>
                    <p className="text-lg text-gray-600 dark:text-gray-400 mb-8 max-w-md mx-auto">
                      {activeTab === "my-meets"
                        ? "You don't have any meetings yet. Create your first meeting to get started."
                        : "There are no shared meetings available right now."}
                    </p>
                    {activeTab === "my-meets" && (
                      <div className="flex flex-col sm:flex-row gap-3">
                  <Button
                          onClick={handleCreate}
                          disabled={loading}
                          className="h-12 px-6 bg-gradient-to-r from-blue-600 to-purple-700 hover:from-blue-700 hover:to-purple-800 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
                        >
                          <Plus className="h-5 w-5 mr-2" />
                          Create Meeting
                  </Button>
                  <Button
                          onClick={handleRefresh}
                    disabled={loadingMeets}
                    variant="outline"
                          className="h-12 px-6 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:border-blue-300 dark:hover:border-blue-700 text-gray-700 dark:text-gray-300 hover:text-blue-700 dark:hover:text-blue-300 font-semibold shadow-sm hover:shadow-md transition-all duration-300"
                        >
                          <Clock className={`h-5 w-5 mr-2 ${loadingMeets ? "animate-spin" : ""}`} />
                          Refresh
                  </Button>
                </div>
                    )}
              </div>
                </div>
              ) : (
                <div className="grid gap-4">
                  {filteredMeetings.map((meeting) => (
                    <div key={meeting.id} className="group relative overflow-hidden rounded-2xl border border-gray-200/60 dark:border-gray-800/60 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm hover:shadow-2xl transition-all duration-300">
                      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-blue-50/40 via-transparent to-purple-50/40 dark:from-blue-950/15 dark:via-transparent dark:to-purple-950/15 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                      <div className="relative p-6">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-start space-x-4 flex-1 min-w-0">
                            <div className="text-3xl">{meeting.isActive ? "🔴" : "📹"}</div>
                        <div className="flex-1 min-w-0">
                              <h3 className="text-lg font-semibold text-gray-900 dark:text-white group-hover:text-blue-700 dark:group-hover:text-blue-300 transition-colors">
                              {meeting.title}
                              </h3>
                              <div className="flex items-center gap-4 mt-2 text-sm text-gray-600 dark:text-gray-400">
                                <span className="flex items-center">
                                  <Clock className="h-4 w-4 mr-1" />
                              {formatMeetingTime(meeting.startTime, meeting.endTime)}
                                </span>
                                <span className="flex items-center">
                                  <Users className="h-4 w-4 mr-1" />
                              {meeting.attendees.length} attendee{meeting.attendees.length !== 1 ? 's' : ''}
                            </span>
                            </div>
                              <div className="flex items-center gap-2 mt-3">
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
                          </div>
                          <div className="flex items-center gap-2">
                          <Button
                            onClick={() => openMeetingDetails(meeting.id)}
                            size="sm"
                            variant="outline"
                            className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            Details
                          </Button>
                          <Button
                            onClick={() => joinRunningMeet(meeting.meetingUri)}
                            size="sm"
                              className="bg-blue-600 hover:bg-blue-700 text-white"
                          >
                            <ExternalLink className="h-4 w-4 mr-1" />
                              {meeting.isActive ? "Join" : "View"}
                          </Button>
                          {currentUser?.role === 'admin' && (
                            <Button
                              onClick={() => deleteMeeting(meeting.id)}
                              size="sm"
                              variant="outline"
                              disabled={deletingMeetingId === meeting.id}
                              className="bg-white dark:bg-gray-800 border-red-200 dark:border-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-700 dark:text-red-300 hover:text-red-900 dark:hover:text-red-100"
                            >
                              {deletingMeetingId === meeting.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Trash2 className="h-4 w-4" />
                              )}
                            </Button>
                          )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                    </div>
                  )}
                </div>
          </TabsContent>
        </Tabs>

        {/* Undo Delete Countdown */}
        {undoDelete.isCountingDown && deletedMeeting && (
          <div className="fixed bottom-4 right-4 z-50">
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl p-4 max-w-sm">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
                    <Trash2 className="h-6 w-6 text-red-600 dark:text-red-400" />
                  </div>
                  {/* Circular Progress Indicator */}
                  <div className="absolute inset-0 w-12 h-12">
                    <svg className="w-12 h-12 transform -rotate-90" viewBox="0 0 48 48">
                      <circle
                        cx="24"
                        cy="24"
                        r="20"
                        stroke="currentColor"
                        strokeWidth="3"
                        fill="none"
                        className="text-gray-200 dark:text-gray-700"
                      />
                      <circle
                        cx="24"
                        cy="24"
                        r="20"
                        stroke="currentColor"
                        strokeWidth="3"
                        fill="none"
                        strokeDasharray={`${2 * Math.PI * 20}`}
                        strokeDashoffset={`${2 * Math.PI * 20 * (1 - (10 - undoDelete.timeLeft) / 10)}`}
                        className="text-red-500 transition-all duration-1000 ease-linear"
                        strokeLinecap="round"
                      />
                    </svg>
                  </div>
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-gray-900 dark:text-white">
                    Meeting Deleted
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                    "{deletedMeeting.title}"
                  </p>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3 text-red-500 animate-pulse" />
                        <span className="text-xs font-medium text-red-600 dark:text-red-400">
                          Permanently deleted in
                        </span>
                      </div>
                      <div className="bg-red-100 dark:bg-red-900/30 px-2 py-1 rounded-md border border-red-200 dark:border-red-800">
                        <span className="text-sm font-bold text-red-700 dark:text-red-300 tabular-nums">
                          {undoDelete.timeLeft}s
                        </span>
                      </div>
                    </div>
                    {/* Progress Bar */}
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                      <div 
                        className="bg-red-500 h-1.5 rounded-full transition-all duration-1000 ease-linear"
                        style={{ width: `${((10 - undoDelete.timeLeft) / 10) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <Button
                    onClick={undoDelete.cancelCountdown}
                    size="sm"
                    className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-1 h-7"
                  >
                    Undo
                  </Button>
                  <Button
                    onClick={undoDelete.confirmDelete}
                    size="sm"
                    variant="outline"
                    className="border-red-200 text-red-700 hover:bg-red-50 dark:border-red-700 dark:text-red-300 dark:hover:bg-red-900/20 text-xs px-3 py-1 h-7"
                  >
                    Now
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Professional Modal for Create/Join Meeting */}
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent className="w-[95vw] max-w-lg max-h-[90vh] overflow-y-auto mx-4 sm:mx-0">
            <DialogHeader className="relative">
              <DialogTitle className="flex items-center gap-3 pr-12">
                <div className={`p-2 rounded-xl ${modalType === "create" ? "bg-gradient-to-br from-blue-500 to-blue-600" : "bg-gradient-to-br from-green-500 to-emerald-600"}`}>
                  {modalType === "create" ? (
                    <Video className="h-5 w-5 text-white" />
                  ) : (
                    <Users className="h-5 w-5 text-white" />
              )}
            </div>
                <span className="text-xl font-semibold">
                  {modalType === "create" ? "Start a meet" : "Join with code"}
                </span>
              </DialogTitle>
              <Button
                onClick={closeModal}
                variant="ghost"
                size="sm"
                className="absolute top-0 right-0 h-8 w-8 p-0 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full"
              >
                <X className="h-4 w-4" />
              </Button>
            </DialogHeader>
            
            <div className="space-y-6">
              {error && (
                <Alert className="border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-800">
                  <AlertDescription className="text-red-800 dark:text-red-300">
                    {error}
                  </AlertDescription>
                </Alert>
              )}
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {modalType === "create" ? "Meeting Title" : "Meeting Code"}
                  </label>
                  <Input 
                    placeholder={modalType === "create" ? "Enter meeting title" : "Enter meeting code"} 
                    value={modalType === "create" ? title : code} 
                    onChange={(e) => {
                      if (modalType === "create") {
                        setTitle(e.target.value);
                      } else {
                        setCode(e.target.value.toUpperCase());
                      }
                    }}
                    className="w-full h-12 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 rounded-xl shadow-sm hover:shadow-md transition-all duration-300 font-mono text-center text-lg tracking-wider"
                  />
                </div>

                {/* Team Member Selection - Only for Create Modal */}
                {modalType === "create" && (
                  <div className="space-y-3">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Invite Team Members
                    </label>
                    
                    {loadingUsers ? (
                      <div className="flex items-center justify-center py-8">
                        <div className="flex items-center gap-3">
                          <Clock className="h-5 w-5 animate-spin text-blue-500" />
                          <span className="text-sm text-gray-600 dark:text-gray-400">Loading team members...</span>
                        </div>
                      </div>
                    ) : teamMembers.length === 0 ? (
                      <div className="text-center py-8">
                        <Users className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                        <p className="text-sm text-gray-500 dark:text-gray-400">No team members found</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {/* Role Tabs - Responsive Grid */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-lg">
                          <button
                            onClick={() => setActiveRoleTab("all")}
                            className={`flex items-center justify-center gap-1 sm:gap-2 px-2 sm:px-3 py-2 rounded-md text-xs sm:text-sm font-medium transition-all duration-200 ${
                              activeRoleTab === "all"
                                ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
                                : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                            }`}
                          >
                            <Users className="h-3 w-3 sm:h-4 sm:w-4" />
                            <span className="hidden sm:inline">All</span>
                            <span className="sm:hidden">All</span>
                            <span className="ml-1 px-1.5 sm:px-2 py-0.5 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-full text-xs">
                              {getRoleCounts().all}
                            </span>
                          </button>
                          <button
                            onClick={() => setActiveRoleTab("admin")}
                            className={`flex items-center justify-center gap-1 sm:gap-2 px-2 sm:px-3 py-2 rounded-md text-xs sm:text-sm font-medium transition-all duration-200 ${
                              activeRoleTab === "admin"
                                ? "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 shadow-sm"
                                : "text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400"
                            }`}
                          >
                            <Shield className="h-3 w-3 sm:h-4 sm:w-4" />
                            <span className="hidden sm:inline">Admins</span>
                            <span className="sm:hidden">Admin</span>
                            <span className="ml-1 px-1.5 sm:px-2 py-0.5 bg-red-200 dark:bg-red-800 text-red-700 dark:text-red-300 rounded-full text-xs">
                              {getRoleCounts().admin}
                            </span>
                          </button>
                          <button
                            onClick={() => setActiveRoleTab("developer")}
                            className={`flex items-center justify-center gap-1 sm:gap-2 px-2 sm:px-3 py-2 rounded-md text-xs sm:text-sm font-medium transition-all duration-200 ${
                              activeRoleTab === "developer"
                                ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 shadow-sm"
                                : "text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
                            }`}
                          >
                            <Code className="h-3 w-3 sm:h-4 sm:w-4" />
                            <span className="hidden sm:inline">Devs</span>
                            <span className="sm:hidden">Dev</span>
                            <span className="ml-1 px-1.5 sm:px-2 py-0.5 bg-blue-200 dark:bg-blue-800 text-blue-700 dark:text-blue-300 rounded-full text-xs">
                              {getRoleCounts().developer}
                            </span>
                          </button>
                          <button
                            onClick={() => setActiveRoleTab("tester")}
                            className={`flex items-center justify-center gap-1 sm:gap-2 px-2 sm:px-3 py-2 rounded-md text-xs sm:text-sm font-medium transition-all duration-200 ${
                              activeRoleTab === "tester"
                                ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 shadow-sm"
                                : "text-gray-600 dark:text-gray-400 hover:text-green-600 dark:hover:text-green-400"
                            }`}
                          >
                            <TestTube className="h-3 w-3 sm:h-4 sm:w-4" />
                            <span className="hidden sm:inline">Testers</span>
                            <span className="sm:hidden">Test</span>
                            <span className="ml-1 px-1.5 sm:px-2 py-0.5 bg-green-200 dark:bg-green-800 text-green-700 dark:text-green-300 rounded-full text-xs">
                              {getRoleCounts().tester}
                            </span>
                          </button>
                        </div>

                        {/* Team Members List */}
                        <div className="max-h-48 overflow-y-auto space-y-2 border border-gray-200 dark:border-gray-700 rounded-xl p-3 bg-gray-50 dark:bg-gray-800/50">
                          {getFilteredTeamMembers().map((member) => (
                          <div
                            key={member.email}
                            onClick={() => toggleUserSelection(member.email)}
                            className={`flex items-center gap-2 sm:gap-3 p-2 sm:p-3 rounded-lg cursor-pointer transition-all duration-200 ${
                              selectedUsers.includes(member.email)
                                ? 'bg-blue-100 dark:bg-blue-900/30 border-2 border-blue-300 dark:border-blue-700'
                                : 'bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'
                            }`}
                          >
                            <div className="flex-shrink-0">
                              <div className={`p-1.5 sm:p-2 rounded-lg ${getRoleColor(member.role)}`}>
                                {getRoleIcon(member.role)}
                              </div>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1 sm:gap-2">
                                <Mail className="h-3 w-3 sm:h-4 sm:w-4 text-gray-500 flex-shrink-0" />
                                <span className="text-xs sm:text-sm font-medium text-gray-900 dark:text-white truncate">
                                  {member.email}
                                </span>
                              </div>
                              <div className="flex items-center gap-1 mt-1">
                                <span className={`px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full text-xs font-medium ${getRoleColor(member.role)}`}>
                                  {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
                                </span>
                              </div>
                            </div>
                            <div className="flex-shrink-0">
                              <div className={`w-4 h-4 sm:w-5 sm:h-5 rounded-full border-2 flex items-center justify-center ${
                                selectedUsers.includes(member.email)
                                  ? 'bg-blue-500 border-blue-500'
                                  : 'border-gray-300 dark:border-gray-600'
                              }`}>
                                {selectedUsers.includes(member.email) && (
                                  <Check className="h-2 w-2 sm:h-3 sm:w-3 text-white" />
                                )}
              </div>
            </div>
          </div>
                        ))}
                        </div>
                      </div>
                    )}

                    {/* Selected Users Summary - Responsive */}
                    {selectedUsers.length > 0 && (
                      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-2 sm:p-3">
                        <div className="flex items-center gap-2 mb-2">
                          <Users className="h-3 w-3 sm:h-4 sm:w-4 text-blue-600 dark:text-blue-400" />
                          <span className="text-xs sm:text-sm font-medium text-blue-800 dark:text-blue-300">
                            {selectedUsers.length} member{selectedUsers.length !== 1 ? 's' : ''} selected
                          </span>
                </div>
                        <div className="flex flex-wrap gap-1">
                          {getSelectedUsers().map((member) => (
                            <span
                              key={member.email}
                              className="inline-flex items-center gap-1 px-1.5 sm:px-2 py-0.5 sm:py-1 bg-blue-100 dark:bg-blue-800/30 text-blue-800 dark:text-blue-300 rounded-md text-xs"
                            >
                              {getRoleIcon(member.role)}
                              <span className="truncate max-w-[120px] sm:max-w-none">
                                {member.email}
                              </span>
                            </span>
                          ))}
              </div>
                </div>
                    )}
                  </div>
                )}
                
                <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                <Button 
                    onClick={modalType === "create" ? handleCreate : handleJoin} 
                    disabled={loading || (modalType === "join" && !code.trim())}
                    className={`flex-1 h-10 sm:h-12 font-semibold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 ${
                      modalType === "create" 
                        ? "bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white" 
                        : "bg-gradient-to-r from-green-600 to-emerald-700 hover:from-green-700 hover:to-emerald-800 text-white"
                    }`}
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-1 sm:mr-2 h-4 w-4 sm:h-5 sm:w-5 animate-spin" />
                        <span className="text-sm sm:text-base">
                          {modalType === "create" ? "Creating..." : "Joining..."}
                        </span>
                    </>
                  ) : (
                    <>
                        {modalType === "create" ? (
                          <>
                            <Plus className="mr-1 sm:mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                            <span className="text-sm sm:text-base">Create Meeting</span>
                    </>
                  ) : (
                    <>
                      <Users className="mr-1 sm:mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                      <span className="text-sm sm:text-base">Join Meeting</span>
                          </>
                        )}
                    </>
                  )}
                </Button>
            </div>
                  </div>
                </div>
          </DialogContent>
        </Dialog>

        {/* Meeting Details Modal */}
        <Dialog open={isDetailsModalOpen} onOpenChange={setIsDetailsModalOpen}>
          <DialogContent className="w-[95vw] max-w-4xl max-h-[90vh] overflow-y-auto mx-4 sm:mx-0">
            <DialogHeader className="relative">
              <DialogTitle className="flex items-center gap-3 pr-12">
                <div className="p-2 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600">
                  <BarChart3 className="h-5 w-5 text-white" />
                </div>
                <span className="text-xl font-semibold">
                  Meeting Details & Analytics
                </span>
              </DialogTitle>
              <Button
                onClick={closeDetailsModal}
                variant="ghost"
                size="sm"
                className="absolute top-0 right-0 h-8 w-8 p-0 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full"
              >
                <X className="h-4 w-4" />
              </Button>
            </DialogHeader>
            
            {loadingDetails ? (
              <div className="flex items-center justify-center py-12">
                <div className="flex items-center gap-3">
                  <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
                  <span className="text-lg text-gray-600 dark:text-gray-400">Loading meeting details...</span>
                </div>
              </div>
            ) : meetingDetails ? (
              <div className="space-y-6">
                {/* Meeting Overview */}
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 rounded-xl p-6 border border-blue-200 dark:border-blue-800">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                        {meetingDetails.title}
                      </h3>
                      <p className="text-gray-600 dark:text-gray-400">
                        {meetingDetails.description || "No description provided"}
                      </p>
                    </div>
                    {meetingDetails.meetingCode && (
                      <div className="flex items-center gap-2">
                        <code className="px-3 py-1 bg-white dark:bg-gray-800 rounded-lg text-sm font-mono border">
                          {meetingDetails.meetingCode}
                        </code>
                        <Button
                          onClick={() => copyToClipboard(meetingDetails.meetingCode!)}
                          size="sm"
                          variant="outline"
                          className="h-8 w-8 p-0"
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-blue-600" />
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        <strong>Start:</strong> {new Date(meetingDetails.startTime).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-blue-600" />
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        <strong>End:</strong> {new Date(meetingDetails.endTime).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-blue-600" />
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        <strong>Creator:</strong> {meetingDetails.creator}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Participants Overview */}
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Users className="h-5 w-5 text-green-600" />
                    <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
                      Participants ({meetingDetails.participants.length})
                    </h4>
                  </div>
                  
                  <div className="grid gap-3">
                    {meetingDetails.participants.map((participant, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center">
                            <User className="h-4 w-4 text-white" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">
                              {participant.displayName || participant.email}
                            </p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              {participant.email}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            participant.responseStatus === 'accepted' 
                              ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                              : participant.responseStatus === 'declined'
                              ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                              : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
                          }`}>
                            {participant.responseStatus}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Session Analytics */}
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <BarChart3 className="h-5 w-5 text-purple-600" />
                    <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
                      Session Analytics
                    </h4>
                  </div>
                  
                  <div className="space-y-4">
                    {meetingDetails.sessionAnalytics.map((session, index) => (
                      <div key={session.sessionId} className="border border-gray-200 dark:border-gray-600 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full flex items-center justify-center">
                              <UserCheck className="h-5 w-5 text-white" />
                            </div>
                            <div>
                              <p className="font-medium text-gray-900 dark:text-white">
                                {session.participant.displayName}
                              </p>
                              <p className="text-sm text-gray-500 dark:text-gray-400">
                                {session.participant.email}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              session.status === 'active'
                                ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                                : 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300'
                            }`}>
                              {session.status}
                            </span>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                          <div className="flex items-center gap-2">
                            <Timer className="h-4 w-4 text-green-600" />
                            <span className="text-gray-600 dark:text-gray-400">
                              <strong>Joined:</strong> {new Date(session.joinTime).toLocaleString()}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Timer className="h-4 w-4 text-red-600" />
                            <span className="text-gray-600 dark:text-gray-400">
                              <strong>Left:</strong> {new Date(session.leaveTime).toLocaleString()}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-blue-600" />
                            <span className="text-gray-600 dark:text-gray-400">
                              <strong>Duration:</strong> {session.durationFormatted}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500 dark:text-gray-400">No meeting details available</p>
              </div>
            )}
          </DialogContent>
        </Dialog>

      </section>
    </main>
  );
}


