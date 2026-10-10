import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

//========================================================
// Constants
//========================================================

//--------------------------------------------------------
// Geometry
//--------------------------------------------------------
const VOXEL_SIZE = 1.0;

const GRID_SIZE_X = 5;
const GRID_SIZE_Y = 5;
const GRID_SIZE_Z = 5;

const HALF_GRID_X = GRID_SIZE_X * VOXEL_SIZE * 0.5;
const HALF_GRID_Y = GRID_SIZE_Y * VOXEL_SIZE * 0.5;
const HALF_GRID_Z = GRID_SIZE_Z * VOXEL_SIZE * 0.5;

//--------------------------------------------------------
// Terrain
//--------------------------------------------------------
const BASE_HEIGHT = 0.0;
const TERRAIN_AMPLITUDE = 0.75;
const FREQUENCY = 0.7;

const TERRAIN_SAMPLE_SPACING = 0.25;

//========================================================
// Visualization Instance
//========================================================

function initializeSurfaceVoxelGrid(visualizationRoot) {

	//========================================================
	// Terrain Helper Functions
	//========================================================

	function sampleTerrainHeight(x, z) {
		const sampleX =
			x + terrainOffset;

		const sampleZ =
			z + terrainOffset * 0.6;

		return BASE_HEIGHT +
			TERRAIN_AMPLITUDE * (
				Math.sin(sampleX * FREQUENCY) +
				0.5 * Math.cos(sampleZ * FREQUENCY * 0.8)
			);
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

	const surfaceSlider =
		visualizationRoot.querySelector(".surface-variation");

	const surfaceVariationValue =
		visualizationRoot.querySelector(".surface-variation-value");

	const surfaceButton =
		visualizationRoot.querySelector(".toggle-surface");

	const surfaceVoxelsButton =
		visualizationRoot.querySelector(".toggle-surface-voxels");

	const voxelGridButton =
		visualizationRoot.querySelector(".toggle-voxel-grid");

	const resetCameraButton =
		visualizationRoot.querySelector(".reset-camera");

	const numSurfaceVoxels =
		visualizationRoot.querySelector(".num-surface-voxels");

	if (
		surfaceSlider === null ||
		surfaceVariationValue === null ||
		surfaceButton === null ||
		surfaceVoxelsButton === null ||
		voxelGridButton === null ||
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

	camera.position.set(4.0, 3.0, 4.5);

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
	// Voxel Geometry
	//========================================================

	const voxelVertices = [
		new THREE.Vector3(-0.5, -0.5, -0.5),
		new THREE.Vector3(0.5, -0.5, -0.5),
		new THREE.Vector3(0.5, 0.5, -0.5),
		new THREE.Vector3(-0.5, 0.5, -0.5),

		new THREE.Vector3(-0.5, -0.5, 0.5),
		new THREE.Vector3(0.5, -0.5, 0.5),
		new THREE.Vector3(0.5, 0.5, 0.5),
		new THREE.Vector3(-0.5, 0.5, 0.5)
	];

	const voxelEdges = [
		[voxelVertices[0], voxelVertices[1]],
		[voxelVertices[1], voxelVertices[2]],
		[voxelVertices[2], voxelVertices[3]],
		[voxelVertices[3], voxelVertices[0]],

		[voxelVertices[4], voxelVertices[5]],
		[voxelVertices[5], voxelVertices[6]],
		[voxelVertices[6], voxelVertices[7]],
		[voxelVertices[7], voxelVertices[4]],

		[voxelVertices[0], voxelVertices[4]],
		[voxelVertices[1], voxelVertices[5]],
		[voxelVertices[2], voxelVertices[6]],
		[voxelVertices[3], voxelVertices[7]]
	];

	//========================================================
	// Voxel Grid Geometry
	//========================================================

	const gridPoints = [];

	//--------------------------------------------------------
	// X-Directed Lines
	//--------------------------------------------------------
	for (let y = 0; y <= GRID_SIZE_Y; y++) {
		for (let z = 0; z <= GRID_SIZE_Z; z++) {
			const worldY =
				-HALF_GRID_Y + y * VOXEL_SIZE;

			const worldZ =
				-HALF_GRID_Z + z * VOXEL_SIZE;

			gridPoints.push(
				new THREE.Vector3(
					-HALF_GRID_X,
					worldY,
					worldZ
				),
				new THREE.Vector3(
					HALF_GRID_X,
					worldY,
					worldZ
				)
			);
		}
	}

	//--------------------------------------------------------
	// Y-Directed Lines
	//--------------------------------------------------------
	for (let x = 0; x <= GRID_SIZE_X; x++) {
		for (let z = 0; z <= GRID_SIZE_Z; z++) {
			const worldX =
				-HALF_GRID_X + x * VOXEL_SIZE;

			const worldZ =
				-HALF_GRID_Z + z * VOXEL_SIZE;

			gridPoints.push(
				new THREE.Vector3(
					worldX,
					-HALF_GRID_Y,
					worldZ
				),
				new THREE.Vector3(
					worldX,
					HALF_GRID_Y,
					worldZ
				)
			);
		}
	}

	//--------------------------------------------------------
	// Z-Directed Lines
	//--------------------------------------------------------
	for (let x = 0; x <= GRID_SIZE_X; x++) {
		for (let y = 0; y <= GRID_SIZE_Y; y++) {
			const worldX =
				-HALF_GRID_X + x * VOXEL_SIZE;

			const worldY =
				-HALF_GRID_Y + y * VOXEL_SIZE;

			gridPoints.push(
				new THREE.Vector3(
					worldX,
					worldY,
					-HALF_GRID_Z
				),
				new THREE.Vector3(
					worldX,
					worldY,
					HALF_GRID_Z
				)
			);
		}
	}

	//========================================================
	// Terrain Geometry
	//========================================================

	let terrainOffset = 0.0;

	const sampleCountX =
		Math.round(
			(GRID_SIZE_X * VOXEL_SIZE) /
			TERRAIN_SAMPLE_SPACING
		) + 1;

	const sampleCountZ =
		Math.round(
			(GRID_SIZE_Z * VOXEL_SIZE) /
			TERRAIN_SAMPLE_SPACING
		) + 1;

	const terrainVertexCount =
		sampleCountX * sampleCountZ;

	const terrainPositionCount =
		terrainVertexCount * 3;

	const terrainPositions =
		new Float32Array(
			terrainPositionCount
		);

	for (let z = 0; z < sampleCountZ; z++) {
		for (let x = 0; x < sampleCountX; x++) {
			const worldX =
				-HALF_GRID_X +
				x * TERRAIN_SAMPLE_SPACING;

			const worldZ =
				-HALF_GRID_Z +
				z * TERRAIN_SAMPLE_SPACING;

			const worldY =
				sampleTerrainHeight(
					worldX,
					worldZ
				);

			const vertexIndex =
				z * sampleCountX + x;

			const positionIndex =
				vertexIndex * 3;

			terrainPositions[positionIndex] =
				worldX;

			terrainPositions[positionIndex + 1] =
				worldY;

			terrainPositions[positionIndex + 2] =
				worldZ;
		}
	}

	const terrainCellCountX =
		sampleCountX - 1;

	const terrainCellCountZ =
		sampleCountZ - 1;

	const terrainIndexCount =
		terrainCellCountX *
		terrainCellCountZ *
		6;

	const terrainIndices =
		new Uint16Array(
			terrainIndexCount
		);

	let indexPosition = 0;

	for (let z = 0; z < sampleCountZ - 1; z++) {
		for (let x = 0; x < sampleCountX - 1; x++) {
			const v00 =
				z * sampleCountX + x;

			const v10 =
				v00 + 1;

			const v01 =
				v00 + sampleCountX;

			const v11 =
				v01 + 1;

			terrainIndices[indexPosition++] = v00;
			terrainIndices[indexPosition++] = v01;
			terrainIndices[indexPosition++] = v10;

			terrainIndices[indexPosition++] = v10;
			terrainIndices[indexPosition++] = v01;
			terrainIndices[indexPosition++] = v11;
		}
	}
	//========================================================
	// Rendering Geometry
	//========================================================

	const voxelGridGeo =
		new THREE.BufferGeometry().setFromPoints(
			gridPoints
		);

	const terrainGeo =
		new THREE.BufferGeometry();

	const terrainPositionAttribute =
		new THREE.BufferAttribute(
			terrainPositions,
			3
		);

	terrainPositionAttribute.setUsage(
		THREE.DynamicDrawUsage
	);

	terrainGeo.setAttribute(
		"position",
		terrainPositionAttribute
	);

	terrainGeo.setIndex(
		new THREE.BufferAttribute(
			terrainIndices,
			1
		)
	);

	terrainGeo.computeVertexNormals();

	//========================================================
	// Materials
	//========================================================

	const voxelGridMaterial = new THREE.LineBasicMaterial({
		color: 0xffffff,
		transparent: true,
		opacity: 0.35
	});

	// MeshNormalMaterial
	const terrainMaterial =
		new THREE.MeshNormalMaterial({
			color: 0x7092be,
			side: THREE.DoubleSide,
			transparent: true,
			opacity: 0.5
		});

	//========================================================
	// Scene Objects
	//========================================================

	const voxelGrid =
		new THREE.LineSegments(
			voxelGridGeo,
			voxelGridMaterial
		);

	const terrainMesh =
		new THREE.Mesh(
			terrainGeo,
			terrainMaterial
		);

	//========================================================
	// Visualization State & Initialization
	//========================================================



	//========================================================
	// UI Event Handlers
	//========================================================

	surfaceButton.addEventListener(
		"click",
		() => {
			terrainMesh.visible =
				!terrainMesh.visible;
		}
	);

	voxelGridButton.addEventListener(
		"click",
		() => {
			voxelGrid.visible =
				!voxelGrid.visible;
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

	scene.add(voxelGrid);
	scene.add(terrainMesh);

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
