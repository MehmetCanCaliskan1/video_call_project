import { useRef, useEffect } from "react";
import { Icon } from "@iconify/react";
import { useState } from "react";
function FaceCamCard({ title, isLocal, videoStream,showVideoButton}) {
  const videoRef = useRef(null);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.srcObject = videoStream || null;
    }
  }, [videoStream]);

  useEffect(() => {
    if (!isLocal) return;
    async function startCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        if (videoRef.current) videoRef.current.srcObject = stream;
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

  const [videoEnabled, setVideoEnabled] = useState(true);
  const [audioEnabled, setAudioEnabled] = useState(true);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        border: "1px solid #ddd",
        borderRadius: "10px",
        padding: "10px",
        height: "auto",
        width: "350px",
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
      <div style={{ display: "flex", gap: "10px" }}>
                   {showVideoButton && (

        <button
          onClick={() => {
            if (videoRef.current) {
              const stream = videoRef.current.srcObject;
              if (stream) {
                const audioTrack = stream.getAudioTracks()[0];
                if (audioTrack) {
                  audioTrack.enabled = !audioTrack.enabled;
                  setAudioEnabled(audioTrack.enabled);
                }
              }
            }
          }}
          style={{ cursor: "pointer", marginTop: "10px", borderRadius: "5px", display: "flex", alignItems: "center", gap: "5px" }}
        >
          {audioEnabled ? (
            <>
             <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
            <path fill="currentColor" d="M12 15c1.66 0 2.99-1.34 2.99-3L15 6c0-1.66-1.34-3-3-3S9 4.34 9 6v6c0 1.66 1.34 3 3 3m5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 15 6.7 12H5c0 3.42 2.72 6.23 6 6.72V22h2v-3.28c3.28-.48 6-3.3 6-6.72z"/>
          </svg>
            </>
          ) : (
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path fill="currentColor" d="M15 10.6V5c0-1.66-1.34-3-3-3c-1.54 0-2.79 1.16-2.96 2.65zm4 .4h-1.7c0 .58-.1 1.13-.27 1.64l1.27 1.27c.44-.88.7-1.87.7-2.91M4.41 2.86L3 4.27l6 6V11c0 1.66 1.34 3 3 3c.23 0 .44-.03.65-.08l1.66 1.66c-.71.33-1.5.52-2.31.52c-2.76 0-5.3-2.1-5.3-5.1H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28a7.1 7.1 0 0 0 2.55-.9l4.2 4.2l1.41-1.41z"/></svg>  
          )}
         
        </button>
                  )}

        <div>   
           {showVideoButton && (
          <button
            onClick={() => {
              if (videoRef.current) {
                const stream = videoRef.current.srcObject;
                const videoTrack = stream.getVideoTracks()[0];
                videoTrack.enabled = !videoTrack.enabled;
                setVideoEnabled(videoTrack.enabled);
              }
            }}
            style={{ cursor: "pointer", marginTop: "10px", borderRadius: "5px" }}
          >
            {videoEnabled ? (
              // Camera on SVG
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
                <path fill="currentColor" d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11z"/>
              </svg>
            ) : (
              // Camera off SVG
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path fill="currentColor" d="m21 6.5l-4 4V7c0-.55-.45-1-1-1H9.82L21 17.18zM3.27 2L2 3.27L4.73 6H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.21 0 .39-.08.54-.18L19.73 21L21 19.73z"/></svg>
            )}
          </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default FaceCamCard;


