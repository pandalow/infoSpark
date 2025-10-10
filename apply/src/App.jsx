import { useState } from 'react'
import './App.css'
import User from './components/User'
import Chat from './components/Chat'

function App() {
  const [count, setCount] = useState(0)

  return (
    <>
    <h1>Apply Day</h1>
    <div><User/></div>
    <div><Chat/></div>
    </>
  )
}

export default App
