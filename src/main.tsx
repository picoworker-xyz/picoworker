import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import { SupabaseStoreProvider } from './lib/supabaseStore.tsx'
import { supabaseEnabled } from './lib/supabase.ts'

function ConfigError() {
  return (
    <div style={{ minHeight: '100svh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, textAlign: 'center', fontFamily: 'system-ui' }}>
      <div style={{ maxWidth: 420 }}>
        <h1 style={{ color: '#fff', fontSize: 22 }}>Backend not configured</h1>
        <p style={{ color: '#9A9CA8', fontSize: 14 }}>
          Set <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code> to run the app.
        </p>
      </div>
    </div>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {supabaseEnabled ? (
      <SupabaseStoreProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </SupabaseStoreProvider>
    ) : (
      <ConfigError />
    )}
  </StrictMode>,
)
