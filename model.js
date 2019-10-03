
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

function getPath(el) {
  let $node = $(el).closest('[data-index]');
  let index = $node.attr('data-index');
  if (index === 'pools') return ['pools'];
  let parent = getPath($node.parent());
  parent.push(index);
  return parent;
}

function getNode(path) {
  let node = table;
  for (let index of path) {
    if (!isNaN(index)) {
      index = +index;
    } else if (node[index] === undefined) {
      node[index] = {};
    }
    node = node[index];
  }
  return node;
}

function getType(el) {
  let $field = $(el).closest('[data-index]');
  if ($field) {
    return $field.attr('data-type');
  }
}

function getParent(el) {
  let path = getPath(el);
  path.pop();
  return getNode(path);
}

function getSuperParent(el) {
  let path = getPath(el);
  path.pop();
  path.pop();
  return getNode(path);
}

function addComponent(el, array) {
  let node = getNode(getPath(el));
  if (!node[array]) {
    node[array] = [];
  }
  node[array].push({});
  invalidated();
}

function removeComponent(el) {
  let path = getPath(el);
  let index = path.pop();
  let array = path.pop();
  let node = getNode(path);
  node[array].splice(index, 1);
  if (node[array].length === 0) {
    delete node[array];
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

function addToMap(el) {
  let node = getParent(el);
  let $field = $(el).closest('[data-index]');
  let key = $field.find('input').val();
  let map = $field.attr('data-index');
  let type = $field.attr('data-item-type');
  if (key.length === 0) {
    return;
  }
  if (!node[map]) {
    node[map] = {};
  }
  if (type === 'int' || type === 'float' || type === 'random' || type === 'range' || type === 'boundary') {
    node[map][key] = 0;
  } else if (type === 'boolean') {
    node[map][key] = false;
  } else {
    node[map][key] = "";
  }
  invalidated();
}

function removeFromMap(el) {
  let path = getPath(el);
  let key = path.pop();
  let node = getNode(path);
  delete node[key];
  if (Object.keys(node).length === 0) {
    let field = path.pop();
    let parent = getNode(path);
    delete parent[field];
  }
  invalidated();
}

function toggleCollapseObject(el) {
  let path = getPath(el);
  let index = path.pop();
  let node = getNode(path);
  if (!node[index]) {
    node[index] = {};
  } else {
    delete node[index];
  }
  invalidated();
}

function updateField(el) {
  let path = getPath(el);
  console.log(path);
  let $field = $(el).closest('[data-index]');
  let field = path.pop();
  let node = getNode(path);
  let type = getType(el);
  let value = undefined;

  if (type === 'string' || type === 'int' || type === 'float' || type === 'enum' || type === 'json' || type === 'nbt' || type === 'chance-list') {
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
  } else if (type === 'chance-list') {
    value = '[' + value + ']';
    try {
      value = JSON.parse(value);
      for (let i = 0; i < value.length; i += 1) {
        if (value[i] > 1) {
          value[i] = 1;
        } else if (value[i] < 0) {
          value[i] = 0;
        }
      }
    } catch(e) {
      value = [];
    }
  } else if (type === 'enum') {
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
  } else if (type === 'range' || type === 'random' || type === 'boundary') {
    if (type === 'boundary' && node[field] === undefined) {
      node[field] = {};
    }
    value = getRangeValue($field, node[field]);
  } else if (type === 'checkbox') {
    value = $(el).prop('checked');
  } else if (type === 'boolean') {
    value = getBooleanValue(node[field], ($(el).val() === 'true'));
  }
  if (value === '') {
    delete node[field];
  } else {
    node[field] = value;
  }
  invalidated();
}

function updateRangeType(el) {
  let path = getPath(el);
  let field = path.pop();
  let node = getNode(path);
  let type = $(el).attr('value');
  if (type === 'range') {
    node[field] = {};
  } else if (type === 'binomial') {
    node[field] = {type: "minecraft:binomial"};
  } else {
    node[field] = 0;
  }
  updateField(el);
}

function getRangeValue($field, data) {
  console.log($field, data);
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
