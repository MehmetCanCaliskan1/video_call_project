import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { useEffect, useState, useRef } from "react";
import { io } from "socket.io-client";
import FaceCamCard from "../components/FaceCamCard.jsx";
import "../room.css";

export default function Room() {
  const navigate = useNavigate();
    const [users, setUsers] = useState([]);
  const [remoteStreams, setRemoteStreams] = useState({});
  const [mySocketId, setMySocketId] = useState(null);

  const [isInRoom, setIsInRoom] = useState(false); // Odaya girildi mi kontrolü
  const [isHost, setIsHost] = useState(false);     // Yönetici kontrolü
  const [statusMessage, setStatusMessage] = useState("Sunucuya bağlanılıyor...");
  const [incomingRequests, setIncomingRequests] = useState([]); // Host için bekleyen istekler

  const socketRef = useRef(null);
  const pcsRef = useRef({});
  const localStreamRef = useRef(null);
  const iceQueueRef = useRef({});

  const { roomId } = useParams();
  const [searchParams] = useSearchParams();
  const username = searchParams.get("username");

  //PEER CONNECTION Oluşumu
  const createPeerConnection = (otherUserId) => {
    if (pcsRef.current[otherUserId]) {
      return pcsRef.current[otherUserId];
    }

    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" }, // STUN
        /* {
             urls: "turn:YOUR_TURN_SERVER_IP:3478",
             username: "...",
             credential: "..."
           }, */
        {
          urls: "stun:stun.relay.metered.ca:80",
        },
        {
          urls: "turn:global.relay.metered.ca:80",
          username: "07af05e7c57849a01ae77b0c",
          credential: "GY2GcKhMltO2CdJk",
        },
        {
          urls: "turn:global.relay.metered.ca:80?transport=tcp",
          username: "07af05e7c57849a01ae77b0c",
          credential: "GY2GcKhMltO2CdJk",
        },
        {
          urls: "turn:global.relay.metered.ca:443",
          username: "07af05e7c57849a01ae77b0c",
          credential: "GY2GcKhMltO2CdJk",
        },
        {
          urls: "turns:global.relay.metered.ca:443?transport=tcp",
          username: "07af05e7c57849a01ae77b0c",
          credential: "GY2GcKhMltO2CdJk",
        },
      ],
    });

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) =>
        pc.addTrack(track, localStreamRef.current)
      );
    }

    pc.onicecandidate = (e) => {
      if (e.candidate) {
        socketRef.current.emit("webrtc-ice", {
          to: otherUserId,
          candidate: e.candidate,
        });
      }
    };

    pc.ontrack = (e) => {
      setRemoteStreams((prev) => ({
        ...prev,
        [otherUserId]: e.streams[0],
      }));
    };

    pcsRef.current[otherUserId] = pc;
    return pc;
  };

  useEffect(() => {
    socketRef.current = io(import.meta.env.VITE_BACKEND_URL || "http://localhost:5006");

    socketRef.current.on("connect", () => {
      setMySocketId(socketRef.current.id);
      // Bağlanır bağlanmaz odaya girme isteği atılır
      // Artık hemen kamerayı açılmıyor, onay bekleniyor.
      socketRef.current.emit("join-room", { roomId, username });
    });

    // 2. Odaya Kabul Edilme (Veya Host Olma) Durumu
    socketRef.current.on("room-joined", async ({ status, isHost: imHost, users: currentUsers }) => {
      if (status === "approved") {
        setIsInRoom(true);
        setIsHost(imHost);
        // Listeden kendimizi çıkartıp diğerlerini alıyoruz
        setUsers(currentUsers.filter(u => u.socketId !== socketRef.current.id));

        // KAMERA İZNİ 
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: true,
          });
          localStreamRef.current = stream;
          // Kendi görüntümüzün ekrana gelmesi için state tetikliyoruz
          setRemoteStreams((prev) => ({ ...prev })); 
        } catch (err) {
          console.error("Kamera hatası:", err);
          alert("Kameraya erişilemedi!");
        }
      }
    });

    // 3. Onay Bekleme Durumu
    socketRef.current.on("waiting-approval", () => {
      setStatusMessage("Toplantı sahibinin onayı bekleniyor...");
      setIsInRoom(false);
    });

    // 4. Reddedilme Durumu
    socketRef.current.on("join-rejected", () => {
      alert("Toplantı sahibi isteğinizi reddetti.");
      navigate("/"); // Ana sayfaya yönlendir
    });

    // 5. (Sadece Host İçin) Yeni Bir İstek Geldiğinde
    socketRef.current.on("join-request", ({ socketId, username }) => {
      setIncomingRequests((prev) => [...prev, { socketId, username }]);
    });

    socketRef.current.on("room-users", async (roomUsers) => {
      const others = roomUsers.filter((u) => u.socketId !== socketRef.current.id);
      setUsers(others);

      if (others.length !== 1) return;

      const other = others[0];

      // WebRTC Offer Mantığı 
      if (socketRef.current.id < other.socketId) return;
      if (pcsRef.current[other.socketId]) return;

      const pc = createPeerConnection(other.socketId);
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      socketRef.current.emit("webrtc-offer", {
        to: other.socketId,
        offer,
      });
    });

    // --- Webrtc ---
    socketRef.current.on("webrtc-offer", async ({ from, offer }) => {
      const pc = createPeerConnection(from);
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socketRef.current.emit("webrtc-answer", { to: from, answer });
    });

    socketRef.current.on("webrtc-answer", async ({ from, answer }) => {
      const pc = pcsRef.current[from];
      if (!pc) return;

      if (pc.signalingState !== "have-local-offer") {
        console.warn("Answer ignored, wrong state:", pc.signalingState);
        return;
      }
      await pc.setRemoteDescription(new RTCSessionDescription(answer));

      iceQueueRef.current[from]?.forEach(async (c) => {
        await pc.addIceCandidate(new RTCIceCandidate(c));
      });
      iceQueueRef.current[from] = [];
    });

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
      if (socketRef.current) {
        socketRef.current.off();
        socketRef.current.disconnect();
      }
      Object.values(pcsRef.current).forEach((pc) => pc.close());
      pcsRef.current = {};
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, [roomId, username, navigate]);


  //HOST FONKSİYONU 
  const handleDecision = (requesterId, requesterName, decision) => {
    socketRef.current.emit("handle-join-request", {
      decision, // 'approve' veya 'reject'
      requesterId,
      requesterName
    });
    // Listeden çıkar
    setIncomingRequests((prev) => prev.filter((r) => r.socketId !== requesterId));
  };


  // --- EKRAN 1 BEKLEME MODU (Onaylanmadıysa) ---
  if (!isInRoom) {
    return (
      <div className="waiting-room-container" style={{ 
          display: 'flex', flexDirection: 'column', alignItems: 'center', 
          justifyContent: 'center', height: '100vh', color: 'white', backgroundColor: '#222' 
      }}>
           <FaceCamCard
          title={username}
          isLocal={true}
          videoStream={localStreamRef.current}
          showVideoButton={true}
        />
        <h2>{statusMessage}</h2>
        <div className="loader" style={{ marginTop: '20px', border: '4px solid #f3f3f3', borderTop: '4px solid #3498db', borderRadius: '50%', width: '30px', height: '30px', animation: 'spin 2s linear infinite' }}></div>
        <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
        <br />
        <button 
          onClick={() => navigate("/")} 
          style={{ padding: "10px 20px", cursor: "pointer", background: "#d9534f", color: "white", border: "none", borderRadius: "5px" }}
        >
          İptal Et ve Çık
        </button>
      </div>
    );
  }

  // --- EKRAN 2 TOPLANTI ODASI (Onaylandıysa) ---
  return (
    <div className="meeting-container">
      
      {/* HOST İÇİN ONAY KUTUSU (POPUP) */}
      {isHost && incomingRequests.length > 0 && (
        <div className="request-modal" style={{
            position: 'fixed', bottom: '20px', right: '20px', 
            background: '#2a2a2a', padding: '30px', borderRadius: '8px',
            boxShadow: '0 4px 15px rgba(0,0,0,0.5)', zIndex: 9999, border: '1px solid #444', color: 'white'
        }}>
          <h3 style={{ margin: '0 0 10px 0', fontSize: '16px' }}>Katılım İstekleri</h3>
          {incomingRequests.map((req) => (
            <div key={req.socketId} style={{ marginBottom: '10px', paddingBottom: '10px', borderBottom: '1px solid #444', display: 'flex', flexDirection: 'column', gap: '5px' }}>
              <span style={{ fontSize: '14px' }}><strong>{req.username}</strong> odaya girmek istiyor.</span>
              <div style={{ display: 'flex', gap: '10px' }}>
                
                <button 
                  onClick={() => handleDecision(req.socketId, req.username, 'approve')}
                  style={{ flex: 1, background: '#4CAF50', color: 'white', border: 'none', padding: '5px', cursor: 'pointer', borderRadius: '4px' }}
                >
                  Kabul Et
                </button>
                <button 
                  onClick={() => handleDecision(req.socketId, req.username, 'reject')}
                  style={{ flex: 1, background: '#f44336', color: 'white', border: 'none', padding: '5px', cursor: 'pointer', borderRadius: '4px' }}
                >
                  Reddet
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

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
        <li>{username} {isHost ? "(Host)" : ""} (Siz)</li>
        {users.map((u) => (
          <li key={u.socketId}>{u.username} {u.isHost ? "(Host)" : ""}</li>
        ))}
      </ul>

      <h1 className="meeting-title">TOPLANTI SALONU</h1>

      <div className="video-container">
        <FaceCamCard
          title={username}
          isLocal={true}
          videoStream={localStreamRef.current}
          showVideoButton={true}
        />

        {users.map((u) => (
          <FaceCamCard
            key={u.socketId}
            title={u.username}
            isLocal={false}
            videoStream={remoteStreams[u.socketId]}
            showVideoButton={true}
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