import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import CANNON from 'cannon'
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js'
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader.js'

export default function init(canvas) {

  //////////////////////
  // DEBUG
  //////////////////////

  const debugObject = {}

  //////////////////////
  // SCENE
  //////////////////////

  const scene = new THREE.Scene()
  scene.background = new THREE.Color("#000000")

  //////////////////////
  // PHYSICS
  //////////////////////

  const world = new CANNON.World()
  world.gravity.set(0, 0, 0)

  //////////////////////
  // TEXTURES
  //////////////////////

  const textureLoader = new THREE.TextureLoader()

  const ringPointTexture = textureLoader.load('particles/1.png')

  //////////////////////
  // TORUS RINGS
  //////////////////////

  const ringNumParticles = 50
  const ringRadius = 2
  const torusRadius = 9
  const numRings = 1000

  function createRing() {
    const ringGeometry = new THREE.BufferGeometry()
    const positions = []

    for (let i = 0; i < ringNumParticles; i++) {
      const angle = (i / ringNumParticles) * Math.PI * 2

      const x = Math.cos(angle) * ringRadius
      const y = 0
      const z = Math.sin(angle) * ringRadius

      positions.push(x, y, z)
    }

    ringGeometry.setAttribute(
      'position',
      new THREE.Float32BufferAttribute(positions, 3)
    )

    const ringMaterial = new THREE.PointsMaterial({
      color: '#FF70FF',
      size: 0.1,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
      map: ringPointTexture,
      depthWrite: false
    })

    const ring = new THREE.Points(ringGeometry, ringMaterial)

    ring.rotation.z = Math.PI / 2

    return ring
  }

  const torusGroup = new THREE.Group()

  for (let i = 0; i < numRings; i++) {
    const angle = (i / numRings) * Math.PI * 2

    const ringX = Math.cos(angle) * torusRadius
    const ringZ = Math.sin(angle) * torusRadius
    const ringY = 0

    const ring = createRing()
    ring.position.set(ringX, ringY, ringZ)

    const radialDirection = new THREE.Vector3(-ringX, 0, -ringZ).normalize()
    ring.quaternion.setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      radialDirection
    )

    ring.userData = {
      rotationSpeed: 0.02
    }

    torusGroup.add(ring)
  }

  scene.add(torusGroup)

  //////////////////////
  // LIGHTS
  //////////////////////

  const ambientLight = new THREE.AmbientLight(0xffffff, 2.1)
  scene.add(ambientLight)

  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.6)
  directionalLight.position.set(5, 5, 5)
  scene.add(directionalLight)

  //////////////////////
  // SIZES (canvas-based)
  //////////////////////

  const sizes = {
    width: canvas.clientWidth,
    height: canvas.clientHeight
  }

  //////////////////////
  // CAMERA
  //////////////////////

  const camera = new THREE.PerspectiveCamera(75, sizes.width / sizes.height, 0.1, 100)
  camera.position.set(-1, 8.5, 16)
  camera.lookAt(0, 0, 0)
  scene.add(camera)

  //////////////////////
  // RENDERER
  //////////////////////

  const renderer = new THREE.WebGLRenderer({
    canvas: canvas,
    antialias: true
  })

  renderer.setSize(sizes.width, sizes.height)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

  //////////////////////
  // CONTROLS
  //////////////////////

  const controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true

  //////////////////////
  // EVENTS
  //////////////////////

  function onKeyDown(e) {
    if (e.key === 'p') {
      console.log("Camera position:", camera.position)
    }
  }

  document.addEventListener('keydown', onKeyDown)

  //////////////////////
  // RESIZE
  //////////////////////

  function onResize() {
    const width = canvas.clientWidth
    const height = canvas.clientHeight

    camera.aspect = width / height
    camera.updateProjectionMatrix()

    renderer.setSize(width, height)
  }

  window.addEventListener('resize', onResize)

  //////////////////////
  // ANIMATION
  //////////////////////

  let animId

  function animate() {
    torusGroup.children.forEach((ring) => {
      ring.rotation.y += ring.userData.rotationSpeed
    })

    controls.update()
    renderer.render(scene, camera)

    animId = requestAnimationFrame(animate)
  }

  animate()

  //////////////////////
  // CLEANUP
  //////////////////////

  return function cleanup() {
    cancelAnimationFrame(animId)

    window.removeEventListener('resize', onResize)
    document.removeEventListener('keydown', onKeyDown)

    controls.dispose()
    renderer.dispose()

    scene.traverse(obj => {
      if (obj.geometry) obj.geometry.dispose()
      if (obj.material) obj.material.dispose()
    })
  }
}