import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  // mic-recorder-to-mp3 bundles lamejs with bare assignments like `Lame = Lame_1`
  // which throw in strict ESM; map them to globalThis so init runs correctly.
  define: {
    Lame: 'globalThis.Lame',
    Presets: 'globalThis.Presets',
    GainAnalysis: 'globalThis.GainAnalysis',
    QuantizePVT: 'globalThis.QuantizePVT',
    Quantize: 'globalThis.Quantize',
    Takehiro: 'globalThis.Takehiro',
    Reservoir: 'globalThis.Reservoir',
    MPEGMode: 'globalThis.MPEGMode',
    BitStream: 'globalThis.BitStream',
  },
})
