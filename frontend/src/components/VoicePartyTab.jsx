import React, { useState, useEffect, useRef, useContext, useCallback } from 'react';
import api from '../api';
import toast from 'react-hot-toast';
import { SocketContext } from '../context/SocketContext';
import { Mic, MicOff, PhoneOff, PhoneCall, Volume2, Users, Trash2 } from 'lucide-react';
import SkeletonLoader from './SkeletonLoader';

const VoicePartyTab = ({ communityId, currentUser, isMod, isCreator }) => {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeRoomId, setActiveRoomId] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [participants, setParticipants] = useState([]); // { id, stream, isMuted }
  
  const { socket } = useContext(SocketContext);
  const userStream = useRef(null);
  const peers = useRef({}); // { socketId: RTCPeerConnection }
  const audioRefs = useRef({}); // { socketId: HTMLAudioElement }

  const token = localStorage.getItem('token');
  const curUserId = currentUser?.id || currentUser?._id;

  const fetchRooms = useCallback(async () => {
    try {
      const res = await api.get(`/api/voice/community/${communityId}`);
      setRooms(res.data);
    } catch (err) {
      console.error("Error fetching voice rooms", err);
    } finally {
      setLoading(false);
    }
  }, [communityId]);

  useEffect(() => {
    fetchRooms();
  }, [fetchRooms]);

  // WebRTC Configuration
  const rtcConfig = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:global.stun.twilio.com:3478' }
    ]
  };

  // --- WebRTC Logic ---
  useEffect(() => {
    if (!socket || !activeRoomId) return;

    const startLocalStream = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        userStream.current = stream;
        
        // Add self to participants
        setParticipants([{ id: curUserId, socketId: socket.id, isSelf: true }]);
        
        // Tell server we joined
        socket.emit('join-voice-room', { roomId: activeRoomId, userId: curUserId });

      } catch (err) {
        toast.error("Microphone access denied or not available");
        leaveRoom();
        console.error("Mic error:", err);
      }
    };

    startLocalStream();

    // 1. A new user joined, I should call them (I am the caller)
    socket.on('user-connected-voice', async ({ socketId, userId }) => {
      console.log('User connected:', socketId, userId);
      const peer = createPeer(socketId, userId, true);
      peers.current[socketId] = peer;
    });

    // 2. Incoming call offer from someone
    socket.on('voice-offer', async ({ offer, callerSocketId, userId }) => {
      const peer = createPeer(callerSocketId, userId, false);
      peers.current[callerSocketId] = peer;
      
      await peer.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await peer.createAnswer();
      await peer.setLocalDescription(answer);
      
      socket.emit('voice-answer', {
        answer,
        targetSocketId: callerSocketId,
        answererSocketId: socket.id
      });
    });

    // 3. Answer received from my offer
    socket.on('voice-answer', async ({ answer, answererSocketId }) => {
      const peer = peers.current[answererSocketId];
      if (peer) {
        await peer.setRemoteDescription(new RTCSessionDescription(answer));
      }
    });

    // 4. ICE Candidates
    socket.on('voice-candidate', async ({ candidate, senderSocketId }) => {
      const peer = peers.current[senderSocketId];
      if (peer) {
        await peer.addIceCandidate(new RTCIceCandidate(candidate));
      }
    });

    // 5. User disconnected
    socket.on('user-disconnected-voice', (disconnectedSocketId) => {
      console.log('User disconnected:', disconnectedSocketId);
      if (peers.current[disconnectedSocketId]) {
        peers.current[disconnectedSocketId].close();
        delete peers.current[disconnectedSocketId];
      }
      setParticipants(prev => prev.filter(p => p.socketId !== disconnectedSocketId));
    });

    return () => {
      socket.off('user-connected-voice');
      socket.off('voice-offer');
      socket.off('voice-answer');
      socket.off('voice-candidate');
      socket.off('user-disconnected-voice');
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket, activeRoomId]);

  const createPeer = (targetSocketId, targetUserId, isInitiator) => {
    const peer = new RTCPeerConnection(rtcConfig);

    // Add local tracks
    if (userStream.current) {
      userStream.current.getTracks().forEach(track => {
        peer.addTrack(track, userStream.current);
      });
    }

    // Handle ICE
    peer.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit('voice-candidate', {
          candidate: event.candidate,
          targetSocketId: targetSocketId,
          senderSocketId: socket.id
        });
      }
    };

    // Receive remote tracks
    peer.ontrack = (event) => {
      setParticipants(prev => {
        // Only add if not already in list to avoid duplicates
        if (!prev.find(p => p.socketId === targetSocketId)) {
          return [...prev, { id: targetUserId || targetSocketId, socketId: targetSocketId, stream: event.streams[0] }];
        }
        return prev;
      });
    };

    if (isInitiator) {
      peer.createOffer().then(offer => {
        peer.setLocalDescription(offer);
        socket.emit('voice-offer', {
          offer,
          targetSocketId: targetSocketId,
          callerSocketId: socket.id,
          userId: curUserId // Pass our user ID so receiver knows who called
        });
      });
    }

    return peer;
  };

  const handleStartRoom = async () => {
    if (!token) return toast.error("Please log in to start a party!");
    try {
      const res = await api.post('/api/voice', {
        name: `${currentUser.username}'s Voice Party`,
        communityId
      });
      toast.success("Voice Party started!");
      fetchRooms();
      setActiveRoomId(res.data._id);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to start room");
    }
  };

  const joinRoom = (roomId) => {
    if (!token) return toast.error("Please log in to join!");
    setActiveRoomId(roomId);
  };

  const leaveRoom = () => {
    if (activeRoomId && socket) {
      socket.emit('leave-voice-room', { roomId: activeRoomId, userId: curUserId });
    }
    
    // Cleanup WebRTC
    Object.values(peers.current).forEach(peer => peer.close());
    peers.current = {};
    audioRefs.current = {};
    
    if (userStream.current) {
      userStream.current.getTracks().forEach(track => track.stop());
      userStream.current = null;
    }

    setActiveRoomId(null);
    setParticipants([]);
    setIsMuted(false);
    fetchRooms(); // Refresh rooms list
  };

  const toggleMute = () => {
    if (userStream.current) {
      const audioTrack = userStream.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  };

  const handleDeleteRoom = async (roomId) => {
    try {
      await api.delete(`/api/voice/${roomId}`);
      toast.success("Room ended.");
      fetchRooms();
      if (activeRoomId === roomId) {
        leaveRoom();
      }
    } catch (error) {
      console.error("Delete room error:", error);
      toast.error("Failed to end room");
    }
  };

  // Helper to connect streams to audio elements dynamically
  const streamCallback = (node, stream) => {
    if (node && stream && node.srcObject !== stream) {
      node.srcObject = stream;
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      leaveRoom();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) return <div className="mt-4"><SkeletonLoader /></div>;

  return (
    <div className="flex flex-col gap-4">
      
      {!activeRoomId ? (
        <>
          <div className="flex justify-between items-center bg-white dark:bg-[#1a1a1b] border border-gray-200 dark:border-[#343536] p-4 rounded-md shadow-sm">
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Voice Parties</h2>
              <p className="text-sm text-gray-500">Jump into live audio rooms.</p>
            </div>
            {(isMod || isCreator) && (
              <button 
                onClick={handleStartRoom}
                className="flex items-center gap-1.5 bg-orange-500 text-white px-4 py-2 rounded-full font-bold text-sm hover:bg-orange-600 transition-colors shadow-md"
              >
                <Mic size={16} /> Start Room
              </button>
            )}
          </div>

          {rooms.length === 0 ? (
            <div className="bg-white dark:bg-[#1a1a1b] border border-gray-200 dark:border-[#343536] p-10 rounded-md text-center">
              <PhoneOff size={48} className="mx-auto text-gray-300 dark:text-[#343536] mb-4" />
              <p className="text-gray-500 font-bold mb-1">No active voice parties.</p>
              <p className="text-sm text-gray-400">Start one to hang out with others!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {rooms.map(room => {
                const canDelete = isMod || isCreator || room.creator?._id === curUserId;
                return (
                <div key={room._id} className="bg-white dark:bg-[#1a1a1b] border border-orange-200 dark:border-orange-500/30 p-5 rounded-md shadow-sm relative group hover:border-orange-300 transition-colors">
                  {canDelete && (
                    <button onClick={() => handleDeleteRoom(room._id)} className="absolute top-4 right-4 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Trash2 size={16} />
                    </button>
                  )}
                  <div className="flex justify-between items-start mb-3 pr-6">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                       <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse"></span>
                       {room.name}
                    </h3>
                  </div>
                  
                  <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
                    <Users size={16} />
                    <span>{room.participants?.length || 0} active listener(s)</span>
                  </div>

                  <div className="flex justify-between mt-4">
                    <p className="text-xs text-gray-400 self-end">
                      Host: u/{room.creator?.username || 'user'}
                    </p>
                    <button 
                      onClick={() => joinRoom(room._id)}
                      className="bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 px-4 py-1.5 rounded-full font-bold text-sm hover:bg-orange-200 dark:hover:bg-orange-900/50 transition-colors"
                    >
                      Join Room
                    </button>
                  </div>
                </div>
                );
              })}
            </div>
          )}
        </>
      ) : (
        // ACTIVE ROOM VIEW
        <div className="bg-white dark:bg-[#1a1a1b] border border-orange-500/50 p-6 rounded-md shadow-lg animate-fade-in relative overflow-hidden">
          {/* Background Glow */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>

          <div className="flex justify-between items-center border-b border-gray-200 dark:border-[#343536] pb-4 mb-6 relative z-10">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Volume2 className="text-orange-500 animate-pulse" /> Live Voice Party
              </h2>
              <p className="text-sm text-gray-500 font-medium">Connected and talking</p>
            </div>
            
            <div className="flex gap-2">
              <button 
                onClick={toggleMute}
                className={`p-3 rounded-full shadow-sm transition-all ${
                  isMuted ? 'bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400' : 'bg-gray-100 text-gray-700 dark:bg-[#272729] dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-[#343536]'
                }`}
              >
                {isMuted ? <MicOff size={20} /> : <Mic size={20} />}
              </button>
              <button 
                onClick={leaveRoom}
                className="bg-red-500 hover:bg-red-600 text-white p-3 rounded-full shadow-md transition-colors flex items-center gap-2 font-bold px-4"
              >
                <PhoneCall size={20} /> Leave
              </button>
            </div>
          </div>

          {/* Participants Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 relative z-10 mb-4 min-h-50">
            {participants.map((p, idx) => (
              <div key={idx} className="flex flex-col items-center justify-center p-4 bg-gray-50 dark:bg-[#272729] rounded-xl border border-gray-200 dark:border-[#343536]">
                <div className={`w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold mb-2 shadow-inner relative ${
                  p.isSelf ? 'bg-orange-500 text-white' : 'bg-blue-500 text-white'
                }`}>
                  {/* Just showing first letter of ID / Placeholder for avatar */}
                  {p.isSelf ? 'You' : p.id.substring(0,2)}
                  
                  {/* Fake Audio level ring for aesthetics */}
                  {!p.isSelf && <div className="absolute inset-0 rounded-full border-2 border-green-400 animate-ping opacity-20"></div>}
                </div>
                <span className="text-xs font-bold text-gray-700 dark:text-gray-300 truncate max-w-full">
                  {p.isSelf ? 'You' : `User ${p.id.substring(0,4)}`}
                </span>
                
                {/* Audio Elements (Hidden) */}
                {!p.isSelf && p.stream && (
                  <audio autoPlay ref={node => streamCallback(node, p.stream)} />
                )}
              </div>
            ))}
          </div>
          
          {/* Host Controls */}
          {rooms.find(r => r._id === activeRoomId)?.creator?._id === curUserId && (
            <div className="pt-4 border-t border-gray-200 dark:border-[#343536] flex justify-end">
               <button 
                 onClick={() => handleDeleteRoom(activeRoomId)}
                 className="text-xs text-red-500 hover:text-red-700 font-bold"
               >
                 End Party for Everyone
               </button>
            </div>
          )}

        </div>
      )}
    </div>
  );
};

export default VoicePartyTab;
