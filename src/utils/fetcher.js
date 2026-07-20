import { getAdminToken } from './cookies';

export const swrFetcher = async ([url, method, body]) => {
    const token = getAdminToken();
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    
    const options = {
        method: method || 'GET',
        headers,
        credentials: 'include'
    };
    if (body) options.body = JSON.stringify(body);
    
    const res = await fetch(url, options);
    const data = await res.json();
    return data.data || data || [];
};
