import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

//========================================================
// Scene & Camera
//========================================================

const width = 640;
const height = 480;

const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(
	70,
	width / height,
	0.01,
	100
);

camera.position.set(0, 0, 2);

//========================================================
// Rendering
//========================================================

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(width, height);

document.body.appendChild(renderer.domElement);

//========================================================
// Controls
//========================================================

const controls = new OrbitControls(
	camera,
	renderer.domElement
);

controls.update();

//========================================================
// Geometry
//========================================================

const cube = new THREE.BoxGeometry(1.0, 1.0, 1.0);

const edges = new THREE.EdgesGeometry(cube);

//========================================================
// Materials
//========================================================

const edgeMaterial = new THREE.LineBasicMaterial({
	color: 0xffffff,
});

//========================================================
// Scene Objects
//========================================================

const cubeWireframe = new THREE.LineSegments(
	edges,
	edgeMaterial
);

scene.add(cubeWireframe);

//========================================================
// Animation Loop
//========================================================

renderer.setAnimationLoop(animate);

function animate() {
	controls.update();
	renderer.render(scene, camera);
}
