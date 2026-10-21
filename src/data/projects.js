///////////////////////////////////////////////////////////////////////////////
// data/projects.js
// ================
//
// Shared metadata for the site's development projects.
//
///////////////////////////////////////////////////////////////////////////////


//========================================================
// Project Metadata
//========================================================

/**
 * @typedef {Object} Project
 * @property {string} id
 * @property {string} title
 * @property {string} description
 * @property {string} href
 * @property {string} image
 * @property {string} [repositoryUrl]
 * @property {string[]} areaIds
 */

/** @type {Project[]} */
export const projects = [
	{
		id: "plane-voxel-lab",
		title: "Plane Voxel Lab",
		description:
			"An experimental C++ / OpenGL lab for investigating voxel terrain representation, surface construction, rendering, spatial systems, and approaches to editable terrain.",
		href: "/projects/plane-voxel-lab",
		image: "/images/xz-columnar-preview.jpg",
		repositoryUrl: "https://github.com/aaron-eugene/PlaneVoxelLab",
		areaIds: [
			"terrain-systems",
			"rendering-visualization",
			"spatial-systems",
			"software-architecture"
		]
	}
];


//========================================================
// Project Queries
//========================================================

/**
 * Finds a project by its stable identifier.
 *
 * @param {string} id
 * @returns {Project | undefined}
 */
export function getProjectById(id) {
	return projects.find((project) => project.id === id);
}

/**
 * Returns projects associated with a technical area.
 *
 * @param {string} areaId
 * @returns {Project[]}
 */
export function getProjectsByAreaId(areaId) {
	return projects.filter((project) =>
		project.areaIds.includes(areaId)
	);
}