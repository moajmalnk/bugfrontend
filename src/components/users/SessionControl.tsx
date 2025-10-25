import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/context/AuthContext';
import { sessionService, type Session } from '@/services/sessionService';
import { toast } from '@/hooks/use-toast';
import { 
  Play, 
  Square, 
  Clock, 
  Activity,
  Timer,
  Calendar,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';

export function SessionControl() {
  const { currentUser } = useAuth();
  const [activeSession, setActiveSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [currentDuration, setCurrentDuration] = useState(0);

  const fetchActiveSession = async () => {
    try {
      const sessions = await sessionService.getActiveSessions();
      const userSession = sessions.find(s => s.user_id === currentUser?.id);
      setActiveSession(userSession || null);
    } catch (error) {
      console.error('Error fetching active session:', error);
    }
  };

  const startSession = async () => {
    try {
      setIsLoading(true);
      const result = await sessionService.startSession({
        activity_type: 'work',
        notes: 'Work session started'
      });
      
      toast({
        title: 'Session Started',
        description: `Work session started at ${result.start_time}`,
        variant: 'default',
      });
      
      // Refresh session data
      await fetchActiveSession();
    } catch (error) {
      console.error('Error starting session:', error);
      toast({
        title: 'Start Failed',
        description: 'Failed to start work session. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const endSession = async () => {
    try {
      setIsLoading(true);
      const result = await sessionService.endSession();
      
      toast({
        title: 'Session Ended',
        description: `Work session ended. Duration: ${result.duration_hours.toFixed(1)} hours`,
        variant: 'default',
      });
      
      // Refresh session data
      await fetchActiveSession();
    } catch (error) {
      console.error('Error ending session:', error);
      toast({
        title: 'End Failed',
        description: 'Failed to end work session. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Update current duration every minute
  useEffect(() => {
    if (activeSession) {
      const updateDuration = () => {
        const duration = sessionService.calculateCurrentDuration(activeSession.session_start);
        setCurrentDuration(duration);
      };
      
      updateDuration();
      const interval = setInterval(updateDuration, 60000); // Update every minute
      return () => clearInterval(interval);
    }
  }, [activeSession]);

  useEffect(() => {
    fetchActiveSession();
  }, []);

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  const getSessionStatusColor = () => {
    if (activeSession) {
      return 'text-green-600 dark:text-green-400';
    }
    return 'text-gray-600 dark:text-gray-400';
  };

  const getSessionStatusIcon = () => {
    if (activeSession) {
      return <CheckCircle className="h-5 w-5 text-green-500" />;
    }
    return <AlertCircle className="h-5 w-5 text-gray-500" />;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-blue-500" />
          Work Session Control
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Session Status */}
        <div className="flex items-center justify-between p-4 bg-gray-50/50 dark:bg-gray-800/50 rounded-lg">
          <div className="flex items-center gap-3">
            {getSessionStatusIcon()}
            <div>
              <div className={`font-semibold ${getSessionStatusColor()}`}>
                {activeSession ? 'Session Active' : 'No Active Session'}
              </div>
              {activeSession && (
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  Started {formatDistanceToNow(new Date(activeSession.session_start), { addSuffix: true })}
                </div>
              )}
            </div>
          </div>
          
          {activeSession && (
            <div className="text-right">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                {formatDuration(currentDuration)}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                Current Duration
              </div>
            </div>
          )}
        </div>

        {/* Session Controls */}
        <div className="flex gap-3">
          {!activeSession ? (
            <Button
              onClick={startSession}
              disabled={isLoading}
              className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white"
            >
              <Play className="h-4 w-4" />
              {isLoading ? 'Starting...' : 'Start Session'}
            </Button>
          ) : (
            <Button
              onClick={endSession}
              disabled={isLoading}
              variant="destructive"
              className="flex items-center gap-2"
            >
              <Square className="h-4 w-4" />
              {isLoading ? 'Ending...' : 'End Session'}
            </Button>
          )}
        </div>

        {/* Session Details */}
        {activeSession && (
          <div className="space-y-3 p-4 bg-blue-50/50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <span className="text-sm font-medium text-blue-800 dark:text-blue-200">
                Session Details
              </span>
            </div>
            
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600 dark:text-gray-400">Start Time:</span>
                <div className="font-medium">
                  {format(new Date(activeSession.session_start), 'MMM dd, yyyy HH:mm')}
                </div>
              </div>
              
              <div>
                <span className="text-gray-600 dark:text-gray-400">Activity Type:</span>
                <div>
                  <Badge variant="secondary" className="ml-1">
                    {activeSession.activity_type.charAt(0).toUpperCase() + activeSession.activity_type.slice(1)}
                  </Badge>
                </div>
              </div>
              
              {activeSession.project_name && (
                <div className="col-span-2">
                  <span className="text-gray-600 dark:text-gray-400">Project:</span>
                  <div className="font-medium">{activeSession.project_name}</div>
                </div>
              )}
              
              {activeSession.notes && (
                <div className="col-span-2">
                  <span className="text-gray-600 dark:text-gray-400">Notes:</span>
                  <div className="font-medium">{activeSession.notes}</div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Help Text */}
        <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
          <p>• Start a session when you begin working</p>
          <p>• End the session when you finish or take a break</p>
          <p>• Sessions are automatically tracked for your active hours</p>
        </div>
      </CardContent>
    </Card>
  );
}
