import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { enableKeyboardOrbitControls } from "./keyboardOrbitControls.js";

//========================================================
// Geometry Constants
//========================================================

const VOXEL_SIZE = 1.0;
const VOXEL_COUNT_Y = 3;

const SURFACE_SAMPLE_COUNT = 21;
const BICUBIC_PATCH_SAMPLE_COUNT = 21;

//========================================================
// Terrain Constants
//========================================================

const TERRAIN_BASE_HEIGHT = 0.0;
const TERRAIN_AMPLITUDE = 8.0;

const NOISE_BASE_SCALE = 1.0 / 20.0;
const NOISE_OCTAVE_COUNT = 5;
const NOISE_PERSISTENCE = 0.5;
const NOISE_LACUNARITY = 2.0;
const NOISE_SEED = 9109;

const DERIVATIVE_STEP = 1.0;

const NOISE_SAMPLE_BASE_X = -60.0;
const NOISE_SAMPLE_BASE_Z = 35.0;

//========================================================
// Voxel Column Helpers
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
// Noise Helpers
//========================================================

function smoothstep5(t) {
	return (
		t * t * t *
		(t * (t * 6.0 - 15.0) + 10.0)
	);
}

function hashNoise2d(
	x,
	z,
	seed
) {
	let hash =
		Math.imul(x, 374761393) +
		Math.imul(z, 668265263) +
		Math.imul(seed, 69069);

	hash =
		Math.imul(
			hash ^ (hash >>> 13),
			1274126177
		);

	hash ^= hash >>> 16;

	return (
		(hash >>> 0) /
		4294967295.0
	) * 2.0 - 1.0;
}

function sampleValueNoise2d(
	x,
	z,
	scale,
	seed
) {
	const scaledX =
		x * scale;

	const scaledZ =
		z * scale;

	const x0 =
		Math.floor(scaledX);

	const z0 =
		Math.floor(scaledZ);

	const x1 =
		x0 + 1;

	const z1 =
		z0 + 1;

	const tx =
		scaledX - x0;

	const tz =
		scaledZ - z0;

	const smoothX =
		smoothstep5(tx);

	const smoothZ =
		smoothstep5(tz);

	const value00 =
		hashNoise2d(
			x0,
			z0,
			seed
		);

	const value10 =
		hashNoise2d(
			x1,
			z0,
			seed
		);

	const value01 =
		hashNoise2d(
			x0,
			z1,
			seed
		);

	const value11 =
		hashNoise2d(
			x1,
			z1,
			seed
		);

	const valueX0 =
		THREE.MathUtils.lerp(
			value00,
			value10,
			smoothX
		);

	const valueX1 =
		THREE.MathUtils.lerp(
			value01,
			value11,
			smoothX
		);

	return THREE.MathUtils.lerp(
		valueX0,
		valueX1,
		smoothZ
	);
}

function sampleFractalValueNoise2d(
	x,
	z
) {
	let total = 0.0;
	let octaveAmplitude = 1.0;
	let maxAmplitude = 0.0;

	let octaveScale =
		NOISE_BASE_SCALE;

	for (let octaveIndex = 0;
		octaveIndex < NOISE_OCTAVE_COUNT;
		octaveIndex++) {

		total +=
			sampleValueNoise2d(
				x,
				z,
				octaveScale,
				NOISE_SEED +
				octaveIndex * 1013
			) *
			octaveAmplitude;

		maxAmplitude +=
			octaveAmplitude;

		octaveAmplitude *=
			NOISE_PERSISTENCE;

		octaveScale *=
			NOISE_LACUNARITY;
	}

	return total /
		maxAmplitude;
}

function getNoiseSampleOffset(
	noisePosition
) {
	return {
		x:
			NOISE_SAMPLE_BASE_X +
			noisePosition,

		z:
			NOISE_SAMPLE_BASE_Z +
			noisePosition * 2.1
	};
}

//========================================================
// Original Surface Helpers
//========================================================

function sampleOriginalSurfaceHeight(
	x,
	z,
	noisePosition
) {
	const offset =
		getNoiseSampleOffset(
			noisePosition
		);

	const worldX =
		x + offset.x;

	const worldZ =
		z + offset.z;

	return TERRAIN_BASE_HEIGHT +
		sampleFractalValueNoise2d(
			worldX,
			worldZ
		) *
		TERRAIN_AMPLITUDE;
}

function sampleOriginalSurfaceDerivativeX(
	x,
	z,
	noisePosition
) {
	const heightX0 =
		sampleOriginalSurfaceHeight(
			x - DERIVATIVE_STEP,
			z,
			noisePosition
		);

	const heightX1 =
		sampleOriginalSurfaceHeight(
			x + DERIVATIVE_STEP,
			z,
			noisePosition
		);

	return (
		heightX1 -
		heightX0
	) /
		(2.0 * DERIVATIVE_STEP);
}

function sampleOriginalSurfaceDerivativeZ(
	x,
	z,
	noisePosition
) {
	const heightZ0 =
		sampleOriginalSurfaceHeight(
			x,
			z - DERIVATIVE_STEP,
			noisePosition
		);

	const heightZ1 =
		sampleOriginalSurfaceHeight(
			x,
			z + DERIVATIVE_STEP,
			noisePosition
		);

	return (
		heightZ1 -
		heightZ0
	) /
		(2.0 * DERIVATIVE_STEP);
}

function sampleOriginalSurfaceMixedDerivative(
	x,
	z,
	noisePosition
) {
	const heightX0Z0 =
		sampleOriginalSurfaceHeight(
			x - DERIVATIVE_STEP,
			z - DERIVATIVE_STEP,
			noisePosition
		);

	const heightX0Z1 =
		sampleOriginalSurfaceHeight(
			x - DERIVATIVE_STEP,
			z + DERIVATIVE_STEP,
			noisePosition
		);

	const heightX1Z0 =
		sampleOriginalSurfaceHeight(
			x + DERIVATIVE_STEP,
			z - DERIVATIVE_STEP,
			noisePosition
		);

	const heightX1Z1 =
		sampleOriginalSurfaceHeight(
			x + DERIVATIVE_STEP,
			z + DERIVATIVE_STEP,
			noisePosition
		);

	return (
		heightX1Z1 -
		heightX1Z0 -
		heightX0Z1 +
		heightX0Z0
	) /
		(
			4.0 *
			DERIVATIVE_STEP *
			DERIVATIVE_STEP
		);
}

function createSurfaceCornerData(
	noisePosition
) {
	const halfWidth =
		VOXEL_SIZE * 0.5;

	const cornersXZ = [
		[-halfWidth, -halfWidth],
		[halfWidth, -halfWidth],
		[-halfWidth, halfWidth],
		[halfWidth, halfWidth]
	];

	return cornersXZ.map(
		([x, z]) => ({
			x,
			z,
			height:
				sampleOriginalSurfaceHeight(
					x,
					z,
					noisePosition
				),
			derivativeX:
				sampleOriginalSurfaceDerivativeX(
					x,
					z,
					noisePosition
				),
			derivativeZ:
				sampleOriginalSurfaceDerivativeZ(
					x,
					z,
					noisePosition
				),
			mixedDerivative:
				sampleOriginalSurfaceMixedDerivative(
					x,
					z,
					noisePosition
				)
		})
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
// Bicubic Patch Helpers
//========================================================

function hermiteBasis(t) {
	const t2 = t * t;
	const t3 = t2 * t;

	return {
		h00: 2.0 * t3 - 3.0 * t2 + 1.0,
		h10: t3 - 2.0 * t2 + t,
		h01: -2.0 * t3 + 3.0 * t2,
		h11: t3 - t2
	};
}

function sampleBicubicPatch(
	u,
	v,
	cornerData
) {
	const xBasis =
		hermiteBasis(u);

	const zBasis =
		hermiteBasis(v);

	const c00 = cornerData[0];
	const c10 = cornerData[1];
	const c01 = cornerData[2];
	const c11 = cornerData[3];

	const extentX = VOXEL_SIZE;
	const extentZ = VOXEL_SIZE;

	//--------------------------------------------------------
	// Interpolate Along X at Z Minimum
	//--------------------------------------------------------

	const valueZ0 =
		xBasis.h00 * c00.height +
		xBasis.h10 *
		c00.derivativeX *
		extentX +
		xBasis.h01 * c10.height +
		xBasis.h11 *
		c10.derivativeX *
		extentX;

	//--------------------------------------------------------
	// Interpolate Along X at Z Maximum
	//--------------------------------------------------------

	const valueZ1 =
		xBasis.h00 * c01.height +
		xBasis.h10 *
		c01.derivativeX *
		extentX +
		xBasis.h01 * c11.height +
		xBasis.h11 *
		c11.derivativeX *
		extentX;

	//--------------------------------------------------------
	// Interpolate Z Derivatives Along X
	//--------------------------------------------------------

	const derivativeZ0 =
		xBasis.h00 *
		c00.derivativeZ *
		extentZ +
		xBasis.h10 *
		c00.mixedDerivative *
		extentX *
		extentZ +
		xBasis.h01 *
		c10.derivativeZ *
		extentZ +
		xBasis.h11 *
		c10.mixedDerivative *
		extentX *
		extentZ;

	const derivativeZ1 =
		xBasis.h00 *
		c01.derivativeZ *
		extentZ +
		xBasis.h10 *
		c01.mixedDerivative *
		extentX *
		extentZ +
		xBasis.h01 *
		c11.derivativeZ *
		extentZ +
		xBasis.h11 *
		c11.mixedDerivative *
		extentX *
		extentZ;

	//--------------------------------------------------------
	// Interpolate Along Z
	//--------------------------------------------------------

	return (
		zBasis.h00 * valueZ0 +
		zBasis.h10 * derivativeZ0 +
		zBasis.h01 * valueZ1 +
		zBasis.h11 * derivativeZ1
	);
}

function createBicubicPatchGeometry() {
	const vertexCount =
		BICUBIC_PATCH_SAMPLE_COUNT *
		BICUBIC_PATCH_SAMPLE_COUNT;

	const cellCount =
		(BICUBIC_PATCH_SAMPLE_COUNT - 1) *
		(BICUBIC_PATCH_SAMPLE_COUNT - 1);

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

	for (let sampleV = 0;
		sampleV < BICUBIC_PATCH_SAMPLE_COUNT;
		sampleV++) {

		const v =
			sampleV /
			(BICUBIC_PATCH_SAMPLE_COUNT - 1);

		const z =
			-halfWidth +
			v * VOXEL_SIZE;

		for (let sampleU = 0;
			sampleU < BICUBIC_PATCH_SAMPLE_COUNT;
			sampleU++) {

			const u =
				sampleU /
				(BICUBIC_PATCH_SAMPLE_COUNT - 1);

			const x =
				-halfWidth +
				u * VOXEL_SIZE;

			positions[positionIndex++] = x;
			positions[positionIndex++] = 0.0;
			positions[positionIndex++] = z;
		}
	}

	let index = 0;

	for (let cellV = 0;
		cellV < BICUBIC_PATCH_SAMPLE_COUNT - 1;
		cellV++) {

		for (let cellU = 0;
			cellU < BICUBIC_PATCH_SAMPLE_COUNT - 1;
			cellU++) {

			const topLeft =
				cellV *
				BICUBIC_PATCH_SAMPLE_COUNT +
				cellU;

			const topRight =
				topLeft + 1;

			const bottomLeft =
				topLeft +
				BICUBIC_PATCH_SAMPLE_COUNT;

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

function hermiteDerivativeBasis(t) {
	const t2 = t * t;

	return {
		h00: 6.0 * t2 - 6.0 * t,
		h10: 3.0 * t2 - 4.0 * t + 1.0,
		h01: -6.0 * t2 + 6.0 * t,
		h11: 3.0 * t2 - 2.0 * t
	};
}

function sampleBicubicPatchCenter(
	cornerData
) {
	const u = 0.5;
	const v = 0.5;

	const xBasis =
		hermiteBasis(u);

	const zBasis =
		hermiteBasis(v);

	const xDerivativeBasis =
		hermiteDerivativeBasis(u);

	const zDerivativeBasis =
		hermiteDerivativeBasis(v);

	const c00 = cornerData[0];
	const c10 = cornerData[1];
	const c01 = cornerData[2];
	const c11 = cornerData[3];

	const extentX = VOXEL_SIZE;
	const extentZ = VOXEL_SIZE;

	const valueZ0 =
		xBasis.h00 * c00.height +
		xBasis.h10 *
		c00.derivativeX *
		extentX +
		xBasis.h01 * c10.height +
		xBasis.h11 *
		c10.derivativeX *
		extentX;

	const valueZ1 =
		xBasis.h00 * c01.height +
		xBasis.h10 *
		c01.derivativeX *
		extentX +
		xBasis.h01 * c11.height +
		xBasis.h11 *
		c11.derivativeX *
		extentX;

	const derivativeZ0 =
		xBasis.h00 *
		c00.derivativeZ *
		extentZ +
		xBasis.h10 *
		c00.mixedDerivative *
		extentX *
		extentZ +
		xBasis.h01 *
		c10.derivativeZ *
		extentZ +
		xBasis.h11 *
		c10.mixedDerivative *
		extentX *
		extentZ;

	const derivativeZ1 =
		xBasis.h00 *
		c01.derivativeZ *
		extentZ +
		xBasis.h10 *
		c01.mixedDerivative *
		extentX *
		extentZ +
		xBasis.h01 *
		c11.derivativeZ *
		extentZ +
		xBasis.h11 *
		c11.mixedDerivative *
		extentX *
		extentZ;

	const value =
		zBasis.h00 * valueZ0 +
		zBasis.h10 * derivativeZ0 +
		zBasis.h01 * valueZ1 +
		zBasis.h11 * derivativeZ1;

	const derivativeXValueZ0 =
		xDerivativeBasis.h00 * c00.height +
		xDerivativeBasis.h10 *
		c00.derivativeX *
		extentX +
		xDerivativeBasis.h01 * c10.height +
		xDerivativeBasis.h11 *
		c10.derivativeX *
		extentX;

	const derivativeXValueZ1 =
		xDerivativeBasis.h00 * c01.height +
		xDerivativeBasis.h10 *
		c01.derivativeX *
		extentX +
		xDerivativeBasis.h01 * c11.height +
		xDerivativeBasis.h11 *
		c11.derivativeX *
		extentX;

	const derivativeXDerivativeZ0 =
		xDerivativeBasis.h00 *
		c00.derivativeZ *
		extentZ +
		xDerivativeBasis.h10 *
		c00.mixedDerivative *
		extentX *
		extentZ +
		xDerivativeBasis.h01 *
		c10.derivativeZ *
		extentZ +
		xDerivativeBasis.h11 *
		c10.mixedDerivative *
		extentX *
		extentZ;

	const derivativeXDerivativeZ1 =
		xDerivativeBasis.h00 *
		c01.derivativeZ *
		extentZ +
		xDerivativeBasis.h10 *
		c01.mixedDerivative *
		extentX *
		extentZ +
		xDerivativeBasis.h01 *
		c11.derivativeZ *
		extentZ +
		xDerivativeBasis.h11 *
		c11.mixedDerivative *
		extentX *
		extentZ;

	const derivativeU =
		zBasis.h00 *
		derivativeXValueZ0 +
		zBasis.h10 *
		derivativeXDerivativeZ0 +
		zBasis.h01 *
		derivativeXValueZ1 +
		zBasis.h11 *
		derivativeXDerivativeZ1;

	const derivativeV =
		zDerivativeBasis.h00 *
		valueZ0 +
		zDerivativeBasis.h10 *
		derivativeZ0 +
		zDerivativeBasis.h01 *
		valueZ1 +
		zDerivativeBasis.h11 *
		derivativeZ1;

	return {
		height: value,
		gradientX:
			derivativeU /
			extentX,
		gradientZ:
			derivativeV /
			extentZ
	};
}

//========================================================
// Surface Sample Helpers
//========================================================

function createCornerSamplePositions(
	noisePosition,
	displayOffsetY
) {
	const halfWidth =
		VOXEL_SIZE * 0.5;

	const cornersXZ = [
		[-halfWidth, -halfWidth],
		[halfWidth, -halfWidth],
		[-halfWidth, halfWidth],
		[halfWidth, halfWidth]
	];

	const positions = [];

	for (const [x, z] of cornersXZ) {
		const y =
			sampleOriginalSurfaceHeight(
				x,
				z,
				noisePosition
			) +
			displayOffsetY;

		positions.push(
			new THREE.Vector3(
				x,
				y,
				z
			)
		);
	}

	return positions;
}

function sampleOriginalSurfaceCenter(
	noisePosition
) {
	return {
		height:
			sampleOriginalSurfaceHeight(
				0.0,
				0.0,
				noisePosition
			),

		gradientX:
			sampleOriginalSurfaceDerivativeX(
				0.0,
				0.0,
				noisePosition
			),

		gradientZ:
			sampleOriginalSurfaceDerivativeZ(
				0.0,
				0.0,
				noisePosition
			)
	};
}

//========================================================
// Tangent Plane Helpers
//========================================================

function createTangentPlaneGeometry() {
	const halfWidth =
		VOXEL_SIZE * 0.5;

	const positions = new Float32Array([
		-halfWidth, 0.0, -halfWidth,
		halfWidth, 0.0, -halfWidth,
		-halfWidth, 0.0, halfWidth,
		halfWidth, 0.0, halfWidth
	]);

	const indices = new Uint16Array([
		0, 2, 1,
		1, 2, 3
	]);

	const geometry =
		new THREE.BufferGeometry();

	geometry.setAttribute(
		"position",
		new THREE.BufferAttribute(
			positions,
			3
		)
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
	// Update Helpers
	//========================================================

	function updateOriginalSurfaceGeometry(
		geometry,
		noisePosition
	) {
		const positionAttribute =
			geometry.getAttribute(
				"position"
			);

		let minimumHeight =
			Number.POSITIVE_INFINITY;

		let maximumHeight =
			Number.NEGATIVE_INFINITY;

		//--------------------------------------------------------
		// Sample Surface Heights
		//--------------------------------------------------------

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
					noisePosition
				);

			positionAttribute.setY(
				vertexIndex,
				y
			);

			minimumHeight =
				Math.min(
					minimumHeight,
					y
				);

			maximumHeight =
				Math.max(
					maximumHeight,
					y
				);
		}

		//--------------------------------------------------------
		// Center Surface Vertically
		//--------------------------------------------------------

		const surfaceCenterHeight =
			(
				minimumHeight +
				maximumHeight
			) * 0.5;

		const displayOffsetY =
			-surfaceCenterHeight;

		for (let vertexIndex = 0;
			vertexIndex < positionAttribute.count;
			vertexIndex++) {

			positionAttribute.setY(
				vertexIndex,
				positionAttribute.getY(
					vertexIndex
				) +
				displayOffsetY
			);
		}

		positionAttribute.needsUpdate = true;

		geometry.computeVertexNormals();

		return displayOffsetY;
	}

	function updateCornerSamples() {
		const cornerSamplePositions =
			createCornerSamplePositions(
				noisePosition,
				displayOffsetY
			);

		for (let i = 0;
			i < cornerSampleMeshes.length;
			i++) {

			cornerSampleMeshes[i].position.copy(
				cornerSamplePositions[i]
			);
		}
	}

	function updateBicubicPatchGeometry(
		geometry,
		noisePosition,
		displayOffsetY
	) {
		const positionAttribute =
			geometry.getAttribute(
				"position"
			);

		const cornerData =
			createSurfaceCornerData(
				noisePosition
			);

		const halfWidth =
			VOXEL_SIZE * 0.5;

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

			const u =
				(x + halfWidth) /
				VOXEL_SIZE;

			const v =
				(z + halfWidth) /
				VOXEL_SIZE;

			const y =
				sampleBicubicPatch(
					u,
					v,
					cornerData
				) +
				displayOffsetY;

			positionAttribute.setY(
				vertexIndex,
				y
			);
		}

		positionAttribute.needsUpdate = true;
	}

	function updateTangentPlaneGeometry(
		geometry,
		surfaceSample,
		displayOffsetY
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
				surfaceSample.height +
				surfaceSample.gradientX * x +
				surfaceSample.gradientZ * z +
				displayOffsetY;

			positionAttribute.setY(
				vertexIndex,
				y
			);
		}

		positionAttribute.needsUpdate = true;
	}

	function updateTangentPlanes() {
		const directSample =
			sampleOriginalSurfaceCenter(
				noisePosition
			);

		const cornerData =
			createSurfaceCornerData(
				noisePosition
			);

		const hermiteSample =
			sampleBicubicPatchCenter(
				cornerData
			);

		updateTangentPlaneGeometry(
			directTangentGeometry,
			directSample,
			displayOffsetY
		);

		updateTangentPlaneGeometry(
			hermiteTangentGeometry,
			hermiteSample,
			displayOffsetY
		);

		const directTangentY =
			directSample.height +
			displayOffsetY;

		const hermiteTangentY =
			hermiteSample.height +
			displayOffsetY;

		directTangentHeightReadout.textContent =
			directTangentY.toFixed(2);

		directTangentSlopeReadout.textContent =
			`(${directSample.gradientX.toFixed(2)}, ${directSample.gradientZ.toFixed(2)})`;

		hermiteTangentHeightReadout.textContent =
			hermiteTangentY.toFixed(2);

		hermiteTangentSlopeReadout.textContent =
			`(${hermiteSample.gradientX.toFixed(2)}, ${hermiteSample.gradientZ.toFixed(2)})`;

		tangentSamples.setAttribute(
			"aria-label",
			`Tangent sample comparison. ` +
			`Direct tangent: height ${directTangentY.toFixed(2)}, ` +
			`X slope ${directSample.gradientX.toFixed(2)}, ` +
			`Z slope ${directSample.gradientZ.toFixed(2)}. ` +
			`Hermite tangent: height ${hermiteTangentY.toFixed(2)}, ` +
			`X slope ${hermiteSample.gradientX.toFixed(2)}, ` +
			`Z slope ${hermiteSample.gradientZ.toFixed(2)}.`
		);
	}

	function updateVisualization() {
		displayOffsetY =
			updateOriginalSurfaceGeometry(
				originalSurfaceGeometry,
				noisePosition
			);

		updateCornerSamples();

		updateBicubicPatchGeometry(
			bicubicPatchGeometry,
			noisePosition,
			displayOffsetY
		);

		updateTangentPlanes();
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

	const noisePositionSlider =
		visualizationRoot.querySelector(
			".noise-position"
		);

	const noisePositionValue =
		visualizationRoot.querySelector(
			".noise-position-value"
		);

	const originalSurfaceCheckbox =
		visualizationRoot.querySelector(
			".toggle-original-surface"
		);

	const cornerSamplesCheckbox =
		visualizationRoot.querySelector(
			".toggle-corner-samples"
		);

	const bicubicPatchCheckbox =
		visualizationRoot.querySelector(
			".toggle-bicubic-patch"
		);

	const directTangentCheckbox =
		visualizationRoot.querySelector(
			".toggle-direct-tangent"
		);

	const hermiteTangentCheckbox =
		visualizationRoot.querySelector(
			".toggle-hermite-tangent"
		);

	const resetCameraButton =
		visualizationRoot.querySelector(
			".reset-camera"
		);

	const directTangentHeightReadout =
		visualizationRoot.querySelector(
			".direct-tangent-height"
		);

	const directTangentSlopeReadout =
		visualizationRoot.querySelector(
			".direct-tangent-slope"
		);

	const hermiteTangentHeightReadout =
		visualizationRoot.querySelector(
			".hermite-tangent-height"
		);

	const hermiteTangentSlopeReadout =
		visualizationRoot.querySelector(
			".hermite-tangent-slope"
		);

	const tangentSamples =
		visualizationRoot.querySelector(".tangent-samples");

	if (
		noisePositionSlider === null ||
		noisePositionValue === null ||
		originalSurfaceCheckbox === null ||
		cornerSamplesCheckbox === null ||
		bicubicPatchCheckbox === null ||
		directTangentCheckbox === null ||
		hermiteTangentCheckbox === null ||
		resetCameraButton === null ||
		directTangentHeightReadout === null ||
		directTangentSlopeReadout === null ||
		hermiteTangentHeightReadout === null ||
		hermiteTangentSlopeReadout === null ||
		tangentSamples === null
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
		-0.95,
		0.5,
		2.2
	);

	//========================================================
	// Rendering
	//========================================================

	const renderer = new THREE.WebGLRenderer({
		antialias: true
	});

	renderer.setSize(width, height);

	viewport.appendChild(renderer.domElement);

	renderer.domElement.setAttribute(
		"aria-label",
		"Interactive 3D column surface construction visualization"
	);

	renderer.domElement.setAttribute(
		"aria-describedby",
		"column-surface-instructions"
	);

	//========================================================
	// Viewport Resizing
	//========================================================

	const resizeObserver = new ResizeObserver(() => {
		const width = viewport.clientWidth;
		const height = viewport.clientHeight;

		if (width === 0 || height === 0) {
			return;
		}

		camera.aspect = width / height;
		camera.updateProjectionMatrix();

		renderer.setSize(width, height);
	});

	resizeObserver.observe(viewport);

	//========================================================
	// Camera Controls
	//========================================================

	const controls = new OrbitControls(
		camera,
		renderer.domElement
	);

	enableKeyboardOrbitControls(
		renderer.domElement,
		controls,
		camera,
		{
			rotationDegrees: 2,
			zoomFactor: 0.95
		}
	);

	controls.target.set(0, 0, 0);
	controls.update();
	controls.saveState();

	//========================================================
	// Visualization State
	//========================================================

	let noisePosition =
		Number(
			noisePositionSlider.value
		);

	noisePositionValue.textContent =
		noisePosition.toFixed(2);

	let displayOffsetY = 0.0;

	//========================================================
	// Rendering Geometry
	//========================================================

	//--------------------------------------------------------
	// Voxel Column
	//--------------------------------------------------------
	const voxelColumnPoints =
		createVoxelColumnPoints(
			VOXEL_SIZE,
			VOXEL_COUNT_Y
		);

	const voxelColumnGeometry =
		new THREE.BufferGeometry().setFromPoints(
			voxelColumnPoints
		);

	//--------------------------------------------------------
	// Surface Geometry
	//--------------------------------------------------------
	const originalSurfaceGeometry =
		createOriginalSurfaceGeometry();

	const cornerSampleGeometry =
		new THREE.SphereGeometry(
			0.015,
			12,
			8
		);

	const bicubicPatchGeometry =
		createBicubicPatchGeometry();

	//--------------------------------------------------------
	// Tangent Geometry
	//--------------------------------------------------------
	const directTangentGeometry =
		createTangentPlaneGeometry();

	const hermiteTangentGeometry =
		createTangentPlaneGeometry();

	//========================================================
	// Materials
	//========================================================

	//--------------------------------------------------------
	// Voxel and Surface Materials
	//--------------------------------------------------------
	const voxelColumnMaterial =
		new THREE.LineBasicMaterial({
			color: 0xffffff,
			transparent: true,
			opacity: 0.6
		});

	const originalSurfaceMaterial =
		new THREE.MeshNormalMaterial({
			side: THREE.DoubleSide,
			transparent: true,
			opacity: 0.5
		});

	const cornerSampleMaterial =
		new THREE.MeshBasicMaterial({
			color: 0xff7fed
		});

	const bicubicPatchMaterial =
		new THREE.MeshBasicMaterial({
			color: 0xff7fb6,
			side: THREE.DoubleSide,
			transparent: true,
			opacity: 0.5
		});

	//--------------------------------------------------------
	// Tangent Materials
	//--------------------------------------------------------
	const directTangentMaterial =
		new THREE.MeshBasicMaterial({
			color: 0xff9f43,
			side: THREE.DoubleSide,
			transparent: true,
			opacity: 0.5
		});

	const hermiteTangentMaterial =
		new THREE.MeshBasicMaterial({
			color: 0x4dc3ff,
			side: THREE.DoubleSide,
			transparent: true,
			opacity: 0.5
		});

	//========================================================
	// Scene Objects
	//========================================================

	//--------------------------------------------------------
	// Voxel Column
	//--------------------------------------------------------
	const voxelColumnWireframe =
		new THREE.LineSegments(
			voxelColumnGeometry,
			voxelColumnMaterial
		);

	//--------------------------------------------------------
	// Surface Layers
	//--------------------------------------------------------
	const originalSurfaceMesh =
		new THREE.Mesh(
			originalSurfaceGeometry,
			originalSurfaceMaterial
		);

	originalSurfaceMesh.visible =
		originalSurfaceCheckbox.checked;

	const cornerSampleGroup =
		new THREE.Group();

	const cornerSampleMeshes = [];

	for (let cornerIndex = 0;
		cornerIndex < 4;
		cornerIndex++) {

		const marker =
			new THREE.Mesh(
				cornerSampleGeometry,
				cornerSampleMaterial
			);

		cornerSampleGroup.add(marker);
		cornerSampleMeshes.push(marker);
	}

	cornerSampleGroup.visible =
		cornerSamplesCheckbox.checked;

	const bicubicPatchMesh =
		new THREE.Mesh(
			bicubicPatchGeometry,
			bicubicPatchMaterial
		);

	bicubicPatchMesh.visible =
		bicubicPatchCheckbox.checked;

	//--------------------------------------------------------
	// Tangent Layers
	//--------------------------------------------------------
	const directTangentMesh =
		new THREE.Mesh(
			directTangentGeometry,
			directTangentMaterial
		);

	directTangentMesh.visible =
		directTangentCheckbox.checked;

	const hermiteTangentMesh =
		new THREE.Mesh(
			hermiteTangentGeometry,
			hermiteTangentMaterial
		);

	hermiteTangentMesh.visible =
		hermiteTangentCheckbox.checked;

	//========================================================
	// Scene Assembly
	//========================================================

	scene.add(voxelColumnWireframe);
	scene.add(originalSurfaceMesh);
	scene.add(cornerSampleGroup);
	scene.add(bicubicPatchMesh);
	scene.add(directTangentMesh);
	scene.add(hermiteTangentMesh);

	//========================================================
	// Initial Visualization Update
	//========================================================

	updateVisualization();

	//========================================================
	// UI Event Handlers
	//========================================================

	//--------------------------------------------------------
	// Sampling Controls
	//--------------------------------------------------------
	noisePositionSlider.addEventListener(
		"input",
		() => {
			noisePosition =
				Number(
					noisePositionSlider.value
				);

			noisePositionValue.textContent =
				noisePosition.toFixed(2);

			updateVisualization();
		}
	);

	//--------------------------------------------------------
	// Visibility Controls
	//--------------------------------------------------------
	originalSurfaceCheckbox.addEventListener(
		"change",
		() => {
			originalSurfaceMesh.visible =
				originalSurfaceCheckbox.checked;
		}
	);

	cornerSamplesCheckbox.addEventListener(
		"change",
		() => {
			cornerSampleGroup.visible =
				cornerSamplesCheckbox.checked;
		}
	);

	bicubicPatchCheckbox.addEventListener(
		"change",
		() => {
			bicubicPatchMesh.visible =
				bicubicPatchCheckbox.checked;
		}
	);


	directTangentCheckbox.addEventListener(
		"change",
		() => {
			directTangentMesh.visible =
				directTangentCheckbox.checked;
		}
	);

	hermiteTangentCheckbox.addEventListener(
		"change",
		() => {
			hermiteTangentMesh.visible =
				hermiteTangentCheckbox.checked;
		}
	);

	//--------------------------------------------------------
	// Camera Controls
	//--------------------------------------------------------
	resetCameraButton.addEventListener(
		"click",
		() => {
			controls.reset();
		}
	);

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
