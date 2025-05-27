// src/vite-env.d.ts
/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_BACKEND_API_URL: string;
  // Add other VITE_ variables here if you use them, e.g.:
  // readonly VITE_ANOTHER_VAR: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}