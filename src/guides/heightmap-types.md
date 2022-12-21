---
title: The different heightmap types explained
versions:
  - '1.16'
  - '1.17'
  - '1.18'
  - '1.18.2'
  - '1.19'
tags:
  - worldgen
---

Heightmaps are essentially a cache that store the height of the terrain for each block column in a chunk.

They are computed by starting at the top of the world and iterating downwards, for each block checking if a condition still matches. Let's go over each type to see how they work.

## `WORLD_SURFACE`
The world surface heightmap is the simplest one. It checks whether the block is air or not. This only matches `air`, `void_air` and `cave_air`.

## `WORLD_SURFACE_WG`
The worldgen variant of `WORLD_SURFACE`. Works exactly the same, but is updated during worldgen and is discarded after worldgen is finished.

## `OCEAN_FLOOR`
The ocean floor heightmap checks that the block has no collision box. This means it will pass through air, water, lava, bubble columns, portals, most plants, fire, cobwebs, powder snow, and many more blocks. An exception are carpets, which are seen as having no collision box to this heightmap.

## `OCEAN_FLOOR_WG`
The worldgen variant of `OCEAN_FLOOR`. Works exactly the same, but is updated during worldgen and is discarded after worldgen is finished.

## `MOTION_BLOCKING`
The motion blocking heightmap is similar to `OCEAN_FLOOR` that checks that the block has no collision box. The difference is that it also checks that there is no fluid in the block.

## `MOTION_BLOCKING_NO_LEAVES`
Similar to `MOTION_BLOCKING` but as the name suggests, this ignores leaves. The heightmap will be set to the ground next to trees even if leaves are above it.
