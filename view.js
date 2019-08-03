
function invalidated() {
  generateStructure();
  $('#source').val(JSON.stringify(table, null, indentation));
}

function preventNewline(e) {
  if (e.which === 13) {
    $(e.target).trigger('change');
    e.preventDefault();
  }
}

function generateRange($el, data) {
  if (typeof data === 'object') {
    if (data.type && data.type.match(/(minecraft:)?binomial/)) {
      $el.find('.binomial').removeClass('d-none');
      $el.find('.binomial.n').val(data.n);
      $el.find('.binomial.p').val(data.p);
    } else {
      $el.find('.range').removeClass('d-none');
      $el.find('.range.min').val(data.min);
      $el.find('.range.max').val(data.max);
    }
  } else {
    $el.find('.exact').removeClass('d-none');
    $el.find('.exact').val(data);
  }
}

function generateRadio($el, data) {
  if (data === true) {
    $el.find('[value="true"]').addClass('active');
  } else if (data === false) {
    $el.find('[value="false"]').addClass('active');
  }
}

function generateStructure() {
  $('#structure').html('');

  if (!table.type) {
    table.type = 'minecraft:empty';
  }
  $('#tableType').val(table.type);

  if (table.pools) {
    for (let i = 0; i < table.pools.length; i += 1) {
      let $pool = generatePool(table.pools[i], i);
      $('#structure').append($pool);

      $('#luck-based').attr('checked', luck_based);
    }
  }
}

function generatePool(pool, i) {
  let $pool = $('#poolTemplate').clone();
  $pool.removeAttr('id').attr('data-index', i);

  if (!pool.rolls) {
    pool.rolls = 1;
  }
  let $rolls = $pool.find('.rolls');
  generateRange($rolls, pool.rolls);

  let $bonus_rolls = $pool.find('.bonus-rolls');
  if (pool.bonus_rolls) {
    luck_based = true;
    generateRange($bonus_rolls, pool.bonus_rolls);
  } else {
    $bonus_rolls.find('.exact').removeClass('d-none');
  }
  if (!luck_based) {
    $pool.find('.bonus-rolls').addClass('d-none');
  }

  if (pool.entries) {
    for (let j = 0; j < pool.entries.length; j += 1) {
      let $entry = generateEntry(pool.entries[j], j, pool.entries.length);
      $pool.children('.card-body').append($entry);
    }
  }

  if (pool.conditions) {
    for (let j = 0; j < pool.conditions.length; j += 1) {
      let $condition = generateCondition(pool.conditions[j], j);
      $pool.children('.card-body').append($condition);
    }
  }

  return $pool;
}

function generateEntry(entry, i, size) {
  let $entry = $('#entryTemplate').clone();
  $entry.removeAttr('id').attr('data-index', i);

  $entry.find('.entry-type').val(entry.type);
  if (entry.type === 'minecraft:item' || entry.type === 'minecraft:tag' || entry.type === 'minecraft:loot_table' || entry.type === 'minecraft:dynamic') {
    $entry.find('.entry-name').removeClass('d-none');
    if (entry.type === 'minecraft:dynamic') {
      entry.name = 'minecraft:contents';
    }
    $entry.find('.entry-name input').val(entry.name);
  }
  if (size > 1) {
    $entry.find('.entry-weight').removeClass('d-none');
  }
  if (luck_based) {
    $entry.find('.entry-quality').removeClass('d-none');
  } else {
    $entry.find('.entry-quality').addClass('d-none');
  }
  if (entry.weight ) {
    $entry.find('.entry-weight input').val(entry.weight);
  }
  if (entry.quality) {
    luck_based = true;
    $entry.find('.entry-quality input').val(entry.quality);
  }
  if (entry.type === 'minecraft:alternatives' || entry.type === 'minecraft:sequence' || entry.type === 'minecraft:group') {
    delete entry.name;
    $entry.find('.entry-children').removeClass('d-none');
  }

  if (entry.children) {
    for (let j = 0; j < entry.children.length; j += 1) {
      let $child = generateEntry(entry.children[j], j, entry.children.length);
      $child.attr('data-field', 'children[]');
      $entry.children('.card-body').append($child);
    }
  }

  if (entry.functions) {
    for (let j = 0; j < entry.functions.length; j += 1) {
      let $function = generateFunction(entry.functions[j], j);
      $entry.children('.card-body').append($function);
    }
  }

  if (entry.conditions) {
    for (let j = 0; j < entry.conditions.length; j += 1) {
      let $condition = generateCondition(entry.conditions[j], j);
      $entry.children('.card-body').append($condition);
    }
  }

  return $entry;
}

function generateFunction(func, i) {
  let $function = $('#functionTemplate').clone();
  $function.removeAttr('id').attr('data-index', i);

  $function.find('.function-type').val(func.function);

  if (func.function === 'minecraft:set_count' || func.function === 'minecraft:looting_enchant') {
    $function.find('.function-count').removeClass('d-none');
    generateRange($function.find('.function-count'), func.count);
  } else {
    delete func.count;
  }

  if (func.function === 'minecraft:set_damage') {
    $function.find('.function-damage').removeClass('d-none');
    generateRange($function.find('.function-damage'), func.damage);
  } else {
    delete func.damage;
  }

  if (func.function === 'minecraft:set_nbt') {
    if (func.tag) {
      if (!func.tag.startsWith('{')) {
        func.tag = '{' + func.tag;
      }
      if (!func.tag.endsWith('}')) {
        func.tag = func.tag + '}';
      }
    }
    $function.find('.function-nbt').removeClass('d-none');
    $function.find('.function-nbt textarea').val(func.tag).keydown(e => preventNewline(e));
  } else {
    delete func.tag;
  }

  if (func.function === 'minecraft:enchant_randomly') {
    $function.find('.function-ench-rand').removeClass('d-none');
    if (func.enchantments) {
      for (let e of func.enchantments) {
        let item = $function.find('.dropdown-item[data-ench="' + e + '"]');
        item.addClass('d-none');
        let html = '<button type="button" class="btn btn-outline-danger bg-light btn-sm mr-2 mt-2" data-ench="' + e + '" onclick="removeEnchantment(this)">' + item.text() + '</button>';
        $function.find('.enchantment-list').append(html);
      }
    }
  } else {
    delete func.enchantments;
  }

  if (func.function === 'minecraft:enchant_with_levels') {
    $function.find('.function-ench-levels').removeClass('d-none');
    generateRange($function.find('.function-ench-levels'), func.levels);
    $function.find('.function-ench-treasure').removeClass('d-none');
    let treasure = false;
    if (func.treasure) {
      treasure = true;
    } else {
      delete func.treasure;
    }
    let id = 'treasureCheckbox' + Math.floor(1000000*Math.random());
    $function.find('.function-ench-treasure label').attr('for', id);
    $function.find('.function-ench-treasure input').prop('checked', treasure).attr('id', id);
  } else {
    delete func.levels;
    delete func.treasure;
  }

  if (func.function === 'minecraft:looting_enchant' || func.function === 'minecraft:limit_count') {
    if (func.function === 'minecraft:looting_enchant') {
      $function.find('.function-limit').removeClass('d-none');
      $function.find('.function-limit input').val(func.limit);
    } else {
      $function.find('.function-limit-range').removeClass('d-none');
      generateRange($function.find('.function-limit-range'), func.limit);
    }
  } else {
    delete func.limit;
  }

  if (func.function === 'minecraft:set_attributes') {
    $function.find('.function-attributes').removeClass('d-none');
    if (func.modifiers) {
      for (let j = 0; j < func.modifiers.length; j += 1) {
        let $modifier = generateModifier(func.modifiers[j], j);
        $function.children('.card-body').append($modifier);
      }
    }
  } else {
    delete func.modifiers;
  }

  if (func.function === 'minecraft:set_name') {
    $function.find('.function-name').removeClass('d-none');
    let value = func.name;
    if (typeof value !== 'string') {
      value = JSON.stringify(value);
    }
    $function.find('.function-name textarea').val(value).keydown(e => preventNewline(e));
  } else {
    delete func.name;
  }

  if (func.function === 'minecraft:set_lore') {
    let lore = "";
    if (func.lore) {
      for (let j = 0; j < func.lore.length; j += 1) {
        let value = func.lore[j];
        if (typeof value !== 'string') {
          value = JSON.stringify(value);
        }
        lore += value;
        if (j < func.lore.length - 1) {
          lore += "\n";
        }
      }
    }

    $function.find('.function-lore').removeClass('d-none');
    $function.find('.function-lore textarea').val(lore);

    if(!func.replace) {
      delete func.replace;
    }

    $function.find('.function-lore-replace').removeClass('d-none');
    $function.find('.function-lore-replace input').prop('checked', func.replace);
  } else {
    delete func.lore;
    delete func.replace;
  }

  if (func.function === 'minecraft:copy_name' || func.function === 'minecraft:copy_nbt') {
    if (func.function === 'minecraft:copy_name') {
      func.source = 'block_entity';
    }
    if (!func.source) {
      func.source = 'this';
    }
    $function.find('.function-source').removeClass('d-none');
    $function.find('.function-source select').val(func.source);
  } else {
    delete func.source;
  }

  if (func.function === 'minecraft:set_name' || func.function === 'minecraft:fill_player_head') {
    if (!func.entity) {
      func.entity = 'this';
    }
    $function.find('.function-entity').removeClass('d-none');
    $function.find('.function-entity select').val(func.entity);
  } else {
    delete func.entity;
  }

  if (func.function === 'minecraft:set_contents') {
    $function.find('.function-entries').removeClass('d-none');
  } else {
    delete func.entries;
  }

  if (func.function === 'minecraft:copy_nbt') {
    $function.find('.function-operations').removeClass('d-none');
  } else {
    delete func.ops;
  }

  if (func.function === 'minecraft:apply_bonus') {
    $function.find('.function-enchantment').removeClass('d-none');
    $function.find('.function-enchantment input').val(func.enchantment);
  } else {
    delete func.enchantment;
  }

  if (func.function === 'minecraft:apply_bonus') {
    if (!func.formula) {
      func.formula = 'minecraft:uniform_bonus_count';
    }
    $function.find('.function-formula').removeClass('d-none');
    $function.find('.function-formula select').val(func.formula);

    if (!func.parameters){
      func.parameters = {};
    }
    if (func.formula === 'minecraft:uniform_bonus_count') {
      if (!func.parameters.bonusMultiplier) {
        func.parameters.bonusMultiplier = 1;
      }
      delete func.parameters.extra;
      delete func.parameters.probability;
      $function.find('.function-bonus-multiplier').removeClass('d-none');
      $function.find('.function-bonus-multiplier input').val(func.parameters.bonusMultiplier);
    } else if (func.formula === 'minecraft:binomial_with_bonus_count') {
      if (!func.parameters.extra) {
        func.parameters.extra = 0;
      }
      if (!func.parameters.probability) {
        func.parameters.probability = 0.5;
      }
      delete func.parameters.multiplier;
      $function.find('.function-bonus-extra').removeClass('d-none');
      $function.find('.function-bonus-extra input').val(func.parameters.extra);
      $function.find('.function-bonus-probability').removeClass('d-none');
      $function.find('.function-bonus-probability input').val(func.parameters.probability);
    } else {
      delete func.parameters;
    }
  } else {
    delete func.formula;
  }

  if (func.ops) {
    for (let j = 0; j < func.ops.length; j += 1) {
      let $operation = generateOperation(func.ops[j], j);
      $function.children('.card-body').append($operation);
    }
  }

  if (func.entries) {
    for (let j = 0; j < func.entries.length; j += 1) {
      let $entry = generateEntry(func.entries[j], j, func.entries.length);
      $function.children('.card-body').append($entry);
    }
  }

  if (func.conditions) {
    for (let j = 0; j < func.conditions.length; j += 1) {
      let $condition = generateCondition(func.conditions[j], j);
      $function.children('.card-body').append($condition);
    }
  }

  return $function;
}

function generateModifier(modifier, i) {
  let $modifier = $('#modifierTemplate').clone();
  $modifier.removeAttr('id').attr('data-index', i);

  $modifier.find('.modifier-attribute').val(modifier.attribute);
  $modifier.find('.modifier-name').val(modifier.name);
  generateRange($modifier.find('.modifier-amount'), modifier.amount);
  $modifier.find('.modifier-operation').val(modifier.operation);

  if (modifier.slot) {
    for (let s of modifier.slot) {
      let item = $modifier.find('.dropdown-item[data-slot="' + s + '"]');
      item.addClass('d-none');
      let html = '<button type="button" class="btn btn-outline-danger bg-light btn-sm mr-2 mt-2" data-slot="' + s + '" onclick="removeModifierSlot(this)">' + item.text() + '</button>';
      $modifier.find('.modifier-slots-list').append(html);
    }
  }

  return $modifier
}

function generateOperation(operation, i) {
  let $operation = $('#operationTemplate').clone();
  $operation.removeAttr('id').attr('data-index', i);

  $operation.find('.operation-source').val(operation.source);
  $operation.find('.operation-target').val(operation.target);

  $operation.find('.operation-type').val(operation.op);

  return $operation
}

function generateCondition(condition, i) {
  let $condition = $('#conditionTemplate').clone();
  $condition.removeAttr('id').attr('data-index', i);

  $condition.find('.condition-type').val(condition.condition);

  if (table.type === 'minecraft:generic') {
    $condition.find('option[value="minecraft:block_state_propery"]').addClass('d-none');
    $condition.find('option[value="minecraft:match_tool"]').addClass('d-none');
    $condition.find('option[value="minecraft:damage_source_properties"]').addClass('d-none');
    $condition.find('option[value="minecraft:survives_explosion"]').addClass('d-none');
    $condition.find('option[value="minecraft:table_bonus"]').addClass('d-none');
  } else if (table.type === 'minecraft:block') {
    $condition.find('option[value="minecraft:damage_source_properties"]').addClass('d-none');
  } else if (table.type === 'minecraft:fishing') {
    $condition.find('option[value="minecraft:block_state_propery"]').addClass('d-none');
    $condition.find('option[value="minecraft:damage_source_properties"]').addClass('d-none');
    $condition.find('option[value="minecraft:survives_explosion"]').addClass('d-none');
    $condition.find('option[value="minecraft:table_bonus"]').addClass('d-none');
  } else if (table.type === 'minecraft:entity') {
    $condition.find('option[value="minecraft:block_state_propery"]').addClass('d-none');
    $condition.find('option[value="minecraft:survives_explosion"]').addClass('d-none');
    $condition.find('option[value="minecraft:table_bonus"]').addClass('d-none');
    $condition.find('option[value="minecraft:match_tool"]').addClass('d-none');
  } else if (table.type === 'minecraft:chest') {
    $condition.find('option[value="minecraft:block_state_propery"]').addClass('d-none');
    $condition.find('option[value="minecraft:damage_source_properties"]').addClass('d-none');
    $condition.find('option[value="minecraft:survives_explosion"]').addClass('d-none');
    $condition.find('option[value="minecraft:table_bonus"]').addClass('d-none');
    $condition.find('option[value="minecraft:match_tool"]').addClass('d-none');
  }

  if (condition.condition === 'minecraft:random_chance' || condition.condition === 'minecraft:random_chance_with_looting') {
    $condition.find('.condition-chance').removeClass('d-none');
    $condition.find('.condition-chance input').val(condition.chance);
  } else {
    delete condition.chance;
  }

  if (condition.condition === 'minecraft:random_chance_with_looting') {
    $condition.find('.condition-looting-multiplier').removeClass('d-none');
    $condition.find('.condition-looting-multiplier input').val(condition.looting_multiplier);
  } else {
    delete condition.looting_multiplier;
  }

  if (condition.condition === 'minecraft:killed_by_player') {
    $condition.find('.condition-killed-inverted').removeClass('d-none');
    let inverted = false;
    if (condition.inverted) {
      inverted = true;
    } else {
      delete condition.inverted;
    }
    let id = 'invertedCheckbox' + Math.floor(1000000*Math.random());
    $condition.find('.condition-killed-inverted').attr('for', id);
    $condition.find('.condition-killed-inverted label').attr('for', id);
    $condition.find('.condition-killed-inverted input').prop('checked', inverted).attr('id', id);
  } else {
    delete condition.inverted;
  }

  if (condition.condition === 'minecraft:entity_properties' || condition.condition === 'minecraft:entity_scores') {
    if (!condition.entity) {
      condition.entity = 'this';
    }
    $condition.find('.condition-entity').removeClass('d-none');
    $condition.find('.condition-entity select').val(condition.entity);
  } else {
    delete condition.entity;
  }

  if (condition.condition === 'minecraft:block_state_propery') {
    $condition.find('.condition-block').removeClass('d-none');
    $condition.find('.condition-block input').val(condition.block);
    $condition.find('.condition-block-properties').removeClass('d-none');
  } else {
    delete condition.block;
    delete condition.properties;
  }

  if (condition.condition === 'minecraft:entity_properties' || condition.condition === 'minecraft:location_check' || condition.condition === 'minecraft:match_tool' || condition.condition === 'minecraft:damage_source_properties') {

    if(!condition.predicate) {
      condition.predicate = {};
    }

    if (condition.condition === 'minecraft:entity_properties') {
      let $entity = generateEntity(condition.predicate);
      $condition.children('.card-body').append($entity);
    } else {
      delete condition.predicate.entity;
      delete condition.predicate.location;
    }

    if (condition.condition === 'minecraft:location_check') {
      let $location = generateLocation(condition.predicate);
      $condition.children('.card-body').append($location);
      if (condition.predicate) {
        delete condition.nbt;
      }
    } else {
      if (condition.predicate) {
        delete condition.predicate.biome;
        delete condition.predicate.feature;
        delete condition.predicate.position;
        delete condition.predicate.dimension;
      }
    }

    if (condition.condition === 'minecraft:damage_source_properties') {
      let $damage = generateDamage(condition.predicate);
      $condition.children('.card-body').append($damage);
      if (condition.predicate) {
        delete condition.nbt;
      }
    }

    if (condition.condition === 'minecraft:match_tool') {
      let $item = generateItem(condition.predicate);
      $condition.children('.card-body').append($item);
    }

  } else {
    delete condition.predicate;
  }

  if (condition.condition === 'minecraft:entity_scores') {
    $condition.find('.condition-entity-scores').removeClass('d-none');
  } else {
    delete condition.scores;
  }

  if (condition.condition === 'minecraft:alternative') {
    $condition.find('.condition-terms').removeClass('d-none');
  } else {
    delete condition.terms;
  }

  if (condition.condition === 'minecraft:inverted') {
    if (!condition.term) {
      condition.term = {
        condition: "minecraft:random_chance",
        chance: 0.5
      };
    }
  } else {
    delete condition.term;
  }

  if (condition.condition === 'minecraft:weather_check') {
    $condition.find('.condition-raining').removeClass('d-none');
    $condition.find('.condition-thundering').removeClass('d-none');
    generateRadio($condition.find('.condition-raining'), condition.raining);
    generateRadio($condition.find('.condition-thundering'), condition.thundering);
  } else {
    delete condition.raining;
    delete condition.thundering;
  }

  if (condition.condition === 'minecraft:table_bonus') {
    $condition.find('.condition-enchantment').removeClass('d-none');
    $condition.find('.condition-enchantment input').val(condition.enchantment);

    let chances = JSON.stringify(condition.chances);
    if (chances) {
      chances = chances.split(',').join(', ').slice(1, -1);
    }
    $condition.find('.condition-chances').removeClass('d-none');
    $condition.find('.condition-chances input').val(chances);

    if (condition.enchantment === '') {
      delete condition.enchantment;
    }
  } else {
    delete condition.enchantment;
    delete condition.chances;
  }

  if (condition.scores) {
    $condition.find('.scores-list').removeClass('d-none');
    for (let objective in condition.scores) {
      let score = condition.scores[objective];
      delete score.type;
      let $score = $('#scoreTemplate').clone();
      $score.removeAttr('id').attr('data-objective', objective);
      $score.find('.objective').text(objective);
      generateRange($score, score);

      $condition.find('.scores-list').append($score);
    }
  }

  if (condition.properties) {
    $condition.find('.property-list').removeClass('d-none');
    for (let blockstate in condition.properties) {
      let $property = $('#blockPropertyTemplate').clone();
      $property.removeAttr('id').attr('data-blockstate', blockstate);
      $property.find('input').val(condition.properties[blockstate]);
      $property.find('.blockstate').text(blockstate);

      $condition.find('.property-list').append($property);
    }
  }

  if (condition.term) {
    let $term = generateCondition(condition.term, 0);
    $term.attr('data-field', 'term');
    $term.find('.card-header').remove();
    $condition.children('.card-body').append($term);
  }

  if (condition.terms) {
    for (let j = 0; j < condition.terms.length; j += 1) {
      let $term = generateCondition(condition.terms[j], j);
      $term.attr('data-field', 'terms[]');
      $condition.children('.card-body').append($term);
    }
  }

  return $condition;
}

function generateLocation(location) {
  let $location = $('#locationTemplate').clone().removeAttr('id').addClass('predicate');
  if (!location) {
    location = {};
  }

  if (location.position) {
    $location.find('.position-collapse').removeClass('d-none');
    if (location.position.x) {
      $location.find('.position-x .min').val(location.position.x.min);
      $location.find('.position-x .max').val(location.position.x.max);
      if ($.isEmptyObject(location.position.x)) {
        delete location.position.x;
      }
    }
    if (location.position.y) {
      $location.find('.position-y .min').val(location.position.y.min);
      $location.find('.position-y .max').val(location.position.y.max);
      if ($.isEmptyObject(location.position.y)) {
        delete location.position.y;
      }
    }
    if (location.position.z) {
      $location.find('.position-z .min').val(location.position.z.min);
      $location.find('.position-z .max').val(location.position.z.max);
      if ($.isEmptyObject(location.position.z)) {
        delete location.position.z;
      }
    }
  }

  $location.find('.biome').val(location.biome);
  $location.find('.feature').val(location.feature);
  $location.find('.dimension').val(location.dimension);
  if (location.biome === '') {
    delete location.biome;
  }
  if (location.feature === '') {
    delete location.feature;
  }
  if (location.dimension === '') {
    delete location.dimension;
  }

  return $location;
}

function generateEntity(entity) {
  let $entity = $('#entityTemplate').clone().removeAttr('id').addClass('predicate');
  if (!entity) {
    entity = {};
  }
  if (entity.location) {
    let $location = generateLocation(entity.location);
    $location.attr('data-field', 'location');
    $entity.children('.card-body').append($location);
  }
  if (entity.nbt) {
    if (!entity.nbt.startsWith('{')) {
      entity.nbt = '{' + entity.nbt;
    }
    if (!entity.nbt.endsWith('}')) {
      entity.nbt = entity.nbt + '}';
    }
  }
  $entity.find('.type').val(entity.type);
  $entity.find('.nbt').val(entity.nbt).keydown(e => preventNewline(e));
  if (entity.type === '') {
    delete entity.type;
  }
  if (entity.nbt === '') {
    delete entity.nbt;
  }

  return $entity;
}

function generateItem(item) {
  let $item = $('#itemTemplate').clone().removeAttr('id').addClass('predicate');
  if (!item) {
    item = {};
  }
  if (item.nbt) {
    if (!item.nbt.startsWith('{')) {
      item.nbt = '{' + item.nbt;
    }
    if (!item.nbt.endsWith('}')) {
      item.nbt = item.nbt + '}';
    }
  }

  if (item.tag) {
    $item.find('.tag').removeClass('d-none').val(item.tag);
  } else {
    $item.find('.name').removeClass('d-none').val(item.name);
  }
  generateRange($item.find('.item-count'), item.count);
  generateRange($item.find('.item-durability'), item.durability);
  $item.find('.nbt').val(item.nbt).keydown(e => preventNewline(e));
  $item.find('.potion').val(item.potion);
  if (item.name === '') {
    delete item.name;
  }
  if (item.tag === '') {
    delete item.tag;
  }
  if (item.nbt === '') {
    delete item.nbt;
  }
  if (item.nbt === '') {
    delete item.nbt;
  }

  if (item.enchantments) {
    for (let j = 0; j < item.enchantments.length; j += 1) {
      let $enchantment = generateEnchantment(item.enchantments[j], j);
      $item.children('.card-body').append($enchantment);
    }
  }

  return $item;
}

function generateDamage(damage) {
  let $damage = $('#damageTemplate').clone().removeAttr('id');
  if (!damage) {
    damage = {};
  }
  if (damage.type) {
    $damage.find('.damage-flag').removeClass('d-none');
    generateRadio($damage.find('.damage-projectile'), damage.type.is_projectile);
    generateRadio($damage.find('.damage-explosion'), damage.type.is_explosion);
    generateRadio($damage.find('.damage-fire'), damage.type.is_fire);
    generateRadio($damage.find('.damage-magic'), damage.type.is_magic);
    generateRadio($damage.find('.damage-lightning'), damage.is_lightning);
    generateRadio($damage.find('.damage-starvation'), damage.type.bypasses_magic);
    generateRadio($damage.find('.damage-void'), damage.type.bypasses_invulnerability);
    generateRadio($damage.find('.damage-armor'), damage.type.bypasses_armor);
  }

  if (damage.source_entity) {
    let $entity = generateEntity(damage.source_entity);
    $entity.attr('data-field', 'source_entity');
    $damage.find('.source-entity').append($entity);
  }
  if (damage.direct_entity) {
    let $entity = generateEntity(damage.direct_entity);
    $entity.attr('data-field', 'direct_entity');
    $damage.find('.direct-entity').append($entity);
  }

  if (typeof damage.dealt !== 'object' && isNaN(damage.dealt)) {
    delete damage.dealt;
  }
  if (typeof damage.dealt !== 'object' && isNaN(damage.taken)) {
    delete damage.taken;
  }
  generateRange($damage.find('.damage-dealt'), damage.dealt);
  generateRange($damage.find('.damage-taken'), damage.taken);

  generateRadio($damage.find('.damage-blocked'), damage.blocked);

  return $damage;
}

function generateEnchantment(enchantment, i) {
  let $enchantment = $('#enchantmentTemplate').clone();
  $enchantment.removeAttr('id').attr('data-index', i);

  $enchantment.find('.enchantment-id').val(enchantment.enchantment);
  generateRange($enchantment.find('.enchantment-levels'), enchantment.levels);

  return $enchantment;
}
