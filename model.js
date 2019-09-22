
$("#source").val('');
$('#luckBased').prop('checked', false);
$('#tableType').val("minecraft:generic");
$('#indentationSelect').val("2");

let indentation = 2;
let luckBased = false;
let table = {
  type: "minecraft:generic",
  pools: [
    {
      "rolls": 1,
      "entries": [
        {
          "type": "minecraft:item",
          "name": "minecraft:stone"
        }
      ]
    }
  ]
};
let historyBuffer = 100;
let history = ['{}'];
let historyIndex = 0;
invalidated();

const params = new URLSearchParams(window.location.search);
if (params.has('q')) {
  $('#source').val(atob(params.get('q')));
  updateSource();
  $('.container').removeClass('d-none');
} else if (params.has('s')) {
  let short = params.get('s').slice(0, -7);
  window.location = 'https://zws.im/' + short;
} else {
  $('.container').removeClass('d-none');
}

$(document).keydown(function(e){
  if (e.which === 89 && e.ctrlKey ){
     redo();
  } else if (e.which === 90 && e.ctrlKey ){
     undo();
  }
});

function undo() {
  if (historyIndex > 0) {
    historyIndex -= 1;
    table = JSON.parse(history[historyIndex]);
    updateView();
  }
}

function redo() {
  if (historyIndex < history.length - 1) {
    historyIndex += 1;
    table = JSON.parse(history[historyIndex]);
    updateView();
  }
}

function invalidated() {
  if (historyIndex === history.length - 1) {
    history.push(JSON.stringify(table));
    if (history.length > historyBuffer) {
      history = history.slice(-historyBuffer);
    }
    historyIndex = history.length - 1;
  } else {
    historyIndex += 1;
    history = history.slice(0, historyIndex);
    history.push(JSON.stringify(table));
  }
  updateView();
}

function updateTableType() {
  table.type = $('#tableType').val();
  invalidated();
}

function updateLuckBased() {
  luckBased = $('#luckBased').prop('checked');
  invalidated();
}

function hideSource() {
  $('.source-container').addClass('d-none');
  $('.structure-container').removeClass('col-lg-7');
  $('#showSourceButton').removeClass('d-none');
}

function showSource() {
  $('.source-container').removeClass('d-none');
  $('.structure-container').addClass('col-lg-7');
  $('#showSourceButton').addClass('d-none');
}

async function linkSource() {
  let site = window.location.origin + window.location.pathname;
  let url = site + '?q=' + btoa(JSON.stringify(table));
  if (url.length <= 500) {
    let shortener = 'https://us-central1-zero-width-shortener.cloudfunctions.net/shortenURL?url=';
    let response = await fetch(shortener + url);
    let json = await response.json();
    let id = Math.random().toString(36).substring(2, 9);
    url = site + '?s=' + json.short + id;
  }
  $('#copyContainer').removeClass('d-none');
  $('#copyTextarea').val(url);
  $('#copyTextarea').get()[0].select();
}

function copyLink() {
  $('#copyTextarea').get()[0].select();
  document.execCommand('copy');
  setTimeout(() => {
    $('#copyContainer').addClass('d-none');
  }, 100);
}

function updateSource() {
  $('#source').removeClass('invalid');
  try {
    table = JSON.parse($('#source').val());
  } catch(e) {
    if ($('#source').val().length > 0) {
      $('#source').addClass('invalid');
      return;
    }
    table = {};
  }
  invalidated();
}

function updateIndentation(value) {
  indentation = value;
  invalidated();
}

function copySource(el) {
  $('#source').get()[0].select();
  document.execCommand('copy');
}

function getParent(el) {
  let $node = $(el).closest('[data-field]');
  let fields = $node.attr('data-field').split('.');
  if (fields.length === 1 && fields[0] === 'table') {
    return table;
  }
  if ($node.attr('data-type')) {
    fields = fields.slice(0, -1);
  }
  let node = getParent($node.parent());
  for (let f of fields) {
    if (f.endsWith('[]')) {
      f = f.slice(0, -2);
      let index = $node.attr('data-index');
      node = node[f][index];
    } else {
      if (node[f] === undefined) {
        node[f] = {};
      }
      node = node[f];
    }
  }
  return node;
}

function getSuperParent(el) {
  let $parent = $(el).closest('[data-field]');
  return getParent($parent.parent());
}

function setField(node, field, value) {
  let fields = field.split('.');
  let last = fields.splice(-1)[0];
  for (let f of fields) {
    node = node[f];
  }
  node[last] = value;
}

function deleteField(node, field) {
  let fields = field.split('.');
  let last = fields.splice(-1)[0];
  for (let f of fields) {
    node = node[f];
  }
  delete node[last];
}

function getField(node, field) {
  let fields = field.split('.');
  let last = fields.splice(-1)[0];
  for (let f of fields) {
    node = node[f];
  }
  return node[last];
}

function getIndex(el) {
  let $parent = $(el).closest('[data-field]');
  return parseInt($parent.attr('data-index'));
}

function addComponent(el, array) {
  let parent = getParent(el);
  if (!parent[array]) {
    parent[array] = [];
  }
  parent[array].push({});
  invalidated();
}

function removeComponent(el) {
  let node = getSuperParent(el);
  let $field = $(el).closest('[data-field]');
  let index = $field.attr('data-index');
  let last = $field.attr('data-field').slice(0, -2);
  node[last].splice(index, 1);
  if (node[last].length === 0) {
    delete node[last];
  }
  invalidated();
}
function addToSet(el, array) {
  let parent = getParent(el);
  if (!parent[array]) {
    parent[array] = [];
  }
  parent[array].push($(el).attr('value'));
  invalidated();
}

function removeFromSet(el, array) {
  let parent = getParent(el);
  let index = parent[array].indexOf($(el).attr('value'));
  if (index > -1) {
    parent[array].splice(index, 1);
    invalidated();
  }
}

function toggleCollapseObject(el) {
  let parent = getSuperParent(el);
  let field = $(el).closest('[data-field]').attr('data-field');
  if (!parent[field]) {
    parent[field] = {};
  } else {
    delete parent[field];
  }
  invalidated();
}

function updateField(el) {
  let $field = $(el).closest('[data-field]');
  let fields = $field.attr('data-field');
  let field = fields.split('.').slice(-1)[0];
  let type = $field.attr('data-type');
  let node = getParent(el);
  let value = undefined;

  if (type === 'string' || type === 'int' || type === 'float' || type === 'enum' || type === 'json' || type === 'nbt') {
    value = $(el).val();
  }
  if (type === 'int') {
    value = parseInt(value);
    if (isNaN(value)) {
      value = '';
    }
  } else if (type === 'float') {
    value = parseFloat(value);
    if (isNaN(value)) {
      value = '';
    }
  } else if(type === 'enum') {
    if (value === 'unset') {
      value = '';
    }
  } else if (type === 'nbt') {

    if (!value.startsWith('{')) {
      value = '{' + value;
    }
    if (!value.endsWith('}')) {
      value = value + '}';
    }
  } else if (type === 'json') {
    value = parseJSONValue(value)
  } else if (type === 'json-list') {
    let value = [];
    for (let line of $(el).val().split('\n')) {
      value.push(parseJSONValue(line));
    }
    if (value.length === 0) {
      value = '';
    }
  } else if (type === 'range' || type === 'random') {
    value = getRangeValue($field, node[field]);
  } else if (type === 'checkbox') {
    value = $(el).prop('checked');
  } else if (type === 'boolean') {
    value = getBooleanValue(node[field], ($(el).val() === 'true'));
  }
  if (value === '') {
    deleteField(node, field);
  } else {
    setField(node, field, value);
  }
  invalidated();
}

function updateRangeType(el) {
  let $field = $(el).closest('[data-field]');
  let field = $field.attr('data-field');
  let type = $(el).attr('value');
  if (type === 'range') {
    setField(getParent(el), field, {});
  } else if (type === 'binomial') {
    setField(getParent(el), field, {type: "minecraft:binomial"});
  } else {
    setField(getParent(el), field, 0);
  }
  updateField(el);
}

function getRangeValue($field, data) {
  if (typeof data === 'object') {
    if (data.type && data.type.match(/(minecraft:)?binomial/)) {
      let n = $field.find('.binomial.n').val();
      let p = $field.find('.binomial.p').val();
      if (n) data.n = parseInt(n);
      else delete data.n;
      if (p) data.p = parseFloat(p);
      else delete data.p;
    } else {
      let min = $field.find('.range.min').val();
      let max = $field.find('.range.max').val();
      if (min) data.min = parseFloat(min);
      else delete data.min;
      if (max) data.max = parseFloat(max);
      else delete data.max;
    }
  } else {
    data = parseFloat($field.find('.exact').val());
    if (isNaN(data)) {
      data = '';
    }
  }
  return data;
}

function getBooleanValue(oldvalue, newvalue) {
  if (oldvalue === newvalue) {
    return '';
  } else if (newvalue) {
    return true;
  } else {
    return false;
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
  let objective = $(el).closest('.score').attr('data-objective');
  if (type === 'range') {
    getParent(el).scores[objective] = {};
  } else if (type === 'binomial') {
    getParent(el).scores[objective] = {type: "minecraft:binomial"};
  } else {
    getParent(el).scores[objective] = 0;
  }
  updateScoreField(el);
}

function updateScoreField(el) {
  let parent = getParent(el);
  let objective = $(el).closest('.score').attr('data-objective');
  let data = parent.scores[objective];
  let $range = $(el).closest('[data-type="range"]');
  if (typeof data === 'object') {
    let min = $range.find('.range.min').val();
    let max = $range.find('.range.max').val();
    if (min) {
      data.min = parseInt(min);
    } else {
      delete data.min;
    }
    if (max) {
      data.max = parseInt(max);
    } else {
      delete data.max;
    }
  } else {
    data = parseInt($range.find('.exact').val());
  }
  parent.scores[objective] = data;
  invalidated();
}

function parseJSONValue(value) {
  if (value.startsWith('"') || value.startsWith('{') || value.startsWith('[')) {
    try {
      return JSON.parse(value);
    } catch(e) {
      return value;
    }
  }
  return value;
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
  if (type === 'item') {
    $predicate.find('.item').removeClass('d-none');
    $predicate.find('.tag').addClass('d-none');
  } else {
    $predicate.find('.tag').removeClass('d-none');
    $predicate.find('.item').addClass('d-none');
  }
}

function updateItemField(el, type) {
  let parent = getParent(el);
  if (type === 'item') {
    parent.item = $(el).closest('.predicate').find('input.item').val();
    delete parent.tag;
  } else {
    parent.tag = $(el).closest('.predicate').find('input.tag').val();
    delete parent.item;
  }
  invalidated();
}

function toggleDamageFlags(el) {
  let parent = getParent(el);
  if (parent.type) {
    delete parent.type;
  } else {
    parent.type = {};
  }
  invalidated();
}

function toggleSourceEntity(el) {
  let parent = getParent(el);
  if (parent.source_entity) {
    delete parent.source_entity;
  } else {
    parent.source_entity = {};
  }
  invalidated();
}

function toggleDirectEntity(el) {
  let parent = getParent(el);
  if (parent.direct_entity) {
    delete parent.direct_entity;
  } else {
    parent.direct_entity = {};
  }
  invalidated();
}

function updateChancesField(el) {
  let parent = getParent(el);
  let chances = '[' + $(el).val() + ']';
  try {
    parent.chances = JSON.parse(chances);
    for (let i = 0; i < parent.chances.length; i += 1) {
      if (parent.chances[i] > 1) {
        parent.chances[i] = 1;
      }
    }
  } catch(e) {
    parent.chances = [];
  }
  invalidated();
}

function addConditionEnchantment(el) {
  let condition = getParent(el);
  if (!condition.enchantments) {
    condition.enchantments = [];
  }
  condition.enchantments.push({
    enchantment: 'minecraft:silk_touch',
    level: 1
  });
  invalidated();
}
