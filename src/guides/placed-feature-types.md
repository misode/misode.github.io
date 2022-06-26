---
title: Placed features and their configuration
versions:
  - '1.18'
  - '1.18.2'
  - '1.19'
tags:
  - worldgen
  - features
---

[Placed features](/worldgen/placed-feature/) are a combination of a [configured feature](/worldgen/feature/) and a list of placement modifiers. They decide the placement of a feature in biomes. This includes position, rarity, count, filters, and more.

## Placed features
Placed features are referenced in the f`features` list of biomes. They may also be referenced in some configured features types, such as in the `vegetation_patch` feature.

Let's look at an example placed feature:
```json
{
  "feature": "minecraft:monster_room",
  "placement": [
    {
      "type": "minecraft:count",
      "count": 2
    }
  ]
}
```
There are two fields in the placed feature configuration:
* f`feature`: The configured feature that the placed feature is going to place. Can either be referencing a configured feature file or be directly inlined.
* f`placement`: The list of placement modifiers, in order. Each modifier has a f`type` field and depending on the placement modifier, extra fields for configuration.

## Placement modifiers
Without any placement modifiers a feature is by default placed once at the most negative corner of the chunk at Y=0. Using a combination of different modifiers, this position can be altered.

In general there are 3 categories of modifiers, although some modifiers fall in multiple categories:
* **Repeating**: changes how many times the feature should spawn
  * [`count`](#count): Simple repeating count
  * [`noise_based_count`](#noise_based_count): Variable count based on a noise map
  * [`noise_threshold_count`](#noise_threshold_count): Two possible counts based on a noise map
* **Filter**: whether the feature should spawn based on conditions
  * [`biome`](#biome): Checks the biome
  * [`block_predicate_filter`](#block_predicate_filter): Checks a block predicate
  * [`environment_scan`](#environment_scan): Scans up or down for blocks
  * [`rarity_filter`](#rarity_filter): Simple probability
  * [`surface_relative_threshold_filter`](#surface_relative_threshold_filter): Checks the height relative to the surface
  * [`surface_water_depth_filter`](#surface_water_depth_filter): Checks the depth of the water
* **Transform**: changes the position of the feature in the chunk
  * [`carving_mask`](#carving_mask): Returns all carved out blocks
  * [`count_on_every_layer`](#count_on_every_layer): Count, in-square, and multi-layered heightmap in one
  * [`environment_scan`](#environment_scan): Moves up or down based on block predicates
  * [`height_range`](#height_range): Sets the Y coordinate using a height provider
  * [`heightmap`](#heightmap): Sets the Y coordinate to the surface height
  * [`in_square`](#in_square): Offsets the X and Z coordinates randomly in the chunk
  * [`random_offset`](#random_offset): Applies a random offset

## Modifier types

### `biome`
Returns the current position if the biome at the current position includes this placed feature. Otherwise, returns nothing.

> Note: can only be used in placed features that are directly referenced in a biome!

*This placement modifier has no extra fields.*

### `block_predicate_filter`
Checks for block(s) relative to the current position. If the predicate passes, the current position is returned. Otherwise, returns nothing.

* f`predicate`: The predicate to check
  * f`type`: The predicate type
    * s`all_of`: Contains a list of predicates. All listed predicates must pass for the predicate to pass.
    * s`any_of`: Contains list of predicates. At least one predicate must pass for the predicate to pass.
    * s`has_sturdy_face`: Contains an offset and a direction. Checks if the block in the specified direction provides full support on that face.
    * s`inside_world_bounds`: Contains an offset, with no extra fields.
    * s`matching_block_tag`: Contains a block tag along with a block offset. If the block at the offset matches any block in the block tag, the predicate passes.
    * s`matching_blocks`: Contains a list of blocks along with a block offset. If the block at the offset matches any block in the list, the predicate passes.
    * s`matching_fluids`: Identical to `matching_blocks`, but takes a list of fluids instead.
    * s`not`: Contains another predicate inside of it. If the predicate inside it fails, the `not` predicate passes.
    * s`replaceable`: *Contains no extra fields*
    * s`solid`: *Contains no extra fields*
    * s`true`: Always passes.
    * s`would_survive`: Contains an offset and a block state. If the block at the offset would survive, the predicate passes.

### `carving_mask`
Returns all locations in the current chunk if they have been carved out by any configured carver. Importantly, this does not include noise caves.

* f`step`: Either `air` or `liquid`

### `count`
Returns copies of the current position.

* f`count`: The number of placements at the current block position

### `count_on_every_layer`
Returns block positions on every vertical layer, randomly spread within the chunk. 

* f`count`: The number of placements on each vertical layer

### `environment_scan`
Searches either up or down for a target block condition within the step limit. If a suitable block is found, that position is returned. Otherwise, returns nothing.

* f`direction_of_search`: Direction that the placement modifier searches, either `up` or `down`
* f`max_steps`: The max number of blocks that the placement modifier searches, must be an integer between `1` and `32`
* f`target_condition`: The [block predicate](#block_predicate_filter) a searched block must meet for that block position to be returned
* f`allowed_search_condition`: *(optional)* A [block predicate](#block_predicate_filter) blocks at each step must meet for the scan to continue

### `height_range`
Modifies the vertical coordinate to be within the height range.

* f`height`: The height provider the placements must be contained in

### `heightmap`
Modifiers the vertical coordinate to match the provided heightmap.

* f`heightmap`: The [heightmap type](/guides/heightmap-types/) that placements are placed on

### `in_square`
Randomizes the placement horizontally in the chunk. It does this by adding a random value to both the X and Z coordinates between 0 and 15 (inclusive).

*This placement modifier has no extra fields.*

### `noise_based_count`
Returns copies of the current block position, based on a noise value at the current location. 

Uses a global 2D simplex noise with one octave.

* f`noise_to_count_ratio`: Determines how strongly the noise affects the resulting count
* f`noise_factor`: Stretches the noise on the x-axis and z-axis, higher values lead to more spaced out noise peaks
* f`noise_offset`: *(optional)* Offsets the threshold where features are generated, defaults to 0

### `noise_threshold_count`
Returns copies of the current block position. The number of copies depends on whether or not the noise at the given position is above the `noise_level`. 

Uses a global 2D simplex noise with one octave.

* f`noise_level`: The threshold value, useful range is `-1` to `1`
* f`below_noise`: The count if the noise value is below the f`noise_level`
* f`above_noise`: The count if the noise value is above the f`noise_level`

### `random_offset`
Offsets the current block position on each axis. 
*(While the x-axis and z-axis share a integer provider, they can be assigned different offsets.)*
* f`xz_spread`: The offset on the x-axis and z-axis, any integer between `-16` and `16`
* f`y_spread`: The offset on the y-axis, any integer between `-16` and `16`

### `rarity_filter`
Either returns the current block position or nothing. The chance for the filter to pass is `1 / chance`.

* f`chance`: An integer, must be at least 1

### `surface_relative_threshold_filter`
Checks if the heightmap is within a range, and returns the current position if so. If the check fails, nothing is returned,

* f`heightmap`: The [heightmap type](/guides/heightmap-types) to use provider
* f`min_inclusive`: The minimum vertical coordinate that the heightmap must be in
* f`max_inclusive`: The maximum vertical coordinate that the heightmap must be in

### `surface_water_depth_filter`
Returns the current position if the block's depth in water is not above the provided max water depth. Otherwise returns nothing.

* f`max_water_depth`: The maximum depth in water the feature can be placed in.
