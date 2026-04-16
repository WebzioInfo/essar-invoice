import axios from "axios";
import { useToastStore } from "@/hooks/useToastStore";

/**
 * Standard API Client with Axios
 * This ensures consistency across the app, 
 * including authorization headers if needed.
 */
const apiClient = axios.create({
    baseURL: "/",
    headers: {
        "Content-Type": "application/json",
    },
});

// Response Interceptor for handling errors globally
apiClient.interceptors.response.use(
    (response) => response,
    (error) => {
        // Extract a human-readable message
        const message = 
            error.response?.data?.error || 
            error.response?.data?.message || 
            error.message || 
            "An unexpected network error occurred.";
        
        console.error("[API_ERROR]", message);

        // Trigger global toast (Zustand store allows non-hook usage via getState)
        useToastStore.getState().error(message);

        // Handle specific status codes
        if (error.response?.status === 401) {
            // Optional: Redirect to login or handle session expiry
            // window.location.href = "/login";
        }

        return Promise.reject(error);
    }
);

export default apiClient;
