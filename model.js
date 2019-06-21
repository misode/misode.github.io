
$("#source").val('');
$('#luckBased').prop('checked', false);
$('#tableType').val("minecraft:generic");
$('#indentationSelect').val("2");

let indentation = 2;
let luck_based = false;
const nodes = '.loot-table, .pool, .entry, .child, .term, .terms, .function, .condition, .modifier, .operation, .predicate, .location';
let table = {
  type: "minecraft:generic",
  pools: []
};
addPool();
addEntry($('#structure .pool').get());

const params = new URLSearchParams(window.location.search);
if (params.has('q')) {
  $('#source').val(params.get('q'));
  updateSouce();
}

function updateTableType() {
  table.type = $('#tableType').val();
  invalidated();
}

function updateLuckBased() {
  luck_based = $('#luckBased').prop('checked');
  invalidated();
}

function linkSource() {
  let link = window.location.origin + window.location.pathname + '?q=' + JSON.stringify(table);
  $('#copyTextarea').removeClass('d-none').val(link);
  $('#copyTextarea').get()[0].select();
  document.execCommand('copy');
  setTimeout(() => {
    $('#copyTextarea').addClass('d-none');
  }, 2000);
}

function updateSouce() {
  $('#source').removeClass('invalid');
  try {
    table = JSON.parse($('#source').val());
  } catch {
    if ($('#source').val().length > 0) {
      $('#source').addClass('invalid');
      return;
    }
    table = {};
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
  let $parent = $(el).closest(nodes);
  let index = $parent.attr('data-index');
  if ($parent.hasClass('loot-table')) {
    return table;
  } else if ($parent.hasClass('pool')) {
    return getParent($parent.parent()).pools[index];
  } else if ($parent.hasClass('entry')) {
    return getParent($parent.parent()).entries[index];
  } else if ($parent.hasClass('child')) {
    return getParent($parent.parent()).children[index];
  } else if ($parent.hasClass('term')) {
    return getParent($parent.parent()).term;
  } else if ($parent.hasClass('terms')) {
    return getParent($parent.parent()).terms[index];
  } else if ($parent.hasClass('function')) {
    return getParent($parent.parent()).functions[index];
  } else if ($parent.hasClass('condition')) {
    return getParent($parent.parent()).conditions[index];
  } else if ($parent.hasClass('modifier')) {
    return getParent($parent.parent()).modifiers[index];
  } else if ($parent.hasClass('operation')) {
    return getParent($parent.parent()).ops[index];
  } else if ($parent.hasClass('predicate')) {
    return getParent($parent.parent()).predicate;
  } else if ($parent.hasClass('location')) {
    return getParent($parent.parent()).location;
  }
}

function getSuperParent(el) {
  let $parent = $(el).closest(nodes);
  return getParent($parent.parent());
}

function getIndex(el) {
  let $parent = $(el).closest(nodes);
  return parseInt($parent.attr('data-index'));
}

function addPool(el) {
  if (!table.pools) {
    table.pools = [];
  }
  table.pools.push({
    rolls: 1
  });
  invalidated();
}

function removePool(el) {
  let parent = getSuperParent(el);
  let index = getIndex(el);
  parent.pools.splice(index, 1);
  if (parent.pools.length === 0) {
    delete parent.pools;
  }
  invalidated();
}

function addEntry(el) {
  let pool = getParent(el);
  if (!pool.entries) {
    pool.entries = [];
  }
  pool.entries.push({
    type: "minecraft:item",
    name: "minecraft:stone"
  });
  invalidated();
}

function removeEntry(el) {
  let parent = getSuperParent(el);
  let index = getIndex(el);
  parent.entries.splice(index, 1);
  if (parent.entries.length === 0) {
    delete parent.entries;
  }
  invalidated();
}

function addChild(el) {
  let entry = getParent(el);
  if (!entry.children) {
    entry.children = [];
  }
  entry.children.push({
    type: "minecraft:item",
    name: "minecraft:stone"
  });
  invalidated();
}

function removeChild(el) {
  let parent = getSuperParent(el);
  let index = getIndex(el);
  parent.children.splice(index, 1);
  if (parent.children.length === 0) {
    delete parent.children;
  }
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
  if (parent.conditions) {
    parent.conditions.splice(getIndex(el), 1);
    if (parent.conditions.length === 0) {
      delete parent.conditions;
    }
  } else {
    parent.terms.splice(getIndex(el), 1);
    if (parent.terms.length === 0) {
      delete parent.terms;
    }
  }
  invalidated();
}

function updateValue(root, field, value) {
  let f = field.split('.');
  if (f.length === 1) return root[f[0]] = value;
  if (!root[f[0]]) root[f[0]] = {};
  if (f.length === 2) return root[f[0]][f[1]] = value;
  if (!root[f[0]][f[1]]) root[f[0]][f[1]] = {};
  if (f.length === 3) return root[f[0]][f[1]][f[2]] = value;
  if (!root[f[0]][f[1]][f[2]]) root[f[0]][f[1]][f[2]] = {};
  if (f.length === 4) return root[f[0]][f[1]][f[2]][f[3]] = value;
  if (!root[f[0]][f[1]][f[2]][f[3]]) root[f[0]][f[1]][f[2]][f[3]] = {};
  if (f.length === 5) return root[f[0]][f[1]][f[2]][f[3]][f[4]] = value;
  if (!root[f[0]][f[1]][f[2]][f[3]][f[4]]) root[f[0]][f[1]][f[2]][f[3]][f[4]] = {};
  if (f.length === 6) return root[f[0]][f[1]][f[2]][f[3]][f[4]][f[5]] = value;
}

function deleteValue(root, field) {
  let f = field.split('.');
  if (f.length === 1) delete root[f[0]];
  if (f.length === 2) delete root[f[0]][f[1]];
  if (f.length === 3) delete root[f[0]][f[1]][f[2]];
  if (f.length === 4) delete root[f[0]][f[1]][f[2]][f[3]];
  if (f.length === 5) delete root[f[0]][f[1]][f[2]][f[3]][f[4]];
  if (f.length === 6) delete root[f[0]][f[1]][f[2]][f[3]][f[4]][f[6]];
}

function updateField(el, field) {
  updateValue(getParent(el), field, $(el).val());
  invalidated();
}

function updateJSONField(el, field) {
  let value = parseJSONValue($(el).val());
  updateValue(getParent(el), field, value);
  invalidated();
}

function updateIntField(el, field) {
  let value = parseInt($(el).val());
  if (isNaN(value)) {
    deleteValue(getParent(el), field);
  } else {
    updateValue(getParent(el), field, value);
  }
  invalidated();
}

function updateFloatField(el, field) {
  let value = parseFloat($(el).val());
  if (isNaN(value)) {
    deleteValue(getParent(el), field);
  } else {
    updateValue(getParent(el), field, value);
  }
  invalidated();
}

function updateCheckedField(el, field) {
  getParent(el)[field] = $(el).prop('checked');
  invalidated();
}

function updateRangeType(el, field, type) {
  $(el).closest('[data-type]').attr('data-type', type);
  updateRangeField(el, field);
}

function updateRangeField(el, field) {
  let type = $(el).closest('[data-type]').attr('data-type');
  let data = getRangeField($(el).closest('[data-type]'), type);
  getParent(el)[field] = data;
  invalidated();
}

function getRangeField($el, type) {
  if (type === 'exact') {
    return parseFloat($el.find('.exact').val());
  } else if (type === 'range') {
    let data = {};
    let min = $el.find('.range.min').val();
    let max = $el.find('.range.max').val();
    if (min) data.min = parseFloat(min);
    if (max) data.max = parseFloat(max);
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
  getSuperParent(el).modifiers.splice(index, 1);
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

function addScore(el) {
  let condition = getParent(el);
  let objective = $(el).closest('.condition-entity-scores').find('input').val();
  if (!objective.length) {
    return;
  }
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

function updateScoreType(el, type) {
  $(el).closest('.score').attr('data-type', type);
  updateScoreField(el);
}

function updateScoreField(el) {
  let type = $(el).closest('.score').attr('data-type');
  let data = getRangeField($(el).closest('.score'), type);
  let objective = $(el).closest('.score').attr('data-objective');
  getParent(el).scores[objective] = data;
  invalidated();
}

function parseJSONValue(value) {
  if (value.startsWith('"') || value.startsWith('{') || value.startsWith('[')) {
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }
  return value;
}

function updateLoreField(el) {
  let lines = $(el).val().split('\n');
  let parent = getParent(el);
  parent.lore = [];
  for (let line of lines) {
    parent.lore.push(parseJSONValue(line));
  }
  invalidated();
}

function addOperation(el) {
  let func = getParent(el);
  if (!func.ops) {
    func.ops = [];
  }
  func.ops.push({
    source: '',
    target: '',
    op: 'replace'
  });
  invalidated();
}

function removeOperation(el) {
  let index = parseInt($(el).closest('.operation').attr('data-index'));
  getSuperParent(el).ops.splice(index, 1);
  invalidated();
}

function addBlockProperty(el) {
  let func = getParent(el);
  let blockstate = $(el).closest('.condition-block-properties').find('input').val();
  if (!func.properties) {
    func.properties = {};
  }
  func.properties[blockstate] = '';
  invalidated();
}

function removeBlockProperty(el) {
  let blockstate = $(el).closest('.block-property').attr('data-blockstate');
  delete getParent(el).properties[blockstate];
  invalidated();
}

function updateBlockPropertyField(el) {
  let blockstate = $(el).closest('.block-property').attr('data-blockstate');
  getParent(el).properties[blockstate] = $(el).val();
  invalidated();
}

function addTerm(el) {
  let condition = getParent(el);
  if (!condition.terms) {
    condition.terms = [];
  }
  condition.terms.push({
    condition: "minecraft:random_chance",
    chance: 0.5
  });
  invalidated();
}

function togglePosition(el) {
  let parent = getParent(el);
  if (parent.position) {
    delete parent.position;
  } else {
    parent.position = {};
  }
  invalidated();
}

function toggleEntityLocation(el) {
  let parent = getParent(el);
  if (parent.location) {
    delete parent.location;
  } else {
    parent.location = {};
  }
  invalidated();
}

function updateItemType(el, type) {
  let $predicate = $(el).closest('.predicate');
  if (type === 'name') {
    $predicate.find('.name').removeClass('d-none');
    $predicate.find('.tag').addClass('d-none');
  } else {
    $predicate.find('.tag').removeClass('d-none');
    $predicate.find('.name').addClass('d-none');
  }
}

function updateItemField(el, type) {
  let parent = getParent(el);
  if (type === 'name') {
    parent.name = $(el).closest('.predicate').find('input.name').val();
    delete parent.tag;
  } else {
    parent.tag = $(el).closest('.predicate').find('input.tag').val();
    delete parent.name;
  }
  invalidated();
}
