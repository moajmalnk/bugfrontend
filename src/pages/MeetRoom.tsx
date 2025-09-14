import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { joinMeeting, leaveMeeting } from "@/services/meetings";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
  ChevronUp
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

  const wsUrl = useMemo(() => {
    const proto = location.protocol === 'https:' ? 'wss' : 'ws';
    const host = location.hostname;
    const port = 8089;
    return `${proto}://${host}:${port}`;
  }, []);

  const createPeerConnection = useCallback((peerId: string): RTCPeerConnection => {
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' }
      ],
      iceCandidatePoolSize: 10
    });

    // Add local stream tracks
    if (localStream) {
      localStream.getTracks().forEach(track => {
        pc.addTrack(track, localStream);
      });
    }

    // Handle remote stream
    pc.ontrack = (event) => {
      console.log(`Received remote stream from ${peerId}`);
      const [remoteStream] = event.streams;
      
      setPeers(prev => ({
        ...prev,
        [peerId]: {
          ...prev[peerId],
          stream: remoteStream,
          isConnected: true
        }
      }));

      // Set video element source
      setTimeout(() => {
        const videoElement = remoteVideoRefs.current[peerId];
        if (videoElement) {
          videoElement.srcObject = remoteStream;
        }
      }, 100);
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

    // Handle connection state changes
    pc.onconnectionstatechange = () => {
      console.log(`Peer ${peerId} connection state: ${pc.connectionState}`);
      
      setPeers(prev => ({
        ...prev,
        [peerId]: {
          ...prev[peerId],
          isConnected: pc.connectionState === 'connected'
        }
      }));

      // Only clean up on closed state, not on failed/disconnected
      if (pc.connectionState === 'closed') {
        console.log(`Cleaning up peer connection for ${peerId}`);
        delete peersRef.current[peerId];
        setPeers(prev => {
          const newPeers = { ...prev };
          delete newPeers[peerId];
          return newPeers;
        });
      }
    };

    // Handle ICE connection state changes
    pc.oniceconnectionstatechange = () => {
      console.log(`Peer ${peerId} ICE connection state: ${pc.iceConnectionState}`);
      
      if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
        setConnectionQuality('good');
      } else if (pc.iceConnectionState === 'disconnected' || pc.iceConnectionState === 'failed') {
        setConnectionQuality('poor');
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
    
    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;
      
      ws.onopen = () => {
        console.log('WebSocket connected');
        setIsConnected(true);
        setIsConnecting(false);
        setError(null);
        reconnectAttempts.current = 0; // Reset reconnection attempts
        ws.send(JSON.stringify({ type: 'join', code }));
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
                
                // Create and send offer immediately
                try {
                  const offer = await pc.createOffer();
                  await pc.setLocalDescription(offer);
                  ws.send(JSON.stringify({
                    type: 'signal',
                    code,
                    payload: { to: peerId, signal: { sdp: offer } }
                  }));
                } catch (err) {
                  console.error(`Error creating offer for ${peerId}:`, err);
                  // Clean up failed peer connection
                  delete peersRef.current[peerId];
                  setPeers(prev => {
                    const newPeers = { ...prev };
                    delete newPeers[peerId];
                    return newPeers;
                  });
                }
              }
            }
          }
          
          if (msg.type === 'peer-joined') {
            const peerId = msg.peerId;
            setParticipantCount(prev => prev + 1);
            
            // Only create peer connection if we don't already have one
            if (!peersRef.current[peerId]) {
              console.log(`New peer joined: ${peerId}`);
              const pc = createPeerConnection(peerId);
              const peerConnection = { pc, isConnected: false };
              peersRef.current[peerId] = peerConnection;
              setPeers(prev => ({
                ...prev,
                [peerId]: peerConnection
              }));
              
              // Create and send offer immediately
              try {
                const offer = await pc.createOffer();
                await pc.setLocalDescription(offer);
                ws.send(JSON.stringify({
                  type: 'signal',
                  code,
                  payload: { to: peerId, signal: { sdp: offer } }
                }));
              } catch (err) {
                console.error(`Error creating offer for ${peerId}:`, err);
                // Clean up failed peer connection
                delete peersRef.current[peerId];
                setPeers(prev => {
                  const newPeers = { ...prev };
                  delete newPeers[peerId];
                  return newPeers;
                });
              }
            }
          }
          
        if (msg.type === 'signal') {
            const fromId = msg.from;
          const signal = msg.signal;
            await handleSignal(fromId, signal);
          }
        } catch (err) {
          console.error('Error handling WebSocket message:', err);
        }
      };
      
      ws.onclose = () => {
        console.log('WebSocket disconnected');
        setIsConnected(false);
        setConnectionQuality('unknown');
        
        // Don't clean up peer connections immediately on WebSocket close
        // They might reconnect automatically
        
        // Only show error if we were connected
        if (isConnected) {
          setError('Connection lost. Please refresh the page.');
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
          // Handle offer - reset connection if needed
          let currentPc = pc;
          if (pc.signalingState !== 'stable') {
            console.log(`Resetting peer connection for ${fromId} before handling offer`);
            pc.close();
            const newPc = createPeerConnection(fromId);
            setPeers(prev => ({
              ...prev,
              [fromId]: { pc: newPc, isConnected: false }
            }));
            peersRef.current[fromId] = { pc: newPc, isConnected: false };
            currentPc = newPc;
          }
          
          await currentPc.setRemoteDescription(desc);
          const answer = await currentPc.createAnswer();
          await currentPc.setLocalDescription(answer);
          
          wsRef.current?.send(JSON.stringify({
            type: 'signal',
            code,
            payload: { to: fromId, signal: { sdp: answer } }
          }));
        } else if (desc.type === 'answer') {
          // Handle answer
          if (pc.signalingState === 'have-local-offer') {
            await pc.setRemoteDescription(desc);
          } else {
            console.log(`Skipping answer from ${fromId}, not in have-local-offer state: ${pc.signalingState}`);
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
        setError('Meeting initialization timed out. Please try again.');
        setIsConnecting(false);
      }, 15000); // 15 second timeout
      
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
      console.log('Local stream created:', stream);
      console.log('Video tracks:', stream.getVideoTracks());
      console.log('Audio tracks:', stream.getAudioTracks());
      
      // Set local video source with retry mechanism
      const setVideoSource = (retries = 3) => {
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
          localVideoRef.current.play().catch(console.error);
          console.log('Video element srcObject set');
        } else if (retries > 0) {
          console.log(`Local video ref is null, retrying... (${retries} attempts left)`);
          setTimeout(() => setVideoSource(retries - 1), 200);
        } else {
          console.error('Local video ref is still null after all retries');
        }
      };
      
      setTimeout(() => setVideoSource(), 100);
      
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
      
      // Force play the video
      const playVideo = async () => {
        try {
          await localVideoRef.current?.play();
          console.log('Local video playing successfully');
        } catch (error) {
          console.error('Error playing local video:', error);
          // Try again after a short delay
          setTimeout(() => {
            localVideoRef.current?.play().catch(console.error);
          }, 100);
        }
      };
      
      playVideo();
    }
  }, [localStream]);

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
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white">
      {/* Header */}
      <div className="bg-gray-800/95 backdrop-blur-sm border-b border-gray-700/50 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-600/20 rounded-lg">
                <Video className="h-5 w-5 text-blue-400" />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-white">BugMeet</h1>
                <p className="text-sm text-gray-400">Meeting {code}</p>
              </div>
            </div>
            
            <div className="hidden md:flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-700/50 rounded-lg">
                <Users className="h-4 w-4 text-gray-300" />
                <span className="text-gray-200 font-medium">
                  {Object.keys(peers).length + 1} participant{(Object.keys(peers).length + 1) !== 1 ? 's' : ''}
                </span>
              </div>
              
              <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-700/50 rounded-lg">
                <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                <span className="text-gray-200 font-medium">
                  {isConnected ? 'Connected' : 'Disconnected'}
                </span>
                {connectionQuality !== 'unknown' && (
                  <div className="flex items-center gap-1 ml-2">
                    {connectionQuality === 'good' ? (
                      <Wifi className="h-3 w-3 text-green-400" />
                    ) : (
                      <WifiOff className="h-3 w-3 text-yellow-400" />
                    )}
                    <span className="text-xs text-gray-400 capitalize">{connectionQuality}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={copyMeetingCode}
              className="border-gray-600 text-gray-300 hover:bg-gray-700/50 hover:border-gray-500 transition-all duration-200"
            >
              {copied ? <Check className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4" />}
              <span className="ml-2 font-mono text-sm">{code}</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/admin/meet')}
              className="border-gray-600 text-gray-300 hover:bg-gray-700/50 hover:border-gray-500 transition-all duration-200"
            >
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Video Grid */}
      <div className="flex-1 p-6 pb-24">
        <div className="max-w-7xl mx-auto">
          <div className="grid gap-6 [grid-template-columns:repeat(auto-fit,minmax(280px,1fr))] lg:[grid-template-columns:repeat(auto-fit,minmax(320px,1fr))]">
            {/* Local Video */}
            <div className="group relative aspect-video bg-gray-800/50 rounded-2xl overflow-hidden border border-gray-600/50 hover:border-blue-500/50 transition-all duration-300 shadow-2xl hover:shadow-blue-500/10">
              <video
                ref={localVideoRef}
                autoPlay
                muted
                playsInline
                className="w-full h-full object-cover"
                style={{ backgroundColor: '#1f2937' }}
                onLoadedMetadata={() => console.log('Local video loaded')}
                onError={(e) => console.error('Local video error:', e)}
                onPlay={() => {
                  console.log('Local video started playing');
                  setIsVideoPlaying(true);
                }}
                onPause={() => {
                  console.log('Local video paused');
                  setIsVideoPlaying(false);
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
              
              {isVideoEnabled && localStream && !isVideoPlaying && (
                <div className="absolute inset-0 bg-gray-800/90 flex items-center justify-center">
                  <div className="text-center">
                    <Loader2 className="h-10 w-10 animate-spin text-blue-400 mx-auto mb-3" />
                    <p className="text-gray-300 font-medium mb-3">Starting video...</p>
                    <Button
                      onClick={() => {
                        if (localVideoRef.current) {
                          localVideoRef.current.play().catch(console.error);
                        }
                      }}
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                      size="sm"
                    >
                      Click to play
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Remote Videos */}
            {Object.entries(peers).map(([peerId, peer]) => (
              <div
                key={peerId}
                className="group relative aspect-video bg-gray-800/50 rounded-2xl overflow-hidden border border-gray-600/50 hover:border-blue-500/50 transition-all duration-300 shadow-2xl hover:shadow-blue-500/10"
              >
                <video
                  ref={(el) => {
                    if (el) remoteVideoRefs.current[peerId] = el;
                  }}
                  autoPlay
                  playsInline
                  className="w-full h-full object-cover"
                />
                
                {/* Gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                
                {/* Top-left label */}
                <div className="absolute top-3 left-3 bg-black/70 backdrop-blur-sm px-3 py-1.5 rounded-lg text-xs flex items-center gap-2 shadow-lg">
                  <div className={`w-2 h-2 rounded-full ${peer.isConnected ? 'bg-green-400 animate-pulse' : 'bg-yellow-400'}`} />
                  <span className="font-medium text-white">Participant {peerId.slice(-4)}</span>
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
                
                {!peer.stream && (
                  <div className="absolute inset-0 bg-gray-900/90 flex items-center justify-center">
                    <div className="text-center">
                      <div className="w-16 h-16 bg-gray-700/50 rounded-full flex items-center justify-center mx-auto mb-3">
                        <Users className="h-8 w-8 text-gray-400" />
                      </div>
                      <p className="text-gray-300 font-medium">Connecting...</p>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Controls - Enhanced 3 zone footer */}
      <div className="fixed bottom-0 left-0 right-0 bg-gray-800/95 backdrop-blur-sm border-t border-gray-700/50 py-4">
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between gap-4">
          {/* Left: meeting info */}
          <div className="hidden md:flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2 px-3 py-2 bg-gray-700/50 rounded-lg">
              <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
              <span className="text-gray-200 font-medium">
                {isConnected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
            
            <div className="flex items-center gap-2 px-3 py-2 bg-gray-700/50 rounded-lg">
              <Users className="h-4 w-4 text-gray-300" />
              <span className="text-gray-200 font-medium">
                {Object.keys(peers).length + 1} participant{(Object.keys(peers).length + 1) !== 1 ? 's' : ''}
              </span>
            </div>
            
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

          {/* Center: primary controls */}
          <div className="flex items-center justify-center gap-3">
            <Button
              onClick={toggleAudio}
              variant={isAudioEnabled ? 'default' : 'destructive'}
              size="lg"
              className={`rounded-full w-14 h-14 transition-all duration-200 hover:scale-105 active:scale-95 ${
                isAudioEnabled 
                  ? 'bg-gray-600 hover:bg-gray-500 shadow-lg hover:shadow-xl' 
                  : 'bg-red-600 hover:bg-red-700 shadow-lg hover:shadow-red-500/25'
              }`}
              title={isAudioEnabled ? 'Mute microphone' : 'Unmute microphone'}
            >
              {isAudioEnabled ? <Mic className="h-6 w-6" /> : <MicOff className="h-6 w-6" />}
            </Button>
            
            <Button
              onClick={toggleVideo}
              variant={isVideoEnabled ? 'default' : 'destructive'}
              size="lg"
              className={`rounded-full w-14 h-14 transition-all duration-200 hover:scale-105 active:scale-95 ${
                isVideoEnabled 
                  ? 'bg-gray-600 hover:bg-gray-500 shadow-lg hover:shadow-xl' 
                  : 'bg-red-600 hover:bg-red-700 shadow-lg hover:shadow-red-500/25'
              }`}
              title={isVideoEnabled ? 'Turn off camera' : 'Turn on camera'}
            >
              {isVideoEnabled ? <Video className="h-6 w-6" /> : <VideoOff className="h-6 w-6" />}
            </Button>
            
            <Button
              onClick={toggleScreenShare}
              variant={isScreenSharing ? 'default' : 'outline'}
              size="lg"
              className={`rounded-full w-14 h-14 transition-all duration-200 hover:scale-105 active:scale-95 ${
                isScreenSharing 
                  ? 'bg-blue-600 hover:bg-blue-700 shadow-lg hover:shadow-blue-500/25' 
                  : 'border-gray-600 text-gray-300 hover:bg-gray-700/50 hover:border-gray-500'
              }`}
              title={isScreenSharing ? 'Stop sharing' : 'Share screen'}
            >
              {isScreenSharing ? <MonitorOff className="h-6 w-6" /> : <Monitor className="h-6 w-6" />}
            </Button>
            
            <Button
              onClick={toggleRecording}
              variant={isRecording ? 'destructive' : 'outline'}
              size="lg"
              className={`rounded-full w-14 h-14 transition-all duration-200 hover:scale-105 active:scale-95 ${
                isRecording 
                  ? 'bg-red-600 hover:bg-red-700 shadow-lg hover:shadow-red-500/25' 
                  : 'border-gray-600 text-gray-300 hover:bg-gray-700/50 hover:border-gray-500'
              }`}
              title={isRecording ? 'Stop recording' : 'Start recording'}
            >
              {isRecording ? <Square className="h-6 w-6" /> : <Circle className="h-6 w-6" />}
            </Button>
          </div>

          {/* Right: actions */}
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="icon"
              onClick={copyMeetingCode}
              className="w-12 h-12 border-gray-600 text-gray-300 hover:bg-gray-700/50 hover:border-gray-500 transition-all duration-200 hover:scale-105 active:scale-95"
              title="Copy meeting code"
            >
              {copied ? <Check className="h-5 w-5 text-green-400" /> : <Copy className="h-5 w-5" />}
            </Button>
            
            <div className="relative" data-device-settings>
              <Button
                onClick={() => setShowDeviceSettings(!showDeviceSettings)}
                variant="outline"
                size="icon"
                className="w-12 h-12 border-gray-600 text-gray-300 hover:bg-gray-700/50 hover:border-gray-500 transition-all duration-200 hover:scale-105 active:scale-95"
                title="Device settings"
              >
                <Settings className="h-5 w-5" />
              </Button>
              
              {showDeviceSettings && (
                <div className="absolute bottom-16 right-0 bg-gray-800/95 backdrop-blur-sm rounded-xl p-6 min-w-72 shadow-2xl border border-gray-700/50">
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
                  </div>
                </div>
              )}
            </div>
            
            <Button
              onClick={handleLeaveMeeting}
              variant="destructive"
              className="w-12 h-12 bg-red-600 hover:bg-red-700 shadow-lg hover:shadow-red-500/25 transition-all duration-200 hover:scale-105 active:scale-95"
              title="Leave meeting"
            >
              <PhoneOff className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Recording Timer */}
        {isRecording && (
          <div className="absolute left-1/2 -translate-x-1/2 -top-4">
            <div className="bg-red-600 text-white px-4 py-2 rounded-full text-sm flex items-center gap-2 shadow-lg animate-pulse">
              <Circle className="h-3 w-3 fill-current" />
              <span className="font-medium">Recording {formatRecordingTime(recordingTime)}</span>
            </div>
          </div>
        )}
      </div>
      
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
    </div>
  );
}


