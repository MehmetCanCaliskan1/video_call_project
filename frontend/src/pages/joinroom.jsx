import FaceCamCard from "../components/FaceCamCard.jsx";
import { useNavigate } from "react-router-dom";
import { useRef, useEffect, useState } from "react";
import "./Joinroom.css";
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
     <div className="joinroom-page">
  <h1 className="joinroom-title">Toplantıya Katılın</h1>

  <div className="joinroom-wrapper">
    <form onSubmit={redirectToRoom} className="joinroom-form">

      <label className="joinroom-label">
        Toplantı Kodu:
        <input
          type="text"
          name="roomID"
          className="joinroom-input joinroom-input-room"
          autoComplete="off"
          required
        />
      </label>

      <label className="joinroom-label">
        Kullanıcı Adı:
        <input
          type="text"
          name="username"
          className="joinroom-input"
          autoComplete="off"
          required
        />
      </label>

      <button type="submit" className="joinroom-button">
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
