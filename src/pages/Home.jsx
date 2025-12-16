import '../home.css'
import { useNavigate } from 'react-router-dom'
function Home() {
  const navigate = useNavigate()
  return (
    <div className="container">
      <h1 className="title">HOŞ GELDİNİZ</h1>
<div className="buttonContainer">
      <button
        className="primaryBtn"
        onClick={ () => navigate('/meeting') }
      >
        Toplantıya Katılın
      </button>

      <button
        className="secondaryBtn"
        onClick={() => alert('Giriş Yapıldı!')}
      >
        Giriş Yap
      </button>
      </div>
    </div>
  )
}

export default Home
