
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
  let $parent = $(el).closest('.table, .pool, .entry, .child, .term, .function, .condition, .modifier .score');
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
    chance: 0.5
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
  updateDamageField(el);
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

function updateConditionType(el) {
  let condition = $(el).val();
  let $condition = getParent(el);
  if (condition === 'minecraft:random_chance_with_looting') {
    $condition.looting_multiplier = 1;
  } else if (condition === 'minecraft:entity_properties' || condition === 'minecraft:entity_scores'){
    $condition.entity = 'this';
  }
  $condition.condition = condition;
  invalidated();
}

function updateConditionChance(el) {
  let chance = parseFloat($(el).val());
  if (isNaN(chance)) {
    delete getParent(el).chance;
  } else {
    getParent(el).chance = chance;
  }
  invalidated();
}

function updateConditionLootingMultiplier(el) {
  let multiplier = parseFloat($(el).val());
  if (isNaN(multiplier)) {
    multiplier = 1;
  }
  getParent(el).looting_multiplier = multiplier;
  invalidated();
}

function updateInvertedField(el) {
  let inverted = $(el).prop('checked');
  if (inverted) {
    getParent(el).inverted = true;
  } else {
    delete getParent(el).inverted;
  }
  invalidated();
}

function updateConditionEntity(el) {
  getParent(el).entity = $(el).val();
  invalidated();
}

function addScore(el) {
  let condition = getParent(el);
  let objective = $(el).closest('.condition-entity-scores').find('input').val();
  if (!condition.scores) {
    condition.scores = {};
  }
  condition.scores[objective] = 1;
  invalidated();
}

function removeScore(el) {
  let objective = $(el).closest('.score').attr('data-objective');
  delete getParent(el).scores[objective];
  invalidated();
}

function switchConditionScoreType(el, type) {
  $(el).closest('.score').attr('data-type', type);
  updateConditionScoreField(el);
}

function updateConditionScoreField(el) {
  let type = $(el).closest('.score').attr('data-type');
  let data = getRangeField($(el).closest('.score'), type);
  let objective = $(el).closest('.score').attr('data-objective');
  getParent(el).scores[objective] = data;
  invalidated();
}
