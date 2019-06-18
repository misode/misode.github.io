
function invalidated() {
  generateStructure();
  $('#source').val(JSON.stringify(table, null, indentation));
}

function generateRange($el, data) {
  if (typeof data === 'object') {
    if (data.type && data.type.match(/(minecraft:)?binomial/)) {
      $el.attr('data-type', 'binomial');
      $el.find('.binomial').removeClass('d-none');
      $el.find('.binomial.n').val(data.n);
      $el.find('.binomial.p').val(data.p);
    } else {
      $el.attr('data-type', 'range');
      $el.find('.range').removeClass('d-none');
      $el.find('.range.min').val(data.min);
      $el.find('.range.max').val(data.max);
    }
  } else {
    $el.attr('data-type', 'exact');
    $el.find('.exact').removeClass('d-none');
    $el.find('.exact').val(data);
  }
}

function generateStructure() {
  $('#structure').html('');

  for (let i = 0; i < table.pools.length; i += 1) {
    let $pool = generatePool(table.pools[i], i);
    $('#structure').append($pool);

    $('#luck-based').attr('checked', luck_based);
  }
}

function generatePool(pool, i) {
  let $pool = $('#poolTemplate').clone();
  $pool.removeAttr('id').attr('data-index', i);

  // Rolls
  if (!pool.rolls) {
    pool.rolls = 1;
  }
  let $rolls = $pool.find('.rolls');
  generateRange($rolls, pool.rolls);

  // Bonus Rolls
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

  for (let j = 0; j < pool.entries.length; j += 1) {
    let $entry = generateEntry(pool.entries[j], j);
    $pool.children('.card-body').append($entry);
  }

  if (pool.conditions) {
    for (let j = 0; j < pool.conditions.length; j += 1) {
      let $condition = generateCondition(pool.conditions[j], j);
      $pool.children('.card-body').append($condition);
    }
  }

  return $pool;
}

function generateEntry(entry, i) {
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
  $entry.find('.entry-weight').removeClass('d-none');
  if (luck_based) {
    $entry.find('.entry-quality').removeClass('d-none');
  } else {
    $entry.find('.entry-quality').addClass('d-none');
  }
  if (entry.weight) {
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
      let $child = generateEntry(entry.children[j], j);
      $child.removeClass('entry').addClass('child');
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
    $function.find('.function-nbt').removeClass('d-none');
    $function.find('.function-nbt input').val(func.tag);
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
    }
    let id = 'treasureCheckbox' + Math.floor(1000000*Math.random());
    $function.find('.function-ench-treasure label').attr('for', id);
    $function.find('.function-ench-treasure input').prop('checked', treasure).attr('id', id);
  } else {
    delete func.levels;
    delete func.treasure;
  }
  if (func.function === 'minecraft:looting_enchant') {
    $function.find('.function-limit').removeClass('d-none');
    $function.find('.function-limit input').val(func.limit);
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

  if (modifier.slots) {
    for (let s of modifier.slots) {
      let item = $modifier.find('.dropdown-item[data-slot="' + s + '"]');
      item.addClass('d-none');
      let html = '<button type="button" class="btn btn-outline-danger bg-light btn-sm mr-2 mt-2" data-slot="' + s + '" onclick="removeModifierSlot(this)">' + item.text() + '</button>';
      $modifier.find('.modifier-slots-list').append(html);
    }
  }

  return $modifier
}

function generateCondition(condition, i) {
  let $condition = $('#conditionTemplate').clone();
  $condition.removeAttr('id').attr('data-index', i);

  $condition.find('.condition-type').val(condition.condition);
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
    }
    let id = 'invertedCheckbox' + Math.floor(1000000*Math.random());
    $condition.find('.condition-killed-inverted').attr('for', id);
    $condition.find('.condition-killed-inverted label').attr('for', id);
    $condition.find('.condition-killed-inverted input').prop('checked', inverted).attr('id', id);
  } else {
    delete condition.inverted;
  }
  if (condition.condition === 'minecraft:entity_properties' || condition.condition === 'minecraft:entity_scores') {
    $condition.find('.condition-entity').removeClass('d-none');
    $condition.find('.condition-entity select').val(condition.entity);
  } else {
    delete condition.entity;
  }
  if (condition.condition === 'minecraft:entity_properties') {
    $condition.find('.condition-predicate').removeClass('d-none');
  } else {
    delete condition.predicate;
  }
  if (condition.condition === 'minecraft:entity_scores') {
    $condition.find('.condition-entity-scores').removeClass('d-none');

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
  } else {
    delete condition.scores;
  }

  return $condition;
}
