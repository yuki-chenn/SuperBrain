import { useAuthStore } from './auth-store';
const authChannel = new BroadcastChannel('admin-auth');
export function broadcastAuthEvent(type) {
    authChannel.postMessage({ type });
}
export function listenAuthEvents() {
    authChannel.onmessage = async (event) => {
        if (event.data?.type === 'logout') {
            useAuthStore.getState().setAnonymous();
        }
        if (event.data?.type === 'login') {
            await useAuthStore.getState().bootstrap();
        }
    };
}
//# sourceMappingURL=broadcast.js.map