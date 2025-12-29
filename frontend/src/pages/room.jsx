import { useParams, useSearchParams } from "react-router-dom";
import { useEffect, useState, useRef } from "react";
import { io } from "socket.io-client";
import FaceCamCard from "../components/FaceCamCard.jsx";
 import "../room.css";

export default function Room() {
  const [users, setUsers] = useState([]);
  const [remoteStreams, setRemoteStreams] = useState({});
const [mySocketId, setMySocketId] = useState(null);

  const socketRef = useRef(null);
  const pcsRef = useRef({});
  const localStreamRef = useRef(null);
  const iceQueueRef = useRef({});

  const { roomId } = useParams();
  const [searchParams] = useSearchParams();
  const username = searchParams.get("username");

  // PeerConnection oluşturma kısmı
  const createPeerConnection = (otherUserId) => {
    if (pcsRef.current[otherUserId]) {
      return pcsRef.current[otherUserId];
    }

    const pc = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
    });

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track =>
        pc.addTrack(track, localStreamRef.current)
      );
    }

    pc.onicecandidate = (e) => {
      if (e.candidate) {
        socketRef.current.emit("webrtc-ice", {
          to: otherUserId,
          candidate: e.candidate
        });
      }
    };

    pc.ontrack = (e) => {
      setRemoteStreams(prev => ({
        ...prev,
        [otherUserId]: e.streams[0]
      }));
    };

    pcsRef.current[otherUserId] = pc;
    return pc;
  };
//useeffect
  useEffect(() => {
    socketRef.current = io(import.meta.env.VITE_BACKEND_URL || "http://localhost:5006");
    socketRef.current.on("connect", () => {
      setMySocketId(socketRef.current.id);
    });

    const startApp = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true
        });
        localStreamRef.current = stream;

        socketRef.current.emit("join-room", { roomId, username });
      } catch (err) {
        console.error("Kamera hatası:", err);
      }
    };

    startApp();

    // Oda kullanıcıları
socketRef.current.on("room-users", async (roomUsers) => {
  const others = roomUsers.filter(u => u.socketId !== socketRef.current.id);
  setUsers(others);

  if (others.length !== 1) return;

  const other = others[0];

  //OFFERI SADECE socketId si büyük olan yapsın
  if (socketRef.current.id < other.socketId) return;

  if (pcsRef.current[other.socketId]) return;

  const pc = createPeerConnection(other.socketId);
  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);

  socketRef.current.emit("webrtc-offer", {
    to: other.socketId,
    offer
  });
});

    // OFFER kısmı
    socketRef.current.on("webrtc-offer", async ({ from, offer }) => {
      const pc = createPeerConnection(from);

      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      socketRef.current.emit("webrtc-answer", { to: from, answer });
    });

    // ANSWER kısmı
  socketRef.current.on("webrtc-answer", async ({ from, answer }) => {
  const pc = pcsRef.current[from];
  if (!pc) return;

  if (pc.signalingState !== "have-local-offer") {
    console.warn("Answer ignored, wrong state:", pc.signalingState);
    return;
  }

  await pc.setRemoteDescription(new RTCSessionDescription(answer));

  // ICE kuyruğununun boşaltılması kısmı
  iceQueueRef.current[from]?.forEach(async c => {
    await pc.addIceCandidate(new RTCIceCandidate(c));
  });
  iceQueueRef.current[from] = [];
});
    // ICE
    socketRef.current.on("webrtc-ice", async ({ from, candidate }) => {
      const pc = pcsRef.current[from];
      if (!pc) return;

      if (!pc.remoteDescription) {
        if (!iceQueueRef.current[from]) {
          iceQueueRef.current[from] = [];
        }
        iceQueueRef.current[from].push(candidate);
        return;
      }

      await pc.addIceCandidate(new RTCIceCandidate(candidate));
    });

    return () => {
      socketRef.current.off();
      socketRef.current.disconnect();

      Object.values(pcsRef.current).forEach(pc => pc.close());
      pcsRef.current = {};

      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [roomId, username]);

  return (

<div className="meeting-container">
  <h2 className="meeting-code">
    TOPLANTI KODU<br /><br />
    {roomId}
    <button
      className="copy-button"
      onClick={() => navigator.clipboard.writeText(roomId)}
    >
      Kopyala
    </button>
  </h2>

  <h2>Odadaki Kişiler</h2>
  <ul className="user-list">
    <li>{username} (Siz)</li>
    {users.map(u => (
      <li key={u.socketId}>{u.username}</li>
    ))}
  </ul>

  <h1 className="meeting-title">TOPLANTI SALONU</h1>

  <div className="video-container">
    <FaceCamCard
      title={username}
      isLocal
      videoStream={localStreamRef.current}
    />

    {users.map(u => (
      <FaceCamCard
        key={u.socketId}
        title={u.username}
        isLocal={false}
        videoStream={remoteStreams[u.socketId]}
      />
    ))}
  </div>

  <div className="leave-container">
    <button
      className="leave-button"
      onClick={() => (window.location.href = "/")}
    >
      TOPLANTIDAN AYRIL
    </button>
  </div>
</div>

  );
}
