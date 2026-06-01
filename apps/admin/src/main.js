import { jsx as _jsx } from "react/jsx-runtime";
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from '@tanstack/react-router';
import { queryClient } from './lib/query-client';
import { router } from './app/router';
import { AuthProvider } from './features/auth/auth-provider';
import './styles/globals.css';
function App() {
    return (_jsx(QueryClientProvider, { client: queryClient, children: _jsx(AuthProvider, { children: _jsx(RouterProvider, { router: router }) }) }));
}
createRoot(document.getElementById('root')).render(_jsx(StrictMode, { children: _jsx(App, {}) }));
//# sourceMappingURL=main.js.map