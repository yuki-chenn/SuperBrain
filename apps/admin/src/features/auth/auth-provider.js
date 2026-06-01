import { Fragment as _Fragment, jsx as _jsx } from "react/jsx-runtime";
import { useEffect } from 'react';
import { useAuthStore } from './auth-store';
import { listenAuthEvents } from './broadcast';
export function AuthProvider({ children }) {
    const bootstrap = useAuthStore((s) => s.bootstrap);
    useEffect(() => {
        bootstrap();
        listenAuthEvents();
    }, [bootstrap]);
    return _jsx(_Fragment, { children: children });
}
//# sourceMappingURL=auth-provider.js.map