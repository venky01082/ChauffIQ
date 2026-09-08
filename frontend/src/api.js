import clientPkg from '../../client/index.js';

const {
  createChauffIQClient,
  ChauffIQClient,
  TokenManager,
  ApiClientError,
  DEFAULT_BASE_URL,
} = clientPkg;

const PROD_API_URL = 'https://asia-southeast1-chauffiq-a0366.cloudfunctions.net';
const isProd = import.meta.env.PROD;
const fallbackUrl = isProd ? PROD_API_URL : DEFAULT_BASE_URL;

// Resolve API URL: check window config, Vite environment variable, or environment fallback
const baseUrl =
  (typeof window !== 'undefined' && window.__CHAUFFIQ_API_URL__) ||
  (import.meta.env && import.meta.env.VITE_CHAUFFIQ_API_URL) ||
  fallbackUrl;

export const chauffiq = createChauffIQClient({ baseUrl });

export {
  createChauffIQClient,
  ChauffIQClient,
  TokenManager,
  ApiClientError,
  DEFAULT_BASE_URL,
};
