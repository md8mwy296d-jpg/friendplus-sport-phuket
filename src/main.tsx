import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import './index.css'
import I18nProvider from './components/I18nProvider.tsx'
import { StoreProvider } from './lib/store.ts'
import { ClubProvider } from './lib/club.ts'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <BrowserRouter>
    <I18nProvider>
      <StoreProvider>
        <ClubProvider>
          <App />
        </ClubProvider>
      </StoreProvider>
    </I18nProvider>
  </BrowserRouter>,
)
