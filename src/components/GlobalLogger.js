"use client";
import { useEffect } from "react";

export function GlobalLogger() {
    useEffect(() => {
        if (process.env.NODE_ENV !== 'development') return;

        const originalFetch = window.fetch;
        window.fetch = async (...args) => {
            const [resource, config] = args;
            
            // Avoid infinite loops by not intercepting our own logger calls
            if (typeof resource === 'string' && resource.includes('/api/dev-logger')) {
                return originalFetch(...args);
            }

            const startTime = Date.now();
            let response;
            let error;
            try {
                response = await originalFetch(...args);
                return response;
            } catch (err) {
                error = err;
                throw err;
            } finally {
                // Clone response to read body without consuming the original stream
                let responseBody = null;
                if (response) {
                    try {
                        const clone = response.clone();
                        responseBody = await clone.json();
                    } catch (e) {
                        try {
                            const clone = response.clone();
                            responseBody = await clone.text();
                        } catch (e2) {}
                    }
                }

                let requestBody = config?.body;
                if (typeof requestBody === 'string') {
                    try {
                        requestBody = JSON.parse(requestBody);
                    } catch (e) {}
                }

                // Send the log asynchronously
                originalFetch('/api/dev-logger', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        type: 'Frontend API Call',
                        url: resource,
                        method: config?.method || 'GET',
                        requestHeaders: config?.headers,
                        requestBody: requestBody,
                        status: response?.status,
                        responseBody: responseBody,
                        error: error?.message,
                        durationMs: Date.now() - startTime
                    })
                }).catch(() => {});
            }
        };

        return () => {
            window.fetch = originalFetch;
        };
    }, []);

    return null;
}
