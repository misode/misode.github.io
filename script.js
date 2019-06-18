
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
addEntry($('.pool').get());

function getPool(el) {
  let index = parseInt($(el).closest('.pool').attr('data-index'));
  return table.pools[index];
}

function getEntry(el) {
  let index = parseInt($(el).closest('.entry').attr('data-index'));
  return getPool(el).entries[index];
}

function getFunction(el) {
  let index = parseInt($(el).closest('.function').attr('data-index'));
  return getEntry(el).functions[index];
}

function getModifier(el) {
  let index = parseInt($(el).closest('.modifier').attr('data-index'));
  return getFunction(el).modifiers[index];
}

function addPool(el) {
  table.pools.push({
    rolls: 1,
    entries: []
  });
  invalidated();
}

function removePool(el) {
  let index = parseInt($(el).closest('.pool').attr('data-index'));
  table.pools.splice(index, 1);
  invalidated();
}

function addEntry(el) {
  getPool(el).entries.push({
    type: "minecraft:item",
    name: "minecraft:stone"
  });
  invalidated();
}

function removeEntry(el) {
  let index = parseInt($(el).closest('.entry').attr('data-index'));
  getPool(el).entries.splice(index, 1);
  invalidated();
}

function addFunction(el) {
  let entry = getEntry(el);
  if (!entry.functions) {
    entry.functions = [];
  }
  entry.functions.push({
    function: "minecraft:set_count"
  });
  invalidated();
}

function removeFunction(el) {
  let index = parseInt($(el).closest('.function').attr('data-index'));
  getEntry(el).functions.splice(index, 1);
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
  getPool(el).rolls = data;
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
    delete getPool(el).bonus_rolls;
  } else {
    getPool(el).bonus_rolls = data;
  }
  invalidated();
}

function updateEntryType(el) {
  let entry = getEntry(el);
  entry.type = $(el).val();
  if (entry.type === 'minecraft:dynamic') {
    entry.name = 'minecraft:contents';
  }
  invalidated();
}

function updateEntryName(el) {
  let entry = getEntry(el);
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
    delete getEntry(el).weight;
  } else {
    getEntry(el).weight = weight;
  }
  invalidated();
}

function updateEntryQuality(el) {
  let quality = parseInt($(el).val());
  if (isNaN(quality)) {
    delete getEntry(el).quality;
  } else {
    getEntry(el).quality = quality;
  }
  invalidated();
}

function updateFunctionType(el) {
  getFunction(el).function = $(el).val();
  invalidated();
}

function switchCountType(el, type) {
  $(el).closest('.function-count').attr('data-type', type);
  updateCountField(el);
}

function updateCountField(el) {
  let type = $(el).closest('.function-count').attr('data-type');
  let data = getRangeField($(el).closest('.function-count'), type);
  getFunction(el).count = data;
  invalidated();
}

function switchDamageType(el, type) {
  $(el).closest('.function-damage').attr('data-type', type);
  updateCountField(el);
}

function updateDamageField(el) {
  let type = $(el).closest('.function-damage').attr('data-type');
  let data = getRangeField($(el).closest('.function-damage'), type);
  getFunction(el).damage = data;
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
  getFunction(el).tag = nbt;
  invalidated();
}

function addEnchantment(el) {
  let func = getFunction(el);
  let enchantment = $(el).attr('data-ench');
  if (!func.enchantments) {
    func.enchantments = [];
  }
  func.enchantments.push(enchantment);
  invalidated();
}

function removeEnchantment(el) {
  let func = getFunction(el);
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
  getFunction(el).levels = data;
  invalidated();
}

function updateTreasureField(el) {
  let treasure = $(el).prop('checked');
  console.log(treasure);
  if (treasure) {
    getFunction(el).treasure = true;
  } else {
    delete getFunction(el).treasure;
  }
  invalidated();
}

function updateLimitField(el) {
  let limit = parseInt($(el).val());
  if (isNaN(limit)) {
    delete getFunction(el).limit;
  } else {
    getFunction(el).limit = limit;
  }
  invalidated();
}

function addModifier(el) {
  let func = getFunction(el);
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
  getFunction(el).modifiers.splice(index, 1);
  invalidated();
}

function updateModifierAttribute(el) {
  getModifier(el).attribute = $(el).val();
  invalidated();
}

function updateModifierName(el) {
  getModifier(el).name = $(el).val();
  invalidated();
}

function switchModifierAmountType(el, type) {
  $(el).closest('.modifier-amount').attr('data-type', type);
  updateModifierAmountField(el);
}

function updateModifierAmountField(el) {
  let type = $(el).closest('.modifier-amount').attr('data-type');
  let data = getRangeField($(el).closest('.modifier-amount'), type);
  getModifier(el).amount = data;
  invalidated();
}

function updateModifierOperation(el) {
  getModifier(el).operation = $(el).val();
  invalidated();
}

function addModifierSlot(el) {
  let modifier = getModifier(el);
  if (!modifier.slots) {
    modifier.slots = [];
  }
  modifier.slots.push($(el).attr('data-slot'));
  invalidated();
}

function removeModifierSlot(el) {
  let modifier = getModifier(el);
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

  // Entries
  for (let j = 0; j < pool.entries.length; j += 1) {
    let $entry = generateEntry(pool.entries[j], j);
    $pool.children('.card-body').append($entry);
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

  if (entry.functions) {
    for (let j = 0; j < entry.functions.length; j += 1) {
      let $function = generateFunction(entry.functions[j], j);
      $entry.children('.card-body').append($function);
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
        let html = '<button type="button" class="btn btn-outline-danger btn-sm mr-2 mt-2" data-ench="' + e + '" onclick="removeEnchantment(this)">' + item.text() + '</button>';
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
      console.log(s);
      let item = $modifier.find('.dropdown-item[data-slot="' + s + '"]');
      item.addClass('d-none');
      let html = '<button type="button" class="btn btn-outline-danger btn-sm mr-2 mt-2" data-slot="' + s + '" onclick="removeModifierSlot(this)">' + item.text() + '</button>';
      $modifier.find('.modifier-slots-list').append(html);
    }
  }

  return $modifier
}
