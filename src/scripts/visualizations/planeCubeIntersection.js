import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

//========================================================
// Helper Functions
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

function signedDistancesToPlane(plane, vertices, epsilon) {
	let positiveCount = 0;
	let negativeCount = 0;
	let onPlaneCount = 0;

	for (const vertex of vertices) {
		const distance = plane.distanceToPoint(vertex);

		if (distance > epsilon) {
			positiveCount++;
		}
		else if (distance < -epsilon) {
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

function addUniquePoint(points, point, epsilon) {
	for (const existingPoint of points) {
		if (existingPoint.distanceToSquared(point) <= epsilon * epsilon) {
			return;
		}
	}

	points.push(point.clone());
}

function calculatePlaneCubeIntersection(plane, vertices, edges) {
	const intersectionPoints = [];

	const epsilon = 1e-8;

	//--------------------------------------------------------
	// Signed Distances to Plane
	//--------------------------------------------------------
	const distanceCounts = signedDistancesToPlane(
		plane,
		vertices,
		epsilon
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

		const startOnPlane = Math.abs(startDistance) <= epsilon;
		const endOnPlane = Math.abs(endDistance) <= epsilon;

		// Entire edge lies in the plane
		if (startOnPlane && endOnPlane) {
			addUniquePoint(intersectionPoints, start, epsilon);
			addUniquePoint(intersectionPoints, end, epsilon);
		}
		// Plane passes through the start vertex
		else if (startOnPlane) {
			addUniquePoint(intersectionPoints, start, epsilon);
		}
		// Plane passes through the end vertex
		else if (endOnPlane) {
			addUniquePoint(intersectionPoints, end, epsilon);
		}
		// Edge crosses the plane between its endpoints.
		else if (
			(startDistance > epsilon && endDistance < -epsilon) ||
			(startDistance < -epsilon && endDistance > epsilon)
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
				intersection,
				epsilon
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

function createIntersectionGeometry() {
	const maxVertices = 6;
	const maxIndices = 12;

	const positions = new Float32Array(maxVertices * 3);
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
	const maxVertices = 6;

	const positions = new Float32Array(
		maxVertices * 3
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
// Viewport
//========================================================

const width = 640;
const height = 480;

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

document.body.appendChild(renderer.domElement);

//========================================================
// Camera Controls
//========================================================

const controls = new OrbitControls(
	camera,
	renderer.domElement
);

controls.update();

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
// Plane Geometry
//========================================================

const planeNormal = new THREE.Vector3(0, 1, -1).normalize();

const plane = new THREE.Plane(planeNormal, 0);

//========================================================
// Intersection Geometry
//========================================================

const {
	points,
	intersectionType
} = calculatePlaneCubeIntersection(
	plane,
	cubeVertices,
	cubeEdges
);

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

const intersectionGeo = createIntersectionGeometry();
updateIntersectionGeometry(intersectionGeo, points);

const intersectionEdgesGeo = createIntersectionEdgeGeometry();
updateIntersectionEdgeGeometry(intersectionEdgesGeo, points);

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
// Plane Visualization
//========================================================

const defaultPlaneNormal = new THREE.Vector3(0, 0, 1);

const planeRenderPosition = new THREE.Vector3();
const planeRenderRotation = new THREE.Quaternion();

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

updatePlaneVisualization();

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

