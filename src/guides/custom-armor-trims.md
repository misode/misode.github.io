---
title: Trim patterns and materials
versions:
  - '1.19.4'
---

The 23w04a snapshot added armor trims which can be used to customise the texture of items.

The complete data packs and resource packs of these examples can be found in the [trim-examples repository](https://github.com/misode/trim-examples).

> **For trim patterns and materials to work you need to enable the `update_1_20` experimental data pack!**

## Adding a custom trim pattern
In this example we're going to add a new "Stripes" pattern that works with all the vanilla armor types and colors.

![stripes_trim_pattern](https://user-images.githubusercontent.com/17352009/214461348-68abfe9b-554c-4615-97d6-06df2de28c48.png)

### Data pack part
Let's start with the central file in the `trim_pattern` folder in the data pack.

> **Changes to this file won't be applied when running `/reload`. Always leave the world and rejoin to apply the new changes!**

**`data/example/trim_pattern/stripes.json`**
```json
{
  "asset_id": "example:stripes",
  "description": {
    "translate": "trim_pattern.example.stripes"
  },
  "template_item": "minecraft:stick"
}
```
* f`asset_id`: A resource location which will be used in the resource pack.
* f`description`: A text component shown in the item tooltip.
* f`template_item`: The item representing this pattern.

The second and final piece required in the data pack is the recipe.

**`data/example/recipes/stripes_armor_trim.json`**
```json
{
  "type": "minecraft:smithing_trim",
  "addition": {
    "tag": "minecraft:trim_materials"
  },
  "base": {
    "tag": "minecraft:trimmable_armor"
  },
  "template": {
    "item": "minecraft:stick"
  }
}
```

### Resource pack part
We'll quickly add a language file used by the item tooltip:

**`assets/example/lang/en_us.json`**
```json
{
  "trim_pattern.example.stripes": "Stripes Armor Trim"
}
```

And now for the complicated bit: adding the texture permutations for the different colors and armor types. This is done by appending the `minecraft:armor_trims` atlas file.

**`assets/minecraft/atlases/armor_trims.json`**
```json
{
  "sources": [
    {
      "type": "paletted_permutations",
      "textures": [
        "example:trims/models/armor/stripes",
        "example:trims/models/armor/stripes_leggings"
      ],
      "palette_key": "trims/color_palettes/trim_palette",
      "permutations": {
        "quartz": "trims/color_palettes/quartz",
        "iron": "trims/color_palettes/iron",
        "gold": "trims/color_palettes/gold",
        "diamond": "trims/color_palettes/diamond",
        "netherite": "trims/color_palettes/netherite",
        "redstone": "trims/color_palettes/redstone",
        "copper": "trims/color_palettes/copper",
        "emerald": "trims/color_palettes/emerald",
        "lapis": "trims/color_palettes/lapis",
        "amethyst": "trims/color_palettes/amethyst"
      }
    }
  ]
}
```
* f`sources`: The list of sprite sources that will be merged with the vanilla atlas.
  * f`type`: We use the s`paletted_permutations` type here.
  * f`textures`: A list of grayscale trim pattern textures that we want to generate permutations of with the colors defined below.
  * f`palette_key`: The same trim palette key as vanilla.
  * f`permutations`: The same color palettes as vanilla.

It's important to use the same format in the f`textures` list. When rendering armor, the game will use the f`asset_id` from the data pack and insert s`trims/models/armor/` to look for the texture.

The remaining two files are the texture files we specified in the atlas. You can download them here and put them in **`assets/example/textures/trims/models/armor/`**.
* [`stripes_leggings.png`](https://github.com/misode/trim-examples/raw/main/custom_trim_pattern/custom_trim_pattern_rp/assets/example/textures/trims/models/armor/stripes_leggings.png)
* [`stripes.png`](https://github.com/misode/trim-examples/raw/main/custom_trim_pattern/custom_trim_pattern_rp/assets/example/textures/trims/models/armor/stripes.png)

## Adding a custom trim material
In this second example we're adding a new "Ender" material that works with all the vanilla armor types and colors.

![ender_trim_material](https://user-images.githubusercontent.com/17352009/214466110-f779a329-aa56-485a-bb32-7b28fda51f5f.png)

### Data pack part
Let's start now with the `trim_material`.

**`data/example/trim_material/ender.json`**
```json
{
  "asset_name": "ender",
  "description": {
    "color": "#258474",
    "translate": "trim_material.example.ender"
  },
  "ingredient": "minecraft:ender_pearl",
  "item_model_index": 0.85
}
```
* f`asset_name`: A string which will be used in the resource pack.
* f`description`: A text component shown in the item tooltip.
* f`ingredient`: The item used in the smithing table for this material.
* f`item_model_index`: A "random" number that we will reference in the predicates of the item models.
* f`incompatible_armor_material` (optional): If this material is incompatible with an armor material. Possible values: `leather`, `chainmail`, `iron`, `gold`, `diamond`, `turtle`, or `netherite`.

We need to add the ender pearl to the `#minecraft:trim_materials` item tag. This makes our material usable in the smithing recipes.

**`data/minecraft/tags/items/trim_materials.json`**
```json
{
  "values": [
    "minecraft:ender_pearl"
  ]
}
```

### Resource pack part
Now to finish off with the resource pack. Let's quickly add a language file used by the item tooltip:

**`assets/example/lang/en_us.json`**
```json
{
  "trim_material.example.ender": "Ender Material"
}
```

For trim materials, we need to append two atlas files: one for the armor entity rendering and one for the inventory item models.

**`assets/minecraft/atlases/armor_trims.json`**
```json
{
  "sources": [
    {
      "type": "paletted_permutations",
      "textures": [
        "trims/models/armor/coast",
        "trims/models/armor/coast_leggings",
        "trims/models/armor/sentry",
        "trims/models/armor/sentry_leggings",
        "trims/models/armor/dune",
        "trims/models/armor/dune_leggings",
        "trims/models/armor/wild",
        "trims/models/armor/wild_leggings",
        "trims/models/armor/ward",
        "trims/models/armor/ward_leggings",
        "trims/models/armor/eye",
        "trims/models/armor/eye_leggings",
        "trims/models/armor/vex",
        "trims/models/armor/vex_leggings",
        "trims/models/armor/tide",
        "trims/models/armor/tide_leggings",
        "trims/models/armor/snout",
        "trims/models/armor/snout_leggings",
        "trims/models/armor/rib",
        "trims/models/armor/rib_leggings",
        "trims/models/armor/spire",
        "trims/models/armor/spire_leggings"
      ],
      "palette_key": "trims/color_palettes/trim_palette",
      "permutations": {
        "ender": "example:trims/color_palettes/ender"
      }
    }
  ]
}
```
**`assets/minecraft/atlases/blocks.json`**
```json
{
  "sources": [
    {
      "type": "paletted_permutations",
      "textures": [
        "trims/items/leggings_trim",
        "trims/items/chestplate_trim",
        "trims/items/helmet_trim",
        "trims/items/boots_trim"
      ],
      "palette_key": "trims/color_palettes/trim_palette",
      "permutations": {
        "ender": "example:trims/color_palettes/ender"
      }
    }
  ]
}
```
* f`sources`: The list of sprite sources that will be merged with the vanilla atlas.
  * f`type`: We use the s`paletted_permutations` type here.
  * f`textures`: The same list of textures as vanilla.
  * f`palette_key`: The same trim palette key as vanilla.
  * f`permutations`: Our custom materials that we want to add permutations for. Our key f`ender` should match what we had for f`asset_name` in the data pack.

These atlas files reference a color palette which we need to create. Since we use the vanilla palette key, the image has a width of 8 and a height of 1. You can download it here: [`ender.png`](https://github.com/misode/trim-examples/raw/main/custom_trim_material/custom_trim_material_rp/assets/example/textures/trims/color_palettes/ender.png). Put it in **`assets/example/textures/trims/color_palettes/ender.png`**.

*(Don't save the image below, which has been scaled up)*  
![ender_color_palette](https://user-images.githubusercontent.com/17352009/214469452-f1d0d033-8597-4ead-b929-3061607ece52.png)

Finally, the most time consuming step is to add the item model predicate to all the possible items. In this example I only added it for the iron chestplate.

**`assets/minecraft/models/item/iron_chestplate.json`**
```json
{
  "parent": "minecraft:item/generated",
  "overrides": [
    {
      "model": "minecraft:item/iron_chestplate_quartz_trim",
      "predicate": {
        "trim_type": 0.1
      }
    },
    {
      "model": "minecraft:item/iron_chestplate_netherite_trim",
      "predicate": {
        "trim_type": 0.3
      }
    },
    {
      "model": "minecraft:item/iron_chestplate_redstone_trim",
      "predicate": {
        "trim_type": 0.4
      }
    },
    {
      "model": "minecraft:item/iron_chestplate_copper_trim",
      "predicate": {
        "trim_type": 0.5
      }
    },
    {
      "model": "minecraft:item/iron_chestplate_gold_trim",
      "predicate": {
        "trim_type": 0.6
      }
    },
    {
      "model": "minecraft:item/iron_chestplate_emerald_trim",
      "predicate": {
        "trim_type": 0.7
      }
    },
    {
      "model": "minecraft:item/iron_chestplate_diamond_trim",
      "predicate": {
        "trim_type": 0.8
      }
    },
    {
      "model": "example:item/iron_chestplate_ender_trim",
      "predicate": {
        "trim_type": 0.85
      }
    },
    {
      "model": "minecraft:item/iron_chestplate_lapis_trim",
      "predicate": {
        "trim_type": 0.9
      }
    },
    {
      "model": "minecraft:item/iron_chestplate_amethyst_trim",
      "predicate": {
        "trim_type": 1.0
      }
    }
  ],
  "textures": {
    "layer0": "minecraft:item/iron_chestplate"
  }
}
```
This is mostly the vanilla iron chestplate item model, but we added an override with the j`"trim_type": 0.85` predicate for our custom material. The order is important here!

This references another item model file, which we need to create.

**`assets/example/models/item/iron_chestplate_ender_trim.json`**
```json
{
  "parent": "minecraft:item/generated",
  "textures": {
    "layer0": "minecraft:item/iron_chestplate",
    "layer1": "minecraft:trims/items/chestplate_trim_ender"
  }
}
```
This item model references the s`trims/items/chestplate_trim_ender` sprite that was generated in the `blocks.json` atlas.

Since we haven't added the override for all the other armor types, they will default to the previous f`trim_type`, in our case n`0.8`, which is diamonds.

## Adding a custom trimmable item
In this example we're going to add the `iron_axe` as a trimmable item. Since this is not an armor item, we only need to worry about the item model. The trim pattern used will have no effect on the texture, only the trim material can be used in the model overrides.

![trimmable_axe_item](https://user-images.githubusercontent.com/17352009/214481089-dcaa5eee-77f5-4ad7-a35f-3cb5fb9b7565.png)

### Data pack part
The only change in the data pack is adding the item to the `#minecraft:trimmable_armor` item tag.

**`data/minecraft/tags/items/trimmable_armor.json`**
```json
{
  "values": [
    "minecraft:iron_axe"
  ]
}
```

### Resource pack part
We start in the resource pack by customizing the iron axe item model.

**`assets/minecraft/models/item/iron_axe.json`**
```json
{
  "parent": "minecraft:item/generated",
  "overrides": [
    {
      "model": "example:item/iron_axe_quartz_trim",
      "predicate": {
        "trim_type": 0.1
      }
    },
    {
      "model": "example:item/iron_axe_netherite_trim",
      "predicate": {
        "trim_type": 0.3
      }
    },
    {
      "model": "example:item/iron_axe_redstone_trim",
      "predicate": {
        "trim_type": 0.4
      }
    },
    {
      "model": "example:item/iron_axe_copper_trim",
      "predicate": {
        "trim_type": 0.5
      }
    },
    {
      "model": "example:item/iron_axe_gold_trim",
      "predicate": {
        "trim_type": 0.6
      }
    },
    {
      "model": "example:item/iron_axe_emerald_trim",
      "predicate": {
        "trim_type": 0.7
      }
    },
    {
      "model": "example:item/iron_axe_diamond_trim",
      "predicate": {
        "trim_type": 0.8
      }
    },
    {
      "model": "example:item/iron_axe_lapis_trim",
      "predicate": {
        "trim_type": 0.9
      }
    },
    {
      "model": "example:item/iron_axe_amethyst_trim",
      "predicate": {
        "trim_type": 1.0
      }
    }
  ],
  "textures": {
    "layer0": "minecraft:item/iron_axe"
  }
}
```
This lists all the vanilla trim materials and overrides the model with our custom item models. Each of those looks like this:

**`assets/example/models/item/iron_axe_amethyst_trim.json`**
```json
{
  "parent": "minecraft:item/handheld",
  "textures": {
    "layer0": "minecraft:item/iron_axe",
    "layer1": "example:trims/items/axe_trim_amethyst"
  }
}
```

> **Create this file for each of the 10 materials!**

The above item models reference an `axe_trim_amethyst` texture. To make this work we need to add these permutations for the axe to the `blocks.json` atlas.

**`assets/minecraft/atlases/blocks.json`**
```json
{
  "sources": [
    {
      "type": "paletted_permutations",
      "textures": [
        "example:trims/items/axe_trim"
      ],
      "palette_key": "trims/color_palettes/trim_palette",
      "permutations": {
        "quartz": "trims/color_palettes/quartz",
        "iron": "trims/color_palettes/iron",
        "gold": "trims/color_palettes/gold",
        "diamond": "trims/color_palettes/diamond",
        "netherite": "trims/color_palettes/netherite",
        "redstone": "trims/color_palettes/redstone",
        "copper": "trims/color_palettes/copper",
        "emerald": "trims/color_palettes/emerald",
        "lapis": "trims/color_palettes/lapis",
        "amethyst": "trims/color_palettes/amethyst"
      }
    }
  ]
}
```
This references the s`axe_trim` texture, which is a mask for which pixels to color with the color palette. You can download this texture here: [`axe_trim.png`](https://raw.githubusercontent.com/misode/trim-examples/main/custom_trimmable_item/custom_trimmable_item_rp/assets/example/textures/trims/items/axe_trim.png). Put it in **`assets/example/textures/trims/items/axe_trim.png`**.

## Download
A reminder that the complete data packs and resource packs of these examples can be found in the [trim-examples repository](https://github.com/misode/trim-examples).
