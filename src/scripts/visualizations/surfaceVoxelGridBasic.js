import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

//========================================================
// Constants
//========================================================

const VOXEL_SIZE = 1.0;

const GRID_SIZE_X = 5;
const GRID_SIZE_Y = 5;
const GRID_SIZE_Z = 5;



//========================================================
// Visualization Instance
//========================================================

function initializeSurfaceVoxelGrid(visualizationRoot) {

	//========================================================
	// Viewport
	//========================================================

	const viewport =
		visualizationRoot.querySelector(".viewport");

	if (viewport === null) {
		throw new Error(
			"Visualization viewport was not found."
		);
	}

	const width = viewport.clientWidth;
	const height = viewport.clientHeight;

	//========================================================
	// UI Controls
	//========================================================

	const surfaceSlider =
		visualizationRoot.querySelector(".surface-variation");

	const surfaceVariationValue =
		visualizationRoot.querySelector(".surface-variation-value");

	const surfaceButton =
		visualizationRoot.querySelector(".toggle-surface");

	const surfaceVoxelsButton =
		visualizationRoot.querySelector(".toggle-surface-voxels");

	const resetCameraButton =
		visualizationRoot.querySelector(".reset-camera");

	const numSurfaceVoxels =
		visualizationRoot.querySelector(".num-surface-voxels");

	if (
		surfaceSlider === null ||
		surfaceVariationValue === null ||
		surfaceButton === null ||
		surfaceVoxelsButton === null ||
		resetCameraButton === null ||
		numSurfaceVoxels === null
	) {
		throw new Error(
			"Surface voxel grid visualization controls were not found."
		);
	}

	//========================================================
	// Scene & Camera
	//========================================================

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

	const renderer = new THREE.WebGLRenderer({
		antialias: true
	});

	renderer.setSize(width, height);

	viewport.appendChild(renderer.domElement);

	//========================================================
	// Camera Controls
	//========================================================

	const controls = new OrbitControls(
		camera,
		renderer.domElement
	);

	controls.update();
	controls.saveState();

	//========================================================
	// Cube Geometry
	//========================================================

	const cubeVertices = [
		new THREE.Vector3(-0.5, -0.5, -0.5),
		new THREE.Vector3(0.5, -0.5, -0.5),
		new THREE.Vector3(0.5, 0.5, -0.5),
		new THREE.Vector3(-0.5, 0.5, -0.5),

		new THREE.Vector3(-0.5, -0.5, 0.5),
		new THREE.Vector3(0.5, -0.5, 0.5),
		new THREE.Vector3(0.5, 0.5, 0.5),
		new THREE.Vector3(-0.5, 0.5, 0.5)
	];

	const cubeEdges = [
		[cubeVertices[0], cubeVertices[1]],
		[cubeVertices[1], cubeVertices[2]],
		[cubeVertices[2], cubeVertices[3]],
		[cubeVertices[3], cubeVertices[0]],

		[cubeVertices[4], cubeVertices[5]],
		[cubeVertices[5], cubeVertices[6]],
		[cubeVertices[6], cubeVertices[7]],
		[cubeVertices[7], cubeVertices[4]],

		[cubeVertices[0], cubeVertices[4]],
		[cubeVertices[1], cubeVertices[5]],
		[cubeVertices[2], cubeVertices[6]],
		[cubeVertices[3], cubeVertices[7]]
	];

	//========================================================
	// UI Event Handlers
	//========================================================

	resetCameraButton.addEventListener(
		"click",
		() => {
			controls.reset();
		}
	);

	//========================================================
	// Scene Assembly
	//========================================================



	//========================================================
	// Animation Loop
	//========================================================

	renderer.setAnimationLoop(animate);

	function animate() {
		controls.update();
		renderer.render(scene, camera);
	}
}

//========================================================
// Visualization Initialization
//========================================================

const visualizationRoots =
	document.querySelectorAll(
		".surface-voxel-grid"
	);

for (const visualizationRoot of visualizationRoots) {
	initializeSurfaceVoxelGrid(
		visualizationRoot
	);
}
