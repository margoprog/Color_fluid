import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import CANNON from 'cannon'

export default function init(canvas) {

  const scene = new THREE.Scene()
  scene.background = new THREE.Color("#000000")

  const world = new CANNON.World()
  world.gravity.set(0, 0, 0)

  const textureLoader = new THREE.TextureLoader()
  const ringPointTexture = textureLoader.load('particles/1.png')

  const defaultMaterial = new CANNON.Material('default')
  const defaultContactMaterial = new CANNON.ContactMaterial(
    defaultMaterial,
    defaultMaterial,
    { friction: 0, restitution: 1 }
  )
  world.addContactMaterial(defaultContactMaterial)
  world.defaultContactMaterial = defaultContactMaterial

  const ringRadius = 5.3
  const ringNumParticles = 500
  const waveAmplitude = 0.5
  const waveFrequency = 10

  const ringGeometry = new THREE.BufferGeometry()
  const pos = []

  for (let i = 0; i < ringNumParticles; i++) {
    const angle = (i / ringNumParticles) * Math.PI * 2

    const wave = Math.sin(angle * waveFrequency) * waveAmplitude
    const radius = ringRadius + wave

    const z = Math.cos(angle) * radius
    const y = Math.sin(angle) * radius
    const x = 0

    pos.push(x, y, z)
  }

  ringGeometry.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))

  const ringMaterial = new THREE.PointsMaterial({
    color: '#00FF00',
    size: 0.05,
    transparent: true,
    opacity: 0.8,
    blending: THREE.AdditiveBlending,
    map: ringPointTexture,
    depthWrite: false
  })

  const ringParticles = new THREE.Points(ringGeometry, ringMaterial)
//   scene.add(ringParticles)

  const torusRadius = 2
  const numRings = 200
  const ringGroup = new THREE.Group()

  for (let i = 0; i < numRings; i++) {
    const angle = (i / numRings) * Math.PI * 2

    const x = Math.cos(angle) * torusRadius
    const z = Math.sin(angle) * torusRadius
    const y = 0

    const ringClone = ringParticles.clone()
    ringClone.position.set(x, y, z)
    ringClone.lookAt(0, y, 0)
    ringClone.rotateY(Math.PI / 2)

    ringGroup.add(ringClone)
  }

  scene.add(ringGroup)

  const ambientLight = new THREE.AmbientLight(0xffffff, 2.1)
  scene.add(ambientLight)

  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.6)
  directionalLight.position.set(5, 5, 5)
  scene.add(directionalLight)

  const sizes = {
    width: canvas.clientWidth,
    height: canvas.clientHeight
  }

  const camera = new THREE.PerspectiveCamera(75, sizes.width / sizes.height, 0.1, 100)
  camera.position.set(11, 6, 3)
  camera.lookAt(0, 0, 0)
  scene.add(camera)

  function onKeyDown(e) {
    if (e.key === 'p') {
      console.log("Position de la caméra :", camera.position)
    }
  }

  document.addEventListener('keydown', onKeyDown)

  const renderer = new THREE.WebGLRenderer({
    canvas: canvas,
    antialias: true
  })

  renderer.setSize(sizes.width, sizes.height)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

  const controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true

  function onResize() {
    const width = canvas.clientWidth
    const height = canvas.clientHeight

    camera.aspect = width / height
    camera.updateProjectionMatrix()

    renderer.setSize(width, height)
  }

  window.addEventListener('resize', onResize)

  const clock = new THREE.Clock()
  let animId

  function tick() {
    const elapsedTime = clock.getElapsedTime()

    ringGroup.children.forEach((ring) => {
      ring.rotation.z += 0.002
    })

    controls.update()
    world.step(1 / 60)

    renderer.render(scene, camera)
    animId = requestAnimationFrame(tick)
  }

  tick()

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