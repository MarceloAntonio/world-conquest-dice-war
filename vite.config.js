import {defineConfig} from 'vite';
export default defineConfig({
  base:'./',
  build:{rollupOptions:{output:{manualChunks:{three:['three','three/addons/loaders/SVGLoader.js','three/addons/utils/BufferGeometryUtils.js'],geo:['d3-geo']}}}}
});
