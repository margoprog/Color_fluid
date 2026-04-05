import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import CANNON from 'cannon';

export default function init(canvas) {

  const scene = new THREE.Scene();
  scene.background = new THREE.Color("#000000");

  const world = new CANNON.World();
  world.gravity.set(0, 0, 0);

  const defaultMaterial = new CANNON.Material('default');
  const defaultContactMaterial = new CANNON.ContactMaterial(
    defaultMaterial,
    defaultMaterial,
    {
      friction: 0,
      restitution: 1
    }
  );

  world.addContactMaterial(defaultContactMaterial);
  world.defaultContactMaterial = defaultContactMaterial;

  const textureLoader = new THREE.TextureLoader();
  const ringPointTexture = textureLoader.load('particles/6.png');

  const ringRadius = 0.3;
  const ringNumParticles = 1200;
  const waveAmplitude = 6;
  const waveFrequency = 1.5;

  const ringGeometry = new THREE.BufferGeometry();
  const pos = [];
  const colors = [];

  const numColorSources = 20;
  const diffusionRadius = 0.3;

  const colorSources = [];
  const sourceColors = [];

  for (let i = 0; i < numColorSources; i++) {
    const angle = Math.random() * Math.PI * 2;
    const radius = ringRadius + (Math.random() - 0.5) * waveAmplitude;

    const x = Math.sin(angle) * radius;
    const y = Math.cos(angle) * radius;
    const z = 0;

    colorSources.push({ x, y, z });

    const color = new THREE.Color();
    color.setHSL(Math.random(), 1, 0.5);
    sourceColors.push(color);
  }

  for (let i = 0; i < ringNumParticles; i++) {
    const angle = (i / ringNumParticles) * Math.PI * 2;
    const wave = Math.sin(angle * waveFrequency) * waveAmplitude;
    const radius = ringRadius + wave;

    const y = Math.cos(angle) * radius;
    const x = Math.sin(angle) * radius;
    const z = 0;

    const finalColor = new THREE.Color(0, 0, 0);

    for (let j = 0; j < numColorSources; j++) {
      const dx = x - colorSources[j].x;
      const dy = y - colorSources[j].y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < diffusionRadius) {
        const weight = Math.pow(1 - (distance / diffusionRadius), 2);
        finalColor.r += sourceColors[j].r * weight;
        finalColor.g += sourceColors[j].g * weight;
        finalColor.b += sourceColors[j].b * weight;
      }
    }

    const noise = (Math.random() - 0.5) * 0.1;
    finalColor.r += noise;
    finalColor.g += noise;
    finalColor.b += noise;

    colors.push(finalColor.r, finalColor.g, finalColor.b);
    pos.push(x, y, z);
  }

  ringGeometry.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  ringGeometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

  const ringMaterial = new THREE.PointsMaterial({
    vertexColors: true,
    size: 0.2,
    transparent: true,
    opacity: 0.1,
    blending: THREE.AdditiveBlending,
    map: ringPointTexture,
    depthWrite: false
  });

  const ringParticles = new THREE.Points(ringGeometry, ringMaterial);

  const torusRadius = 1;
  const numRings = 600;
  const ringGroup = new THREE.Group();

  for (let i = 0; i < numRings; i++) {
    const angle = (i / numRings) * Math.PI * 2;

    const x = Math.cos(angle) * torusRadius;
    const z = Math.sin(angle) * torusRadius;
    const y = 0;

    const ringClone = ringParticles.clone();
    ringClone.position.set(x, y, z);
    ringClone.lookAt(0, y, 0);
    ringClone.rotateY(Math.PI / 2);

    ringGroup.add(ringClone);
  }

  scene.add(ringGroup);

  const ambientLight = new THREE.AmbientLight(0xffffff, 2.1);
  scene.add(ambientLight);

  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.6);
  directionalLight.position.set(5, 5, 5);
  scene.add(directionalLight);

  const sizes = {
    width: canvas.clientWidth,
    height: canvas.clientHeight
  };

  const camera = new THREE.PerspectiveCamera(75, sizes.width / sizes.height, 0.01, 10000);
  camera.position.set(9.5, -5.7, -8.3);
  camera.lookAt(0, 0, 8);
  scene.add(camera);

  const renderer = new THREE.WebGLRenderer({
    canvas: canvas,
    antialias: true
  });

  renderer.setSize(sizes.width, sizes.height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;

  function onResize() {
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;

    camera.aspect = width / height;
    camera.updateProjectionMatrix();

    renderer.setSize(width, height);
  }

  window.addEventListener('resize', onResize);

  function animateColorSources() {
    for (let j = 0; j < numColorSources; j++) {
      colorSources[j].x += (Math.random() - 0.5) * 0.01;
      colorSources[j].y += (Math.random() - 0.5) * 0.01;
    }
  }

  const clock = new THREE.Clock();
  let animId;

  function tick() {
    const elapsedTime = clock.getElapsedTime();

    ringGroup.children.forEach((ring) => {
      ring.rotation.z += 0.002;
    });

    controls.update();
    world.step(1 / 60);
    animateColorSources();

    renderer.render(scene, camera);
    animId = requestAnimationFrame(tick);
  }

  tick();

  return function cleanup() {
    cancelAnimationFrame(animId);
    window.removeEventListener('resize', onResize);

    controls.dispose();
    renderer.dispose();

    scene.traverse(obj => {
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) obj.material.dispose();
    });
  };
}