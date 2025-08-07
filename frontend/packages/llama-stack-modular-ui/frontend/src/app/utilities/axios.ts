// eslint-disable-next-line no-restricted-imports
import axios from 'axios';

// Create axios instance with baseURL for RAG API endpoints
const ragApiClient = axios.create({
  baseURL: '/rag/api/v1',
});

export default ragApiClient;
