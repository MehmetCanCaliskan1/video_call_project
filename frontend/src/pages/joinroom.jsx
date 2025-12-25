import FaceCamCard from "../components/FaceCamCard.jsx";
import { useNavigate } from "react-router-dom";
import { useRef, useEffect, useState } from "react";

function Joinroom() {
    const navigate = useNavigate();
const [previewStream, setPreviewStream] = useState(null);

    const redirectToRoom = async(e) => {
        e.preventDefault();
       
        const roomID = e.target.roomID.value;
        const username = e.target.username.value;
        if (!roomID) {
            alert("Lütfen toplantı kodunu giriniz.");
            return;
        }
        if (!username) {
            alert("Lütfen kullanıcı adını giriniz.");
            return;
        }
if (username.includes(" ")) {
            alert("Kullanıcı adı boşluk içeremez.");
            return;
        }
if (!username||!roomID) {
            alert("Lütfen tüm alanları doldurunuz.");
            return;
        }
if (roomID.length !== 36) {
            alert("Hatalı toplantı kodu.");
            return;
        }
        navigate(`/room/${roomID}?username=${encodeURIComponent(username)}`);

  };
useEffect(() => {
  navigator.mediaDevices.getUserMedia({ video: true, audio: false })
    .then(stream => {
      localStreamRef.current = stream;
      setPreviewStream(stream);
    });
}, []);
    const localStreamRef = useRef(null);

    return (
        <div style={{ minHeight: "100vh", background: "#f7f8fa" }}>
            <h1 style={{ textAlign: "center", color: "#333" }}>
                Toplantıya Katılın
            </h1>
            <div
                style={{
                    display: "flex",
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                    minHeight: "80vh",
                    gap: "32px",
                }}
            >
                <form
                    onSubmit={redirectToRoom}
                    style={{

                        background: "#fff",
                        padding: "60px 40px",
                        borderRadius: "12px",
                        boxShadow: "0 2px 16px rgba(0,0,0,0.07)",
                        display: "flex",
                        flexDirection: "column",
                        gap: "18px",
                        minWidth: "350px",
                        height: "250px",
                    }}
                >
                    <label style={{ fontWeight: 500, color: "#444" }}>
                        Toplantı Kodu:
                        <input
                            type="text"
                            name="roomID"
                            style={{
                                marginTop: "6px",
                                width: "100%",
                                padding: "8px",
                                borderRadius: "6px",
                                border: "1px solid #ccc",
                                marginBottom: "10px",
                            }}
                            autoComplete="off"
                            required
                        />
                    </label>
                    <label style={{ fontWeight: 500, color: "#444" }}>
                        Kullanıcı Adı:
                        <input
                            type="text"
                            name="username"
                            style={{
                                marginTop: "6px",
                                width: "100%",
                                padding: "8px",
                                borderRadius: "6px",
                                border: "1px solid #ccc",
                            }}
                            autoComplete="off"
                            required
                        />
                    </label>
                    <button
                        style={{
                            marginTop: "12px",
                            borderRadius: "6px",
                            padding: "10px 0",
                            background: "#1976d2",
                            color: "#fff",
                            fontWeight: 600,
                            border: "none",
                            cursor: "pointer",
                            fontSize: "16px",
                            transition: "background 0.2s",
                        }}
                        type="submit"
                    >
                        Katıl
                    </button>
                </form>
                <FaceCamCard
                    title="Kamera Önizleme"
                    isLocal={true}
                    stream={previewStream}
                />
            </div>
        </div>
    );
}

export default Joinroom;
