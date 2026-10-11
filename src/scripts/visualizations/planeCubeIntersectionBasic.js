import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

//========================================================
// Geometry Constants
//========================================================

const INTERSECTION_EPSILON = 1e-8;
const MAX_INTERSECTION_VERTICES = 6;

//========================================================
// Geometry Helpers
//========================================================

function buildPlaneBasis(normal) {
	let referenceVect;

	if (
		Math.abs(normal.x) <= Math.abs(normal.y) &&
		Math.abs(normal.x) <= Math.abs(normal.z)
	) {
		referenceVect = new THREE.Vector3(1, 0, 0);
	}
	else if (Math.abs(normal.y) <= Math.abs(normal.z)) {
		referenceVect = new THREE.Vector3(0, 1, 0);
	}
	else {
		referenceVect = new THREE.Vector3(0, 0, 1);
	}

	const planeU = normal.clone().cross(referenceVect).normalize();
	const planeV = normal.clone().cross(planeU).normalize();

	return { planeU, planeV };
}

function signedDistancesToPlane(plane, vertices) {
	let positiveCount = 0;
	let negativeCount = 0;
	let onPlaneCount = 0;

	for (const vertex of vertices) {
		const distance = plane.distanceToPoint(vertex);

		if (distance > INTERSECTION_EPSILON) {
			positiveCount++;
		}
		else if (distance < -INTERSECTION_EPSILON) {
			negativeCount++;
		}
		else {
			onPlaneCount++;
		}
	}

	return { positiveCount, negativeCount, onPlaneCount };
}

function hasPlaneCubeIntersection(distanceCounts) {
	const {
		positiveCount,
		negativeCount,
		onPlaneCount
	} = distanceCounts;

	if (
		positiveCount > 0 &&
		negativeCount === 0 &&
		onPlaneCount === 0
	) {
		return false;
	}

	if (
		negativeCount > 0 &&
		positiveCount === 0 &&
		onPlaneCount === 0
	) {
		return false;
	}

	return true;
}

function addUniquePoint(points, point) {
	for (const existingPoint of points) {
		if (existingPoint.distanceToSquared(point) <=
			INTERSECTION_EPSILON * INTERSECTION_EPSILON) {
			return;
		}
	}

	points.push(point.clone());
}

function calculatePlaneCubeIntersection(plane, vertices, edges) {
	const intersectionPoints = [];

	//--------------------------------------------------------
	// Signed Distances to Plane
	//--------------------------------------------------------
	const distanceCounts = signedDistancesToPlane(
		plane,
		vertices,
	);

	//--------------------------------------------------------
	// Test for Intersection
	//--------------------------------------------------------
	if (!hasPlaneCubeIntersection(distanceCounts)) {
		return {
			points: [],
			intersectionType: "none"
		};
	}

	//--------------------------------------------------------
	// Collect Edge Intersections
	//--------------------------------------------------------
	for (const edge of edges) {
		const start = edge[0];
		const end = edge[1];

		const startDistance = plane.distanceToPoint(start);
		const endDistance = plane.distanceToPoint(end);

		const startOnPlane = Math.abs(startDistance) <= INTERSECTION_EPSILON;

		const endOnPlane = Math.abs(endDistance) <= INTERSECTION_EPSILON;

		// Entire edge lies in the plane
		if (startOnPlane && endOnPlane) {
			addUniquePoint(intersectionPoints, start);
			addUniquePoint(intersectionPoints, end);
		}
		// Plane passes through the start vertex
		else if (startOnPlane) {
			addUniquePoint(intersectionPoints, start);
		}
		// Plane passes through the end vertex
		else if (endOnPlane) {
			addUniquePoint(intersectionPoints, end);
		}
		// Edge crosses the plane between its endpoints.
		else if (
			(startDistance > INTERSECTION_EPSILON &&
				endDistance < -INTERSECTION_EPSILON) ||
			(startDistance < -INTERSECTION_EPSILON &&
				endDistance > INTERSECTION_EPSILON)
		) {
			const interp =
				startDistance /
				(startDistance - endDistance);

			const intersection = start.clone().lerp(
				end,
				interp
			);

			addUniquePoint(
				intersectionPoints,
				intersection
			);
		}
	}

	//--------------------------------------------------------
	// Classify Intersection
	//--------------------------------------------------------
	if (intersectionPoints.length < 3) {
		let intersectionType = "none";

		if (intersectionPoints.length === 1) {
			intersectionType = "point";
		}
		else if (intersectionPoints.length === 2) {
			intersectionType = "segment";
		}

		return {
			points: intersectionPoints,
			intersectionType
		};
	}

	//--------------------------------------------------------
	// Build Plane Basis
	//--------------------------------------------------------
	const planeBasis = buildPlaneBasis(plane.normal);

	//--------------------------------------------------------
	// Calculate Centroid
	//--------------------------------------------------------
	const centroid = new THREE.Vector3();

	for (const point of intersectionPoints) {
		centroid.add(point);
	}

	centroid.divideScalar(intersectionPoints.length);

	//--------------------------------------------------------
	// Calculate Intersection Angles
	//--------------------------------------------------------
	const pointAngles = [];

	for (const point of intersectionPoints) {
		const offset = point.clone().sub(centroid);

		const u = offset.dot(planeBasis.planeU);
		const v = offset.dot(planeBasis.planeV);

		pointAngles.push({ point, angle: Math.atan2(v, u) });
	}

	pointAngles.sort((a, b) => a.angle - b.angle);

	const sortedPoints = pointAngles.map(
		item => item.point
	);

	return {
		points: sortedPoints,
		intersectionType: "polygon"
	};
}

//========================================================
// Render Geometry Helpers
//========================================================

function createIntersectionGeometry() {
	const maxIndices =
		(MAX_INTERSECTION_VERTICES - 2) * 3;

	const positions = new Float32Array(MAX_INTERSECTION_VERTICES * 3);
	const indices = new Uint16Array(maxIndices);

	const geometry = new THREE.BufferGeometry();

	geometry.setAttribute(
		"position",
		new THREE.BufferAttribute(positions, 3)
	);

	geometry.setIndex(
		new THREE.BufferAttribute(indices, 1)
	);

	// Render nothing until valid polygon data is supplied.
	geometry.setDrawRange(0, 0);

	return geometry;
}

function createIntersectionEdgeGeometry() {

	const positions = new Float32Array(
		MAX_INTERSECTION_VERTICES * 3
	);

	const geometry = new THREE.BufferGeometry();

	geometry.setAttribute(
		"position",
		new THREE.BufferAttribute(positions, 3)
	);

	geometry.setDrawRange(0, 0);

	return geometry;
}

function updateIntersectionGeometry(geometry, points) {
	if (points.length < 3) {
		geometry.setDrawRange(0, 0);
		return;
	}

	const positionAttribute = geometry.getAttribute("position");
	const indexAttribute = geometry.getIndex();

	//--------------------------------------------------------
	// Update Vertex Positions
	//--------------------------------------------------------
	for (let i = 0; i < points.length; i++) {
		positionAttribute.setXYZ(
			i,
			points[i].x,
			points[i].y,
			points[i].z
		);
	}

	positionAttribute.needsUpdate = true;

	//--------------------------------------------------------
	// Build Triangle Fan
	//--------------------------------------------------------
	let indexCount = 0;

	for (let i = 1; i < points.length - 1; i++) {
		indexAttribute.setX(indexCount++, 0);
		indexAttribute.setX(indexCount++, i);
		indexAttribute.setX(indexCount++, i + 1);
	}

	indexAttribute.needsUpdate = true;

	//--------------------------------------------------------
	// Render Only Active Triangles
	//--------------------------------------------------------
	geometry.setDrawRange(0, indexCount);
}

function updateIntersectionEdgeGeometry(geometry, points) {
	if (points.length < 3) {
		geometry.setDrawRange(0, 0);
		return;
	}

	const positionAttribute =
		geometry.getAttribute("position");

	for (let i = 0; i < points.length; i++) {
		positionAttribute.setXYZ(
			i,
			points[i].x,
			points[i].y,
			points[i].z
		);
	}

	positionAttribute.needsUpdate = true;

	geometry.setDrawRange(
		0,
		points.length
	);
}

//========================================================
// Visualization Instance
//========================================================

function initializePlaneCubeIntersection(visualizationRoot) {

	//========================================================
	// Visualization Update Functions
	//========================================================

	function updatePlaneFromState() {
		const azimuth = THREE.MathUtils.degToRad(
			planeAzimuthDegrees
		);

		const elevation = THREE.MathUtils.degToRad(
			planeElevationDegrees
		);

		const cosElevation = Math.cos(elevation);

		plane.normal.set(
			cosElevation * Math.sin(azimuth),
			Math.sin(elevation),
			cosElevation * Math.cos(azimuth)
		);

		plane.constant = -planeOffset;
	}

	function updatePlaneVisualization() {
		plane.coplanarPoint(
			planeRenderPosition
		);

		planeRenderRotation.setFromUnitVectors(
			defaultPlaneNormal,
			plane.normal
		);

		planeGroup.position.copy(
			planeRenderPosition
		);

		planeGroup.quaternion.copy(
			planeRenderRotation
		);
	}

	function updateIntersectionVisualization() {
		intersectionResult =
			calculatePlaneCubeIntersection(
				plane,
				cubeVertices,
				cubeEdges
			);

		updateIntersectionGeometry(
			intersectionGeo,
			intersectionResult.points
		);

		updateIntersectionEdgeGeometry(
			intersectionEdgesGeo,
			intersectionResult.points
		);
	}

	function updateIntersectionStatusDisplay() {
		const pointCount =
			intersectionResult.points.length;

		if (
			intersectionResult.intersectionType === "polygon"
		) {
			intersectionStatus.textContent =
				`Polygon · ${pointCount} vertices`;
		}
		else {
			intersectionStatus.textContent =
				intersectionResult.intersectionType;
		}
	}

	function updatePlaneControls() {
		planeOffsetSlider.value =
			planeOffset;

		planeAzimuthSlider.value =
			planeAzimuthDegrees;

		planeElevationSlider.value =
			planeElevationDegrees;

		planeOffsetValue.textContent =
			planeOffset.toFixed(2);

		planeAzimuthValue.textContent =
			`${planeAzimuthDegrees.toFixed(0)}°`;

		planeElevationValue.textContent =
			`${planeElevationDegrees.toFixed(0)}°`;
	}

	function updateVisualization() {
		updatePlaneFromState();
		updatePlaneVisualization();
		updateIntersectionVisualization();
		updateIntersectionStatusDisplay();
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

	const planeOffsetSlider =
		visualizationRoot.querySelector(".plane-offset");

	const planeAzimuthSlider =
		visualizationRoot.querySelector(".plane-azimuth");

	const planeElevationSlider =
		visualizationRoot.querySelector(".plane-elevation");

	const planeOffsetValue =
		visualizationRoot.querySelector(".plane-offset-value");

	const planeAzimuthValue =
		visualizationRoot.querySelector(".plane-azimuth-value");

	const planeElevationValue =
		visualizationRoot.querySelector(".plane-elevation-value");

	const resetPlaneButton =
		visualizationRoot.querySelector(".reset-plane");

	const resetCameraButton =
		visualizationRoot.querySelector(".reset-camera");

	const intersectionStatus =
		visualizationRoot.querySelector(".intersection-status");

	if (
		planeOffsetSlider === null ||
		planeAzimuthSlider === null ||
		planeElevationSlider === null ||
		planeOffsetValue === null ||
		planeAzimuthValue === null ||
		planeElevationValue === null ||
		resetPlaneButton === null ||
		resetCameraButton === null ||
		intersectionStatus === null
	) {
		throw new Error(
			"Plane/cube visualization controls were not found."
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

	camera.position.set(-1.25, 0.75, -1.75);

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
	// Plane Control State
	//========================================================

	const DEFAULT_PLANE_OFFSET = 0.0;
	const DEFAULT_PLANE_AZIMUTH = 180.0;
	const DEFAULT_PLANE_ELEVATION = 45.0;

	let planeOffset = DEFAULT_PLANE_OFFSET;
	let planeAzimuthDegrees = DEFAULT_PLANE_AZIMUTH;
	let planeElevationDegrees = DEFAULT_PLANE_ELEVATION;

	//========================================================
	// Plane Geometry
	//========================================================

	const plane = new THREE.Plane();

	//========================================================
	// Intersection Geometry
	//========================================================

	let intersectionResult = {
		points: [],
		intersectionType: "none"
	};

	//========================================================
	// Rendering Geometry
	//========================================================

	const cubeEdgePoints = cubeEdges.flat();

	const cubeEdgesGeo = new THREE.BufferGeometry().setFromPoints(
		cubeEdgePoints
	);

	const planeDisplaySize = 2.0;

	const planeGeo = new THREE.PlaneGeometry(
		planeDisplaySize,
		planeDisplaySize
	);

	const planeEdgesGeo = new THREE.EdgesGeometry(
		planeGeo
	);

	const intersectionGeo =
		createIntersectionGeometry();

	const intersectionEdgesGeo =
		createIntersectionEdgeGeometry();

	//========================================================
	// Materials
	//========================================================

	const cubeEdgeMaterial = new THREE.LineBasicMaterial({
		color: 0xffffff
	});

	const planeMaterial = new THREE.MeshBasicMaterial({
		color: 0x7092be,
		side: THREE.DoubleSide,
		transparent: true,
		opacity: 0.35,
		polygonOffset: true,
		polygonOffsetFactor: 1,
		polygonOffsetUnits: 1
	});

	const planeEdgeMaterial = new THREE.LineBasicMaterial({
		color: 0x92bef7
	});

	const intersectionMaterial = new THREE.MeshBasicMaterial({
		color: 0x6ebe8a,
		side: THREE.DoubleSide,
		transparent: true,
		opacity: 0.35
	});

	const intersectionEdgeMaterial = new THREE.LineBasicMaterial({
		color: 0x91fab6
	});

	//========================================================
	// Scene Objects
	//========================================================

	const cubeWireframe = new THREE.LineSegments(
		cubeEdgesGeo,
		cubeEdgeMaterial
	);

	const planeMesh = new THREE.Mesh(
		planeGeo,
		planeMaterial
	);

	const planeWireframe = new THREE.LineSegments(
		planeEdgesGeo,
		planeEdgeMaterial
	);

	const planeGroup = new THREE.Group();

	planeGroup.add(planeMesh);
	planeGroup.add(planeWireframe);

	const intersectionMesh = new THREE.Mesh(
		intersectionGeo,
		intersectionMaterial
	);

	const intersectionWireframe = new THREE.LineLoop(
		intersectionEdgesGeo,
		intersectionEdgeMaterial
	);

	const intersectionGroup = new THREE.Group();

	intersectionGroup.add(intersectionMesh);
	intersectionGroup.add(intersectionWireframe);

	//========================================================
	// Visualization State & Initialization
	//========================================================

	const defaultPlaneNormal =
		new THREE.Vector3(0, 0, 1);

	const planeRenderPosition =
		new THREE.Vector3();

	const planeRenderRotation =
		new THREE.Quaternion();

	updatePlaneControls();
	updateVisualization();

	//========================================================
	// UI Event Handlers
	//========================================================

	planeOffsetSlider.addEventListener(
		"input",
		() => {
			planeOffset =
				Number(planeOffsetSlider.value);

			updatePlaneControls();
			updateVisualization();
		}
	);

	planeAzimuthSlider.addEventListener(
		"input",
		() => {
			planeAzimuthDegrees =
				Number(planeAzimuthSlider.value);

			updatePlaneControls();
			updateVisualization();
		}
	);

	planeElevationSlider.addEventListener(
		"input",
		() => {
			planeElevationDegrees =
				Number(planeElevationSlider.value);

			updatePlaneControls();
			updateVisualization();
		}
	);

	resetPlaneButton.addEventListener(
		"click",
		() => {
			planeOffset =
				DEFAULT_PLANE_OFFSET;

			planeAzimuthDegrees =
				DEFAULT_PLANE_AZIMUTH;

			planeElevationDegrees =
				DEFAULT_PLANE_ELEVATION;

			updatePlaneControls();
			updateVisualization();
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

	scene.add(cubeWireframe);
	scene.add(planeGroup);
	scene.add(intersectionGroup);

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
		".plane-cube-intersection"
	);

for (const visualizationRoot of visualizationRoots) {
	initializePlaneCubeIntersection(
		visualizationRoot
	);
}
