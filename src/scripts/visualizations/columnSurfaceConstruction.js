import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

//========================================================
// Geometry Constants
//========================================================

const VOXEL_SIZE = 1.0;
const VOXEL_COUNT_Y = 3;

//========================================================
// Geometry Helpers
//========================================================

function createVoxelColumnPoints(
	voxelSize,
	voxelCountY
) {
	const columnHalfWidth =
		voxelSize * 0.5;

	const columnHalfHeight =
		voxelCountY *
		voxelSize *
		0.5;

	const points = [];

	//--------------------------------------------------------
	// Vertical Edges
	//--------------------------------------------------------
	const columnCornersXZ = [
		[-columnHalfWidth, -columnHalfWidth],
		[columnHalfWidth, -columnHalfWidth],
		[columnHalfWidth, columnHalfWidth],
		[-columnHalfWidth, columnHalfWidth]
	];

	for (const [x, z] of columnCornersXZ) {
		points.push(
			new THREE.Vector3(
				x,
				-columnHalfHeight,
				z
			),
			new THREE.Vector3(
				x,
				columnHalfHeight,
				z
			)
		);
	}

	//--------------------------------------------------------
	// Horizontal Voxel Boundaries
	//--------------------------------------------------------
	for (let boundaryIndex = 0;
		boundaryIndex <= voxelCountY;
		boundaryIndex++) {

		const y =
			-columnHalfHeight +
			boundaryIndex * voxelSize;

		const corners = [
			new THREE.Vector3(
				-columnHalfWidth,
				y,
				-columnHalfWidth
			),
			new THREE.Vector3(
				columnHalfWidth,
				y,
				-columnHalfWidth
			),
			new THREE.Vector3(
				columnHalfWidth,
				y,
				columnHalfWidth
			),
			new THREE.Vector3(
				-columnHalfWidth,
				y,
				columnHalfWidth
			)
		];

		points.push(
			corners[0], corners[1],
			corners[1], corners[2],
			corners[2], corners[3],
			corners[3], corners[0]
		);
	}

	return points;
}

//========================================================
// Visualization Instance
//========================================================

function initializeColumnSurfaceConstruction(visualizationRoot) {

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

	const resetCameraButton =
		visualizationRoot.querySelector(
			".reset-camera"
		);

	if (resetCameraButton === null) {
		throw new Error(
			"Reset camera button was not found."
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

	camera.position.set(3.25, 1.75, 3.75);

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

	controls.target.set(0, 0, 0);
	controls.update();
	controls.saveState();

	//========================================================
	// Voxel Column Geometry
	//========================================================

	const voxelColumnPoints =
		createVoxelColumnPoints(
			VOXEL_SIZE,
			VOXEL_COUNT_Y
		);

	//========================================================
	// Rendering Geometry
	//========================================================

	const voxelColumnGeometry =
		new THREE.BufferGeometry().setFromPoints(
			voxelColumnPoints
		);

	//========================================================
	// Materials
	//========================================================

	const voxelColumnMaterial =
		new THREE.LineBasicMaterial({
			color: 0xffffff,
			transparent: true,
			opacity: 0.6
		});

	//========================================================
	// Scene Objects
	//========================================================

	const voxelColumnWireframe =
		new THREE.LineSegments(
			voxelColumnGeometry,
			voxelColumnMaterial
		);

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

	scene.add(voxelColumnWireframe);

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
		".column-surface-construction"
	);

for (const visualizationRoot of visualizationRoots) {
	initializeColumnSurfaceConstruction(
		visualizationRoot
	);
}
