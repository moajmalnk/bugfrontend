import axios from 'axios';
import { ENV } from './env';

export const apiClient = axios.create({
  baseURL: ENV.API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: false // Changed to false to avoid CORS issues
}); 