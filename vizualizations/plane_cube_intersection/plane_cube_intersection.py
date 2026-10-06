import numpy as np
import matplotlib.pyplot as plt
from mpl_toolkits.mplot3d.art3d import Poly3DCollection

#========================================================
# Cube Geometry
#========================================================

#   7 -------- 6	+Z
#  /|         /|	^
# 4 -------- 5 |	|
# | |        | |	|
# | 3 ------ | 2	---> +X
# |/         |/
# 0 -------- 1
#
# Corner 0 = (x,     y,     z)
# Corner 1 = (x + 1, y,     z)
# Corner 2 = (x + 1, y + 1, z)
# Corner 3 = (x,     y + 1, z)
# Corner 4 = (x,     y,     z + 1)
# Corner 5 = (x + 1, y,     z + 1)
# Corner 6 = (x + 1, y + 1, z + 1)
# Corner 7 = (x,     y + 1, z + 1)

cube_verts = np.array([
	[-0.5, -0.5, -0.5],
	[0.5, -0.5, -0.5],
	[0.5, 0.5, -0.5],
	[-0.5, 0.5, -0.5],
	[-0.5, -0.5, 0.5],
	[0.5, -0.5, 0.5],
	[0.5, 0.5, 0.5],
	[-0.5, 0.5, 0.5],
])

# Edge 0  = 0 -> 1
# Edge 1  = 1 -> 2
# Edge 2  = 2 -> 3
# Edge 3  = 3 -> 0
#
# Edge 4  = 4 -> 5
# Edge 5  = 5 -> 6
# Edge 6  = 6 -> 7
# Edge 7  = 7 -> 4
#
# Edge 8  = 0 -> 4
# Edge 9  = 1 -> 5
# Edge 10 = 2 -> 6
# Edge 11 = 3 -> 7

cube_edges = np.array([
	[0, 1],
	[1, 2],
	[2, 3],
	[3, 0],

	[4, 5],
	[5, 6],
	[6, 7],
	[7, 4],

	[0, 4],
	[1, 5],
	[2, 6],
	[3, 7],
])

#========================================================
# Plane Definition
#========================================================

plane_normal = np.array([0.0, 1.0, -1.0])
plane_normal = plane_normal / np.linalg.norm(plane_normal)

plane_point = np.array([0.0, 0.0, 0.0])

#========================================================
# Plane Visualization Geometry
#========================================================

reference = np.array([1.0, 0.0, 0.0])

plane_u = np.cross(plane_normal, reference)
plane_u = plane_u / np.linalg.norm(plane_u)

plane_v = np.cross(plane_normal, plane_u)
plane_v = plane_v / np.linalg.norm(plane_v)

half_size = 0.8

plane_corners = np.array([
	plane_point - half_size * plane_u - half_size * plane_v,
	plane_point + half_size * plane_u - half_size * plane_v,
	plane_point + half_size * plane_u + half_size * plane_v,
	plane_point - half_size * plane_u + half_size * plane_v,
])

plane_patch = Poly3DCollection(
	[plane_corners],
	alpha=0.3,
)

#========================================================
# Plane-Cube Intersection
#========================================================

intersection_points = []

epsilon = 1e-8

for edge in cube_edges:
	start = cube_verts[edge[0]]
	end = cube_verts[edge[1]]

	numerator = np.dot(plane_normal, plane_point - start)
	denominator = np.dot(plane_normal, end - start)

	if abs(denominator) > epsilon:
		interp = numerator / denominator

		if 0.0 <= interp <= 1.0:
			intersection = start + interp * (end - start)
			intersection_points.append(intersection)
	# else
		# the edge is parallel and separate from the plane
		# the entire edge lies in the plane

intersection_points = np.array(intersection_points)
centroid = np.mean(intersection_points, axis=0)

angles = []

for point in intersection_points:
	offset = point - centroid

	u = np.dot(offset, plane_u)
	v = np.dot(offset, plane_v)

	angle = np.arctan2(v, u)
	angles.append(angle)

sorted_indices = np.argsort(angles)
sorted_points = intersection_points[sorted_indices]

#========================================================
# Visualization
#========================================================

fig = plt.figure()
ax = fig.add_subplot(111, projection="3d")

ax.add_collection3d(plane_patch)

intersection_patch = Poly3DCollection(
	[sorted_points],
	alpha=0.6,
)

ax.add_collection3d(intersection_patch)

for edge in cube_edges:
	start = cube_verts[edge[0]]
	end = cube_verts[edge[1]]

	ax.plot(
		[start[0], end[0]],
		[start[1], end[1]],
		[start[2], end[2]],
	)

ax.scatter(
	intersection_points[:, 0],
	intersection_points[:, 1],
	intersection_points[:, 2],
)

ax.set_xlim(-0.75, 0.75)
ax.set_ylim(-0.75, 0.75)
ax.set_zlim(-0.75, 0.75)

ax.set_box_aspect((1, 1, 1))

ax.set_xlabel("X")
ax.set_ylabel("Y")
ax.set_zlabel("Z")

plt.show()