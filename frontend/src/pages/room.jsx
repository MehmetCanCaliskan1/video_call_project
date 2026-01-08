import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { useEffect, useState, useRef } from "react";
import { io } from "socket.io-client";
import FaceCamCard from "../components/FaceCamCard.jsx";
import "../room.css";
import { FcLeave } from "react-icons/fc";

export default function Room() {
  const navigate = useNavigate();
  const { roomId } = useParams();
  const [searchParams] = useSearchParams();
  const username = searchParams.get("username");

  // Kullanıcı ve video durumları
  const [users, setUsers] = useState([]);
  const [remoteStreams, setRemoteStreams] = useState({});
  const [mySocketId, setMySocketId] = useState(null);
  const [isInRoom, setIsInRoom] = useState(false);
  const [isHost, setIsHost] = useState(false);
  const [statusMessage, setStatusMessage] = useState("Sunucuya bağlanılıyor...");
  const [incomingRequests, setIncomingRequests] = useState([]);

  // Refler
  const socketRef = useRef(null);
  const pcsRef = useRef({});
  const localStreamRef = useRef(null);
  const iceQueueRef = useRef({});

  // --- PeerConnection Oluşturma ---
  const createPeerConnection = (otherId) => {
    if (pcsRef.current[otherId]) return pcsRef.current[otherId];

    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun.relay.metered.ca:80" },
        { urls: "turn:global.relay.metered.ca:80", username: "07af05e7c57849a01ae77b0c", credential: "GY2GcKhMltO2CdJk" },
        { urls: "turn:global.relay.metered.ca:80?transport=tcp", username: "07af05e7c57849a01ae77b0c", credential: "GY2GcKhMltO2CdJk" },
        { urls: "turn:global.relay.metered.ca:443", username: "07af05e7c57849a01ae77b0c", credential: "GY2GcKhMltO2CdJk" },
        { urls: "turns:global.relay.metered.ca:443?transport=tcp", username: "07af05e7c57849a01ae77b0c", credential: "GY2GcKhMltO2CdJk" },
      ],
    });

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => pc.addTrack(track, localStreamRef.current));
    }

    pc.onicecandidate = (e) => {
      if (e.candidate) socketRef.current.emit("webrtc-ice", { to: otherId, candidate: e.candidate });
    };

    pc.ontrack = (e) => setRemoteStreams((prev) => ({ ...prev, [otherId]: e.streams[0] }));

    pcsRef.current[otherId] = pc;
    return pc;
  };

  // --- useEffect: Socket ve WebRTC ---
  useEffect(() => {
    socketRef.current = io(import.meta.env.VITE_BACKEND_URL || "http://localhost:5006");

    socketRef.current.on("connect", () => {
      setMySocketId(socketRef.current.id);
      socketRef.current.emit("join-room", { roomId, username });
    });

    // Kamera açma
    const initMedia = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        localStreamRef.current = stream;
      } catch {
        alert("Kameraya erişilemedi!");
      }
    };
    initMedia();

    // --- Host/onay durumu ---
    socketRef.current.on("room-joined", ({ status, isHost: imHost, users: currentUsers }) => {
      if (status === "approved") {
        setIsInRoom(true);
        setIsHost(imHost);
        setUsers(currentUsers.filter((u) => u.socketId !== socketRef.current.id));
      }
    });

    socketRef.current.on("waiting-approval", () => {
      setStatusMessage("Toplantı sahibinin onayı bekleniyor...");
      setIsInRoom(false);
    });

    socketRef.current.on("join-rejected", () => {
      alert("Toplantı sahibi isteğinizi reddetti.");
      navigate("/");
    });

    socketRef.current.on("join-request", ({ socketId, username }) =>
      setIncomingRequests((prev) => [...prev, { socketId, username }])
    );

    // Oda kullanıcıları
    socketRef.current.on("room-users", async (roomUsers) => {
      const others = roomUsers.filter((u) => u.socketId !== socketRef.current.id);
      setUsers(others);

      if (others.length !== 1) return;
      const other = others[0];
      if (socketRef.current.id < other.socketId) return;
      if (pcsRef.current[other.socketId]) return;

      const pc = createPeerConnection(other.socketId);
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socketRef.current.emit("webrtc-offer", { to: other.socketId, offer });
    });

    // --- WebRTC Offer ---
    socketRef.current.on("webrtc-offer", async ({ from, offer }) => {
      const pc = createPeerConnection(from);
      await pc.setRemoteDescription(offer);
      if (iceQueueRef.current[from]?.length) {
        for (const c of iceQueueRef.current[from]) await pc.addIceCandidate(c);
        iceQueueRef.current[from] = [];
      }
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socketRef.current.emit("webrtc-answer", { to: from, answer });
    });

    // --- WebRTC Answer ---
    socketRef.current.on("webrtc-answer", async ({ from, answer }) => {
      const pc = pcsRef.current[from];
      if (!pc) return;
      await pc.setRemoteDescription(answer);
      if (iceQueueRef.current[from]?.length) {
        for (const c of iceQueueRef.current[from]) await pc.addIceCandidate(c);
        iceQueueRef.current[from] = [];
      }
    });

    // --- WebRTC ICE ---
    socketRef.current.on("webrtc-ice", async ({ from, candidate }) => {
      const pc = pcsRef.current[from];
      if (!pc?.remoteDescription) {
        iceQueueRef.current[from] = iceQueueRef.current[from] || [];
        iceQueueRef.current[from].push(candidate);
        return;
      }
      await pc.addIceCandidate(candidate);
    });

    return () => {
      socketRef.current.off();
      socketRef.current.disconnect();
      Object.values(pcsRef.current).forEach((pc) => pc.close());
      if (localStreamRef.current) localStreamRef.current.getTracks().forEach((t) => t.stop());
    };
  }, [roomId, username, navigate]);

  // --- Host onay/reddet ---
  const handleDecision = (id, name, decision) => {
    socketRef.current.emit("handle-join-request", { requesterId: id, requesterName: name, decision });
    setIncomingRequests((prev) => prev.filter((r) => r.socketId !== id));
  };

  // --- Bekleme modu ---
  if (!isInRoom) {
    return (
      <div className="waiting-room-container" style={{
    display: "flex",
    justifyContent: "center", 
    alignItems: "center",    
    flexDirection:"column",
    marginTop:100,
}}>
        <FaceCamCard 
        title={username} isLocal videoStream={localStreamRef.current} showVideoButton />
        <h2>{statusMessage}</h2>
        <div className="loader"></div>
        <button className="leave-button"
        onClick={() => navigate("/")}>İptal Et ve Çık</button>
      </div>
    );
  }

  // --- Toplantı odası ---
 return ( 
 <div className="meeting-container"> 
 {/* HOST İÇİN ONAY KUTUSU (POPUP) */} 
 {isHost && incomingRequests.length > 0 && 
 ( <div className="request-modal" 
 style={{ position: 'fixed', bottom: '20px', right: '20px', background: '#2a2a2a', padding: '30px', borderRadius: '8px', 
 boxShadow: '0 4px 15px rgba(0,0,0,0.5)', zIndex: 9999, border: '1px solid #444', color: 'white' }}>
   <h3 style={{ margin: '0 0 10px 0', fontSize: '16px' }}>Katılım İstekleri</h3> 
   {incomingRequests.map((req) => ( <div key={req.socketId}
    style={{ marginBottom: '10px', paddingBottom: '10px', borderBottom: '1px solid #444', display: 'flex', flexDirection: 'column', gap: '5px' }}> 
    <span style={{ fontSize: '14px' }}><strong>{req.username}</strong> odaya girmek istiyor.</span> 
 
    <div style={{ display: 'flex', gap: '10px' }}>
       <button onClick={() => handleDecision(req.socketId, req.username, 'approve')} 
       style={{ flex: 1, background: '#4CAF50', color: 'white', border: 'none', padding: '5px', cursor: 'pointer', borderRadius: '4px' }} >
         Kabul Et </button> <button onClick={() => handleDecision(req.socketId, req.username, 'reject')} 
         style={{ flex: 1, background: '#f44336', color: 'white', border: 'none', padding: '5px', cursor: 'pointer', borderRadius: '4px' }} > Reddet
          </button> </div> </div> ))} </div> )} 

<h2 className="meeting-code" style={{ display: 'flex', alignItems: 'center', gap: '10px',fontSize:"20px" }}>
  TOPLANTI KODU: {roomId}
  <button
    onClick={() => navigator.clipboard.writeText(roomId)}
    style={{
      padding: '5px 10px',
      color: 'blue',
      border: 'none',
      borderRadius: '4px',
      cursor: 'pointer'
    }}
  >
    Kopyala
  </button>
</h2>

      <h2>Odadaki Kişiler</h2>
      <ul className="user-list">
        <li>{username} {isHost && "(Host)"} (Siz)</li>
        {users.map((u) => (
          <li key={u.socketId}>{u.username} {u.isHost && "(Host)"}</li>
        ))}
      </ul>

      <h1 className="meeting-title">TOPLANTI SALONU</h1>

      <div className="video-container">
        <FaceCamCard title={username} isLocal videoStream={localStreamRef.current} showVideoButton />
        {users.map((u) => (
          <FaceCamCard key={u.socketId} title={u.username} videoStream={remoteStreams[u.socketId]} showVideoButton/>
        ))}
      </div>

      <div className="leave-container">
        <button className="leave-button" onClick={() => (window.location.href = "/")}>TOPLANTIDAN AYRIL</button>
      </div>
    </div>
  );
}
