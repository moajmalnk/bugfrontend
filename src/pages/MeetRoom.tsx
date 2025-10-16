import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { joinMeeting, leaveMeeting } from "@/services/meetings";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { WS_URL } from "@/lib/env";
import { useAuth } from "@/context/AuthContext";
import { 
  Video, 
  VideoOff, 
  Mic, 
  MicOff, 
  Phone, 
  PhoneOff, 
  Users, 
  Settings,
  Copy,
  Check,
  AlertCircle,
  Loader2,
  Wifi,
  WifiOff,
  Monitor,
  MonitorOff,
  Maximize,
  Minimize,
  Square,
  Circle,
  Volume2,
  VolumeX,
  Camera,
  CameraOff,
  MoreVertical,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  MessageSquareOff,
  Hand,  
  Share,
  Download,
  Upload,
  Grid,
  Grid3X3,
  Layout,
  LayoutGrid,
  Eye,
  EyeOff,
  Pin,
  PinOff,
  Volume1,
  Volume2 as Volume2Icon,
  Headphones,
  HeadphoneOff as HeadphonesOff,
  Shield,
  ShieldCheck,
  Lock,
  Unlock,
  Clock,
  Timer,
  Zap,
  ZapOff,
  Star,
  StarOff
} from "lucide-react";
import { toast } from "sonner";

interface PeerConnection {
  pc: RTCPeerConnection;
  stream?: MediaStream;
  isConnected: boolean;
}

export default function MeetRoom() {
  const { code } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [peers, setPeers] = useState<Record<string, PeerConnection>>({});
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [participantCount, setParticipantCount] = useState(1);
  const [copied, setCopied] = useState(false);
  const [connectionQuality, setConnectionQuality] = useState<'good' | 'poor' | 'unknown'>('unknown');
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [selectedVideoDevice, setSelectedVideoDevice] = useState<string>('');
  const [selectedAudioDevice, setSelectedAudioDevice] = useState<string>('');
  const [availableDevices, setAvailableDevices] = useState<MediaDeviceInfo[]>([]);
  const [showDeviceSettings, setShowDeviceSettings] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [showSaveRecording, setShowSaveRecording] = useState(false);
  const [recordingUrl, setRecordingUrl] = useState<string>('');
  const [recordingSize, setRecordingSize] = useState<number>(0);
  
  // Enhanced Google Meet-like features
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<Array<{id: string, user: string, message: string, timestamp: Date}>>([]);
  const [newMessage, setNewMessage] = useState('');
  const [raisedHands, setRaisedHands] = useState<Set<string>>(new Set());
  const [isHandRaised, setIsHandRaised] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'speaker' | 'spotlight'>('grid');
  const [pinnedParticipant, setPinnedParticipant] = useState<string | null>(null);
  const [isMeetingLocked, setIsMeetingLocked] = useState(false);
  const [meetingTimer, setMeetingTimer] = useState(0);
  const [isNoiseSuppression, setIsNoiseSuppression] = useState(true);
  const [isEchoCancellation, setIsEchoCancellation] = useState(true);
  const [isAutoGainControl, setIsAutoGainControl] = useState(true);
  const [isHDVideo, setIsHDVideo] = useState(true);
  const [participantNames, setParticipantNames] = useState<Record<string, string>>({});
  const [showParticipants, setShowParticipants] = useState(false);
  const [meetingStartTime] = useState(new Date());

  // Function to get participant display name
  const getParticipantName = useCallback((peerId: string) => {
    // Check if we have a stored name for this participant
    if (participantNames[peerId]) {
      return participantNames[peerId];
    }
    
    // For now, use the current user's name if available, otherwise fall back to generic name
    if (currentUser?.name || currentUser?.username) {
      return currentUser.name || currentUser.username;
    }
    
    // Fallback to generic participant name
    return `Participant ${peerId.slice(-4)}`;
  }, [participantNames, currentUser]);
  
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRefs = useRef<Record<string, HTMLVideoElement>>({});
  const isInitialized = useRef(false);
  const peersRef = useRef<Record<string, PeerConnection>>({});
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const recordingRef = useRef<MediaRecorder | null>(null);
  const recordingChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isPlayingRef = useRef(false);
  const playPromiseRef = useRef<Promise<void> | null>(null);
  const chatMessagesEndRef = useRef<HTMLDivElement>(null);
  const meetingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const performanceMonitorRef = useRef<{ [key: string]: number }>({});

  const wsUrl = useMemo(() => {
    return WS_URL;
  }, []);

  // Professional performance monitoring
  const monitorPerformance = useCallback((operation: string) => {
    const now = Date.now();
    const lastTime = performanceMonitorRef.current[operation];
    
    if (lastTime && now - lastTime < 100) { // Less than 100ms between operations
      console.warn(`⚠️ Performance issue detected: ${operation} called too frequently (${now - lastTime}ms)`);
    }
    
    performanceMonitorRef.current[operation] = now;
  }, []);

  // Debug video element state
  const debugVideoElement = useCallback((videoElement: HTMLVideoElement, context: string) => {
    console.log(`[${context}] Video element debug:`, {
      readyState: videoElement.readyState,
      networkState: videoElement.networkState,
      paused: videoElement.paused,
      ended: videoElement.ended,
      muted: videoElement.muted,
      autoplay: videoElement.autoplay,
      srcObject: !!videoElement.srcObject,
      videoWidth: videoElement.videoWidth,
      videoHeight: videoElement.videoHeight,
      currentTime: videoElement.currentTime,
      duration: videoElement.duration
    });
  }, []);

  // Google Meet-style video play function with enhanced debugging
  const safePlayVideo = useCallback(async (videoElement: HTMLVideoElement) => {
    console.log('=== safePlayVideo called ===');
    console.log('Video element:', videoElement);
    console.log('srcObject:', videoElement?.srcObject);
    console.log('Video paused:', videoElement?.paused);
    console.log('Video readyState:', videoElement?.readyState);
    
    if (!videoElement || !videoElement.srcObject) {
      console.log('❌ Video element or srcObject not available');
      return;
    }

    // If already playing, don't interfere
    if (!videoElement.paused) {
      console.log('✅ Video already playing');
      setIsVideoPlaying(true);
      return;
    }

    console.log('🚀 Starting video play sequence...');
    
    try {
      // Google Meet approach: play immediately and handle events
      const playPromise = videoElement.play();
      
      // Handle the play promise
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            console.log('✅ Video play promise resolved successfully');
            setIsVideoPlaying(true);
          })
          .catch((error) => {
            console.log('❌ Video play promise rejected:', error.name);
            if (error.name === 'NotAllowedError') {
              console.log('⚠️ Video play blocked by browser policy - user interaction required');
            } else if (error.name === 'AbortError') {
              console.log('⚠️ Video play was aborted');
            } else {
              console.error('❌ Video play error:', error);
            }
          });
      }
    } catch (error) {
      console.error('❌ Error starting video play:', error);
    }
  }, []);

  const createPeerConnection = useCallback((peerId: string): RTCPeerConnection => {
    const pc = new RTCPeerConnection({
      iceServers: [
        // Primary STUN servers
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
        { urls: 'stun:stun3.l.google.com:19302' },
        { urls: 'stun:stun4.l.google.com:19302' },
        // Professional TURN servers for NAT traversal
        {
          urls: 'turn:openrelay.metered.ca:80',
          username: 'openrelayproject',
          credential: 'openrelayproject'
        },
        {
          urls: 'turn:openrelay.metered.ca:443',
          username: 'openrelayproject',
          credential: 'openrelayproject'
        },
        {
          urls: 'turn:openrelay.metered.ca:443?transport=tcp',
          username: 'openrelayproject',
          credential: 'openrelayproject'
        }
      ],
      iceCandidatePoolSize: 10,
      iceTransportPolicy: 'all',
      bundlePolicy: 'balanced',
      rtcpMuxPolicy: 'require'
    });

    // Add local stream tracks
    if (localStream) {
      localStream.getTracks().forEach(track => {
        pc.addTrack(track, localStream);
      });
    }

    // Handle remote stream - Professional stream management
    pc.ontrack = (event) => {
      console.log(`✅ Professional remote stream received from ${peerId}`);
      const [remoteStream] = event.streams;
      
      setPeers(prev => ({
        ...prev,
        [peerId]: {
          ...prev[peerId],
          stream: remoteStream,
          isConnected: true
        }
      }));

      // Professional video element setup with enhanced retry mechanism
      const setRemoteVideo = (retries = 10) => {
        const videoElement = remoteVideoRefs.current[peerId];
        if (videoElement && videoElement.srcObject !== remoteStream) {
          console.log(`🎥 Setting professional remote video for ${peerId}`);
          videoElement.srcObject = remoteStream;
          
          // Enhanced play handling with promise management
          const playPromise = videoElement.play();
          if (playPromise !== undefined) {
            playPromise
              .then(() => {
                console.log(`✅ Professional remote video playing for ${peerId}`);
              })
              .catch(err => {
                console.log(`⚠️ Remote video play error for ${peerId}:`, err.name);
                // Retry play after a short delay
                setTimeout(() => {
                  videoElement.play().catch(console.error);
                }, 500);
              });
          }
        } else if (retries > 0 && !videoElement) {
          console.log(`🔄 Remote video element not ready for ${peerId}, retrying... (${retries} left)`);
          setTimeout(() => setRemoteVideo(retries - 1), 200);
        } else if (videoElement && videoElement.srcObject === remoteStream) {
          console.log(`✅ Remote video already set for ${peerId}`);
        } else {
          console.error(`❌ Failed to set remote video for ${peerId} after all retries`);
        }
      };
      
      setRemoteVideo();
    };

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate && wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          type: 'signal',
          code,
          payload: {
            to: peerId,
            signal: { candidate: event.candidate }
          }
        }));
      }
    };

    // Handle connection state changes - Professional ICE-based connection detection
    pc.onconnectionstatechange = () => {
      console.log(`Peer ${peerId} connection state: ${pc.connectionState}`);
      
      const isConnected = pc.connectionState === 'connected' || pc.connectionState === 'connecting';
      
      setPeers(prev => ({
        ...prev,
        [peerId]: {
          ...prev[peerId],
          isConnected
        }
      }));

      // Only clean up on closed state, not on failed/disconnected
      if (pc.connectionState === 'closed') {
        console.log(`🧹 Professional cleanup for peer connection ${peerId}`);
        
        // Clean up video element reference
        if (remoteVideoRefs.current[peerId]) {
          delete remoteVideoRefs.current[peerId];
        }
        
        // Clean up peer connection
        delete peersRef.current[peerId];
        setPeers(prev => {
          const newPeers = { ...prev };
          delete newPeers[peerId];
          return newPeers;
        });
        
        console.log(`✅ Cleanup completed for peer ${peerId}`);
      }
    };

    // Handle ICE connection state changes - Professional connection quality monitoring
    pc.oniceconnectionstatechange = () => {
      console.log(`Peer ${peerId} ICE connection state: ${pc.iceConnectionState}`);
      
      const isConnected = pc.iceConnectionState === 'connected' || 
                         pc.iceConnectionState === 'completed' ||
                         pc.iceConnectionState === 'checking';
      
      setPeers(prev => ({
        ...prev,
        [peerId]: {
          ...prev[peerId],
          isConnected
        }
      }));
      
      if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
        setConnectionQuality('good');
        console.log(`✅ Professional connection established with ${peerId}`);
      } else if (pc.iceConnectionState === 'disconnected' || pc.iceConnectionState === 'failed') {
        setConnectionQuality('poor');
        console.log(`⚠️ Connection issues with ${peerId}`);
      }
    };

    return pc;
  }, [localStream, code, wsRef]);

  const connectWebSocket = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;
    
    // Clean up existing connection
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    
    console.log('Attempting to connect to WebSocket:', wsUrl);
    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;
      
      ws.onopen = () => {
        console.log('WebSocket connected to meeting:', code);
        setIsConnected(true);
        setIsConnecting(false);
        setError(null);
        reconnectAttempts.current = 0; // Reset reconnection attempts
        ws.send(JSON.stringify({ 
          type: 'join', 
          code,
          user: {
            name: currentUser?.name || currentUser?.username || 'Anonymous',
            username: currentUser?.username || 'anonymous',
            role: currentUser?.role || 'participant'
          }
        }));
        toast.success('Connected to meeting');
      };
      
      ws.onmessage = async (e) => {
        try {
        const msg = JSON.parse(e.data);
          console.log('WebSocket message received:', msg.type, msg);
          
        if (msg.type === 'peers') {
            const existingPeers = msg.peers.filter((id: string) => id !== (ws as any).resourceId);
            setParticipantCount(existingPeers.length + 1);
            
            // Create peer connections for existing participants
            for (const peerId of existingPeers) {
              if (!peersRef.current[peerId]) {
                console.log(`Creating peer connection for ${peerId}`);
                const pc = createPeerConnection(peerId);
                const peerConnection = { pc, isConnected: false };
                peersRef.current[peerId] = peerConnection;
                setPeers(prev => ({
                  ...prev,
                  [peerId]: peerConnection
                }));
                
                // Create and send offer with professional error handling
                try {
                  const offer = await pc.createOffer({
                offerToReceiveAudio: true,
                offerToReceiveVideo: true
              });
                  
                  await pc.setLocalDescription(offer);
                  
                  ws.send(JSON.stringify({
                    type: 'signal',
                    code,
                    payload: { to: peerId, signal: { sdp: offer } }
                  }));
                  
                  console.log(`✅ Professional offer created and sent to ${peerId}`);
                } catch (err) {
                  console.error(`❌ Error creating offer for ${peerId}:`, err);
                  
                  // Professional cleanup with retry mechanism
                  setTimeout(() => {
                    if (peersRef.current[peerId]) {
                      console.log(`🔄 Retrying peer connection for ${peerId}`);
                      try {
                        const retryPc = createPeerConnection(peerId);
                        peersRef.current[peerId] = { pc: retryPc, isConnected: false };
                        setPeers(prev => ({
                          ...prev,
                          [peerId]: { pc: retryPc, isConnected: false }
                        }));
                      } catch (retryErr) {
                        console.error(`❌ Retry failed for ${peerId}:`, retryErr);
                        delete peersRef.current[peerId];
                        setPeers(prev => {
                          const newPeers = { ...prev };
                          delete newPeers[peerId];
                          return newPeers;
                        });
                      }
                    }
                  }, 1000);
                }
              }
            }
          }
          
          if (msg.type === 'peer-joined') {
            const peerId = msg.peerId;
            const userInfo = msg.user;
            
            setParticipantCount(prev => prev + 1);
            
            // Store participant name if provided
            if (userInfo?.name || userInfo?.username) {
              setParticipantNames(prev => ({
                ...prev,
                [peerId]: userInfo.name || userInfo.username
              }));
            }
            
            // Only create peer connection if we don't already have one
            if (!peersRef.current[peerId]) {
              console.log(`New peer joined: ${peerId}`, userInfo ? `(${userInfo.name || userInfo.username})` : '');
              const pc = createPeerConnection(peerId);
              const peerConnection = { pc, isConnected: false };
              peersRef.current[peerId] = peerConnection;
              setPeers(prev => ({
                ...prev,
                [peerId]: peerConnection
              }));
              
              // Create and send offer with professional error handling
              try {
                const offer = await pc.createOffer({
                  offerToReceiveAudio: true,
                  offerToReceiveVideo: true
                });
                
                await pc.setLocalDescription(offer);
                
                ws.send(JSON.stringify({
                  type: 'signal',
                  code,
                  payload: { to: peerId, signal: { sdp: offer } }
                }));
                
                console.log(`✅ Professional offer created for new peer ${peerId}`);
              } catch (err) {
                console.error(`❌ Error creating offer for new peer ${peerId}:`, err);
                
                // Professional cleanup with retry mechanism
                setTimeout(() => {
                  if (peersRef.current[peerId]) {
                    console.log(`🔄 Retrying new peer connection for ${peerId}`);
                    try {
                      const retryPc = createPeerConnection(peerId);
                      peersRef.current[peerId] = { pc: retryPc, isConnected: false };
                      setPeers(prev => ({
                        ...prev,
                        [peerId]: { pc: retryPc, isConnected: false }
                      }));
                    } catch (retryErr) {
                      console.error(`❌ Retry failed for new peer ${peerId}:`, retryErr);
                      delete peersRef.current[peerId];
                      setPeers(prev => {
                        const newPeers = { ...prev };
                        delete newPeers[peerId];
                        return newPeers;
                      });
                    }
                  }
                }, 1000);
              }
            }
          }
          
        if (msg.type === 'signal') {
            const fromId = msg.from;
          const signal = msg.signal;
            await handleSignal(fromId, signal);
          }
          
          // Handle chat messages
          if (msg.type === 'chat') {
            const message = {
              id: Date.now().toString(),
              user: getParticipantName(msg.from || 'Unknown'),
              message: msg.message || '',
              timestamp: new Date()
            };
            setChatMessages(prev => [...prev, message]);
          }
          
          // Handle hand raising
          if (msg.type === 'hand-raise') {
            const participantId = msg.from;
            const isRaised = msg.raised;
            
            setRaisedHands(prev => {
              const newSet = new Set(prev);
              if (isRaised) {
                newSet.add(participantId);
              } else {
                newSet.delete(participantId);
              }
              return newSet;
            });
          }
        } catch (err) {
          console.error('Error handling WebSocket message:', err);
        }
      };
      
      ws.onclose = (event) => {
        console.log('WebSocket disconnected:', event.code, event.reason);
        setIsConnected(false);
        setConnectionQuality('unknown');
        
        // Don't clean up peer connections immediately on WebSocket close
        // They might reconnect automatically
        
        // Only show error if we were connected
        if (isConnected) {
          if (event.code === 1006) {
            setError('WebSocket connection failed. Please check if the signaling server is running.');
          } else {
            setError('Connection lost. Please refresh the page.');
          }
          setIsConnecting(false);
        }
      };
      
      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        setIsConnected(false);
        
        // Don't set error message or isConnecting here to avoid triggering reconnection
        // The onclose handler will handle reconnection logic
      };
    } catch (err) {
      console.error('Failed to create WebSocket:', err);
      setError('Failed to connect to meeting server');
      setIsConnecting(false);
    }
  }, [wsUrl, code, createPeerConnection]);

  const handleSignal = async (fromId: string, signal: any) => {
    try {
      const peer = peersRef.current[fromId];
      
      // Only handle signals for existing peer connections
      if (!peer) {
        console.log(`No peer connection found for ${fromId}, ignoring signal`);
        return;
      }

      const pc = peer.pc;
      
      if (signal.sdp) {
        const desc = new RTCSessionDescription(signal.sdp);
        console.log(`Handling ${desc.type} from peer ${fromId}, current state: ${pc.signalingState}`);
        
        if (desc.type === 'offer') {
          // Professional offer handling - only reset if in conflicting state
          console.log(`Handling offer from ${fromId}, current state: ${pc.signalingState}`);
          
          let currentPc = pc;
          
          // Only reset if we're in a conflicting signaling state
          if (pc.signalingState !== 'stable' && pc.signalingState !== 'closed') {
            console.log(`⚠️ Signaling conflict detected, resetting connection for ${fromId}`);
            pc.close();
            currentPc = createPeerConnection(fromId);
            setPeers(prev => ({
              ...prev,
              [fromId]: { pc: currentPc, isConnected: false }
            }));
            peersRef.current[fromId] = { pc: currentPc, isConnected: false };
          }
          
          try {
            await currentPc.setRemoteDescription(desc);
            const answer = await currentPc.createAnswer();
            await currentPc.setLocalDescription(answer);
            
            wsRef.current?.send(JSON.stringify({
              type: 'signal',
              code,
              payload: { to: fromId, signal: { sdp: answer } }
            }));
            console.log(`✅ Professional answer sent to ${fromId}`);
          } catch (error) {
            console.error(`❌ Error handling offer from ${fromId}:`, error);
          }
        } else if (desc.type === 'answer') {
          // Professional answer handling - only process if we're expecting it
          console.log(`Handling answer from ${fromId}, current state: ${pc.signalingState}`);
          
          if (pc.signalingState === 'have-local-offer') {
            try {
              await pc.setRemoteDescription(desc);
              console.log(`✅ Professional answer processed for ${fromId}`);
            } catch (error) {
              console.error(`❌ Error handling answer from ${fromId}:`, error);
            }
          } else {
            console.log(`⚠️ Skipping answer from ${fromId} - not in have-local-offer state: ${pc.signalingState}`);
          }
        }
      } else if (signal.candidate) {
        if (pc.remoteDescription) {
          await pc.addIceCandidate(signal.candidate);
        }
      }
    } catch (err) {
      console.error(`Error handling signal from ${fromId}:`, err);
    }
  };

  const initializeMeeting = useCallback(async () => {
    if (isInitialized.current) {
      console.log('Already initialized, skipping...');
      return;
    }
    
    // Reset initialization flag if there's an error
    if (error) {
      isInitialized.current = false;
    }
    
    try {
      isInitialized.current = true;
      setIsConnecting(true);
      setError(null);
      reconnectAttempts.current = 0; // Reset reconnection attempts
      
      // Set a timeout to prevent infinite loading
      const timeoutId = setTimeout(() => {
        console.log('Meeting initialization timeout');
        setError('Meeting initialization timed out. Please check if the WebSocket server is running and try again.');
        setIsConnecting(false);
      }, 10000); // 10 second timeout
      
      // Get available devices first
      await getAvailableDevices();
      
      // Get user media with professional constraints
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: { ideal: 1920, min: 640 },
          height: { ideal: 1080, min: 480 },
          frameRate: { ideal: 30, min: 15 },
          deviceId: selectedVideoDevice ? { exact: selectedVideoDevice } : undefined
        }, 
        audio: { 
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 48000,
          deviceId: selectedAudioDevice ? { exact: selectedAudioDevice } : undefined
        }
      });
      
      setLocalStream(stream);
      console.log('=== LOCAL STREAM CREATED ===');
      console.log('Stream object:', stream);
      console.log('Stream active:', stream.active);
      console.log('Stream id:', stream.id);
      console.log('Video tracks:', stream.getVideoTracks());
      console.log('Audio tracks:', stream.getAudioTracks());
      
      // Check each video track
      stream.getVideoTracks().forEach((track, index) => {
        console.log(`Video track ${index}:`, {
          id: track.id,
          kind: track.kind,
          label: track.label,
          enabled: track.enabled,
          muted: track.muted,
          readyState: track.readyState
        });
      });
      
      // Add video track event listeners for better state management
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.onended = () => {
          console.log('Video track ended');
          setIsVideoPlaying(false);
        };
        
        videoTrack.onmute = () => {
          console.log('Video track muted');
          setIsVideoPlaying(false);
        };
        
        videoTrack.onunmute = () => {
          console.log('Video track unmuted');
          // Video will start playing when track becomes available
        };
      }
      
      // Google Meet-style video setup with enhanced debugging
      let retryCount = 0;
      const maxRetries = 50; // Maximum 5 seconds of retries (50 * 100ms)
      
      const setupLocalVideo = () => {
        const videoElement = localVideoRef.current;
        console.log('=== setupLocalVideo called ===');
        console.log('Video element:', videoElement);
        console.log('Stream:', stream);
        console.log('Stream tracks:', stream.getTracks());
        console.log('Retry count:', retryCount);
        
        if (!videoElement) {
          retryCount++;
          if (retryCount >= maxRetries) {
            console.error('❌ Failed to setup local video after maximum retries. Video element not found.');
            return;
          }
          console.log(`⚠️ Video element not ready yet, retrying... (${retryCount}/${maxRetries})`);
          setTimeout(setupLocalVideo, 100);
          return;
        }

        console.log('🚀 Setting up local video with stream:', stream);
        console.log('Stream video tracks:', stream.getVideoTracks());
        console.log('Stream audio tracks:', stream.getAudioTracks());
        
        // Set the stream source
        videoElement.srcObject = stream;
        console.log('✅ Stream assigned to video element');
        
        // Set up event listeners for proper state management
        const handleLoadedMetadata = () => {
          console.log('📹 Video metadata loaded, attempting play');
          console.log('Video readyState after metadata:', videoElement.readyState);
          safePlayVideo(videoElement);
        };
        
        const handleCanPlay = () => {
          console.log('▶️ Video can play, attempting play');
          console.log('Video readyState after canplay:', videoElement.readyState);
          safePlayVideo(videoElement);
        };
        
        const handlePlay = () => {
          console.log('🎥 Video started playing successfully!');
          setIsVideoPlaying(true);
        };
        
        const handlePause = () => {
          console.log('⏸️ Video paused');
          setIsVideoPlaying(false);
        };
        
        const handleError = (e: Event) => {
          console.error('❌ Video element error:', e);
          console.error('Video error details:', videoElement.error);
        };
        
        // Remove any existing listeners
        videoElement.removeEventListener('loadedmetadata', handleLoadedMetadata);
        videoElement.removeEventListener('canplay', handleCanPlay);
        videoElement.removeEventListener('play', handlePlay);
        videoElement.removeEventListener('pause', handlePause);
        videoElement.removeEventListener('error', handleError);
        
        // Add new listeners
        videoElement.addEventListener('loadedmetadata', handleLoadedMetadata);
        videoElement.addEventListener('canplay', handleCanPlay);
        videoElement.addEventListener('play', handlePlay);
        videoElement.addEventListener('pause', handlePause);
        videoElement.addEventListener('error', handleError);
        
        // Try to play immediately
        safePlayVideo(videoElement);
        
        // Fallback: Try again after a short delay if not playing
        setTimeout(() => {
          if (videoElement.paused && videoElement.srcObject) {
            console.log('Video still paused after setup, attempting play again');
            safePlayVideo(videoElement);
          }
        }, 500);
        
        console.log('Local video setup complete');
      };
      
      // Setup the video
      setupLocalVideo();
      
      // Setup audio level monitoring
      setupAudioLevelMonitoring(stream);
      
      // Join meeting
      await joinMeeting(code!);
      
      // Clear timeout since we got this far
      clearTimeout(timeoutId);
      
      // Connect WebSocket immediately
      connectWebSocket();
    } catch (err: any) {
      console.error('Failed to initialize meeting:', err);
      
      // Check if it's a permission error
      if (err.name === 'NotAllowedError') {
        setError('Camera and microphone access denied. Please allow access and refresh the page.');
      } else if (err.name === 'NotFoundError') {
        setError('No camera or microphone found. Please connect a device and refresh the page.');
      } else {
        setError(err.message || 'Failed to start meeting');
      }
      
      setIsConnecting(false);
      toast.error('Failed to start meeting');
    }
  }, [code]);

  useEffect(() => {
    initializeMeeting();

    return () => {
      // Clean up all resources
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      leaveMeeting(code!);
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      // Clean up peer connections
      Object.values(peersRef.current).forEach(peer => {
        if (peer.pc.signalingState !== 'closed') {
          peer.pc.close();
        }
      });
      peersRef.current = {};
      
      // Clean up audio monitoring
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
      }
      
      // Clean up recording
      if (recordingRef.current && recordingRef.current.state === 'recording') {
        recordingRef.current.stop();
      }
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
      if (recordingUrl) {
        URL.revokeObjectURL(recordingUrl);
      }
      
      localStream?.getTracks().forEach(t => t.stop());
    };
  }, [code]); // Remove initializeMeeting from dependencies

  // Update local video when stream changes
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      console.log('Updating local video with stream:', localStream);
      localVideoRef.current.srcObject = localStream;
      
      // Use safe play function
      safePlayVideo(localVideoRef.current);
    } else if (localStream && !localVideoRef.current) {
      // If we have a stream but no video element yet, wait a bit and try again
      console.log('Stream available but video element not ready, retrying...');
      let retryCount = 0;
      const maxRetries = 30; // Maximum 3 seconds of retries (30 * 100ms)
      
      const retrySetVideo = () => {
        retryCount++;
        if (localVideoRef.current && localStream) {
          localVideoRef.current.srcObject = localStream;
          safePlayVideo(localVideoRef.current);
          console.log('Video element set after retry');
        } else if (retryCount < maxRetries) {
          console.log(`Retrying video setup... (${retryCount}/${maxRetries})`);
          setTimeout(retrySetVideo, 100);
        } else {
          console.error('❌ Failed to setup video element after maximum retries');
        }
      };
      setTimeout(retrySetVideo, 100);
    }
  }, [localStream, safePlayVideo]);

  // Ensure video element is ready after component mounts
  useEffect(() => {
    const checkVideoElement = () => {
      if (localVideoRef.current && localStream) {
        console.log('✅ Video element found and stream available, setting up...');
        localVideoRef.current.srcObject = localStream;
        safePlayVideo(localVideoRef.current);
      }
    };

    // Check immediately
    checkVideoElement();
    
    // Also check after a short delay to ensure DOM is fully rendered
    const timeoutId = setTimeout(checkVideoElement, 200);
    
    return () => clearTimeout(timeoutId);
  }, [localStream, safePlayVideo]);

  // Close device settings when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showDeviceSettings) {
        const target = event.target as Element;
        if (!target.closest('[data-device-settings]')) {
          setShowDeviceSettings(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showDeviceSettings]);

  // Auto-scroll chat to bottom
  useEffect(() => {
    if (chatMessagesEndRef.current) {
      chatMessagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages]);

  // Start meeting timer when connected
  useEffect(() => {
    if (isConnected && !meetingTimerRef.current) {
      startMeetingTimer();
    }
    
    return () => {
      if (meetingTimerRef.current) {
        clearInterval(meetingTimerRef.current);
        meetingTimerRef.current = null;
      }
    };
  }, [isConnected]);

  // Auto-scroll chat to bottom when new messages arrive
  useEffect(() => {
    if (isChatOpen && chatMessagesEndRef.current) {
      chatMessagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, isChatOpen]);

  // Add user interaction handler for video autoplay
  const handleUserInteraction = useCallback(() => {
    if (localVideoRef.current && localVideoRef.current.paused && localVideoRef.current.srcObject) {
      console.log('User interaction detected, attempting video play');
      safePlayVideo(localVideoRef.current);
    }
  }, [safePlayVideo]);

  // Global click handler for video autoplay (Google Meet style)
  useEffect(() => {
    document.addEventListener('click', handleUserInteraction);
    document.addEventListener('touchstart', handleUserInteraction);
    
    return () => {
      document.removeEventListener('click', handleUserInteraction);
      document.removeEventListener('touchstart', handleUserInteraction);
    };
  }, [handleUserInteraction]);


  const handleLeaveMeeting = async () => {
    try {
      await leaveMeeting(code!);
      navigate('/admin/meet');
      toast.success('Left meeting');
    } catch (err) {
      console.error('Error leaving meeting:', err);
    }
  };

  const copyMeetingCode = () => {
    navigator.clipboard.writeText(code!);
    setCopied(true);
    toast.success('Meeting code copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  // Professional device management
  const getAvailableDevices = async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      setAvailableDevices(devices);
      
      // Set default devices
      const videoDevices = devices.filter(device => device.kind === 'videoinput');
      const audioDevices = devices.filter(device => device.kind === 'audioinput');
      
      if (videoDevices.length > 0 && !selectedVideoDevice) {
        setSelectedVideoDevice(videoDevices[0].deviceId);
      }
      if (audioDevices.length > 0 && !selectedAudioDevice) {
        setSelectedAudioDevice(audioDevices[0].deviceId);
      }
    } catch (err) {
      console.error('Error getting devices:', err);
    }
  };

  // Audio level monitoring
  const setupAudioLevelMonitoring = (stream: MediaStream) => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const analyser = audioContext.createAnalyser();
      const microphone = audioContext.createMediaStreamSource(stream);
      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      analyser.fftSize = 256;
      microphone.connect(analyser);

      audioContextRef.current = audioContext;
      analyserRef.current = analyser;

      const updateAudioLevel = () => {
        if (analyserRef.current) {
          analyserRef.current.getByteFrequencyData(dataArray);
          const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
          setAudioLevel(average);
          animationFrameRef.current = requestAnimationFrame(updateAudioLevel);
        }
      };
      updateAudioLevel();
    } catch (err) {
      console.error('Error setting up audio monitoring:', err);
    }
  };

  // Professional video toggle with device switching
  const toggleVideo = async () => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoEnabled(videoTrack.enabled);
        setIsVideoOff(!videoTrack.enabled);
        
        if (videoTrack.enabled) {
          toast.success('Video turned on');
        } else {
          toast.info('Video turned off');
        }
      }
    }
  };

  // Professional audio toggle with mute state
  const toggleAudio = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsAudioEnabled(audioTrack.enabled);
        setIsMuted(!audioTrack.enabled);
        
        if (audioTrack.enabled) {
          toast.success('Microphone unmuted');
        } else {
          toast.info('Microphone muted');
        }
      }
    }
  };

  // Screen sharing functionality
  const toggleScreenShare = async () => {
    try {
      if (!isScreenSharing) {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: { 
            width: { ideal: 1920 },
            height: { ideal: 1080 },
            frameRate: { ideal: 30 }
          },
          audio: true
        });

        // Replace video track in all peer connections
        const videoTrack = screenStream.getVideoTracks()[0];
        Object.values(peersRef.current).forEach(peer => {
          const sender = peer.pc.getSenders().find(s => s.track && s.track.kind === 'video');
          if (sender) {
            sender.replaceTrack(videoTrack);
          }
        });

        // Update local stream
        if (localStream) {
          const newStream = new MediaStream([
            ...localStream.getAudioTracks(),
            videoTrack
          ]);
          setLocalStream(newStream);
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = newStream;
          }
        }

        setIsScreenSharing(true);
        toast.success('Screen sharing started');

        // Handle screen share end
        videoTrack.onended = () => {
          toggleScreenShare();
        };
      } else {
        // Stop screen sharing and return to camera
        if (localStream) {
          const cameraStream = await navigator.mediaDevices.getUserMedia({
            video: { 
              width: { ideal: 1920, min: 640 },
              height: { ideal: 1080, min: 480 },
              frameRate: { ideal: 30, min: 15 },
              deviceId: selectedVideoDevice ? { exact: selectedVideoDevice } : undefined
            }
          });

          const videoTrack = cameraStream.getVideoTracks()[0];
          Object.values(peersRef.current).forEach(peer => {
            const sender = peer.pc.getSenders().find(s => s.track && s.track.kind === 'video');
            if (sender) {
              sender.replaceTrack(videoTrack);
            }
          });

          const newStream = new MediaStream([
            ...localStream.getAudioTracks(),
            videoTrack
          ]);
          setLocalStream(newStream);
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = newStream;
          }
        }

        setIsScreenSharing(false);
        toast.info('Screen sharing stopped');
      }
    } catch (err: any) {
      console.error('Error toggling screen share:', err);
      
      if (err.name === 'NotAllowedError') {
        toast.error('Screen sharing permission denied. Please allow screen sharing and try again.');
      } else if (err.name === 'NotFoundError') {
        toast.error('No screen sharing source available.');
      } else {
        toast.error('Failed to toggle screen sharing');
      }
    }
  };

  // Recording functionality
  const toggleRecording = async () => {
    try {
      if (!isRecording) {
        if (localStream) {
          const mediaRecorder = new MediaRecorder(localStream, {
            mimeType: 'video/webm;codecs=vp9'
          });

          recordingChunksRef.current = [];
          recordingRef.current = mediaRecorder;

          mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
              recordingChunksRef.current.push(event.data);
            }
          };

          mediaRecorder.onstop = () => {
            const blob = new Blob(recordingChunksRef.current, { type: 'video/webm' });
            const url = URL.createObjectURL(blob);
            setRecordingUrl(url);
            setRecordingSize(blob.size);
            setShowSaveRecording(true);
            toast.info('Recording ready');
          };

          mediaRecorder.start();
          setIsRecording(true);
          setRecordingTime(0);

          // Recording timer
          recordingTimerRef.current = setInterval(() => {
            setRecordingTime(prev => prev + 1);
          }, 1000);

          toast.success('Recording started');
        }
      } else {
        if (recordingRef.current) {
          recordingRef.current.stop();
          setIsRecording(false);
          if (recordingTimerRef.current) {
            clearInterval(recordingTimerRef.current);
          }
          toast.info('Recording stopped');
        }
      }
    } catch (err) {
      console.error('Error toggling recording:', err);
      toast.error('Failed to toggle recording');
    }
  };

  // Device switching
  const switchVideoDevice = async (deviceId: string) => {
    try {
      if (localStream) {
        const newStream = await navigator.mediaDevices.getUserMedia({
          video: { 
            width: { ideal: 1920, min: 640 },
            height: { ideal: 1080, min: 480 },
            frameRate: { ideal: 30, min: 15 },
            deviceId: { exact: deviceId }
          },
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
            sampleRate: 48000,
            deviceId: selectedAudioDevice ? { exact: selectedAudioDevice } : undefined
          }
        });

        const videoTrack = newStream.getVideoTracks()[0];
        Object.values(peersRef.current).forEach(peer => {
          const sender = peer.pc.getSenders().find(s => s.track && s.track.kind === 'video');
          if (sender) {
            sender.replaceTrack(videoTrack);
          }
        });

        setLocalStream(newStream);
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = newStream;
        }
        setSelectedVideoDevice(deviceId);
        toast.success('Camera switched');
      }
    } catch (err) {
      console.error('Error switching video device:', err);
      toast.error('Failed to switch camera');
    }
  };

  const switchAudioDevice = async (deviceId: string) => {
    try {
      if (localStream) {
        const newStream = await navigator.mediaDevices.getUserMedia({
          video: { 
            width: { ideal: 1920, min: 640 },
            height: { ideal: 1080, min: 480 },
            frameRate: { ideal: 30, min: 15 },
            deviceId: selectedVideoDevice ? { exact: selectedVideoDevice } : undefined
          },
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
            sampleRate: 48000,
            deviceId: { exact: deviceId }
          }
        });

        const audioTrack = newStream.getAudioTracks()[0];
        Object.values(peersRef.current).forEach(peer => {
          const sender = peer.pc.getSenders().find(s => s.track && s.track.kind === 'audio');
          if (sender) {
            sender.replaceTrack(audioTrack);
          }
        });

        setLocalStream(newStream);
        setSelectedAudioDevice(deviceId);
        toast.success('Microphone switched');
      }
    } catch (err) {
      console.error('Error switching audio device:', err);
      toast.error('Failed to switch microphone');
    }
  };

  // Format recording time
  const formatRecordingTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const formatBytes = (bytes: number) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
  };

  const downloadRecording = () => {
    if (!recordingUrl) return;
    const a = document.createElement('a');
    a.href = recordingUrl;
    a.download = `meeting-recording-${new Date().toISOString()}.webm`;
    a.click();
    toast.success('Recording downloaded');
    // Keep URL for potential re-download until dialog closes
  };

  const discardRecording = () => {
    if (recordingUrl) URL.revokeObjectURL(recordingUrl);
    setRecordingUrl('');
    setRecordingSize(0);
    setShowSaveRecording(false);
    toast.info('Recording discarded');
  };

  // Enhanced Google Meet-like features
  
  // Chat functionality
  const sendChatMessage = () => {
    if (!newMessage.trim() || !wsRef.current) return;
    
    const message = {
      id: Date.now().toString(),
      user: 'You',
      message: newMessage.trim(),
      timestamp: new Date()
    };
    
    setChatMessages(prev => [...prev, message]);
    setNewMessage('');
    
    // Broadcast to other participants
    wsRef.current.send(JSON.stringify({
      type: 'chat',
      code,
      payload: { message: newMessage.trim() }
    }));
    
    toast.success('Message sent');
  };

  // Hand raising functionality
  const toggleHandRaise = () => {
    if (!wsRef.current) return;
    
    const newHandRaised = !isHandRaised;
    setIsHandRaised(newHandRaised);
    
    if (newHandRaised) {
      setRaisedHands(prev => new Set([...prev, 'You']));
      toast.info('Hand raised');
    } else {
      setRaisedHands(prev => {
        const newSet = new Set(prev);
        newSet.delete('You');
        return newSet;
      });
      toast.info('Hand lowered');
    }
    
    // Broadcast hand raise status
    wsRef.current.send(JSON.stringify({
      type: 'hand-raise',
      code,
      payload: { raised: newHandRaised }
    }));
  };

  // View mode switching
  const switchViewMode = (mode: 'grid' | 'speaker' | 'spotlight') => {
    setViewMode(mode);
    toast.success(`Switched to ${mode} view`);
  };

  // Pin participant
  const togglePinParticipant = (participantId: string) => {
    if (pinnedParticipant === participantId) {
      setPinnedParticipant(null);
      toast.info('Participant unpinned');
    } else {
      setPinnedParticipant(participantId);
      toast.info('Participant pinned');
    }
  };

  // Meeting timer
  const startMeetingTimer = () => {
    meetingTimerRef.current = setInterval(() => {
      setMeetingTimer(prev => prev + 1);
    }, 1000);
  };

  // Enhanced device settings with audio processing
  const updateAudioSettings = async () => {
    if (!localStream) return;
    
    try {
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: { 
          width: { ideal: isHDVideo ? 1920 : 1280, min: 640 },
          height: { ideal: isHDVideo ? 1080 : 720, min: 480 },
          frameRate: { ideal: 30, min: 15 },
          deviceId: selectedVideoDevice ? { exact: selectedVideoDevice } : undefined
        },
        audio: {
          echoCancellation: isEchoCancellation,
          noiseSuppression: isNoiseSuppression,
          autoGainControl: isAutoGainControl,
          sampleRate: 48000,
          deviceId: selectedAudioDevice ? { exact: selectedAudioDevice } : undefined
        }
      });

      // Update peer connections
      const audioTrack = newStream.getAudioTracks()[0];
      Object.values(peersRef.current).forEach(peer => {
        const sender = peer.pc.getSenders().find(s => s.track && s.track.kind === 'audio');
        if (sender) {
          sender.replaceTrack(audioTrack);
        }
      });

      setLocalStream(newStream);
      toast.success('Audio settings updated');
    } catch (err) {
      console.error('Error updating audio settings:', err);
      toast.error('Failed to update audio settings');
    }
  };

  // Format meeting time
  const formatMeetingTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  // Reset meeting state
  const resetMeeting = () => {
    isInitialized.current = false;
    setError(null);
    setIsConnecting(false);
    setLocalStream(null);
    setIsVideoPlaying(false);
    setIsVideoEnabled(true);
    setIsAudioEnabled(true);
    setIsScreenSharing(false);
    setIsMuted(false);
    setIsVideoOff(false);
    setAudioLevel(0);
    setIsRecording(false);
    setRecordingTime(0);
    
    // Reset enhanced features
    setIsChatOpen(false);
    setChatMessages([]);
    setNewMessage('');
    setRaisedHands(new Set());
    setIsHandRaised(false);
    setViewMode('grid');
    setPinnedParticipant(null);
    setIsMeetingLocked(false);
    setMeetingTimer(0);
    setParticipantNames({});
    setShowParticipants(false);
  };


  if (isConnecting) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-white mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-white mb-2">Joining Meeting</h2>
          <p className="text-gray-300">Setting up your video call...</p>
        </div>
      </div>
    );
  }

  if (error) {
  return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <Alert className="border-red-200 bg-red-50">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">{error}</AlertDescription>
          </Alert>
          <div className="mt-4 flex gap-2">
            <Button onClick={() => navigate('/admin/meet')} variant="outline" className="flex-1">
              Back to Lobby
            </Button>
            <Button 
              onClick={() => {
                resetMeeting();
                reconnectAttempts.current = 0;
                // Small delay to ensure state is reset
                setTimeout(() => {
                  initializeMeeting();
                }, 100);
              }} 
              className="flex-1"
            >
              Retry Connection
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
    <main className="min-h-[calc(100vh-4rem)] bg-background px-3 py-4 sm:px-6 sm:py-6 md:px-8 lg:px-10 lg:py-8">
      <section className="max-w-7xl mx-auto space-y-6 sm:space-y-8">
        {/* Header */}
        <div className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-50/50 via-transparent to-emerald-50/50 dark:from-blue-950/20 dark:via-transparent dark:to-emerald-950/20"></div>
          <div className="relative bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-4 sm:p-6 lg:p-8">
            {/* Mobile Layout */}
            <div className="block lg:hidden space-y-4">
              {/* Top Row - Logo and Title */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gradient-to-br from-blue-600 to-emerald-600 rounded-xl shadow-lg">
                    <Video className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                  </div>
                  <div>
                    <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-gray-900 via-gray-800 to-gray-700 dark:from-white dark:via-gray-100 dark:to-gray-300 bg-clip-text text-transparent tracking-tight">BugMeet</h1>
                    <div className="h-1 w-16 bg-gradient-to-r from-blue-600 to-emerald-600 rounded-full mt-1"></div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={copyMeetingCode}
                    className="border-border text-foreground hover:bg-muted/50 hover:border-border/80 transition-all duration-200 px-2"
                  >
                    {copied ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
                    <span className="ml-1 font-mono text-xs hidden xs:inline">{code}</span>
                  </Button>
                </div>
              </div>
              
              {/* Meeting Code Row */}
              <div className="flex items-center justify-center">
                <p className="text-xs sm:text-sm text-muted-foreground">Meeting {code}</p>
              </div>
              
              {/* Status Row - Compact */}
              <div className="flex items-center justify-center gap-2 flex-wrap">
                <div className="flex items-center gap-1 px-2 py-1 bg-gradient-to-r from-muted/20 to-muted/30 rounded-md border border-border/50">
                  <Users className="h-3 w-3 text-muted-foreground" />
                  <span className="text-xs font-medium text-foreground">
                    {Object.keys(peers).length + 1}
                  </span>
                </div>
                
                <div className="flex items-center gap-1 px-2 py-1 bg-gradient-to-r from-muted/20 to-muted/30 rounded-md border border-border/50">
                  <Clock className="h-3 w-3 text-muted-foreground" />
                  <span className="text-xs font-medium font-mono text-foreground">
                    {formatMeetingTime(meetingTimer)}
                  </span>
                </div>
                
                <div className="flex items-center gap-1 px-2 py-1 bg-gradient-to-r from-muted/20 to-muted/30 rounded-md border border-border/50">
                  <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                  <span className="text-xs font-medium text-foreground">
                    {isConnected ? 'Online' : 'Offline'}
                  </span>
                </div>
                
                {raisedHands.size > 0 && (
                  <div className="flex items-center gap-1 px-2 py-1 bg-yellow-50 dark:bg-yellow-600/10 rounded-md border border-yellow-300/60 dark:border-yellow-500/30">
                    <Hand className="h-3 w-3 text-yellow-600 dark:text-yellow-400" />
                    <span className="text-xs font-medium text-yellow-700 dark:text-yellow-300">
                      {raisedHands.size}
                    </span>
                  </div>
                )}
                
                {isMeetingLocked && (
                  <div className="flex items-center gap-1 px-2 py-1 bg-red-50 dark:bg-red-600/10 rounded-md border border-red-300/60 dark:border-red-500/30">
                    <Lock className="h-3 w-3 text-red-600 dark:text-red-400" />
                    <span className="text-xs font-medium text-red-700 dark:text-red-300">Locked</span>
                  </div>
                )}
              </div>
            </div>
            
            {/* Desktop Layout */}
            <div className="hidden lg:block">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-gradient-to-br from-blue-600 to-emerald-600 rounded-xl shadow-lg">
                      <Video className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h1 className="text-4xl lg:text-5xl font-bold bg-gradient-to-r from-gray-900 via-gray-800 to-gray-700 dark:from-white dark:via-gray-100 dark:to-gray-300 bg-clip-text text-transparent tracking-tight">BugMeet</h1>
                      <div className="h-1 w-20 bg-gradient-to-r from-blue-600 to-emerald-600 rounded-full mt-2"></div>
                      <p className="text-sm text-muted-foreground mt-2">Meeting {code}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-muted/20 to-muted/30 rounded-lg border border-border/50">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium text-foreground">
                        {Object.keys(peers).length + 1}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-muted/20 to-muted/30 rounded-lg border border-border/50">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium font-mono text-foreground">
                        {formatMeetingTime(meetingTimer)}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-muted/20 to-muted/30 rounded-lg border border-border/50">
                      <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                      <span className="font-medium text-foreground">
                        {isConnected ? 'Connected' : 'Disconnected'}
                      </span>
                      {connectionQuality !== 'unknown' && (
                        <div className="flex items-center gap-1 ml-2">
                          {connectionQuality === 'good' ? (
                            <Wifi className="h-3 w-3 text-green-500" />
                          ) : (
                            <WifiOff className="h-3 w-3 text-yellow-500" />
                          )}
                          <span className="text-xs text-muted-foreground capitalize">{connectionQuality}</span>
                        </div>
                      )}
                    </div>
                    
                    {raisedHands.size > 0 && (
                      <div className="flex items-center gap-2 px-3 py-2 bg-yellow-50 dark:bg-yellow-600/10 rounded-lg border border-yellow-300/60 dark:border-yellow-500/30">
                        <Hand className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                        <span className="font-medium text-yellow-700 dark:text-yellow-300">
                          {raisedHands.size} hand{raisedHands.size !== 1 ? 's' : ''} raised
                        </span>
                      </div>
                    )}
                    
                    {isMeetingLocked && (
                      <div className="flex items-center gap-2 px-3 py-2 bg-red-50 dark:bg-red-600/10 rounded-lg border border-red-300/60 dark:border-red-500/30">
                        <Lock className="h-4 w-4 text-red-600 dark:text-red-400" />
                        <span className="font-medium text-red-700 dark:text-red-300">Meeting Locked</span>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={copyMeetingCode}
                    className="border-border text-foreground hover:bg-muted/50 hover:border-border/80 transition-all duration-200"
                  >
                    {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                    <span className="ml-2 font-mono text-sm">{code}</span>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Video Grid */}
        <div className={`p-0 sm:p-0 transition-all duration-300 ${isChatOpen ? 'pr-0' : ''}`}>
          <div className="max-w-7xl mx-auto flex gap-6">
          {/* Main video area */}
          <div className={`flex-1 transition-all duration-300 ${isChatOpen ? 'max-w-4xl' : ''}`}>
            <div className="grid gap-6 [grid-template-columns:repeat(auto-fit,minmax(280px,1fr))] lg:[grid-template-columns:repeat(auto-fit,minmax(320px,1fr))]">
            {/* Local Video */}
            <div className="group relative aspect-video bg-gray-800/50 rounded-2xl overflow-hidden border border-gray-600/50 hover:border-blue-500/50 transition-all duration-500 shadow-2xl hover:shadow-blue-500/10 hover:scale-[1.02] transform">
              <video
                ref={localVideoRef}
                autoPlay
                muted
                playsInline
                preload="metadata"
                className="w-full h-full object-cover"
                style={{ 
                  backgroundColor: '#1f2937',
                  display: 'block',
                  visibility: 'visible',
                  opacity: 1
                }}
              />
              
              {/* Gradient overlay for better text readability */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
              
              {/* Top-left label */}
              <div className="absolute top-3 left-3 bg-black/70 backdrop-blur-sm px-3 py-1.5 rounded-lg text-xs flex items-center gap-2 shadow-lg">
                <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
                <span className="font-medium text-white">You</span>
                {isScreenSharing && (
                  <span className="inline-flex items-center gap-1 text-yellow-300 bg-yellow-500/20 px-2 py-0.5 rounded">
                    <Monitor className="h-3 w-3" /> Screen
                  </span>
                )}
                {!isVideoEnabled && (
                  <span className="inline-flex items-center gap-1 text-red-300 bg-red-500/20 px-2 py-0.5 rounded">
                    <VideoOff className="h-3 w-3" /> Video Off
                  </span>
                )}
                {isMuted && (
                  <span className="inline-flex items-center gap-1 text-red-300 bg-red-500/20 px-2 py-0.5 rounded">
                    <MicOff className="h-3 w-3" /> Muted
                  </span>
                )}
              </div>
              
              {/* Audio level indicator */}
              {isAudioEnabled && (
                <div className="absolute bottom-3 right-3">
                  <div className="flex items-end gap-1 bg-black/50 backdrop-blur-sm px-2 py-1 rounded-lg">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div
                        key={i}
                        className={`w-1 h-2 rounded-full transition-all duration-150 ${
                          audioLevel > (i + 1) * 20 
                            ? 'bg-green-400 shadow-sm shadow-green-400/50' 
                            : 'bg-gray-500'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              )}
              
              {/* Fallbacks */}
              {!isVideoEnabled && (
                <div className="absolute inset-0 bg-gray-900/90 flex items-center justify-center">
                  <div className="text-center">
                    <VideoOff className="h-16 w-16 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-300 font-medium">Camera is off</p>
                  </div>
                </div>
              )}
              
              {/* Only show loading state if video is truly not playing and we have a stream */}
              {isVideoEnabled && localStream && !isVideoPlaying && localVideoRef.current?.paused && (
                <div className="absolute inset-0 bg-gray-900/95 backdrop-blur-sm flex items-center justify-center">
                  <div className="text-center">
                    <div className="relative mb-6">
                      <div className="w-16 h-16 border-4 border-blue-500/30 rounded-full"></div>
                      <div className="absolute top-0 left-0 w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                    <h3 className="text-lg font-semibold mb-2 text-white">Starting your video</h3>
                    <p className="text-sm text-gray-300 mb-6 max-w-xs mx-auto">
                      Video stream is ready, starting playback...
                    </p>
                    <Button
                      onClick={() => {
                        if (localVideoRef.current) {
                          console.log('=== MANUAL VIDEO START TRIGGERED ===');
                          safePlayVideo(localVideoRef.current);
                        }
                      }}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
                      size="sm"
                    >
                      Start Video
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Remote Videos */}
            {Object.entries(peers).map(([peerId, peer]) => (
              <div
                key={peerId}
                className="group relative aspect-video bg-gray-800/50 rounded-2xl overflow-hidden border border-gray-600/50 hover:border-blue-500/50 transition-all duration-500 shadow-2xl hover:shadow-blue-500/10 hover:scale-[1.02] transform"
              >
                <video
                  ref={(el) => {
                    if (el && !remoteVideoRefs.current[peerId]) {
                      monitorPerformance(`remoteVideoRef_${peerId}`);
                      remoteVideoRefs.current[peerId] = el;
                      console.log(`✅ Remote video element initialized for ${peerId}`);
                    }
                  }}
                  autoPlay
                  playsInline
                  muted
                  preload="metadata"
                  className="w-full h-full object-cover"
                  onLoadedMetadata={() => {
                    console.log(`Remote video metadata loaded for ${peerId}`);
                  }}
                  onCanPlay={() => {
                    console.log(`Remote video can play for ${peerId}`);
                  }}
                  onPlay={() => {
                    console.log(`Remote video started playing for ${peerId}`);
                  }}
                  onError={(e) => {
                    console.error(`Remote video error for ${peerId}:`, e);
                  }}
                />
                
                {/* Gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                
                {/* Top-left label */}
                <div className="absolute top-3 left-3 bg-black/70 backdrop-blur-sm px-3 py-1.5 rounded-lg text-xs flex items-center gap-2 shadow-lg">
                  <div className={`w-2 h-2 rounded-full ${peer.isConnected ? 'bg-green-400 animate-pulse' : 'bg-yellow-400'}`} />
                  <span className="font-medium text-white">{getParticipantName(peerId)}</span>
                  {peer.isConnected ? (
                    <span className="inline-flex items-center gap-1 text-green-300 bg-green-500/20 px-2 py-0.5 rounded">
                      <Wifi className="h-3 w-3" /> Connected
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-yellow-300 bg-yellow-500/20 px-2 py-0.5 rounded">
                      <WifiOff className="h-3 w-3" /> Connecting
                    </span>
                  )}
                </div>
                
                {!peer.stream && peer.isConnected && (
                  <div className="absolute inset-0 bg-gray-900/95 backdrop-blur-sm flex items-center justify-center">
                    <div className="text-center">
                      <div className="relative mb-4">
                        <div className="w-12 h-12 border-3 border-green-500/30 rounded-full"></div>
                        <div className="absolute top-0 left-0 w-12 h-12 border-3 border-green-500 border-t-transparent rounded-full animate-spin"></div>
                      </div>
                      <p className="text-white font-medium text-sm">Connected</p>
                      <p className="text-gray-400 text-xs mt-1">Waiting for video stream</p>
                    </div>
                  </div>
                )}
                
                {!peer.stream && !peer.isConnected && (
                  <div className="absolute inset-0 bg-gray-900/95 backdrop-blur-sm flex items-center justify-center">
                    <div className="text-center">
                      <div className="relative mb-4">
                        <div className="w-12 h-12 border-3 border-blue-500/30 rounded-full"></div>
                        <div className="absolute top-0 left-0 w-12 h-12 border-3 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                      </div>
                      <p className="text-white font-medium text-sm">Connecting...</p>
                      <p className="text-gray-400 text-xs mt-1">Establishing connection</p>
                    </div>
                  </div>
                )}
              </div>
            ))}
            </div>
          </div>
          
          {/* Chat Panel */}
          {isChatOpen && (
            <div className="w-80 bg-gray-800/95 backdrop-blur-sm border-l border-gray-700/50 flex flex-col h-[calc(100vh-200px)]">
              <div className="p-4 border-b border-gray-700/50">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-white">Chat</h3>
                  <Button
                    onClick={() => setIsChatOpen(false)}
                    variant="ghost"
                    size="sm"
                    className="text-gray-400 hover:text-white"
                  >
                    ×
                  </Button>
                </div>
                <p className="text-sm text-gray-400 mt-1">
                  {Object.keys(peers).length + 1} participant{(Object.keys(peers).length + 1) !== 1 ? 's' : ''}
                </p>
              </div>
              
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {chatMessages.length === 0 ? (
                  <div className="text-center text-gray-400 py-8">
                    <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No messages yet</p>
                    <p className="text-sm">Start a conversation!</p>
                  </div>
                ) : (
                  chatMessages.map((message) => (
                    <div key={message.id} className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-blue-400">{message.user}</span>
                        <span className="text-xs text-gray-500">
                          {message.timestamp.toLocaleTimeString()}
                        </span>
                      </div>
                      <p className="text-gray-200 text-sm bg-gray-700/50 rounded-lg p-2">
                        {message.message}
                      </p>
                    </div>
                  ))
                )}
                <div ref={chatMessagesEndRef} />
              </div>
              
              <div className="p-4 border-t border-gray-700/50">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && sendChatMessage()}
                    placeholder="Type a message..."
                    className="flex-1 bg-gray-700/50 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  />
                  <Button
                    onClick={sendChatMessage}
                    disabled={!newMessage.trim()}
                    size="sm"
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    Send
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

        {/* Controls - Center-aligned and Responsive */}
        <div className="sticky bottom-0 left-0 right-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-3 sm:p-4">
          <div className="max-w-7xl mx-auto flex flex-col items-center gap-4">
            
            {/* Connection Status - Mobile Only */}
            <div className="flex md:hidden items-center gap-2 text-sm">
              {connectionQuality !== 'unknown' && (
                <div className="flex items-center gap-2 px-2 py-1 bg-gray-700/50 rounded-lg">
                  {connectionQuality === 'good' ? (
                    <Wifi className="h-3 w-3 text-green-400" />
                  ) : (
                    <WifiOff className="h-3 w-3 text-yellow-400" />
                  )}
                  <span className="text-gray-200 font-medium text-xs capitalize">{connectionQuality}</span>
                </div>
              )}
            </div>

            {/* Primary Controls - Center Aligned */}
            <div className="flex items-center justify-center gap-2 sm:gap-3 flex-wrap">
              {/* Core Controls */}
              <div className="flex items-center gap-2 sm:gap-3">
                <Button
                  onClick={toggleAudio}
                  variant={isAudioEnabled ? 'default' : 'destructive'}
                  size="lg"
                  className={`rounded-full w-12 h-12 sm:w-14 sm:h-14 transition-all duration-200 hover:scale-105 active:scale-95 ${
                    isAudioEnabled 
                      ? 'bg-gray-600 hover:bg-gray-500 shadow-lg hover:shadow-xl' 
                      : 'bg-red-600 hover:bg-red-700 shadow-lg hover:shadow-red-500/25'
                  }`}
                  title={isAudioEnabled ? 'Mute microphone' : 'Unmute microphone'}
                >
                  {isAudioEnabled ? <Mic className="h-5 w-5 sm:h-6 sm:w-6" /> : <MicOff className="h-5 w-5 sm:h-6 sm:w-6" />}
                </Button>
                
                <Button
                  onClick={toggleVideo}
                  variant={isVideoEnabled ? 'default' : 'destructive'}
                  size="lg"
                  className={`rounded-full w-12 h-12 sm:w-14 sm:h-14 transition-all duration-200 hover:scale-105 active:scale-95 ${
                    isVideoEnabled 
                      ? 'bg-gray-600 hover:bg-gray-500 shadow-lg hover:shadow-xl' 
                      : 'bg-red-600 hover:bg-red-700 shadow-lg hover:shadow-red-500/25'
                  }`}
                  title={isVideoEnabled ? 'Turn off camera' : 'Turn on camera'}
                >
                  {isVideoEnabled ? <Video className="h-5 w-5 sm:h-6 sm:w-6" /> : <VideoOff className="h-5 w-5 sm:h-6 sm:w-6" />}
                </Button>
                
                <Button
                  onClick={toggleScreenShare}
                  variant={isScreenSharing ? 'default' : 'outline'}
                  size="lg"
                  className={`rounded-full w-12 h-12 sm:w-14 sm:h-14 transition-all duration-200 hover:scale-105 active:scale-95 ${
                    isScreenSharing 
                      ? 'bg-blue-600 hover:bg-blue-700 shadow-lg hover:shadow-blue-500/25' 
                      : 'border-gray-600 text-gray-300 hover:bg-gray-700/50 hover:border-gray-500'
                  }`}
                  title={isScreenSharing ? 'Stop sharing' : 'Share screen'}
                >
                  {isScreenSharing ? <MonitorOff className="h-5 w-5 sm:h-6 sm:w-6" /> : <Monitor className="h-5 w-5 sm:h-6 sm:w-6" />}
                </Button>
              </div>

              {/* Secondary Controls */}
              <div className="flex items-center gap-2 sm:gap-3">
                <Button
                  onClick={toggleRecording}
                  variant={isRecording ? 'destructive' : 'outline'}
                  size="lg"
                  className={`rounded-full w-12 h-12 sm:w-14 sm:h-14 transition-all duration-200 hover:scale-105 active:scale-95 ${
                    isRecording 
                      ? 'bg-red-600 hover:bg-red-700 shadow-lg hover:shadow-red-500/25' 
                      : 'border-gray-600 text-gray-300 hover:bg-gray-700/50 hover:border-gray-500'
                  }`}
                  title={isRecording ? 'Stop recording' : 'Start recording'}
                >
                  {isRecording ? <Square className="h-5 w-5 sm:h-6 sm:w-6" /> : <Circle className="h-5 w-5 sm:h-6 sm:w-6" />}
                </Button>
                
                <Button
                  onClick={toggleHandRaise}
                  variant={isHandRaised ? 'default' : 'outline'}
                  size="lg"
                  className={`rounded-full w-12 h-12 sm:w-14 sm:h-14 transition-all duration-200 hover:scale-105 active:scale-95 ${
                    isHandRaised 
                      ? 'bg-yellow-600 hover:bg-yellow-700 shadow-lg hover:shadow-yellow-500/25' 
                      : 'border-gray-600 text-gray-300 hover:bg-gray-700/50 hover:border-gray-500'
                  }`}
                  title={isHandRaised ? 'Lower hand' : 'Raise hand'}
                >
                  {isHandRaised ? <Hand className="h-5 w-5 sm:h-6 sm:w-6 fill-current" /> : <Hand className="h-5 w-5 sm:h-6 sm:w-6" />}
                </Button>
                
                <Button
                  onClick={() => setIsChatOpen(!isChatOpen)}
                  variant={isChatOpen ? 'default' : 'outline'}
                  size="lg"
                  className={`rounded-full w-12 h-12 sm:w-14 sm:h-14 transition-all duration-200 hover:scale-105 active:scale-95 ${
                    isChatOpen 
                      ? 'bg-blue-600 hover:bg-blue-700 shadow-lg hover:shadow-blue-500/25' 
                      : 'border-gray-600 text-gray-300 hover:bg-gray-700/50 hover:border-gray-500'
                  }`}
                  title={isChatOpen ? 'Close chat' : 'Open chat'}
                >
                  {isChatOpen ? <MessageSquareOff className="h-5 w-5 sm:h-6 sm:w-6" /> : <MessageSquare className="h-5 w-5 sm:h-6 sm:w-6" />}
                </Button>
              </div>

              {/* Action Controls */}
              <div className="flex items-center gap-2 sm:gap-3">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={copyMeetingCode}
                  className="w-10 h-10 sm:w-12 sm:h-12 border-gray-600 text-gray-300 hover:bg-gray-700/50 hover:border-gray-500 transition-all duration-200 hover:scale-105 active:scale-95"
                  title="Copy meeting code"
                >
                  {copied ? <Check className="h-4 w-4 sm:h-5 sm:w-5 text-green-400" /> : <Copy className="h-4 w-4 sm:h-5 sm:w-5" />}
                </Button>
                
                <div className="relative" data-device-settings>
                  <Button
                    onClick={() => setShowDeviceSettings(!showDeviceSettings)}
                    variant="outline"
                    size="icon"
                    className="w-10 h-10 sm:w-12 sm:h-12 border-gray-600 text-gray-300 hover:bg-gray-700/50 hover:border-gray-500 transition-all duration-200 hover:scale-105 active:scale-95"
                    title="Device settings"
                  >
                    <Settings className="h-4 w-4 sm:h-5 sm:w-5" />
                  </Button>
                  
                  {showDeviceSettings && (
                    <div className="absolute bottom-14 sm:bottom-16 left-1/2 transform -translate-x-1/2 sm:left-auto sm:right-0 sm:transform-none bg-gray-800/95 backdrop-blur-sm rounded-xl p-4 sm:p-6 w-80 sm:min-w-80 shadow-2xl border border-gray-700/50 max-h-80 sm:max-h-96 overflow-y-auto">
                      <h3 className="text-lg font-semibold text-white mb-4">Device Settings</h3>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">Camera</label>
                          <select
                            value={selectedVideoDevice}
                            onChange={(e) => switchVideoDevice(e.target.value)}
                            className="w-full bg-gray-700/50 border border-gray-600 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                          >
                            {availableDevices
                              .filter(device => device.kind === 'videoinput')
                              .map(device => (
                                <option key={device.deviceId} value={device.deviceId}>
                                  {device.label || `Camera ${device.deviceId.slice(0, 8)}`}
                                </option>
                              ))}
                          </select>
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">Microphone</label>
                          <select
                            value={selectedAudioDevice}
                            onChange={(e) => switchAudioDevice(e.target.value)}
                            className="w-full bg-gray-700/50 border border-gray-600 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                          >
                            {availableDevices
                              .filter(device => device.kind === 'audioinput')
                              .map(device => (
                                <option key={device.deviceId} value={device.deviceId}>
                                  {device.label || `Microphone ${device.deviceId.slice(0, 8)}`}
                                </option>
                              ))}
                          </select>
                        </div>
                        
                        {/* Audio Processing Settings */}
                        <div className="border-t border-gray-600/50 pt-4">
                          <h4 className="text-sm font-medium text-gray-300 mb-3">Audio Processing</h4>
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-gray-300">Noise Suppression</span>
                              <Button
                                onClick={() => {
                                  setIsNoiseSuppression(!isNoiseSuppression);
                                  updateAudioSettings();
                                }}
                                variant={isNoiseSuppression ? "default" : "outline"}
                                size="sm"
                                className="text-xs"
                              >
                                {isNoiseSuppression ? "On" : "Off"}
                              </Button>
                            </div>
                            
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-gray-300">Echo Cancellation</span>
                              <Button
                                onClick={() => {
                                  setIsEchoCancellation(!isEchoCancellation);
                                  updateAudioSettings();
                                }}
                                variant={isEchoCancellation ? "default" : "outline"}
                                size="sm"
                                className="text-xs"
                              >
                                {isEchoCancellation ? "On" : "Off"}
                              </Button>
                            </div>
                            
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-gray-300">Auto Gain Control</span>
                              <Button
                                onClick={() => {
                                  setIsAutoGainControl(!isAutoGainControl);
                                  updateAudioSettings();
                                }}
                                variant={isAutoGainControl ? "default" : "outline"}
                                size="sm"
                                className="text-xs"
                              >
                                {isAutoGainControl ? "On" : "Off"}
                              </Button>
                            </div>
                          </div>
                        </div>
                        
                        {/* Video Quality Settings */}
                        <div className="border-t border-gray-600/50 pt-4">
                          <h4 className="text-sm font-medium text-gray-300 mb-3">Video Quality</h4>
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-300">HD Video</span>
                            <Button
                              onClick={() => {
                                setIsHDVideo(!isHDVideo);
                                updateAudioSettings();
                              }}
                              variant={isHDVideo ? "default" : "outline"}
                              size="sm"
                              className="text-xs"
                            >
                              {isHDVideo ? "On" : "Off"}
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                
                <Button
                  onClick={handleLeaveMeeting}
                  variant="destructive"
                  className="w-10 h-10 sm:w-12 sm:h-12 bg-red-600 hover:bg-red-700 shadow-lg hover:shadow-red-500/25 transition-all duration-200 hover:scale-105 active:scale-95"
                  title="Leave meeting"
                >
                  <PhoneOff className="h-4 w-4 sm:h-5 sm:w-5" />
                </Button>
              </div>
            </div>

            {/* Connection Status - Desktop Only */}
            <div className="hidden md:flex items-center gap-4 text-sm">
              {connectionQuality !== 'unknown' && (
                <div className="flex items-center gap-2 px-3 py-2 bg-gray-700/50 rounded-lg">
                  {connectionQuality === 'good' ? (
                    <Wifi className="h-4 w-4 text-green-400" />
                  ) : (
                    <WifiOff className="h-4 w-4 text-yellow-400" />
                  )}
                  <span className="text-gray-200 font-medium capitalize">{connectionQuality}</span>
                </div>
              )}
            </div>
          </div>
        </div>
        {/* Recording Timer */}
        {isRecording && (
          <div className="fixed left-1/2 -translate-x-1/2 bottom-24 z-50">
            <div className="bg-red-600 text-white px-4 py-2 rounded-full text-sm flex items-center gap-2 shadow-lg animate-pulse">
              <Circle className="h-3 w-3 fill-current" />
              <span className="font-medium">Recording {formatRecordingTime(recordingTime)}</span>
            </div>
          </div>
        )}
      </section>
    </main>
    
    {/* Enhanced Save recording dialog */}
    {showSaveRecording && (
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <div className="w-full sm:max-w-lg bg-gray-800/95 backdrop-blur-sm border border-gray-700/50 rounded-2xl shadow-2xl animate-in slide-in-from-bottom-4 duration-300">
          <div className="p-6 border-b border-gray-700/50">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-600/20 rounded-lg">
                <Circle className="h-5 w-5 text-red-400" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-white">Recording Complete</h3>
                <p className="text-sm text-gray-400">Your meeting recording is ready</p>
              </div>
            </div>
          </div>
          
          <div className="p-6 space-y-4">
            <div className="bg-gray-700/30 rounded-lg p-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-300">Duration:</span>
                <span className="text-white font-medium">{formatRecordingTime(recordingTime)}</span>
              </div>
              <div className="flex items-center justify-between text-sm mt-2">
                <span className="text-gray-300">Format:</span>
                <span className="text-white font-medium">WebM (VP9)</span>
              </div>
              <div className="flex items-center justify-between text-sm mt-2">
                <span className="text-gray-300">Size:</span>
                <span className="text-white font-medium">{formatBytes(recordingSize)}</span>
              </div>
            </div>
            
            <p className="text-sm text-gray-300 text-center">
              Would you like to download your recording now?
            </p>
          </div>
          
          <div className="p-6 pt-0 flex flex-col sm:flex-row gap-3">
            <Button
              onClick={discardRecording}
              variant="outline"
              className="flex-1 border-gray-600 text-gray-300 hover:bg-gray-700/50 hover:border-gray-500 transition-all duration-200"
            >
              Discard Recording
            </Button>
            <Button
              onClick={() => {
                downloadRecording();
                setShowSaveRecording(false);
                // Revoke after closing dialog to free memory
                setTimeout(() => {
                  if (recordingUrl) URL.revokeObjectURL(recordingUrl);
                  setRecordingUrl('');
                  setRecordingSize(0);
                }, 300);
              }}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white transition-all duration-200 hover:scale-105 active:scale-95"
            >
              Download Recording
            </Button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}
