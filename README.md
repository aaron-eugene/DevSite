# Aaron's Dev Lab

Source code for [aaronsdevlab.com](https://aaronsdevlab.com), my personal development website.

The site serves as a technical journal for documenting software projects, experiments, implementation details, and lessons learned. Its current focus is on voxel terrain research, computational geometry, and real-time rendering.

## Technologies

- **Astro** — Static site generation and page components
- **JavaScript** — Interactive functionality and visualization logic
- **Three.js** — Interactive 3D rendering
- **CSS** — Responsive layouts and styling

## Interactive Visualizations

The site includes several interactive demonstrations developed to accompany technical articles:

- **Surface Voxel Grid** — Visualizes how a continuous terrain surface intersects a voxel grid.
- **Plane–Cube Intersection** — Demonstrates plane intersections with cube geometry and the resulting polygons.
- **Column Surface Construction** — Explores surface interpolation and tangent estimation.

The visualizations include mouse, touch, and keyboard camera controls, along with accessibility features.

## Development

Install dependencies and start the local development server:

```bash
npm install
npm run dev
```

To generate a production build:

```bash
npm run build
```

The site is statically generated and deployed through Cloudflare Pages.

## Live Website

**[aaronsdevlab.com](https://aaronsdevlab.com)**
