///////////////////////////////////////////////////////////////////////////////
// data/technicalAreas.js
// ======================
//
// Shared metadata for the site's technical areas.
//
///////////////////////////////////////////////////////////////////////////////


//========================================================
// Technical Area Metadata
//========================================================

/**
 * @typedef {Object} TechnicalArea
 * @property {string} id
 * @property {string} title
 * @property {string} description
 * @property {string} href
 */

/** @type {TechnicalArea[]} */
export const technicalAreas = [
	{
		id: "terrain-systems",
		title: "Terrain Systems",
		description:
			"Terrain representation, surface construction, density fields, topology, procedural generation, and editable geometry.",
		href: "/areas/terrain-systems"
	},
	{
		id: "rendering-visualization",
		title: "Rendering & Visualization",
		description:
			"Graphics pipelines, shaders, lighting, rendering techniques, and the visual presentation of data and geometry.",
		href: "/areas/rendering-visualization"
	},
	{
		id: "spatial-systems",
		title: "Spatial Systems",
		description:
			"Coordinate systems, spatial organization, indexing, precision, sampling, and relationships between objects in space.",
		href: "/areas/spatial-systems"
	},
	{
		id: "software-architecture",
		title: "Software Architecture & Design",
		description:
			"Code organization, module boundaries, ownership, resource lifetime, interfaces, and technical design decisions.",
		href: "/areas/software-architecture"
	}
];


//========================================================
// Technical Area Queries
//========================================================

/**
 * Finds a technical area by its stable identifier.
 *
 * @param {string} id
 * @returns {TechnicalArea | undefined}
 */
export function getTechnicalAreaById(id) {
	return technicalAreas.find((area) => area.id === id);
}
