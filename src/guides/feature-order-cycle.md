---
title: How to fix feature order cycles
versions:
  - '1.18'
  - '1.18.2'
  - '1.19'
tags:
  - worldgen
  - biomes
  - features
---

> java.lang.IllegalStateException: Feature order cycle found, involved biomes

Are you getting this frustrating error? Let's look at why it happens and how to prevent it.

## Why does it happen?
Feature order cycles happen when two biomes reference the same [placed feature](/guides/placed-features/) in the same step, but in a different order.

Let's try with an example. We have two biomes here:  
**`data/example/worldgen/biome/forest.json`**
```json
{
  ...
  "features": [
    [],
    [
      "example:blue_tree",
      "example:red_tree",
      "example:rocks",
    ]
  ]
}
```

**`data/example/worldgen/biome/plains.json`**
```json
{
  ...
  "features": [
    [
      "example:blue_tree"
    ],
    [
      "example:rocks",
      "example:blue_tree"
    ]
  ]
}
```

When we try to load these biomes, data pack validation will fail because in the `example:forest` biome in step 2, s`blue_tree` is before s`rocks`; while in the `example:plains` biome, s`rocks` is before s`blue_tree`.

## How to fix it
The rule is that for each step in f`"features"`, all feature IDs need to be ordered consistently across biomes.

The above example can be fixed by swapping the features in step 2 of the `plains` biome:  
**`data/example/worldgen/biome/plains.json`**
```json
{
  ...
  "features": [
    [
      "example:blue_tree"
    ],
    [
      "example:blue_tree",
      "example:rocks"
    ]
  ]
}
```

If your data pack is more complicated, with multiple biomes and lots of features, this will be a harder process. Since 1.18.2, the error will include the conflicting biome IDs.

If you want more detailed errors, a useful mod is [Cyanide](https://www.curseforge.com/minecraft/mc-mods/cyanide-fabric). This will show the exact feature cycle that's causing problems, as well as other worldgen related errors.
