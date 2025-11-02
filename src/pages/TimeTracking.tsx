import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import { Calendar, Clock, Play, Pause, Square, Download, BarChart3, TrendingUp } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { timeTrackingService, TimeSession } from '@/services/timeTrackingService';

export default function TimeTracking() {
  const { currentUser } = useAuth();
  const [currentSession, setCurrentSession] = useState<TimeSession | null>(null);
  const [sessionHistory, setSessionHistory] = useState<TimeSession[]>([]);
  const [loading, setLoading] = useState(false);
  const [sessionLoading, setSessionLoading] = useState(false);
  const [liveDuration, setLiveDuration] = useState(0);

  // Load current session and history
  useEffect(() => {
    loadCurrentSession();
    loadSessionHistory();
  }, []);

  // Update live timer
  useEffect(() => {
    if (!currentSession || !currentSession.is_active) return;
    
    const interval = setInterval(() => {
      const duration = timeTrackingService.calculateLiveDuration(currentSession);
      setLiveDuration(duration);
    }, 1000);
    
    return () => clearInterval(interval);
  }, [currentSession]);

  async function loadCurrentSession() {
    try {
      const session = await timeTrackingService.getCurrentSession();
      setCurrentSession(session);
      
      if (session) {
        const duration = timeTrackingService.calculateLiveDuration(session);
        setLiveDuration(duration);
      }
    } catch (error) {
      console.error('Failed to load current session:', error);
    }
  }

  async function loadSessionHistory() {
    try {
      setLoading(true);
      const from = new Date();
      from.setDate(from.getDate() - 30); // Last 30 days
      
      const sessions = await timeTrackingService.getSessionHistory({
        from: from.toISOString().slice(0, 10),
        to: new Date().toISOString().slice(0, 10),
        limit: 50
      });
      
      setSessionHistory(sessions);
    } catch (error) {
      console.error('Failed to load session history:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleCheckIn() {
    try {
      setSessionLoading(true);
      const result = await timeTrackingService.checkIn({
        submission_date: new Date().toISOString().slice(0, 10),
        session_notes: 'Work session'
      });
      
      await loadCurrentSession();
      const checkInTime = new Date(result.check_in_time).toLocaleTimeString('en-IN', { 
        hour: '2-digit', 
        minute: '2-digit', 
        second: '2-digit',
        hour12: true,
        timeZone: 'Asia/Kolkata'
      });
      toast({ title: 'Checked in successfully', description: `Started at ${checkInTime}` });
    } catch (error: any) {
      toast({ title: 'Failed to check in', description: error.message, variant: 'destructive' });
    } finally {
      setSessionLoading(false);
    }
  }

  async function handleCheckOut() {
    try {
      setSessionLoading(true);
      const result = await timeTrackingService.checkOut();
      
      await loadCurrentSession();
      await loadSessionHistory();
      toast({ title: 'Checked out successfully', description: `Worked for ${timeTrackingService.formatDuration(result.net_duration)}` });
    } catch (error: any) {
      toast({ title: 'Failed to check out', description: error.message, variant: 'destructive' });
    } finally {
      setSessionLoading(false);
    }
  }

  async function handlePause() {
    try {
      setSessionLoading(true);
      await timeTrackingService.pauseSession({ pause_reason: 'break' });
      await loadCurrentSession();
      toast({ title: 'Session paused' });
    } catch (error: any) {
      toast({ title: 'Failed to pause session', description: error.message, variant: 'destructive' });
    } finally {
      setSessionLoading(false);
    }
  }

  async function handleResume() {
    try {
      setSessionLoading(true);
      await timeTrackingService.resumeSession();
      await loadCurrentSession();
      toast({ title: 'Session resumed' });
    } catch (error: any) {
      toast({ title: 'Failed to resume session', description: error.message, variant: 'destructive' });
    } finally {
      setSessionLoading(false);
    }
  }

  // Calculate today's summary
  const todaySessions = sessionHistory.filter(s => s.submission_date === new Date().toISOString().slice(0, 10));
  const todayTotalHours = todaySessions.reduce((total, session) => total + (session.net_duration_seconds / 3600), 0);
  const todayOvertime = Math.max(0, todayTotalHours - 8);

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-background px-3 py-4 sm:px-6 sm:py-6 md:px-8 lg:px-10 lg:py-8">
      <section className="max-w-7xl mx-auto space-y-6 sm:space-y-8">
        {/* Header */}
        <div className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-50/50 via-transparent to-emerald-50/50 dark:from-blue-950/20 dark:via-transparent dark:to-emerald-950/20"></div>
          <div className="relative bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-6 sm:p-8">
            <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-6">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gradient-to-br from-blue-600 to-emerald-600 rounded-xl shadow-lg">
                    <Clock className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold bg-gradient-to-r from-gray-900 via-gray-800 to-gray-700 dark:from-white dark:via-gray-100 dark:to-gray-300 bg-clip-text text-transparent tracking-tight">
                      Time Tracking
                    </h1>
                    <div className="h-1 w-20 bg-gradient-to-r from-blue-600 to-emerald-600 rounded-full mt-2"></div>
                  </div>
                </div>
                <p className="text-gray-600 dark:text-gray-400 text-base lg:text-lg font-medium max-w-2xl">
                  Track your work hours with check-in/check-out and pause functionality
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Current Session Card */}
        <div className="relative overflow-hidden rounded-2xl shadow-lg border border-gray-200/40 dark:border-gray-700/40">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-600/5 via-emerald-600/3 to-purple-600/5 dark:from-blue-600/10 dark:via-emerald-600/5 dark:to-purple-600/10"></div>
          <div className="relative bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border border-gray-200/60 dark:border-gray-700/60 p-4 sm:p-6 md:p-8 lg:p-10">
            <div className="flex items-center gap-4 mb-8">
              <div className="p-3 bg-gradient-to-br from-blue-600 to-emerald-600 rounded-2xl shadow-lg ring-4 ring-blue-600/20">
                <Clock className="h-6 w-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Current Session</h2>
                <p className="text-gray-600 dark:text-gray-400 text-sm">Live time tracking</p>
              </div>
            </div>
            
            {currentSession ? (
              <div className="space-y-6">
                {/* Session Status */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${
                      currentSession.is_paused ? 'bg-yellow-500' :
                      currentSession.is_active ? 'bg-green-500' : 'bg-gray-500'
                    }`}></div>
                    <span className="text-lg font-semibold text-gray-900 dark:text-white">
                      {timeTrackingService.getSessionStatus(currentSession)}
                    </span>
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Started at {(() => {
                      // Backend stores time in IST format (YYYY-MM-DD HH:MM:SS)
                      // Parse it treating it as a local IST time string
                      const timeStr = currentSession.check_in_time;
                      const [datePart, timePart] = timeStr.split(' ');
                      const [year, month, day] = datePart.split('-');
                      const [hour, minute, second] = timePart.split(':');
                      // Create a date object in IST timezone
                      const istDate = new Date(`${year}-${month}-${day}T${timePart}+05:30`);
                      return istDate.toLocaleTimeString('en-IN', { 
                        hour: '2-digit', 
                        minute: '2-digit', 
                        second: '2-digit',
                        hour12: true,
                        timeZone: 'Asia/Kolkata'
                      });
                    })()}
                  </div>
                </div>

                {/* Live Timer */}
                <div className="text-center">
                  <div className="text-4xl sm:text-5xl font-bold text-gray-900 dark:text-white mb-2">
                    {timeTrackingService.formatDuration(liveDuration)}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {currentSession.is_paused ? 'Paused' : 'Active'} • Net working time
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 justify-center">
                  {currentSession.is_paused ? (
                    <Button
                      onClick={handleResume}
                      disabled={sessionLoading}
                      size="lg"
                      className="bg-green-600 hover:bg-green-700 text-white px-8"
                    >
                      <Play className="h-5 w-5 mr-2" />
                      Resume
                    </Button>
                  ) : (
                    <Button
                      onClick={handlePause}
                      disabled={sessionLoading}
                      size="lg"
                      className="bg-yellow-600 hover:bg-yellow-700 text-white px-8"
                    >
                      <Pause className="h-5 w-5 mr-2" />
                      Pause
                    </Button>
                  )}
                  
                  <Button
                    onClick={handleCheckOut}
                    disabled={sessionLoading}
                    size="lg"
                    variant="destructive"
                    className="px-8"
                  >
                    <Square className="h-5 w-5 mr-2" />
                    Check Out
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="text-6xl mb-4">⏰</div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">No Active Session</h3>
                <p className="text-gray-600 dark:text-gray-400 mb-6">Start tracking your work time</p>
                <Button
                  onClick={handleCheckIn}
                  disabled={sessionLoading}
                  size="lg"
                  className="bg-blue-600 hover:bg-blue-700 text-white px-8"
                >
                  <Play className="h-5 w-5 mr-2" />
                  Check In
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Today's Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="relative overflow-hidden rounded-2xl shadow-lg border border-gray-200/40 dark:border-gray-700/40">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-600/5 to-blue-600/5 dark:from-emerald-600/10 dark:to-blue-600/10"></div>
            <div className="relative bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border border-gray-200/60 dark:border-gray-700/60 p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-emerald-600 rounded-lg">
                  <Clock className="h-5 w-5 text-white" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Today</h3>
              </div>
              <div className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">
                {todayTotalHours.toFixed(1)}h
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {todaySessions.length} session{todaySessions.length !== 1 ? 's' : ''}
              </div>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-2xl shadow-lg border border-gray-200/40 dark:border-gray-700/40">
            <div className="absolute inset-0 bg-gradient-to-br from-orange-600/5 to-red-600/5 dark:from-orange-600/10 dark:to-red-600/10"></div>
            <div className="relative bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border border-gray-200/60 dark:border-gray-700/60 p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-orange-600 rounded-lg">
                  <TrendingUp className="h-5 w-5 text-white" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Overtime</h3>
              </div>
              <div className="text-3xl font-bold text-orange-600 dark:text-orange-400">
                {todayOvertime.toFixed(1)}h
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {todayOvertime > 0 ? 'Extra hours worked' : 'Within regular hours'}
              </div>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-2xl shadow-lg border border-gray-200/40 dark:border-gray-700/40">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-600/5 to-blue-600/5 dark:from-purple-600/10 dark:to-blue-600/10"></div>
            <div className="relative bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border border-gray-200/60 dark:border-gray-700/60 p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-purple-600 rounded-lg">
                  <BarChart3 className="h-5 w-5 text-white" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">This Week</h3>
              </div>
              <div className="text-3xl font-bold text-purple-600 dark:text-purple-400">
                {sessionHistory.filter(s => {
                  const sessionDate = new Date(s.submission_date);
                  const weekStart = new Date();
                  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
                  return sessionDate >= weekStart;
                }).reduce((total, session) => total + (session.net_duration_seconds / 3600), 0).toFixed(1)}h
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Weekly total
              </div>
            </div>
          </div>
        </div>

        {/* Session History */}
        <div className="relative overflow-hidden rounded-2xl shadow-lg border border-gray-200/40 dark:border-gray-700/40">
          <div className="absolute inset-0 bg-gradient-to-br from-gray-600/5 via-blue-600/3 to-emerald-600/5 dark:from-gray-600/10 dark:via-blue-600/5 dark:to-emerald-600/10"></div>
          <div className="relative bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border border-gray-200/60 dark:border-gray-700/60 p-4 sm:p-6 md:p-8 lg:p-10">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-gradient-to-br from-gray-600 to-blue-600 rounded-2xl shadow-lg ring-4 ring-gray-600/20">
                  <Calendar className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Session History</h2>
                  <p className="text-gray-600 dark:text-gray-400 text-sm">Last 30 days</p>
                </div>
              </div>
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
            
            {loading ? (
              <div className="space-y-4">
                <div className="h-16 bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse"></div>
                <div className="h-16 bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse"></div>
                <div className="h-16 bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse"></div>
              </div>
            ) : sessionHistory.length === 0 ? (
              <div className="text-center py-8">
                <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-500 dark:text-gray-400">No sessions found</p>
              </div>
            ) : (
              <div className="space-y-4">
                {sessionHistory.map((session) => (
                  <div key={session.id} className="bg-white/60 dark:bg-gray-800/60 border border-gray-200/60 dark:border-gray-700/60 rounded-xl p-4 hover:shadow-lg hover:border-gray-300 dark:hover:border-gray-600 transition-all duration-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-semibold text-gray-900 dark:text-white">
                          {new Date(session.submission_date).toLocaleDateString('en-US', { 
                            weekday: 'long', 
                            year: 'numeric', 
                            month: 'long', 
                            day: 'numeric' 
                          })}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          {session.check_in_time ? new Date(session.check_in_time).toLocaleTimeString('en-IN', { 
                            hour: '2-digit', 
                            minute: '2-digit', 
                            second: '2-digit',
                            hour12: true,
                            timeZone: 'Asia/Kolkata'
                          }) : 'N/A'} - 
                          {session.check_out_time ? new Date(session.check_out_time).toLocaleTimeString('en-IN', { 
                            hour: '2-digit', 
                            minute: '2-digit', 
                            second: '2-digit',
                            hour12: true,
                            timeZone: 'Asia/Kolkata'
                          }) : 'Active'}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-gray-900 dark:text-white">
                          {timeTrackingService.formatDuration(session.net_duration_seconds)}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          {session.is_active ? 'Active' : 'Completed'}
                        </div>
                      </div>
                    </div>
                    {session.pauses && session.pauses.length > 0 && (
                      <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                        {session.pauses.length} pause{session.pauses.length !== 1 ? 's' : ''} taken
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
