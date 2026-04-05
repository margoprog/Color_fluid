import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import CANNON from 'cannon'

export default function init(canvas) {

  //////////////////////
  // SETUP
  //////////////////////

  const scene = new THREE.Scene()
  scene.background = new THREE.Color("#000000")

  const sizes = {
    width: canvas.clientWidth || window.innerWidth,
    height: canvas.clientHeight || window.innerHeight
  }

  const camera = new THREE.PerspectiveCamera(75, sizes.width / sizes.height, 0.1, 100)
  camera.position.set(0, 13, 8)
  camera.lookAt(0, 0, 0)

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
  renderer.setSize(sizes.width, sizes.height)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

  const controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true

  const clock = new THREE.Clock()

  //////////////////////
  // PHYSICS
  //////////////////////

  const world = new CANNON.World()
  world.gravity.set(0, 0, 0)

  const defaultMaterial = new CANNON.Material('default')
  const contactMaterial = new CANNON.ContactMaterial(defaultMaterial, defaultMaterial, {
    friction: 0,
    restitution: 1
  })

  world.addContactMaterial(contactMaterial)
  world.defaultContactMaterial = contactMaterial

  //////////////////////
  // LIGHTS
  //////////////////////

  const ambientLight = new THREE.AmbientLight(0xffffff, 2)
  scene.add(ambientLight)

  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.6)
  directionalLight.position.set(5, 5, 5)
  scene.add(directionalLight)

  //////////////////////
  // PARTICLE RING
  //////////////////////

  const textureLoader = new THREE.TextureLoader()
  const ringPointTexture = textureLoader.load('/particles/1.png')

  const ringMaterial = new THREE.PointsMaterial({
    color: '#0070FF',
    size: 0.1,
    transparent: true,
    opacity: 0.8,
    blending: THREE.AdditiveBlending,
    map: ringPointTexture,
    depthWrite: false
  })

  const ringRadius = 5.3
  const ringNumParticles = 700
  const waveAmplitude = 0.5
  const waveFrequency = 10

  const ringGeometry = new THREE.BufferGeometry()
  const pos = []

  for (let i = 0; i < ringNumParticles; i++) {
    const angle = (i / ringNumParticles) * Math.PI * 2
    const wave = Math.sin(angle * waveFrequency) * waveAmplitude
    const radius = ringRadius + wave

    const x = Math.sin(angle) * radius
    const y = Math.cos(angle) * radius
    const z = 0

    pos.push(x, y, z)
  }

  ringGeometry.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))

  const baseRing = new THREE.Points(ringGeometry, ringMaterial)

  //////////////////////
  // RING GROUP (TORUS STYLE)
  //////////////////////

  const ringGroup = new THREE.Group()
  const torusRadius = 2
  const numRings = 50

  for (let i = 0; i < numRings; i++) {
    const angle = (i / numRings) * Math.PI * 2

    const x = Math.cos(angle) * torusRadius
    const z = Math.sin(angle) * torusRadius

    const ringClone = baseRing.clone()
    ringClone.position.set(x, 0, z)
    ringClone.lookAt(0, 0, 0)
    ringClone.rotateY(Math.PI / 2)

    ringGroup.add(ringClone)
  }

  scene.add(ringGroup)

  //////////////////////
  // ANIMATION
  //////////////////////

  let animId

  function animate() {
    animId = requestAnimationFrame(animate)

    const delta = clock.getDelta()
    world.step(1 / 60, delta)

    ringGroup.children.forEach(ring => {
      ring.rotation.z += 0.002
    })

    controls.update()
    renderer.render(scene, camera)
  }

  animate()

  //////////////////////
  // RESIZE (IMPORTANT pour grille)
  //////////////////////

  function onResize() {
    const width = canvas.clientWidth
    const height = canvas.clientHeight

    renderer.setSize(width, height, false)
    camera.aspect = width / height
    camera.updateProjectionMatrix()
  }

  window.addEventListener('resize', onResize)

  //////////////////////
  // CLEANUP
  //////////////////////

  return function cleanup() {
    cancelAnimationFrame(animId)
    window.removeEventListener('resize', onResize)

    controls.dispose()
    renderer.dispose()

    scene.traverse(obj => {
      if (obj.geometry) obj.geometry.dispose()
      if (obj.material) obj.material.dispose()
    })
  }
}