import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import { MockStoreProvider } from './lib/store.tsx'
import { SupabaseStoreProvider } from './lib/supabaseStore.tsx'
import { supabaseEnabled } from './lib/supabase.ts'

// Real Postgres/Auth/Storage when env keys are set; otherwise the local mock.
const StoreProvider = supabaseEnabled ? SupabaseStoreProvider : MockStoreProvider

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <StoreProvider>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </StoreProvider>
  </StrictMode>,
)
