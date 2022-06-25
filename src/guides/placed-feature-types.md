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

[Placed features](/worldgen/placed-feature) are utilized by biomes (and sometimes configured features) in their generation. They use placement modifiers to determine the block(s) where the configured feature will generate.

## Placed features
Placed features are referenced in the feature list of biomes. They may also be referenced in some configured features types, such as in the `vegetation_patch` feature.

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
* f`placement`: The list of placement modifiers, in order. Each has a f`type` field, and depending on the placement modifier, extra field(s) for configuration.

## Placement modifier types

### `biome`
Returns the current position if the biome in the current position includes the placed feature. Otherwise, returns nothing.

*This placement modifier contains no extra fields.*

### `block_predicate_filter`
Checks for block(s) relative to the current position. If the predicate passes, the current position is returned. Otherwise, returns nothing.

* f`predicate`: The predicate that is checked.
  * f`type`: The predicate type.
    * f`all_of`: Contains a list of predicates. All listed predicates must pass for the predicate to pass.
    * f`any_of`: Contains list of predicates. At least one predicate must pass for the predicate to pass.
    * f`has_sturdy_face`: Contains an offset and a direction. Checks if the block in the specified direction provides full support on that face.
    * f`inside_world_bounds`: Contains an offset, with no extra fields.
    * f`matching_block_tag`: Contains a block tag along with a block offset. If the block at the offset matches any block in the block tag, the predicate passes.
    * f`matching_blocks`: Contains a list of blocks along with a block offset. If the block at the offset matches any block in the list, the predicate passes.
    * f`matching_fluids`: Identical to `matching_blocks`, but takes a list of fluids instead.
    * f`not`: Contains another predicate inside of it. If the predicate inside it fails, the `not` predicate passes.
    * f`replaceable`: *Contains no extra fields*
    * f`solid`: *Contains no extra fields*
    * f`true`: Always passes.
    * f`would_survive`: Contains an offset and a block state. If the block at the offset would survive, the predicate passes.

### `carving_mask`
Returns all locations in the current chunk if they have been carved out by any configured carver (Not noise caves)

* f`step`: Either `air` or `liquid`.

### `count`
Returns copies of the current position.

* f`count`: The number of placements at the current block position.

### `count_on_every_layer`
Returns block positions on every vertical layer, randomly spread within the chunk. 

* f`count`: The number of placements on each vertical layer.

### `environment_scan`
Searches either up or down for a target block condition within the step limit. If a suitable block is found, that position is returned. Otherwise, return nothing.

* f`direction_of_search`: Direction that the placement modifier searches. Either `up` or `down`.
* f`max_steps`: The max number of blocks that the placement modifier searches. Number provided is an integer between `1` and `32`.
* f`target_condition`: The predicate a searched block must meet for that block position to be returned. All block predicates are listed in [`block_predicate_filter`](#blockpredicatefilter).
* f`allowed_search_condition`: *(optional)* Predicates each block checked must meet for the scan to continue. All block predicates are listed in [`block_predicate_filter`](#blockpredicatefilter).

### `height_range`
Modifies the vertical coordinate to be within the height range.

* f`height`: The height provider the placements must be contained in.

### `heightmap`
Modifiers the vertical coordinate to match the provided heightmap.

* f`heightmap`: The heightmap that placements are placed on. The list of all heightmaps are in the [heightmap guide](/guides/heightmap-types).

### `in_square`
Randomizes the placements in the chunk.

*This placement modifier contains no extra fields.*

### `noise_based_count`
Returns copies of the current block position, based on a noise value at the current location. 

* f`noise_factor`: Stretches the noise on the x-axis and z-axis. Higher values lead to more spaced out noise peaks
* f`noise_offset`: *(Optional)* Offsets the threshold where features are generated. Default is 0 if not specified.
* f`noise_to_count_ratio`: Multiplier of current block position, if feautres are generated at that position.

### `noise_threshold_count`
Returns copies of the current block position. The number of copies depends on whether or not the noise at the given position is above the `noise_level`. 

*(The noise provider is not configurable, and it is Simplex noise.)*

* f`noise_level`: The threshold where values above it return the count in `above_noise`.
* f`below_noise`: The count provided if the noise value at that position is below the `noise_level`.
* f`above_noise`: The count provided if the noise value at that position is above the `noise_level`.

### `random_offset`
Offsets the current block position on each axis. 
*(While the x-axis and z-axis share a integer provider, they can be assigned different offsets.)*
* f`xz_spread`: The offset on the x-axis and z-axis. Can be any integer between `-16` and `16`.
* f`y_spread`: The offset on the y-axis. Can be any integer between `-16` and `16`.

### `rarity_filter`
Either returns the current block position or nothing. The chance for the current block position to be discarded is 1/`chance`.

* f`chance`: The chance for the block position to not be scrapped.

### `surface_relative_threshold_filter`
Checks if the heightmap is within a range, and returns the current position if so. If the check fails, nothing is returned,

* f`heightmap`: The heightmap provider. The list of all heightmaps are in the [heightmap guide](/guides/heightmap-types).
* f`min_inclusive`: The minimum vertical coordinate that the heightmap must be in.
* f`max_inclusive`: The maximum vertical coordinate that the heightmap must be in.

### `surface_water_depth_filter`
Returns the current position if the block's depth in water is not above the provided max water depth. Otherwise returns nothing.

* f`max_water_depth`: The maximum depth in water the feature can be placed in.
