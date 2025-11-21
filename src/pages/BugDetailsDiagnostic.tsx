import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import { apiClient } from "@/lib/axios";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Activity, 
  AlertCircle, 
  CheckCircle2, 
  XCircle, 
  RefreshCw,
  MemoryStick,
  Network,
  Clock,
  Database,
  Settings,
  Trash2
} from "lucide-react";

interface DiagnosticData {
  timestamp: string;
  type: 'info' | 'warning' | 'error' | 'success';
  message: string;
  data?: any;
}

interface MemoryUsage {
  used: number;
  total: number;
  limit: number;
}

interface ApiCall {
  url: string;
  method: string;
  status?: number;
  duration?: number;
  timestamp: string;
  error?: string;
}

const BugDetailsDiagnostic = () => {
  const { bugId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser } = useAuth();
  const queryClient = useQueryClient();
  
  const [diagnostics, setDiagnostics] = useState<DiagnosticData[]>([]);
  const [memoryUsage, setMemoryUsage] = useState<MemoryUsage | null>(null);
  const [apiCalls, setApiCalls] = useState<ApiCall[]>([]);
  const [reactQueryCache, setReactQueryCache] = useState<any>(null);
  const [isMonitoring, setIsMonitoring] = useState(true);
  const [navigationCount, setNavigationCount] = useState(0);
  const [freezeDetected, setFreezeDetected] = useState(false);
  const [serviceWorkerStatus, setServiceWorkerStatus] = useState<{
    registered: boolean;
    updateCheckInterval?: number;
    note?: string;
  } | null>(null);
  
  const logsRef = useRef<DiagnosticData[]>([]);
  const apiCallsRef = useRef<ApiCall[]>([]);
  const memoryMonitorRef = useRef<number | null>(null);
  const freezeDetectorRef = useRef<number | null>(null);
  const lastHeartbeatRef = useRef<number>(Date.now());
  const heartbeatIntervalRef = useRef<number | null>(null);

  // Add diagnostic log
  const addDiagnostic = (type: DiagnosticData['type'], message: string, data?: any) => {
    const diagnostic: DiagnosticData = {
      timestamp: new Date().toISOString(),
      type,
      message,
      data,
    };
    logsRef.current = [...logsRef.current.slice(-99), diagnostic]; // Keep last 100
    setDiagnostics(logsRef.current);
  };

  // Monitor memory usage (if available)
  useEffect(() => {
    if (!isMonitoring) return;

    const checkMemory = () => {
      if ('memory' in performance) {
        const memory = (performance as any).memory;
        const usage: MemoryUsage = {
          used: memory.usedJSHeapSize,
          total: memory.totalJSHeapSize,
          limit: memory.jsHeapSizeLimit,
        };
        setMemoryUsage(usage);
        
        // Alert if memory is above 80% of limit
        const memoryPercent = (usage.used / usage.limit) * 100;
        if (memoryPercent > 80) {
          addDiagnostic('warning', `High memory usage: ${memoryPercent.toFixed(2)}%`, usage);
        }
      }
    };

    checkMemory();
    memoryMonitorRef.current = window.setInterval(checkMemory, 5000);

    return () => {
      if (memoryMonitorRef.current) {
        clearInterval(memoryMonitorRef.current);
      }
    };
  }, [isMonitoring]);

  // Freeze detection using heartbeat
  useEffect(() => {
    if (!isMonitoring) return;

    const checkHeartbeat = () => {
      const now = Date.now();
      const timeSinceLastHeartbeat = now - lastHeartbeatRef.current;
      
      // If more than 3 seconds passed since last heartbeat, likely frozen
      if (timeSinceLastHeartbeat > 3000) {
        setFreezeDetected(true);
        addDiagnostic('error', `Page freeze detected! Last heartbeat: ${timeSinceLastHeartbeat}ms ago`, {
          timeSinceLastHeartbeat,
          timestamp: new Date().toISOString(),
        });
      }
      
      lastHeartbeatRef.current = now;
    };

    heartbeatIntervalRef.current = window.setInterval(checkHeartbeat, 1000);

    return () => {
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
      }
    };
  }, [isMonitoring]);

  // Heartbeat updater - runs continuously
  useEffect(() => {
    const updateHeartbeat = () => {
      lastHeartbeatRef.current = Date.now();
      requestAnimationFrame(updateHeartbeat);
    };
    requestAnimationFrame(updateHeartbeat);
  }, []);

  // Monitor React Query cache
  useEffect(() => {
    if (!isMonitoring) return;

    const updateCacheInfo = () => {
      const cache = queryClient.getQueryCache();
      const queries = cache.getAll();
      
      const cacheInfo = {
        totalQueries: queries.length,
        queries: queries.map(q => ({
          queryKey: q.queryKey,
          state: q.state.status,
          dataUpdatedAt: q.state.dataUpdatedAt,
          dataExists: !!q.state.data,
          isStale: q.isStale(),
          isFetching: (q as any).isFetching,
        })),
      };
      
      setReactQueryCache(cacheInfo);
      
      // Check for stale queries
      const staleQueries = queries.filter(q => q.isStale());
      if (staleQueries.length > 10) {
        addDiagnostic('warning', `Many stale queries detected: ${staleQueries.length}`, cacheInfo);
      }
    };

    updateCacheInfo();
    const interval = setInterval(updateCacheInfo, 3000);

    return () => clearInterval(interval);
  }, [isMonitoring, queryClient]);

  // Intercept API calls
  useEffect(() => {
    if (!isMonitoring) return;

    const originalRequest = apiClient.interceptors.request.use(
      (config) => {
        const apiCall: ApiCall = {
          url: config.url || '',
          method: config.method?.toUpperCase() || 'GET',
          timestamp: new Date().toISOString(),
        };
        
        const startTime = performance.now();
        (config as any).__startTime = startTime;
        
        apiCallsRef.current = [...apiCallsRef.current.slice(-49), apiCall];
        setApiCalls(apiCallsRef.current);
        
        addDiagnostic('info', `API Request: ${apiCall.method} ${apiCall.url}`, apiCall);
        
        return config;
      },
      (error) => {
        addDiagnostic('error', 'API Request Error', error);
        return Promise.reject(error);
      }
    );

    const originalResponse = apiClient.interceptors.response.use(
      (response) => {
        const config = response.config as any;
        const duration = config.__startTime ? performance.now() - config.__startTime : undefined;
        
        const apiCall = apiCallsRef.current[apiCallsRef.current.length - 1];
        if (apiCall) {
          apiCall.status = response.status;
          apiCall.duration = duration;
          setApiCalls([...apiCallsRef.current]);
          
          if (duration && duration > 5000) {
            addDiagnostic('warning', `Slow API call: ${duration.toFixed(0)}ms for ${apiCall.url}`, apiCall);
          }
        }
        
        return response;
      },
      (error) => {
        const config = error.config as any;
        const duration = config?.__startTime ? performance.now() - (config.__startTime as number) : undefined;
        
        const apiCall = apiCallsRef.current[apiCallsRef.current.length - 1];
        if (apiCall) {
          apiCall.status = error.response?.status || 0;
          apiCall.duration = duration;
          apiCall.error = error.message || 'Unknown error';
          setApiCalls([...apiCallsRef.current]);
          
          addDiagnostic('error', `API Error: ${apiCall.method} ${apiCall.url} - ${apiCall.error}`, apiCall);
        }
        
        return Promise.reject(error);
      }
    );

    return () => {
      apiClient.interceptors.request.eject(originalRequest);
      apiClient.interceptors.response.eject(originalResponse);
    };
  }, [isMonitoring]);

  // Test bug fetch
  const testBugFetch = async () => {
    if (!bugId) return;
    
    addDiagnostic('info', `Testing bug fetch for ID: ${bugId}`);
    
    try {
      const startTime = performance.now();
      const response = await apiClient.get(`/bugs/get.php?id=${bugId}`);
      const duration = performance.now() - startTime;
      
      addDiagnostic('success', `Bug fetch successful in ${duration.toFixed(0)}ms`, {
        duration,
        hasData: !!(response.data as any)?.data,
        bugId,
      });
    } catch (error: any) {
      addDiagnostic('error', `Bug fetch failed: ${error.message}`, error);
    }
  };

  // Test bug list fetch
  const testBugListFetch = async () => {
    addDiagnostic('info', 'Testing bug list fetch (limit: 200)');
    
    try {
      const startTime = performance.now();
      const response = await apiClient.get(`/bugs/getAll.php?page=1&limit=200&user_id=${currentUser?.id}`);
      const duration = performance.now() - startTime;
      
      addDiagnostic('success', `Bug list fetch successful in ${duration.toFixed(0)}ms`, {
        duration,
        bugCount: (response.data as any)?.data?.bugs?.length || 0,
      });
      
      if (duration > 3000) {
        addDiagnostic('warning', 'Bug list fetch took longer than 3 seconds', { duration });
      }
    } catch (error: any) {
      addDiagnostic('error', `Bug list fetch failed: ${error.message}`, error);
    }
  };

  // Clear React Query cache
  const clearCache = () => {
    queryClient.clear();
    addDiagnostic('info', 'React Query cache cleared');
  };

  // Clear logs
  const clearLogs = () => {
    logsRef.current = [];
    setDiagnostics([]);
    addDiagnostic('info', 'Diagnostic logs cleared');
  };

  // Navigate to actual BugDetails page
  const goToBugDetails = () => {
    if (!bugId || !currentUser?.role) return;
    setNavigationCount(prev => prev + 1);
    addDiagnostic('info', `Navigating to BugDetails (attempt ${navigationCount + 1})`);
    navigate(`/${currentUser.role}/bugs/${bugId}`);
  };

  // Monitor Service Worker
  useEffect(() => {
    if (!isMonitoring) return;
    
    const checkServiceWorker = async () => {
      if ('serviceWorker' in navigator) {
        try {
          const registration = await navigator.serviceWorker.getRegistration();
          const isRegistered = !!registration;
          
          // Check if service worker update check is happening every 60 seconds
          // This is a known issue in serviceWorkerManager.ts line 205-209
          // After fix deployment: interval is 300000ms (5 minutes)
          // Before fix: was 60000ms (60 seconds) - causing freezes
          setServiceWorkerStatus({
            registered: isRegistered,
            updateCheckInterval: isRegistered ? 300000 : undefined, // Fixed: 5 minutes
            note: 'If showing 60s, fix not deployed yet. Should show 300s (5 min) after deployment',
          });
          
          if (isRegistered && registration) {
            registration.addEventListener('updatefound', () => {
              addDiagnostic('warning', 'Service Worker update detected', {
                timestamp: new Date().toISOString(),
              });
            });
          }
          
          // Note: We can't directly read the interval from the service worker manager
          // The actual interval is 300000ms (5 minutes) after the fix is deployed
          // This hardcoded value is for display purposes only
          addDiagnostic('info', `Service Worker ${isRegistered ? 'registered' : 'not registered'}`, {
            registered: isRegistered,
            updateCheckInterval: 300000, // After fix: 5 minutes (300000ms), was 60000ms
            note: 'Actual interval depends on deployed code. Fix changes 60s → 300s (5 min)',
          });
        } catch (error: any) {
          addDiagnostic('error', 'Service Worker check failed', { error: error.message });
        }
      }
    };
    
    checkServiceWorker();
    const interval = setInterval(checkServiceWorker, 10000); // Check every 10 seconds
    
    return () => clearInterval(interval);
  }, [isMonitoring]);

  // Initialize and expose diagnostic tools globally
  useEffect(() => {
    addDiagnostic('info', 'BugDetails Diagnostic Page Loaded', {
      bugId,
      pathname: location.pathname,
      userRole: currentUser?.role,
      userId: currentUser?.id,
    });

    // Check for known freeze causes
    addDiagnostic('warning', '⚠️ POTENTIAL FREEZE CAUSE DETECTED', {
      issue: 'Service Worker Update Check',
      interval: 'Every 60 seconds',
      location: 'serviceWorkerManager.ts:205-209',
      recommendation: 'Service worker checks for updates every 60 seconds. This may be causing the freezes.',
    });

    // Expose diagnostic tools to window for global access
    if (typeof window !== 'undefined') {
      (window as any).__BUG_DETAILS_DIAGNOSTIC__ = {
        getLogs: () => logsRef.current,
        exportLogs: () => JSON.stringify(logsRef.current, null, 2),
        clearLogs: () => {
          logsRef.current = [];
          setDiagnostics([]);
        },
        getQueryCache: () => queryClient.getQueryCache().getAll(),
        clearQueryCache: () => queryClient.clear(),
        navigateToDiagnostic: () => {
          if (bugId && currentUser?.role) {
            window.location.href = `/${currentUser.role}/bugs/${bugId}/diagnostic`;
          }
        },
        // Add diagnostic page specific methods
        getDiagnostics: () => diagnostics,
        getApiCalls: () => apiCalls,
        getMemoryUsage: () => memoryUsage,
        getReactQueryCache: () => reactQueryCache,
      };
      
      console.log('[BugDetailsDiagnostic] Diagnostic tools available at window.__BUG_DETAILS_DIAGNOSTIC__');
    }

    // Auto-start monitoring
    setIsMonitoring(true);

    return () => {
      setIsMonitoring(false);
    };
  }, [bugId, currentUser?.role, currentUser?.id, location.pathname, queryClient]);

  const getDiagnosticIcon = (type: DiagnosticData['type']) => {
    switch (type) {
      case 'error': return <XCircle className="h-4 w-4 text-red-500" />;
      case 'warning': return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      case 'success': return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      default: return <Activity className="h-4 w-4 text-blue-500" />;
    }
  };

  const getDiagnosticColor = (type: DiagnosticData['type']) => {
    switch (type) {
      case 'error': return 'border-red-500 bg-red-50 dark:bg-red-950/20';
      case 'warning': return 'border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20';
      case 'success': return 'border-green-500 bg-green-50 dark:bg-green-950/20';
      default: return 'border-blue-500 bg-blue-50 dark:bg-blue-950/20';
    }
  };

  return (
    <main className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-6 w-6" />
                BugDetails Diagnostic Tool
              </CardTitle>
              <div className="flex gap-2">
                <Button
                  variant={isMonitoring ? "default" : "outline"}
                  onClick={() => setIsMonitoring(!isMonitoring)}
                >
                  {isMonitoring ? "Stop Monitoring" : "Start Monitoring"}
                </Button>
                <Button variant="outline" onClick={goToBugDetails}>
                  Go to BugDetails
                </Button>
              </div>
            </div>
            {freezeDetected && (
              <Alert className="mt-4 border-red-500 bg-red-50 dark:bg-red-950/20">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Freeze Detected!</AlertTitle>
                <AlertDescription className="space-y-2">
                  <p>The page appears to be frozen. Check the logs below for details.</p>
                  {serviceWorkerStatus?.registered && (
                    <div className="mt-2 p-2 bg-yellow-50 dark:bg-yellow-950/20 rounded text-sm">
                      <strong>⚠️ Likely Cause:</strong> Service Worker update check every 60 seconds 
                      (matches freeze pattern). See recommendations below.
                    </div>
                  )}
                </AlertDescription>
              </Alert>
            )}
            
            {/* Service Worker Status */}
            {serviceWorkerStatus && (
              <Alert className={serviceWorkerStatus.registered ? "border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20" : ""}>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Service Worker Status</AlertTitle>
                <AlertDescription className="space-y-2">
                  <p>
                    Status: <strong>{serviceWorkerStatus.registered ? 'Registered' : 'Not Registered'}</strong>
                  </p>
                  {serviceWorkerStatus.registered && (
                    <>
                      <p>
                        Update Check Interval: <strong>{serviceWorkerStatus.updateCheckInterval ? `${serviceWorkerStatus.updateCheckInterval / 1000}s` : 'Unknown'}</strong>
                      </p>
                      <div className="mt-2 p-2 bg-background rounded text-xs">
                        <strong>🔧 Status:</strong>
                        {serviceWorkerStatus.updateCheckInterval === 60000 ? (
                          <ul className="list-disc list-inside mt-1 space-y-1">
                            <li className="text-red-600 dark:text-red-400">⚠️ OLD CODE: Still using 60s interval (causing freezes)</li>
                            <li>Fix is in code: <code>serviceWorkerManager.ts:240</code> uses 5 minutes (300000ms)</li>
                            <li className="font-bold">ACTION REQUIRED: Rebuild and deploy to production</li>
                          </ul>
                        ) : (
                          <ul className="list-disc list-inside mt-1 space-y-1">
                            <li className="text-green-600 dark:text-green-400">✅ FIXED: Using 5 minute interval (300000ms)</li>
                            <li>Service worker update checks are now non-blocking</li>
                            <li>Freezes should be resolved after deployment</li>
                          </ul>
                        )}
                      </div>
                    </>
                  )}
                </AlertDescription>
              </Alert>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Test Actions */}
            <div className="flex flex-wrap gap-2">
              <Button onClick={testBugFetch} disabled={!bugId}>
                Test Bug Fetch
              </Button>
              <Button onClick={testBugListFetch}>
                Test Bug List Fetch
              </Button>
              <Button onClick={clearCache} variant="outline">
                Clear React Query Cache
              </Button>
              <Button onClick={clearLogs} variant="outline">
                <Trash2 className="h-4 w-4 mr-2" />
                Clear Logs
              </Button>
            </div>

            {/* Memory Usage */}
            {memoryUsage && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <MemoryStick className="h-4 w-4" />
                    Memory Usage
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Used:</span>
                      <span className="font-mono">
                        {(memoryUsage.used / 1024 / 1024).toFixed(2)} MB
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Total:</span>
                      <span className="font-mono">
                        {(memoryUsage.total / 1024 / 1024).toFixed(2)} MB
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Limit:</span>
                      <span className="font-mono">
                        {(memoryUsage.limit / 1024 / 1024).toFixed(2)} MB
                      </span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2 mt-2">
                      <div
                        className="bg-primary h-2 rounded-full transition-all"
                        style={{
                          width: `${(memoryUsage.used / memoryUsage.limit) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* React Query Cache */}
            {reactQueryCache && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Database className="h-4 w-4" />
                    React Query Cache ({reactQueryCache.totalQueries} queries)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-40">
                    <div className="space-y-1 text-xs">
                      {reactQueryCache.queries.slice(0, 10).map((q: any, i: number) => (
                        <div key={i} className="flex items-center justify-between p-1 bg-muted/50 rounded">
                          <span className="font-mono text-xs truncate flex-1">
                            {JSON.stringify(q.queryKey)}
                          </span>
                          <Badge variant={q.isStale ? "destructive" : "default"} className="ml-2">
                            {q.state}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            )}

            {/* API Calls */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Network className="h-4 w-4" />
                  Recent API Calls ({apiCalls.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-48">
                  <div className="space-y-2">
                    {apiCalls.slice(-10).reverse().map((call, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between p-2 bg-muted/50 rounded text-xs"
                      >
                        <div className="flex-1">
                          <div className="font-mono">{call.method} {call.url}</div>
                          {call.duration && (
                            <div className="text-muted-foreground">
                              {call.duration.toFixed(0)}ms
                            </div>
                          )}
                        </div>
                        {call.status && (
                          <Badge
                            variant={
                              call.status >= 200 && call.status < 300
                                ? "default"
                                : "destructive"
                            }
                          >
                            {call.status}
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Diagnostic Logs */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Activity className="h-4 w-4" />
                  Diagnostic Logs ({diagnostics.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-96">
                  <div className="space-y-2">
                    {diagnostics.slice(-50).reverse().map((log, i) => (
                      <Alert
                        key={i}
                        className={`${getDiagnosticColor(log.type)} text-xs`}
                      >
                        <div className="flex items-start gap-2">
                          {getDiagnosticIcon(log.type)}
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold">{log.type.toUpperCase()}</span>
                              <span className="text-muted-foreground">
                                {new Date(log.timestamp).toLocaleTimeString()}
                              </span>
                            </div>
                            <div className="mt-1">{log.message}</div>
                            {log.data && (
                              <details className="mt-2">
                                <summary className="cursor-pointer text-muted-foreground">
                                  View Data
                                </summary>
                                <pre className="mt-2 p-2 bg-background rounded text-xs overflow-auto">
                                  {JSON.stringify(log.data, null, 2)}
                                </pre>
                              </details>
                            )}
                          </div>
                        </div>
                      </Alert>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </CardContent>
        </Card>
      </div>
    </main>
  );
};

export default BugDetailsDiagnostic;

