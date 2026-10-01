import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'

// Deterministic, opt-in local benchmark runs; ordinary gameplay keeps random spawns.
const seed = new URLSearchParams(window.location.search).get('seed')
if (seed !== null) {
  let state = Number(seed) >>> 0
  Math.random = () => { state = (1664525 * state + 1013904223) >>> 0; return state / 4294967296 }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)