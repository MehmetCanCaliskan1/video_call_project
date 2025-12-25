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

  // PeerConnection oluşturma
  const createPeerConnection = (otherUserId) => {
    const pc = new RTCPeerConnection({ iceServers: [{ urls: "stun:stun.l.google.com:19302" }] });

    // Local trackleri ekle
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => pc.addTrack(track, localStreamRef.current));
    }

    pc.onicecandidate = (e) => {
      if (e.candidate) {
        socketRef.current.emit("webrtc-ice", { to: otherUserId, candidate: e.candidate });
      }
    };

    pc.ontrack = (e) => {
      const remoteVideo = document.getElementById(`remote-video-${otherUserId}`);
      if (remoteVideo) {
        remoteVideo.srcObject = e.streams[0];
      }
    };

    pcsRef.current[otherUserId] = pc;
    return pc;
  };

  useEffect(() => {
    socketRef.current = io("http://localhost:5006");

    // Kamera + mikrofon
    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      .then(stream => {
        localStreamRef.current = stream;
        const localVideo = document.getElementById("local-video");
        if (localVideo) localVideo.srcObject = stream;
      });

    // Socket bağlantısı
    socketRef.current.on("connect", () => setMySocketId(socketRef.current.id));

    socketRef.current.emit("join-room", { roomId, username });

   socketRef.current.on("room-users", async (users) => {
  const otherUsers = users.filter(
    u => u.socketId !== socketRef.current.id
  );

  setUsers(otherUsers);

  // Eğer odada 1 kişi varsa → OFFER GÖNDER
  if (otherUsers.length === 1) {
    const otherUser = otherUsers[0];

    // Aynı kişiye tekrar offer gönderme
    if (pcsRef.current[otherUser.socketId]) return;

    const pc = createPeerConnection(otherUser.socketId);
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    socketRef.current.emit("webrtc-offer", {
      to: otherUser.socketId,
      offer
    });
  }
});


    // WebRTC offer
    socketRef.current.on("webrtc-offer", async ({ from, offer }) => {
      const pc = createPeerConnection(from);
      await pc.setRemoteDescription(offer);
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socketRef.current.emit("webrtc-answer", { to: from, answer });
    });

    socketRef.current.on("webrtc-answer", async ({ from, answer }) => {
      const pc = pcsRef.current[from];
      if (pc) await pc.setRemoteDescription(answer);
    });

  socketRef.current.on("webrtc-ice", async ({ from, candidate }) => {
  const pc = pcsRef.current[from];
  if (pc && candidate) {
    await pc.addIceCandidate(new RTCIceCandidate(candidate));
  }
});

    return () => socketRef.current.disconnect();
  }, [roomId, username]);

  return (
    <div>
      <h2>Oda ID<br /> <br /> {roomId}</h2>

      <h2>Odadaki Kişiler</h2>
      <ul>
        <li key={mysocketId}>{username} (Sen)</li>
        {users.map(user => <li key={user.socketId}>{user.username}</li>)}
      </ul>

      <h1 style={{ textAlign: "center", marginTop: "-70px" }}>TOPLANTI ORTAMI</h1>

      <div style={{ display: "flex", justifyContent: "center", gap: "30px" }}>
        <FaceCamCard title={username} isLocal={true} videoId="local-video" />
        {users.map(user => (
          <FaceCamCard
            key={user.socketId}
            title={user.username}
            isLocal={false}
            videoId={`remote-video-${user.socketId}`}
          />
        ))}
      </div>
      <div style={{ display: "flex", justifyContent: "center", marginTop: "50px" }}>
        <button 
          onClick={() => {
            window.location.href = '/';
          }}
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
