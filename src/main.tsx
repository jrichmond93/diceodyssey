import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Auth0Provider } from '@auth0/auth0-react'
import './index.css'
import App from './App.tsx'
import { getAuth0EnvConfig } from './multiplayer/env'

const auth0 = getAuth0EnvConfig()

const authorizationParams = {
  redirect_uri: auth0.redirectUri,
  ...(auth0.audience ? { audience: auth0.audience } : {}),
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Auth0Provider
      domain={auth0.domain}
      clientId={auth0.clientId}
      authorizationParams={authorizationParams}
      cacheLocation="localstorage"
    >
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </Auth0Provider>
  </StrictMode>,
)
