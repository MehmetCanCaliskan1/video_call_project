import React, { useRef, useEffect } from "react";

function FaceCamCard({ title, isLocal }) {
  const videoRef = useRef(null);

  useEffect(() => {
    if(!isLocal) return;
    async function startCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
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

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        border: "1px solid #ddd",
        borderRadius: "10px",
        padding: "10px",
        width: "350px",
        height: "auto",
        boxShadow: "0 4px 8px rgba(0,0,0,0.1)",
        fontFamily: "Arial, sans-serif",
        fontSize: "20px",
      }}
    >
      <h3 style={{ marginBottom: "20px", textTransform: "capitalize" }}>{title}</h3>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={isLocal}
        style={{
          width: "100%",
          height: "auto",
          borderRadius: "20px",
        }}
      />
      <button style={{ marginTop: "10px", borderRadius: "5px" }}>Ses Aç/Kapat</button>
      <div>
        <button
        onClick={() => {
          if (videoRef.current) {
            const stream = videoRef.current.srcObject;
            const videoTrack = stream.getVideoTracks()[0];
            videoTrack.enabled = !videoTrack.enabled;
          }
        }} style={{ marginTop: "10px", borderRadius: "5px" }}>Video Aç/Kapat</button>
      </div>
    </div>
  );
}

export default FaceCamCard;


