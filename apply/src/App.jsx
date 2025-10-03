import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'
import User from './components/User'

function App() {
  const [count, setCount] = useState(0)

  return (
    <>
    <h1>Apply Day</h1>
    <div><User/></div>
    <div></div>
    </>
  )
}

export default App
