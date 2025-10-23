<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Solar System Top-Down with Starfield • A-Frame</title>
    <meta name="description" content="Top-down red sun solar system with twinkling starfield" />
    <script src="https://aframe.io/releases/1.5.0/aframe.min.js"></script>
    <style>
      body { margin: 0; overflow: hidden; background: black; }
      #screenshotBtn {
        position: fixed;
        right: 16px;
        top: 16px;
        z-index: 999;
        background: rgba(255,255,255,0.95);
        border: none;
        padding: 10px 14px;
        font-size: 14px;
        border-radius: 6px;
        cursor: pointer;
        box-shadow: 0 2px 8px rgba(0,0,0,0.4);
      }
      #info {
        position: fixed;
        left: 16px;
        top: 16px;
        z-index: 999;
        color: white;
        font-family: sans-serif;
        background: rgba(0,0,0,0.35);
        padding: 8px 10px;
        border-radius: 6px;
      }
    </style>
    <script>
      AFRAME.registerComponent('solar-top-starfield', {
        init: function () {
          const scene = this.el.sceneEl.object3D;
          // === Starfield using shader points (twinkling) ===
          const starCount = 900;
          const positions = new Float32Array(starCount * 3);
          const phases = new Float32Array(starCount);
          const sizes = new Float32Array(starCount);
          const spread = 220.0;
          for (let i = 0; i < starCount; i++) {
            // distribute in a disk with slight thickness
            const angle = Math.random() * Math.PI * 2;
            const radius = (Math.random() ** 0.6) * spread;
            const x = Math.cos(angle) * radius;
            const z = Math.sin(angle) * radius;
            const y = (Math.random() - 0.5) * 20;
            positions[i * 3 + 0] = x;
            positions[i * 3 + 1] = y;
            positions[i * 3 + 2] = z;
            phases[i] = Math.random() * Math.PI * 2;
            sizes[i] = 0.8 + Math.random() * 3.2;
          }
          const geometry = new THREE.BufferGeometry();
          geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
          geometry.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));
          geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));

          const material = new THREE.ShaderMaterial({
            transparent: true,
            depthWrite: false,
            uniforms: {
              uTime: { value: 0.0 },
              uPixelRatio: { value: window.devicePixelRatio || 1.0 }
            },
            vertexShader: `
              attribute float aPhase;
              attribute float aSize;
              uniform float uTime;
              uniform float uPixelRatio;
              varying float vAlpha;
              void main() {
                vec3 pos = position;
                float dist = length(pos.xz);
                float tw = 0.5 + 0.5 * sin(uTime * 2.0 + aPhase);
                vAlpha = 0.35 + 0.65 * tw;
                gl_PointSize = (aSize * (2.0 + (1.0 - dist/220.0)*2.5)) * uPixelRatio;
                vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
                gl_Position = projectionMatrix * mvPosition;
              }
            `,
            fragmentShader: `
              varying float vAlpha;
              void main() {
                float r = length(gl_PointCoord - vec2(0.5));
                float alpha = smoothstep(0.5, 0.0, r) * vAlpha;
                vec3 col = vec3(1.0, 1.0, 1.0);
                gl_FragColor = vec4(col, alpha);
              }
            `
          });

          const stars = new THREE.Points(geometry, material);
          scene.add(stars);
          this.stars = stars;

          // === Sun (red bright) ===
          const sunGeo = new THREE.SphereGeometry(1.6, 64, 64);
          const sunMat = new THREE.MeshStandardMaterial({
            color: 0x220000,
            emissive: new THREE.Color(0xff2200),
            emissiveIntensity: 6.0,
            roughness: 0.12,
            metalness: 0.0
          });
          const sun = new THREE.Mesh(sunGeo, sunMat);
          sun.position.set(0, 0, 0);
          scene.add(sun);

          // halo using sprite for glow
          const canvasTexture = new THREE.CanvasTexture((() => {
            const c = document.createElement('canvas');
            c.width = 256; c.height = 256;
            const ctx = c.getContext('2d');
            const g = ctx.createRadialGradient(128,128,10,128,128,128);
            g.addColorStop(0, 'rgba(255,200,150,0.95)');
            g.addColorStop(0.3, 'rgba(255,120,80,0.55)');
            g.addColorStop(0.6, 'rgba(255,60,20,0.18)');
            g.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = g; ctx.fillRect(0,0,256,256);
            return c;
          })());
          const spriteMat = new THREE.SpriteMaterial({
            map: canvasTexture,
            blending: THREE.AdditiveBlending,
            transparent: true,
            depthWrite: false
          });
          const halo = new THREE.Sprite(spriteMat);
          halo.scale.set(12,12,1);
          sun.add(halo);

          // subtle corona layers for more glow
          const coronaGeo = new THREE.RingGeometry(2.2, 4.0, 64);
          const coronaMat = new THREE.MeshBasicMaterial({
            color: 0xff8a4a,
            transparent: true,
            opacity: 0.18,
            side: THREE.DoubleSide,
            blending: THREE.AdditiveBlending
          });
          const corona = new THREE.Mesh(coronaGeo, coronaMat);
          corona.rotation.x = Math.PI / 2;
          sun.add(corona);

          // === Planets (top-down distances scaled) ===
          const planetsData = [
            { name: "Mercury", radius: 3.6, size: 0.2, color: 0xaaa9a9, speed: 0.018 },
            { name: "Venus",   radius: 5.0, size: 0.32, color: 0xffd6a6, speed: 0.013 },
            { name: "Earth",   radius: 6.6, size: 0.36, color: 0x3b8eed, speed: 0.01 },
            { name: "Mars",    radius: 8.2, size: 0.28, color: 0xf
