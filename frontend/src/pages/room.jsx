// Room.jsx
import { useParams, useSearchParams } from "react-router-dom";
import { useEffect, useState, useRef } from "react";
import { io } from "socket.io-client";
import FaceCamCard from "../components/FaceCamCard.jsx";

export default function Room() {
  const [users, setUsers] = useState([]);
  const [mysocketId, setMySocketId] = useState(null);

  const socketRef = useRef(null);
  const pcsRef = useRef({}); // Her kullanıcı için ayrı PeerConnection
  const localStreamRef = useRef(null);

  const { roomId } = useParams();
  const [searchParams] = useSearchParams();
  const username = searchParams.get("username");

  const [remoteStreams, setRemoteStreams] = useState({}); 

  // PeerConnection oluşturma
  const createPeerConnection = (otherUserId) => {
    const pc = new RTCPeerConnection({ iceServers: [{ urls: "stun:stun.l.google.com:19302" }] });

    // Local trackleri ekle
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => pc.addTrack(track, localStreamRef.current));
    }

    // ICE Candidate
    pc.onicecandidate = (e) => {
      if (e.candidate) {
        socketRef.current.emit("webrtc-ice", { to: otherUserId, candidate: e.candidate });
      }
    };

    // Remote track geldiğinde state'i güncelle
    pc.ontrack = (e) => {
      setRemoteStreams(prev => ({
        ...prev,
        [otherUserId]: e.streams[0]
      }));
    };

    pcsRef.current[otherUserId] = pc;
    return pc;
  };

 useEffect(() => {
    socketRef.current = io("http://localhost:5006");

    const startApp = async () => {
      try {
        // ÖNCE kamerayı alıyoruz
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        localStreamRef.current = stream;
        
        // SONRA odaya katılıyoruz
        socketRef.current.emit("join-room", { roomId, username });
      } catch (err) {
        console.error("Kamera hatası:", err);
      }
    };

    startApp();

    socketRef.current.on("room-users", async (users) => {
      const otherUsers = users.filter(u => u.socketId !== socketRef.current.id);
      setUsers(otherUsers);

      for (const user of otherUsers) {
        if (pcsRef.current[user.socketId]) continue;

        const pc = createPeerConnection(user.socketId);
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socketRef.current.emit("webrtc-offer", { to: user.socketId, offer });
      }
    });

    socketRef.current.on("webrtc-offer", async ({ from, offer }) => {
      const pc = createPeerConnection(from);
      // Signaling state kontrolü
      if (pc.signalingState !== "stable") return; 
      
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socketRef.current.emit("webrtc-answer", { to: from, answer });
    });

    socketRef.current.on("webrtc-answer", async ({ from, answer }) => {
      const pc = pcsRef.current[from];
      // Sadece 'have-local-offer' durumundaysa answer kabul edilir
      if (pc && pc.signalingState === "have-local-offer") {
        await pc.setRemoteDescription(new RTCSessionDescription(answer));
      }
    });

    socketRef.current.on("webrtc-ice", async ({ from, candidate }) => {
      const pc = pcsRef.current[from];
      // Remote description set edilmeden ice candidate eklenemez!
      if (pc && pc.remoteDescription) {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      }
    });

    return () => {
      socketRef.current.disconnect();
      // Temizlik: Trackleri durdur
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [roomId, username]);

  return (
    <div>
      <h2>Oda ID<br /><br />{roomId}</h2>

      <h2>Odadaki Kişiler</h2>
      <ul style={{ textTransform: "capitalize" }}>
        <li key={mysocketId}>{username} (Sen)</li>
        {users.map(user => <li key={user.socketId}>{user.username}</li>)}
      </ul>

      <h1 style={{ textAlign: "center", marginTop: "-70px" }}>TOPLANTI SALONU</h1>

      <div style={{ display: "flex", justifyContent: "center", gap: "30px" }}>
        <FaceCamCard title={username} isLocal={true} videoStream={localStreamRef.current} />
        {users.map(user => (
          <FaceCamCard
            key={user.socketId}
            title={user.username}
            isLocal={false}
            videoStream={remoteStreams[user.socketId]}
          />
        ))}
      </div>

      <div style={{ display: "flex", justifyContent: "center", marginTop: "50px" }}>
        <button 
          onClick={() => window.location.href = '/'}
          style={{
            backgroundColor: "red",
            color: "white",
            padding: "10px 20px",
            borderRadius: "5px"
          }}
        >
          TOPLANTIDAN AYRIL
        </button>
      </div>
    </div>
  );
}
