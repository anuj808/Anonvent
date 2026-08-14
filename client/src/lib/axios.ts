import axios from 'axios';

const rawUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const apiBaseURL = `${rawUrl.replace(/\/$/, '')}/api/`;

const api = axios.create({
  baseURL: apiBaseURL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

export default api;
