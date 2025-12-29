import FaceCamCard from "../components/FaceCamCard.jsx";
import { useNavigate } from "react-router-dom";
import { useRef, useEffect, useState } from "react";

function Joinroom() {
    const navigate = useNavigate();
    const [previewStream, setPreviewStream] = useState(null);
    const localStreamRef = useRef(null);

    const redirectToRoom = async (e) => {
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
        if (roomID.length !== 36) {
            alert("Hatalı toplantı kodu.");
            return;
        }

        navigate(`/room/${roomID}?username=${encodeURIComponent(username)}`);
    };

    useEffect(() => {
        navigator.mediaDevices.getUserMedia({ video: true, audio: false }).then((stream) => {
            localStreamRef.current = stream;
            setPreviewStream(stream);
        });
    }, []);

    return (
        <div
            style={{
                minHeight: "100vh",
                background: "#f7f8fa",
                padding: "16px",
                display: "flex",
                flexDirection: "column",
            }}
        >
            <h1
                style={{
                    textAlign: "center",
                    color: "#333",
                    fontSize: "1.8rem",
                    marginBottom: "24px",
                }}
            >
                Toplantıya Katılın
            </h1>

            <div
                style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "24px",
                    flex: 1,
                }}
            >
                <div
                    style={{
                        width: "100%",
                        maxWidth: "420px",
                    }}
                >
                    <FaceCamCard
                        title="Kamera Önizleme"
                        isLocal={true}
                        stream={previewStream}
                    />
                </div>

                <form
                    onSubmit={redirectToRoom}
                    style={{
                        background: "#fff",
                        padding: "32px 24px",
                        borderRadius: "14px",
                        boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
                        display: "flex",
                        flexDirection: "column",
                        gap: "16px",
                        width: "100%",
                        maxWidth: "420px",
                    }}
                >
                    <label style={{ fontWeight: 500, color: "#444", fontSize: "14px" }}>
                        Toplantı Kodu:
                        <input
                            type="text"
                            name="roomID"
                            style={{
                                marginTop: "6px",
                                width: "100%",
                                padding: "10px",
                                borderRadius: "8px",
                                border: "1px solid #ccc",
                                fontSize: "14px",
                            }}
                            autoComplete="off"
                            required
                        />
                    </label>

                    <label style={{ fontWeight: 500, color: "#444", fontSize: "14px" }}>
                        Kullanıcı Adı:
                        <input
                            type="text"
                            name="username"
                            style={{
                                marginTop: "6px",
                                width: "100%",
                                padding: "10px",
                                borderRadius: "8px",
                                border: "1px solid #ccc",
                                fontSize: "14px",
                            }}
                            autoComplete="off"
                            required
                        />
                    </label>

                    <button
                        type="submit"
                        style={{
                            marginTop: "8px",
                            borderRadius: "10px",
                            padding: "12px 0",
                            background: "#1976d2",
                            color: "#fff",
                            fontWeight: 600,
                            border: "none",
                            cursor: "pointer",
                            fontSize: "15px",
                        }}
                    >
                        Katıl
                    </button>
                </form>
            </div>

            <style>
                {`
                  @media (min-width: 1024px) {
                    div[style*="flex-direction: column"][style*="gap: 24px"] {
                      flex-direction: row;
                      align-items: center;
                      gap: 48px;
                    }
                  }
                `}
            </style>
        </div>
    );
}

export default Joinroom;
