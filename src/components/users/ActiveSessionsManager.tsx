import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/context/AuthContext';
import { sessionService, type Session } from '@/services/sessionService';
import { toast } from '@/hooks/use-toast';
import { useUndoDelete } from '@/hooks/useUndoDelete';
import { 
  Clock, 
  User, 
  Calendar, 
  Play, 
  Square, 
  Trash2,
  RefreshCw,
  Activity,
  Users,
  Timer,
  AlertCircle
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';

export function ActiveSessionsManager() {
  const { currentUser } = useAuth();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sessionToEnd, setSessionToEnd] = useState<string | null>(null);

  // Undo delete hook for force ending sessions
  const {
    isCountingDown,
    timeLeft,
    startCountdown,
    cancelCountdown,
    confirmDelete: confirmForceEnd,
  } = useUndoDelete({
    duration: 10,
    onConfirm: async () => {
      if (sessionToEnd) {
        try {
          await sessionService.forceEndSession(sessionToEnd);
          toast({
            title: 'Session Force Ended',
            description: 'The work session has been force ended.',
            variant: 'default',
          });
          fetchSessions();
        } catch (error) {
          console.error('Error force ending session:', error);
          toast({
            title: 'Force End Failed',
            description: 'Failed to force end the session. Please try again.',
            variant: 'destructive',
          });
        }
        setSessionToEnd(null);
      }
    },
    onUndo: () => {
      toast({
        title: 'Force End Cancelled',
        description: 'The session force end has been cancelled.',
        variant: 'default',
      });
      setSessionToEnd(null);
    },
  });

  const fetchSessions = async () => {
    try {
      setIsLoading(true);
      const data = await sessionService.getActiveSessions();
      setSessions(data);
    } catch (error) {
      console.error('Error fetching active sessions:', error);
      toast({
        title: "Error",
        description: "Failed to load active sessions.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleForceEndClick = (sessionId: string) => {
    setSessionToEnd(sessionId);
    startCountdown();
    toast({
      title: 'Session Force End Started',
      description: `Session will be force ended in ${timeLeft} seconds. Click "Undo" to cancel.`,
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

  const getActivityTypeColor = (type: string) => {
    switch (type) {
      case 'work': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
      case 'break': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
      case 'meeting': return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300';
      case 'other': return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300';
    }
  };

  const getActivityTypeIcon = (type: string) => {
    switch (type) {
      case 'work': return <Activity className="h-4 w-4" />;
      case 'break': return <Square className="h-4 w-4" />;
      case 'meeting': return <Users className="h-4 w-4" />;
      case 'other': return <Clock className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  useEffect(() => {
    fetchSessions();
    // Refresh every 30 seconds to keep data current
    const interval = setInterval(fetchSessions, 30000);
    return () => clearInterval(interval);
  }, []);

  // Check if user is admin
  if (currentUser?.role !== 'admin') {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-red-500" />
            Access Denied
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">You need admin privileges to view active sessions.</p>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-blue-500" />
            Active Work Sessions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-4 border-primary/20 border-t-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-blue-500" />
            Active Work Sessions
            <Badge variant="secondary" className="ml-2">
              {sessions.length} Active
            </Badge>
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchSessions}
            className="flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {sessions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No active work sessions</p>
            <p className="text-sm">All developers are currently offline</p>
          </div>
        ) : (
          <div className="space-y-4">
            {sessions.map((session) => {
              const currentDuration = sessionService.calculateCurrentDuration(session.session_start);
              const durationFormatted = sessionService.formatDuration(currentDuration);
              
              return (
                <div
                  key={session.id}
                  className="group relative overflow-hidden rounded-xl border border-gray-200/50 dark:border-gray-700/50 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm shadow-sm hover:shadow-lg transition-all duration-300 p-5"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                          <User className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                          <div className="font-semibold text-gray-900 dark:text-white">
                            {session.username}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {session.email}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          Started {formatDistanceToNow(new Date(session.session_start), { addSuffix: true })}
                        </div>
                        <div className="text-lg font-bold text-green-600 dark:text-green-400">
                          {durationFormatted}
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleForceEndClick(session.id)}
                        className="h-8 px-3 text-xs font-medium bg-white dark:bg-gray-800 border-red-200 dark:border-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 hover:border-red-300 dark:hover:border-red-700 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 transition-all duration-200 hover:shadow-md"
                      >
                        <Trash2 className="h-3 w-3 mr-1" />
                        Force End
                      </Button>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <Badge 
                        variant="secondary" 
                        className={`flex items-center gap-1 ${getActivityTypeColor(session.activity_type)}`}
                      >
                        {getActivityTypeIcon(session.activity_type)}
                        {session.activity_type.charAt(0).toUpperCase() + session.activity_type.slice(1)}
                      </Badge>
                      
                      {session.project_name && (
                        <Badge variant="outline" className="text-xs">
                          {session.project_name}
                        </Badge>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                      <Timer className="h-4 w-4" />
                      <span>Active for {durationFormatted}</span>
                    </div>
                  </div>
                  
                  {session.notes && (
                    <div className="mt-3 p-3 bg-gray-50/50 dark:bg-gray-700/30 rounded-lg">
                      <p className="text-sm text-gray-700 dark:text-gray-300">{session.notes}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
