import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import CANNON from 'cannon'

export default function init(canvas) {


  const scene = new THREE.Scene()
  scene.background = new THREE.Color("#000000")

  const world = new CANNON.World()
  world.gravity.set(0, 0, 0)

  const textureLoader = new THREE.TextureLoader()
  const cubeTextureLoader = new THREE.CubeTextureLoader()

  const environmentMapTexture = cubeTextureLoader.load([
    '/textures/environmentMaps/0/px.png',
    '/textures/environmentMaps/0/nx.png',
    '/textures/environmentMaps/0/py.png',
    '/textures/environmentMaps/0/ny.png',
    '/textures/environmentMaps/0/pz.png',
    '/textures/environmentMaps/0/nz.png'
  ])

  const defaultMaterial = new CANNON.Material('default')
  const defaultContactMaterial = new CANNON.ContactMaterial(
    defaultMaterial,
    defaultMaterial,
    { friction: 0, restitution: 1 }
  )
  world.addContactMaterial(defaultContactMaterial)
  world.defaultContactMaterial = defaultContactMaterial

  const sphereGeometry = new THREE.SphereGeometry(0.8, 7, 12)
  const sphereMaterial = new THREE.MeshStandardMaterial({
    metalness: 0.3,
    roughness: 0.1,
    wireframe: true,
    color: '#FFFF00',
    side: THREE.DoubleSide
  })

  const shape = new CANNON.Sphere(0.5)
  const body = new CANNON.Body({
    mass: 1.3,
    position: new CANNON.Vec3(0, 0, 0),
    shape: shape,
    material: defaultMaterial
  })
  world.addBody(body)

  const mesh = new THREE.Mesh(sphereGeometry, sphereMaterial)
  mesh.scale.set(0.5, 0.5, 0.5)
  mesh.position.copy(body.position)
  scene.add(mesh)

  const torusRadius = 9
  const tubeRadius = 5.3
  const numRings = 100
  const particlesPerRing = 30
  const numParticles = numRings * particlesPerRing

  const torusGeometry = new THREE.BufferGeometry()
  const positions = new Float32Array(numParticles * 3)
  const angles = new Float32Array(numParticles)

  for (let i = 0; i < numParticles; i++) {
    const angle = (i / numParticles) * Math.PI * 2
    const tubeAngle = 0.05 * i * Math.PI

    const x = (torusRadius + tubeRadius * Math.cos(tubeAngle)) * Math.cos(angle)
    const y = (torusRadius + tubeRadius * Math.cos(tubeAngle)) * Math.sin(angle)
    const z = tubeRadius * Math.sin(tubeAngle)

    const waveAmplitude = 0.5
    const waveFrequency = 2

    positions[i * 3] = x + waveAmplitude * Math.sin(angle * waveFrequency)
    positions[i * 3 + 1] = y + waveAmplitude * Math.sin(angle * waveFrequency)
    positions[i * 3 + 2] = z + waveAmplitude * Math.cos(angle * waveFrequency)
  }

  torusGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))

  const pointTexture = textureLoader.load('particles/1.png')

  const pointMaterial = new THREE.PointsMaterial({
    color: '#FFFF00',
    size: 0.7,
    transparent: true,
    opacity: 0.8,
    blending: THREE.AdditiveBlending,
    map: pointTexture,
    alphaMap: pointTexture,
    depthWrite: false
  })

  const torus = new THREE.Points(torusGeometry, pointMaterial)
  torus.rotation.y = Math.PI / 2
  scene.add(torus)

  function animateParticles() {
    const positionsArray = torus.geometry.attributes.position.array

    for (let i = 0; i < numParticles; i++) {
      angles[i] += 0.01

      const angle = (i / numParticles) * Math.PI * 2
      const tubeAngle = 0.05 * i * Math.PI

      const x = (torusRadius + tubeRadius * Math.cos(tubeAngle)) * Math.cos(angle)
      const y = (torusRadius + tubeRadius * Math.cos(tubeAngle)) * Math.sin(angle)
      const z = tubeRadius * Math.sin(tubeAngle)

      const waveAmplitude = 0.5
      const waveFrequency = 2

      positionsArray[i * 3] = x + waveAmplitude * Math.sin(angle * waveFrequency + angles[i])
      positionsArray[i * 3 + 1] = y + waveAmplitude * Math.sin(angle * waveFrequency + angles[i])
      positionsArray[i * 3 + 2] = z + waveAmplitude * Math.cos(angle * waveFrequency + angles[i])
    }

    torus.geometry.attributes.position.needsUpdate = true
  }

  const sizes = {
    width: canvas.clientWidth,
    height: canvas.clientHeight
  }

  const camera = new THREE.PerspectiveCamera(75, sizes.width / sizes.height, 0.1, 100)
  camera.position.set(22, -19.4, 7)
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

    animateParticles()

    camera.lookAt(scene.position)

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