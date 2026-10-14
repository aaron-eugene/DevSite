import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

//========================================================
// Geometry Constants
//========================================================

const VOXEL_SIZE = 1.0;
const VOXEL_COUNT_Y = 3;

const SURFACE_SAMPLE_COUNT = 21;

const SURFACE_BASE_HEIGHT = 0.0;
const SURFACE_AMPLITUDE = 0.75;
const SURFACE_FREQUENCY = 1.0;
const SURFACE_VARIATION_PHASE = 1.25;

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

function sampleOriginalSurfaceHeight(
	x,
	z,
	surfaceVariation
) {
	const phase =
		surfaceVariation *
		SURFACE_VARIATION_PHASE;

	return SURFACE_BASE_HEIGHT +
		SURFACE_AMPLITUDE *
		Math.sin(
			x * 0.9 +
			z * 0.55 +
			phase
		);
}

function createOriginalSurfaceGeometry() {
	const vertexCount =
		SURFACE_SAMPLE_COUNT *
		SURFACE_SAMPLE_COUNT;

	const cellCount =
		(SURFACE_SAMPLE_COUNT - 1) *
		(SURFACE_SAMPLE_COUNT - 1);

	const positions =
		new Float32Array(
			vertexCount * 3
		);

	const indices =
		new Uint16Array(
			cellCount * 6
		);

	const halfWidth =
		VOXEL_SIZE * 0.5;

	let positionIndex = 0;

	for (let sampleZ = 0;
		sampleZ < SURFACE_SAMPLE_COUNT;
		sampleZ++) {

		const z =
			-halfWidth +
			(
				sampleZ /
				(SURFACE_SAMPLE_COUNT - 1)
			) * VOXEL_SIZE;

		for (let sampleX = 0;
			sampleX < SURFACE_SAMPLE_COUNT;
			sampleX++) {

			const x =
				-halfWidth +
				(
					sampleX /
					(SURFACE_SAMPLE_COUNT - 1)
				) * VOXEL_SIZE;

			positions[positionIndex++] = x;
			positions[positionIndex++] = 0.0;
			positions[positionIndex++] = z;
		}
	}

	let index = 0;

	for (let cellZ = 0;
		cellZ < SURFACE_SAMPLE_COUNT - 1;
		cellZ++) {

		for (let cellX = 0;
			cellX < SURFACE_SAMPLE_COUNT - 1;
			cellX++) {

			const topLeft =
				cellZ *
				SURFACE_SAMPLE_COUNT +
				cellX;

			const topRight =
				topLeft + 1;

			const bottomLeft =
				topLeft +
				SURFACE_SAMPLE_COUNT;

			const bottomRight =
				bottomLeft + 1;

			indices[index++] = topLeft;
			indices[index++] = bottomLeft;
			indices[index++] = topRight;

			indices[index++] = topRight;
			indices[index++] = bottomLeft;
			indices[index++] = bottomRight;
		}
	}

	const geometry =
		new THREE.BufferGeometry();

	const positionAttribute =
		new THREE.BufferAttribute(
			positions,
			3
		);

	positionAttribute.setUsage(
		THREE.DynamicDrawUsage
	);

	geometry.setAttribute(
		"position",
		positionAttribute
	);

	geometry.setIndex(
		new THREE.BufferAttribute(
			indices,
			1
		)
	);

	return geometry;
}

//========================================================
// Visualization Instance
//========================================================

function initializeColumnSurfaceConstruction(visualizationRoot) {

	//========================================================
	// Surface Helpers
	//========================================================

	function updateOriginalSurfaceGeometry(
		geometry,
		surfaceVariation
	) {
		const positionAttribute =
			geometry.getAttribute(
				"position"
			);

		for (let vertexIndex = 0;
			vertexIndex < positionAttribute.count;
			vertexIndex++) {

			const x =
				positionAttribute.getX(
					vertexIndex
				);

			const z =
				positionAttribute.getZ(
					vertexIndex
				);

			const y =
				sampleOriginalSurfaceHeight(
					x,
					z,
					surfaceVariation
				);

			positionAttribute.setY(
				vertexIndex,
				y
			);
		}

		positionAttribute.needsUpdate = true;

		geometry.computeVertexNormals();
	}

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

	const surfaceVariationSlider =
		visualizationRoot.querySelector(
			".surface-variation"
		);

	const surfaceVariationValue =
		visualizationRoot.querySelector(
			".surface-variation-value"
		);

	const originalSurfaceCheckbox =
		visualizationRoot.querySelector(
			".toggle-original-surface"
		);

	const resetCameraButton =
		visualizationRoot.querySelector(
			".reset-camera"
		);

	if (
		surfaceVariationSlider === null ||
		surfaceVariationValue === null ||
		originalSurfaceCheckbox === null ||
		resetCameraButton === null
	) {
		throw new Error(
			"Column surface construction controls were not found."
		);
	}
	//========================================================
	// Scene & Camera
	//========================================================

	const scene = new THREE.Scene();

	const camera = new THREE.PerspectiveCamera(
		45,
		width / height,
		0.01,
		100
	);

	camera.position.set(
		-2.25,
		1.8,
		3.5
	);

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
	// Visualization State
	//========================================================

	let surfaceVariation =
		Number(
			surfaceVariationSlider.value
		);

	surfaceVariationValue.textContent =
		surfaceVariation.toFixed(2);

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

	const originalSurfaceGeometry =
		createOriginalSurfaceGeometry();

	updateOriginalSurfaceGeometry(
		originalSurfaceGeometry,
		surfaceVariation
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

	const originalSurfaceMaterial =
		new THREE.MeshNormalMaterial({
			color: 0x7092be,
			side: THREE.DoubleSide,
			transparent: true,
			opacity: 0.35
		});

	//========================================================
	// Scene Objects
	//========================================================

	const voxelColumnWireframe =
		new THREE.LineSegments(
			voxelColumnGeometry,
			voxelColumnMaterial
		);

	const originalSurfaceMesh =
		new THREE.Mesh(
			originalSurfaceGeometry,
			originalSurfaceMaterial
		);

	originalSurfaceMesh.visible =
		originalSurfaceCheckbox.checked;

	//========================================================
	// UI Event Handlers
	//========================================================

	surfaceVariationSlider.addEventListener(
		"input",
		() => {
			surfaceVariation =
				Number(
					surfaceVariationSlider.value
				);

			surfaceVariationValue.textContent =
				surfaceVariation.toFixed(2);

			updateOriginalSurfaceGeometry(
				originalSurfaceGeometry,
				surfaceVariation
			);
		}
	);

	originalSurfaceCheckbox.addEventListener(
		"change",
		() => {
			originalSurfaceMesh.visible =
				originalSurfaceCheckbox.checked;
		}
	);

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
	scene.add(originalSurfaceMesh);

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
