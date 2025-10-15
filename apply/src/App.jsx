import { useState } from 'react'
import './App.css'
import Context from './components/Context'
import Chat from './components/Chat'

function App() {
  const [count, setCount] = useState(0)

  return (
    <>
    <h1>Info Spark</h1>
    <div><Context/></div>
    <div><Chat/></div>
    </>
  )
}

export default App
