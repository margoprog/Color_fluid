import * as THREE from "three"
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

const CIRCLE_SEGMENTS = 600
const STACK_COUNT = 150
const VORTEX_COUNT = 5

export default function init(canvas) {

  //////////////////////
  // SETUP
  //////////////////////

  const scene = new THREE.Scene()
  scene.background = new THREE.Color(0x000000)

  const W = window.innerWidth
  const H = window.innerHeight

  const camera = new THREE.PerspectiveCamera(60, W / H, 0.1, 500)
  camera.position.set(0, 0, 25)
  camera.lookAt(0, 0, 0)

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
  renderer.setSize(W, H)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

  // ← plus de document.body.appendChild, on utilise le canvas reçu

  const controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true
  controls.dampingFactor = 0.05
  controls.enableZoom = true
  controls.enablePan = false

  const clock = new THREE.Clock()

  //////////////////////
  // PARTICLE MATERIAL
  //////////////////////

  const baseMaterial = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uTime: { value: 0 },
      uPhase: { value: 0 },
      uHueOffset: { value: 0 }
    },
    vertexShader: `
      uniform float uTime;
      uniform float uPhase;
      varying float vHue;
      const float PI = 3.1415926;
      void main() {
        vec3 pos = position;
        float angle = atan(pos.y, pos.x);
        float radius = length(pos.xy);
        float wave = sin(angle * 8.0 + uTime * PI * 2.0 + uPhase);
        radius += wave * 0.25;
        pos.x = cos(angle) * radius;
        pos.y = sin(angle) * radius;
        vHue = fract(position.z * 0.03 + uTime * 0.1);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
        gl_PointSize = 2.0;
      }
    `,
    fragmentShader: `
      varying float vHue;
      vec3 hsl2rgb(vec3 hsl){
        vec3 rgb = clamp(abs(mod(hsl.x*6.0 + vec3(0,4,2),6.0)-3.0)-1.0,0.0,1.0);
        return hsl.z + hsl.y * (rgb - 0.5) * (1.0 - abs(2.0*hsl.z-1.0));
      }
      void main() {
        float d = length(gl_PointCoord - vec2(0.5));
        float mask = smoothstep(0.5, 0.25, d);
        vec3 color = hsl2rgb(vec3(vHue, 1.0, 0.55));
        gl_FragColor = vec4(color, mask);
      }
    `
  })

  //////////////////////
  // CREATE VORTEX
  //////////////////////

  function createVortex(offsetAngle) {
    const group = new THREE.Group()
    for (let i = 0; i < STACK_COUNT; i++) {
      const t = i / STACK_COUNT
      const radius = (1 - t) * 4.5
      const spread = t * 12
      const curveAngle = t * Math.PI * 2 + offsetAngle
      const centerX = Math.cos(curveAngle) * spread
      const centerY = Math.sin(curveAngle) * spread * 0.4
      const centerZ = (t - 0.5) * 18
      const geometry = new THREE.BufferGeometry()
      const positions = new Float32Array(CIRCLE_SEGMENTS * 3)
      let ptr = 0
      for (let j = 0; j < CIRCLE_SEGMENTS; j++) {
        const a = (j / CIRCLE_SEGMENTS) * Math.PI * 2
        positions[ptr++] = centerX + Math.cos(a) * radius
        positions[ptr++] = centerY + Math.sin(a) * radius
        positions[ptr++] = centerZ
      }
      geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3))
      const mat = baseMaterial.clone()
      mat.uniforms.uPhase = { value: i * 0.4 }
      group.add(new THREE.Points(geometry, mat))
    }
    return group
  }

  for (let i = 0; i < VORTEX_COUNT; i++) {
    scene.add(createVortex((i / VORTEX_COUNT) * Math.PI * 2))
  }

  //////////////////////
  // ANIMATION
  //////////////////////

  let animId

  function animate() {
    animId = requestAnimationFrame(animate)
    const t = clock.getElapsedTime()
    scene.traverse(obj => {
      if (obj.material?.uniforms) obj.material.uniforms.uTime.value = t * 0.5
    })
    scene.rotation.y += 0.002
    controls.update()
    renderer.render(scene, camera)
  }

  animate()

  //////////////////////
  // RESIZE
  //////////////////////

  function onResize() {
    renderer.setSize(window.innerWidth, window.innerHeight)
    camera.aspect = window.innerWidth / window.innerHeight
    camera.updateProjectionMatrix()
  }

  window.addEventListener("resize", onResize)

  //////////////////////
  // CLEANUP
  //////////////////////

  return function cleanup() {
    cancelAnimationFrame(animId)
    window.removeEventListener("resize", onResize)
    controls.dispose()
    renderer.dispose()
    scene.traverse(obj => {
      if (obj.geometry) obj.geometry.dispose()
      if (obj.material) obj.material.dispose()
    })
  }
}