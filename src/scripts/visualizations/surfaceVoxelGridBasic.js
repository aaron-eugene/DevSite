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

const GRID_HALF_EXTENT_X = GRID_SIZE_X * VOXEL_SIZE * 0.5;
const GRID_HALF_EXTENT_Y = GRID_SIZE_Y * VOXEL_SIZE * 0.5;
const GRID_HALF_EXTENT_Z = GRID_SIZE_Z * VOXEL_SIZE * 0.5;

//--------------------------------------------------------
// Terrain
//--------------------------------------------------------
const TERRAIN_BASE_HEIGHT = 0.0;
const TERRAIN_AMPLITUDE = 0.75;
const TERRAIN_FREQUENCY = 0.7;

const TERRAIN_SAMPLE_SPACING = 0.25;

//========================================================
// Visualization Instance
//========================================================

function initializeSurfaceVoxelGrid(visualizationRoot) {

	//========================================================
	// Visualization State
	//========================================================

	let terrainOffset = -10.0;
	let terrainDirty = false;

	const surfaceVoxels = [];

	//========================================================
	// Terrain Helpers
	//========================================================

	function sampleTerrainHeight(x, z) {
		const sampleX =
			x + terrainOffset;

		const sampleZ =
			z + terrainOffset * 0.6;

		return TERRAIN_BASE_HEIGHT +
			TERRAIN_AMPLITUDE * (
				Math.sin(sampleX * TERRAIN_FREQUENCY) +
				0.5 * Math.cos(sampleZ * TERRAIN_FREQUENCY * 0.8)
			);
	}

	function updateTerrainSurface() {
		for (let z = 0; z < sampleCountZ; z++) {
			for (let x = 0; x < sampleCountX; x++) {
				const vertexIndex =
					z * sampleCountX + x;

				const positionIndex =
					vertexIndex * 3;

				const worldX =
					terrainPositions[positionIndex];

				const worldZ =
					terrainPositions[positionIndex + 2];

				terrainPositions[positionIndex + 1] =
					sampleTerrainHeight(
						worldX,
						worldZ
					);
			}
		}

		terrainPositionAttribute.needsUpdate = true;

		terrainGeo.computeVertexNormals();

		updateSurfaceVoxels();
		updateSurfaceVoxelGeometry();

		numSurfaceVoxels.textContent =
			`Surface Voxels: ${surfaceVoxels.length}`;
	}

	//========================================================
	// Surface Voxel Helpers
	//========================================================

	function updateSurfaceVoxels() {
		const samplesPerVoxel =
			VOXEL_SIZE /
			TERRAIN_SAMPLE_SPACING;

		if (!Number.isInteger(samplesPerVoxel)) {
			throw new Error(
				"TERRAIN_SAMPLE_SPACING must divide VOXEL_SIZE evenly."
			);
		}

		surfaceVoxels.length = 0;

		for (let voxelZ = 0; voxelZ < GRID_SIZE_Z; voxelZ++) {
			for (let voxelX = 0; voxelX < GRID_SIZE_X; voxelX++) {
				const startSampleX =
					voxelX * samplesPerVoxel;

				const startSampleZ =
					voxelZ * samplesPerVoxel;

				let minHeight = Infinity;
				let maxHeight = -Infinity;

				//--------------------------------------------------------
				// Find Min/Max Height in Voxel Column
				//--------------------------------------------------------
				for (
					let sampleZ = startSampleZ;
					sampleZ <= startSampleZ + samplesPerVoxel;
					sampleZ++
				) {
					for (
						let sampleX = startSampleX;
						sampleX <= startSampleX + samplesPerVoxel;
						sampleX++
					) {
						const vertexIndex =
							sampleZ * sampleCountX +
							sampleX;

						const positionIndex =
							vertexIndex * 3;

						const sampleY =
							terrainPositions[
							positionIndex + 1
							];

						minHeight =
							Math.min(
								minHeight,
								sampleY
							);

						maxHeight =
							Math.max(
								maxHeight,
								sampleY
							);
					}
				}

				//--------------------------------------------------------
				// Classify Voxels By Min/Max Height
				//--------------------------------------------------------
				for (
					let voxelY = 0;
					voxelY < GRID_SIZE_Y;
					voxelY++
				) {
					const voxelMinY =
						-GRID_HALF_EXTENT_Y +
						voxelY * VOXEL_SIZE;

					const voxelMaxY =
						voxelMinY + VOXEL_SIZE;

					if (
						maxHeight >= voxelMinY &&
						minHeight <= voxelMaxY
					) {
						surfaceVoxels.push({
							x: voxelX,
							y: voxelY,
							z: voxelZ
						});
					}
				}
			}
		}
	}

	function updateSurfaceVoxelGeometry() {
		let positionIndex = 0;

		for (const voxel of surfaceVoxels) {
			const centerX =
				-GRID_HALF_EXTENT_X +
				voxel.x * VOXEL_SIZE +
				VOXEL_SIZE * 0.5;

			const centerY =
				-GRID_HALF_EXTENT_Y +
				voxel.y * VOXEL_SIZE +
				VOXEL_SIZE * 0.5;

			const centerZ =
				-GRID_HALF_EXTENT_Z +
				voxel.z * VOXEL_SIZE +
				VOXEL_SIZE * 0.5;

			for (const edge of voxelEdges) {
				for (const vertex of edge) {
					surfaceVoxelPositions[positionIndex++] =
						vertex.x + centerX;

					surfaceVoxelPositions[positionIndex++] =
						vertex.y + centerY;

					surfaceVoxelPositions[positionIndex++] =
						vertex.z + centerZ;
				}
			}
		}

		surfaceVoxelPositionAttribute.needsUpdate = true;

		surfaceVoxelGeo.setDrawRange(
			0,
			positionIndex / 3
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

	camera.position.set(-1.0, 1.5, -5.5);

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
				-GRID_HALF_EXTENT_Y + y * VOXEL_SIZE;

			const worldZ =
				-GRID_HALF_EXTENT_Z + z * VOXEL_SIZE;

			gridPoints.push(
				new THREE.Vector3(
					-GRID_HALF_EXTENT_X,
					worldY,
					worldZ
				),
				new THREE.Vector3(
					GRID_HALF_EXTENT_X,
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
				-GRID_HALF_EXTENT_X + x * VOXEL_SIZE;

			const worldZ =
				-GRID_HALF_EXTENT_Z + z * VOXEL_SIZE;

			gridPoints.push(
				new THREE.Vector3(
					worldX,
					-GRID_HALF_EXTENT_Y,
					worldZ
				),
				new THREE.Vector3(
					worldX,
					GRID_HALF_EXTENT_Y,
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
				-GRID_HALF_EXTENT_X + x * VOXEL_SIZE;

			const worldY =
				-GRID_HALF_EXTENT_Y + y * VOXEL_SIZE;

			gridPoints.push(
				new THREE.Vector3(
					worldX,
					worldY,
					-GRID_HALF_EXTENT_Z
				),
				new THREE.Vector3(
					worldX,
					worldY,
					GRID_HALF_EXTENT_Z
				)
			);
		}
	}

	//========================================================
	// Terrain Geometry
	//========================================================

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
				-GRID_HALF_EXTENT_X +
				x * TERRAIN_SAMPLE_SPACING;

			const worldZ =
				-GRID_HALF_EXTENT_Z +
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
	// Surface Voxel Geometry
	//========================================================

	const maxSurfaceVoxelCount =
		GRID_SIZE_X *
		GRID_SIZE_Y *
		GRID_SIZE_Z;

	const voxelEdgeCount =
		voxelEdges.length;

	const verticesPerEdge = 2;
	const componentsPerVertex = 3;

	const floatsPerSurfaceVoxel =
		voxelEdgeCount *
		verticesPerEdge *
		componentsPerVertex;

	const surfaceVoxelPositions =
		new Float32Array(
			maxSurfaceVoxelCount *
			floatsPerSurfaceVoxel
		);

	//========================================================
	// Rendering Geometry
	//========================================================

	//--------------------------------------------------------
	// Voxel Grid
	//--------------------------------------------------------
	const voxelGridGeo =
		new THREE.BufferGeometry().setFromPoints(
			gridPoints
		);

	//--------------------------------------------------------
	// Terrain
	//--------------------------------------------------------
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

	//--------------------------------------------------------
	// Surface Voxels
	//--------------------------------------------------------
	const surfaceVoxelGeo =
		new THREE.BufferGeometry();

	const surfaceVoxelPositionAttribute =
		new THREE.BufferAttribute(
			surfaceVoxelPositions,
			3
		);

	surfaceVoxelPositionAttribute.setUsage(
		THREE.DynamicDrawUsage
	);

	surfaceVoxelGeo.setAttribute(
		"position",
		surfaceVoxelPositionAttribute
	);

	surfaceVoxelGeo.setDrawRange(0, 0);

	//========================================================
	// Materials
	//========================================================

	const voxelGridMaterial = new THREE.LineBasicMaterial({
		color: 0xffffff,
		transparent: true,
		opacity: 0.15
	});

	const terrainMaterial =
		new THREE.MeshNormalMaterial({
			side: THREE.DoubleSide,
			transparent: true,
			opacity: 0.8
		});

	const surfaceVoxelMaterial =
		new THREE.LineBasicMaterial({
			color: 0xffffff,
			transparent: true,
			opacity: 0.3
		});

	//========================================================
	// Scene Objects
	//========================================================

	const voxelGrid =
		new THREE.LineSegments(
			voxelGridGeo,
			voxelGridMaterial,
		);

	voxelGrid.visible = false;

	const terrainMesh =
		new THREE.Mesh(
			terrainGeo,
			terrainMaterial
		);


	const surfaceVoxelHighlights =
		new THREE.LineSegments(
			surfaceVoxelGeo,
			surfaceVoxelMaterial
		);

	//========================================================
	// Visualization Initialization
	//========================================================

	updateSurfaceVoxels();
	updateSurfaceVoxelGeometry();

	numSurfaceVoxels.textContent =
		`Surface Voxels: ${surfaceVoxels.length}`;

	//========================================================
	// UI Event Handlers
	//========================================================

	surfaceSlider.addEventListener(
		"input",
		() => {
			terrainOffset =
				Number(surfaceSlider.value);

			surfaceVariationValue.textContent =
				terrainOffset.toFixed(1);

			terrainDirty = true;
		}
	);

	surfaceButton.addEventListener(
		"click",
		() => {
			terrainMesh.visible =
				!terrainMesh.visible;
		}
	);

	surfaceVoxelsButton.addEventListener(
		"click",
		() => {
			surfaceVoxelHighlights.visible =
				!surfaceVoxelHighlights.visible;
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
	scene.add(surfaceVoxelHighlights);

	//========================================================
	// Animation Loop
	//========================================================

	renderer.setAnimationLoop(animate);

	function animate() {
		if (terrainDirty) {
			updateTerrainSurface();
			terrainDirty = false;
		}

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
