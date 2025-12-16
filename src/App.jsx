import { Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import Meeting from './pages/meeting'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/meeting" element={<Meeting />} />
    </Routes>
  )
}

export default App
