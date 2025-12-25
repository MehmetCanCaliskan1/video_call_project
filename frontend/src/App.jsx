import { Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import Joinroom from './pages/joinroom'
import Room from './pages/room'
function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/joinroom" element={<Joinroom />} />
      <Route path="/room/:roomId" element={<Room />} />
    </Routes>
  )
}

export default App
