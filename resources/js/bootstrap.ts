import axios from 'axios';
import { route } from 'ziggy-js';

// Extend Window interface for Ziggy and axios
declare global {
    interface Window {
        Ziggy?: {
            routes: any;
        };
        axios: typeof axios;
        route: typeof route;
    }
}

window.axios = axios;
window.axios.defaults.headers.common['X-Requested-With'] = 'XMLHttpRequest';

// Make route function globally available
window.route = route;

// Initialize Ziggy with the routes from the server
if (typeof window.Ziggy !== 'undefined') {
    (route as any).setRoutes(window.Ziggy.routes);
}
