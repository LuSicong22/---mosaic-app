import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  // Use root base for Vercel/static hosting so assets resolve correctly
  base: "/",
  plugins: [react()],
});
