
///////////////////////////////////////////////////////////////////////////////
// scripts/visualizations/keyboardOrbitControls.js
// ================================================
//
// Reusable keyboard camera controls for Three.js OrbitControls.
//
///////////////////////////////////////////////////////////////////////////////

import * as THREE from "three";


/**
 * @typedef {Object} KeyboardOrbitOptions
 * @property {number} [rotationDegrees]
 * @property {number} [zoomFactor]
 */


/**
 * Enables keyboard rotation and zoom for an OrbitControls camera.
 *
 * Arrow keys rotate the camera around the controls target.
 * Plus and minus zoom toward or away from that target.
 *
 * The keyboard handler responds only while the supplied
 * element has focus.
 *
 * @param {HTMLElement} element
 * @param {import("three/addons/controls/OrbitControls.js").OrbitControls} controls
 * @param {import("three").PerspectiveCamera} camera
 * @param {KeyboardOrbitOptions} [options]
 * @returns {() => void} Function that removes the keyboard handler.
 */
export function enableKeyboardOrbitControls(
	element,
	controls,
	camera,
	options = {}
) {
	const {
		rotationDegrees = 5,
		zoomFactor = 0.9
	} = options;

	const rotationStep =
		THREE.MathUtils.degToRad(rotationDegrees);

	//--------------------------------------------------------
	// Keyboard Input
	//--------------------------------------------------------

	function handleKeyDown(event) {
		switch (event.key) {
			case "ArrowLeft":
				controls.rotateLeft(rotationStep);
				break;

			case "ArrowRight":
				controls.rotateLeft(-rotationStep);
				break;

			case "ArrowUp":
				controls.rotateUp(rotationStep);
				break;

			case "ArrowDown":
				controls.rotateUp(-rotationStep);
				break;

			case "+":
			case "=":
				zoomCamera(zoomFactor);
				break;

			case "-":
			case "_":
				zoomCamera(1 / zoomFactor);
				break;

			default:
				return;
		}

		event.preventDefault();
		controls.update();
	}

	//--------------------------------------------------------
	// Camera Zoom
	//--------------------------------------------------------

	function zoomCamera(factor) {
		const offset =
			camera.position.clone().sub(controls.target);

		const distance = offset.length();

		const newDistance = THREE.MathUtils.clamp(
			distance * factor,
			controls.minDistance,
			controls.maxDistance
		);

		offset.setLength(newDistance);

		camera.position.copy(controls.target).add(offset);
	}

	//--------------------------------------------------------
	// Setup
	//--------------------------------------------------------

	element.tabIndex = 0;

	element.addEventListener("keydown", handleKeyDown);

	//--------------------------------------------------------
	// Cleanup
	//--------------------------------------------------------

	return () => {
		element.removeEventListener(
			"keydown",
			handleKeyDown
		);
	};
}
