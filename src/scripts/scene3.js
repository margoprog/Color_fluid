import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import CANNON from 'cannon'

export default function init(canvas) {

  // Scene
  const scene = new THREE.Scene()
  scene.background = new THREE.Color("#000000")

  // Physics
  const world = new CANNON.World()
  world.gravity.set(0, 0, 0)

  const defaultMaterial = new CANNON.Material('default')
  const defaultContactMaterial = new CANNON.ContactMaterial(
    defaultMaterial,
    defaultMaterial,
    { friction: 0, restitution: 1 }
  )

  world.addContactMaterial(defaultContactMaterial)
  world.defaultContactMaterial = defaultContactMaterial

  // Textures
  const textureLoader = new THREE.TextureLoader()
  const ringPointTexture = textureLoader.load('particles/6.png')

  // Params
  const ringRadius = 0.3
  const ringNumParticles = 1200
  const waveAmplitude = 6
  const waveFrequency = 1.5

  const ringGeometry = new THREE.BufferGeometry()
  const pos = []
  const colors = []

  // SMOOTH
  for (let i = 0; i < ringNumParticles; i++) {
    const angle = (i / ringNumParticles) * Math.PI * 2
    const wave = Math.sin(angle * waveFrequency) * waveAmplitude
    const radius = ringRadius + wave

    const y = Math.cos(angle) * radius
    const x = Math.sin(angle) * radius
    const z = 0

    const hue = (angle / (Math.PI * 2)) * 110
    const color = new THREE.Color()
    color.setHSL(hue / 15, 2, 0.39)

    colors.push(color.r, color.b, color.b)
    pos.push(x, y, z)
  }

  ringGeometry.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  ringGeometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))

  const ringMaterial = new THREE.PointsMaterial({
    vertexColors: true,
    size: 0.06,
    transparent: true,
    opacity: 0.1,
    blending: THREE.AdditiveBlending,
    map: ringPointTexture,
    depthWrite: false
  })

  const ringParticles = new THREE.Points(ringGeometry, ringMaterial)
  scene.add(ringParticles)

  // Ring Group
  const torusRadius = 0.5
  const numRings = 500
  const ringGroup = new THREE.Group()

  for (let i = 0; i < numRings; i++) {
    const angle = (i / numRings) * Math.PI * 2

    const x = Math.cos(angle) * torusRadius
    const z = Math.sin(angle) * torusRadius

    const ringClone = ringParticles.clone()
    ringClone.position.set(x, 0, z)
    ringClone.lookAt(0, 0, 0)
    ringClone.rotateY(Math.PI / 2)

    ringGroup.add(ringClone)
  }

  scene.add(ringGroup)

  // Lights
  const ambientLight = new THREE.AmbientLight(0xffffff, 2.1)
  scene.add(ambientLight)

  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.6)
  directionalLight.position.set(5, 5, 5)
  scene.add(directionalLight)

  // Sizes
  const sizes = {
    width: window.innerWidth,
    height: window.innerHeight
  }

  // Camera
  const camera = new THREE.PerspectiveCamera(
    75,
    sizes.width / sizes.height,
    0.01,
    10000
  )

  camera.position.set(9.5, -5.7, -8.3)
  camera.lookAt(0, 0, 8)
  scene.add(camera)

  // Renderer
  const renderer = new THREE.WebGLRenderer({ canvas })
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap
  renderer.setSize(sizes.width, sizes.height)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

  // Controls
  const controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true

  // Resize
  function onResize() {
    sizes.width = window.innerWidth
    sizes.height = window.innerHeight

    camera.aspect = sizes.width / sizes.height
    camera.updateProjectionMatrix()

    renderer.setSize(sizes.width, sizes.height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  }

  window.addEventListener('resize', onResize)

  // Animation
  const clock = new THREE.Clock()
  let oldElapsedTime = 0
  let animId

  function tick() {
    animId = requestAnimationFrame(tick)

    const elapsedTime = clock.getElapsedTime()
    const deltaTime = elapsedTime - oldElapsedTime
    oldElapsedTime = elapsedTime

    ringGroup.children.forEach((ring) => {
      ring.rotation.z += 0.002
    })

    console.log("Position de la caméra :", camera.position)

    controls.update()
    world.step(1 / 60, deltaTime, 3)

    renderer.render(scene, camera)
  }

  tick()

  // Cleanup
  return function cleanup() {
    cancelAnimationFrame(animId)
    window.removeEventListener('resize', onResize)

    controls.dispose()
    renderer.dispose()

    scene.traverse(obj => {
      if (obj.geometry) obj.geometry.dispose()
      if (obj.material) {
        if (Array.isArray(obj.material)) {
          obj.material.forEach(m => m.dispose())
        } else {
          obj.material.dispose()
        }
      }
    })
  }
}