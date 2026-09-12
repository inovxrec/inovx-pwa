import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        /*
          Vendor code in its own chunk, split by what changes together.

          React and the Supabase client are the two unavoidable downloads — the
          app cannot render or check who you are without them — so they are
          worth isolating: they change only when a dependency is upgraded, which
          means a returning visitor keeps them cached across every deploy of our
          own code. Left mixed in, one edit to a screen invalidates all of it.
        */
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          if (id.includes('react-router')) return 'vendor-router';
          if (id.includes('/react/') || id.includes('/react-dom/') || id.includes('/scheduler/')) {
            return 'vendor-react';
          }
          if (id.includes('@supabase')) return 'vendor-supabase';
          return 'vendor';
        },
      },
    },
  },
})
