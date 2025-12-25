import { useRef, useEffect, useState } from "react";

function FaceCamCard({ title, isLocal, videoStream }) {
  const videoRef = useRef(null);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [videoEnabled, setVideoEnabled] = useState(true);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.srcObject = videoStream || null;
    }
  }, [videoStream]);

  useEffect(() => {
    if (!isLocal) return;
    let localStream;
    async function startCamera() {
      try {
        localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        if (videoRef.current) videoRef.current.srcObject = localStream;
      } catch (err) {
        console.error("Webcam erişimi reddedildi veya bulunamadı:", err);
      }
    }
    startCamera();
    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        videoRef.current.srcObject.getTracks().forEach(track => track.stop());
      }
    };
  }, [isLocal]);

  const handleAudioToggle = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      videoRef.current.srcObject.getAudioTracks().forEach(track => {
        track.enabled = !track.enabled;
        setAudioEnabled(track.enabled);
      });
    }
  };

  const handleVideoToggle = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      videoRef.current.srcObject.getVideoTracks().forEach(track => {
        track.enabled = !track.enabled;
        setVideoEnabled(track.enabled);
      });
    }
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        border: "1px solid #e0e0e0",
        borderRadius: "16px",
        padding: "20px",
        width: "340px",
        background: "#fafbfc",
        boxShadow: "0 6px 24px rgba(0,0,0,0.08)",
        fontFamily: "Segoe UI, Arial, sans-serif",
        fontSize: "18px",
      }}
    >
      <h3 style={{ marginBottom: "16px", textTransform: "capitalize", color: "#222" }}>{title}</h3>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={isLocal}
        style={{
          width: "100%",
          height: "220px",
          objectFit: "cover",
          borderRadius: "12px",
          background: "#222",
        }}
      />
      <div style={{ display: "flex", gap: "12px", marginTop: "18px" }}>
        <button
          onClick={handleAudioToggle}
          style={{
            padding: "8px 18px",
            borderRadius: "6px",
            border: "none",
            background: audioEnabled ? "#1976d2" : "#bdbdbd",
            color: "#fff",
            fontWeight: "bold",
            cursor: "pointer",
            transition: "background 0.2s",
          }}
        >
          {audioEnabled ? "Sesi Kapat" : "Sesi Aç"}
        </button>
        <button
          onClick={handleVideoToggle}
          style={{
            padding: "8px 18px",
            borderRadius: "6px",
            border: "none",
            background: videoEnabled ? "#388e3c" : "#bdbdbd",
            color: "#fff",
            fontWeight: "bold",
            cursor: "pointer",
            transition: "background 0.2s",
          }}
        >
          {videoEnabled ? "Videoyu Kapat" : "Videoyu Aç"}
        </button>
      </div>
    </div>
  );
}

export default FaceCamCard;
