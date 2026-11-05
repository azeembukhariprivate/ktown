// The parts of three.js the game uses, bundled into vendor/three/three.js (one file, no build step for the game):
//   npm install three@0.186.0 esbuild@0.25.10
//   npx esbuild tools/three-entry.js --bundle --format=esm --minify --legal-comments=none --outfile=vendor/three/three.js
export * from 'three';
export { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
export * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';
