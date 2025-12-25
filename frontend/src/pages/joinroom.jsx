import FaceCamCard from "../components/FaceCamCard.jsx";
import { useNavigate } from "react-router-dom";
import { useRef,useEffect,setPreviewStream,useState } from "react";
function Joinroom() {
    const localStreamRef = useRef(null);
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

        navigate(`/room/${roomID}?username=${encodeURIComponent(username)}`);

  };
useEffect(() => {
  navigator.mediaDevices.getUserMedia({ video: true, audio: false })
    .then(stream => {
      localStreamRef.current = stream;
      setPreviewStream(stream);
    });
}, []);
    return (
        <div>
            <h1 style={{ textAlign: "center" }}>Toplantıya Katılın</h1>

            <div
                style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    height: "100vh",
                    gap: "20px",
                }}
            >
                <form onSubmit={redirectToRoom}>
                    <label>
                        Toplantı Kodu:
                        <input type="text" name="roomID" />
                    </label>
                    <br /><br />

                    <label>
                        Kullanıcı Adı:
                        <input type="text" name="username" />
                    </label>
                    <br /><br />

                    <button 
                    style={{ marginRight: "10px", borderRadius: "5px", padding: "5px 10px",alignItems: "center" }}
                    type="submit">Katıl</button>
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
