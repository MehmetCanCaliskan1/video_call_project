import '../home.css'
import { useNavigate } from 'react-router-dom'
import { v4 as uuidv4 } from 'uuid'

function Home() {
  const navigate = useNavigate()


 const createNewMeeting = () => {
    const roomId = uuidv4()
    const username = prompt("Kullanıcı adınızı girin:")
    if (!username) {
      alert("Kullanıcı adı gereklidir.")
      return
    }
    navigate(`/room/${roomId}?username=${username}`)
  }

  return (
    <div className="container">
      <h1 className="title">HOŞ GELDİNİZ</h1>
      <div className="buttonContainer">
        <button
          className="primaryBtn"
          onClick={ () => navigate('/joinroom') }
      >
        Toplantıya Katılın
      </button>

      <button
        className="secondaryBtn"
        onClick={createNewMeeting}
      >
Yeni Toplantı Oluştur     </button>
      </div>
    </div>
  )
}

export default Home
