import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ConfigProvider, App as AntdApp } from 'antd'
import { Toaster } from 'sonner'
import { AuthProvider } from './contexts/AuthContext'
import App from './App'
import './styles.css'

const antdTheme = {
  token: {
    colorPrimary: '#2563eb',
    colorInfo: '#0284c7',
    colorSuccess: '#059669',
    colorWarning: '#d97706',
    colorError: '#dc2626',
    borderRadius: 10,
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
    colorBgLayout: '#f8fafc',
    colorBgContainer: '#ffffff',
  },
}

const client = new QueryClient()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ConfigProvider theme={antdTheme}>
      <AntdApp>
        <QueryClientProvider client={client}>
          <BrowserRouter>
            <AuthProvider>
              <App />
              <Toaster position="bottom-right" richColors />
            </AuthProvider>
          </BrowserRouter>
        </QueryClientProvider>
      </AntdApp>
    </ConfigProvider>
  </React.StrictMode>
)
