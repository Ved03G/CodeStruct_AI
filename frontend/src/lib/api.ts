import axios from 'axios';

// Use environment variable for API URL, fallback to relative path for development
const apiBaseURL = import.meta.env.VITE_API_BASE_URL || '/api';

export const api = axios.create({
  baseURL: apiBaseURL,
  withCredentials: true,
});
