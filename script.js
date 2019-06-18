
$("#source").val('');
$('#luckBased').prop('checked', false);
$('#tableType').val("minecraft:generic");
$('#indentationSelect').val("2");
let indentation = 2;
let luck_based = false;
let table = {
  type: "minecraft:generic",
  pools: []
};
addPool();
addEntry($('#structure .pool').get());

function getParent(el) {
  let $parent = $(el).closest('.table, .pool, .entry, .child, .term, .function, .condition, .modifier');
  let index = $parent.attr('data-index');
  if ($parent.hasClass('table')) {
    return table;
  } else if ($parent.hasClass('pool')) {
    return getParent($parent.parent()).pools[index];
  } else if ($parent.hasClass('entry')) {
    return getParent($parent.parent()).entries[index];
  } else if ($parent.hasClass('child')) {
    return getParent($parent.parent()).children[index];
  } else if ($parent.hasClass('term')) {
    return getParent($parent.parent()).term;
  } else if ($parent.hasClass('function')) {
    return getParent($parent.parent()).functions[index];
  } else if ($parent.hasClass('condition')) {
    return getParent($parent.parent()).conditions[index];
  } else if ($parent.hasClass('modifier')) {
    return getParent($parent.parent()).modifiers[index];
  }
}

function getSuperParent(el) {
  let $parent = $(el).closest('.table, .pool, .entry, .child, .term, .function, .condition, .modifier');
  return getParent($parent.parent());
}

function getIndex(el) {
  let $parent = $(el).closest('.table, .pool, .entry, .child, .term, .function, .condition, .modifier');
  return parseInt($parent.attr('data-index'));
}

function addPool(el) {
  table.pools.push({
    rolls: 1,
    entries: []
  });
  invalidated();
}

function removePool(el) {
  let index = getIndex(el);
  getSuperParent(el).pools.splice(index, 1);
  invalidated();
}

function addEntry(el) {
  getParent(el).entries.push({
    type: "minecraft:item",
    name: "minecraft:stone"
  });
  invalidated();
}

function removeEntry(el) {
  let index = getIndex(el);
  getSuperParent(el).entries.splice(index, 1);
  invalidated();
}

function addChild(el) {
  getParent(el).children.push({
    type: "minecraft:item",
    name: "minecraft:stone"
  });
  invalidated();
}

function removeChild(el) {
  let index = getIndex(el);
  getSuperParent(el).children.splice(index, 1);
  invalidated();
}

function addFunction(el) {
  let entry = getParent(el);
  if (!entry.functions) {
    entry.functions = [];
  }
  entry.functions.push({
    function: "minecraft:set_count"
  });
  invalidated();
}

function removeFunction(el) {
  let parent = getSuperParent(el);
  parent.functions.splice(getIndex(el), 1);
  if (parent.functions.length === 0) {
    delete parent.functions;
  }
  invalidated();
}

function addCondition(el) {
  let parent = getParent(el);
  if (!parent.conditions) {
    parent.conditions = [];
  }
  parent.conditions.push({
    condition: "minecraft:random_chance",
    change: 0.5
  });
  invalidated();
}

function removeCondition(el) {
  let parent = getSuperParent(el);
  parent.conditions.splice(getIndex(el), 1);
  if (parent.conditions.length === 0) {
    delete parent.conditions;
  }
  invalidated();
}

function getRangeField($el, type) {
  if (type === 'exact') {
    return parseInt($el.find('.exact').val());
  } else if (type === 'range') {
    let data = {};
    let min = $el.find('.range.min').val();
    let max = $el.find('.range.max').val();
    if (min) data.min = parseInt(min);
    if (max) data.max = parseInt(max);
    return data;
  } else if (type === 'binomial') {
    let data = {type: "minecraft:binomial"};
    let n = $el.find('.binomial.n').val();
    let p = $el.find('.binomial.p').val();
    if (n) data.n = parseInt(n);
    if (p) data.p = parseFloat(p);
    return data;
  }
}

function switchRollsType(el, type) {
  $(el).closest('.rolls').attr('data-type', type);
  updateRollsField(el);
}

function updateRollsField(el) {
  let type = $(el).closest('.rolls').attr('data-type');
  let data = getRangeField($(el).closest('.rolls'), type);
  getParent(el).rolls = data;
  invalidated();
}

function switchBonusRollsType(el, type) {
  $(el).closest('.bonus-rolls').attr('data-type', type);
  updateBonusRollsField(el);
}

function updateBonusRollsField(el) {
  let type = $(el).closest('.bonus-rolls').attr('data-type');
  let data = getRangeField($(el).closest('.bonus-rolls'), type);
  if (type ==='exact' && isNaN(data)) {
    delete getParent(el).bonus_rolls;
  } else {
    getParent(el).bonus_rolls = data;
  }
  invalidated();
}

function updateEntryType(el) {
  let entry = getParent(el);
  entry.type = $(el).val();
  if (entry.type === 'minecraft:dynamic') {
    entry.name = 'minecraft:contents';
  }
  invalidated();
}

function updateEntryName(el) {
  let entry = getParent(el);
  if (entry.type === 'minecraft:dynamic') {
    entry.name = 'minecraft:contents';
  } else {
    entry.name = $(el).val();
  }
  invalidated();
}

function updateEntryWeight(el) {
  let weight = parseInt($(el).val());
  if (isNaN(weight)) {
    delete getParent(el).weight;
  } else {
    getParent(el).weight = weight;
  }
  invalidated();
}

function updateEntryQuality(el) {
  let quality = parseInt($(el).val());
  if (isNaN(quality)) {
    delete getParent(el).quality;
  } else {
    getParent(el).quality = quality;
  }
  invalidated();
}

function updateFunctionType(el) {
  getParent(el).function = $(el).val();
  invalidated();
}

function switchCountType(el, type) {
  $(el).closest('.function-count').attr('data-type', type);
  updateCountField(el);
}

function updateCountField(el) {
  let type = $(el).closest('.function-count').attr('data-type');
  let data = getRangeField($(el).closest('.function-count'), type);
  getParent(el).count = data;
  invalidated();
}

function switchDamageType(el, type) {
  $(el).closest('.function-damage').attr('data-type', type);
  updateCountField(el);
}

function updateDamageField(el) {
  let type = $(el).closest('.function-damage').attr('data-type');
  let data = getRangeField($(el).closest('.function-damage'), type);
  getParent(el).damage = data;
  invalidated();
}

function updateTagField(el) {
  let nbt = $(el).val();
  if (!nbt.startsWith('{')) {
    nbt = '{' + nbt;
  }
  if (!nbt.endsWith('}')) {
    nbt = nbt + '}';
  }
  getParent(el).tag = nbt;
  invalidated();
}

function addEnchantment(el) {
  let func = getParent(el);
  let enchantment = $(el).attr('data-ench');
  if (!func.enchantments) {
    func.enchantments = [];
  }
  func.enchantments.push(enchantment);
  invalidated();
}

function removeEnchantment(el) {
  let func = getParent(el);
  let ench = $(el).attr('data-ench');
  let index = func.enchantments.indexOf(ench);
  if (index > -1) {
    func.enchantments.splice(index, 1);
    if (func.enchantments.length === 0) {
      delete func.enchantments;
    }
    invalidated();
  }
}

function switchLevelsType(el, type) {
  $(el).closest('.function-ench-levels').attr('data-type', type);
  updateLevelsField(el);
}

function updateLevelsField(el) {
  let type = $(el).closest('.function-ench-levels').attr('data-type');
  let data = getRangeField($(el).closest('.function-ench-levels'), type);
  getParent(el).levels = data;
  invalidated();
}

function updateTreasureField(el) {
  let treasure = $(el).prop('checked');
  if (treasure) {
    getParent(el).treasure = true;
  } else {
    delete getParent(el).treasure;
  }
  invalidated();
}

function updateLimitField(el) {
  let limit = parseInt($(el).val());
  if (isNaN(limit)) {
    delete getParent(el).limit;
  } else {
    getParent(el).limit = limit;
  }
  invalidated();
}

function addModifier(el) {
  let func = getParent(el);
  if (!func.modifiers) {
    func.modifiers = [];
  }
  func.modifiers.push({
    attribute: 'generic.attackDamage',
    name: 'Attack Damage',
    amount: 1,
    operation: 'addition',
    slot: []
  });
  invalidated();
}

function removeModifier(el) {
  let index = parseInt($(el).closest('.modifier').attr('data-index'));
  getParent(el).modifiers.splice(index, 1);
  invalidated();
}

function updateModifierAttribute(el) {
  getParent(el).attribute = $(el).val();
  invalidated();
}

function updateModifierName(el) {
  getParent(el).name = $(el).val();
  invalidated();
}

function switchModifierAmountType(el, type) {
  $(el).closest('.modifier-amount').attr('data-type', type);
  updateModifierAmountField(el);
}

function updateModifierAmountField(el) {
  let type = $(el).closest('.modifier-amount').attr('data-type');
  let data = getRangeField($(el).closest('.modifier-amount'), type);
  getParent(el).amount = data;
  invalidated();
}

function updateModifierOperation(el) {
  getParent(el).operation = $(el).val();
  invalidated();
}

function addModifierSlot(el) {
  let modifier = getParent(el);
  if (!modifier.slots) {
    modifier.slots = [];
  }
  modifier.slots.push($(el).attr('data-slot'));
  invalidated();
}

function removeModifierSlot(el) {
  let modifier = getParent(el);
  let slot = $(el).attr('data-slot');
  let index = modifier.slots.indexOf(slot);
  if (index > -1) {
    modifier.slots.splice(index, 1);
    if (modifier.slots.length === 0) {
      delete modifier.slots;
    }
    invalidated();
  }
}

function updateTableType() {
  table.type = $('#tableType').val();
  invalidated();
}

function updateLuckBased() {
  luck_based = $('#luckBased').prop('checked');
  invalidated();
}

function updateSouce() {
  $('#source').removeClass('invalid');
  try {
    table = JSON.parse($('#source').val());
  } catch {
    $('#source').addClass('invalid');
    return;
  }
  invalidated();
}

function updateIndentation(el) {
  if (el.value === 'tab') {
    indentation = '\t';
  } else {
    indentation = parseInt(el.value);
  }
  invalidated();
}

function copySource(el) {
  $('#source').get()[0].select();
  document.execCommand('copy');
}

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

  return $condition;
}
