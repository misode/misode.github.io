let structure;
let components;
let collections;

changeVersion('1.14');
function changeVersion(version) {
  $.getJSON('schemas/' + version + '.json', json => {
    structure = json.root;
    components = json.components;
    collections = json.collections;
  }).fail((jqXHR, textStatus, errorThrown) => {
    let message = 'Failed loading ' + version + ' schema';
    structure = {
      fields: [
        {
          id: 'pools',
          type: 'error',
          message: message
        }
      ]
    };
    console.error(message + '\n' + errorThrown);
  }).always(() => {
    $('#versionLabel').text(version);
    updateView();
  });
}

function updateView() {
  if (structure) {
    generateTable();
    if (i18next.isInitialized) {
      $('html').localize();
    }
  }
  $('#source').val(JSON.stringify(table, null, indentation));
}

function generateTable() {
  $('#structure').removeClass('d-none').html('');

  if (!table.type) {
    table.type = 'minecraft:empty';
  }
  $('#tableType').val(table.type);

  if (table.pools) {
    $table = generateComponent(table.pools, structure.fields.find(e => e.id === 'pools'));
    $('#structure').append($table);
  }

  $('#luck-based').attr('checked', luckBased);

}

function generateComponent(data, struct) {
  switch (struct.type) {
    case 'string': return generateString(data, struct);
    case 'int': return generateString(data, struct);
    case 'float': return generateString(data, struct);
    case 'chance-list': return generateString(data, struct);
    case 'boolean': return generateBoolean(data, struct);
    case 'random': return generateRandom(data, struct);
    case 'range': return generateRange(data, struct);
    case 'boundary': return generateBoundary(data, struct);
    case 'enum': return generateEnum(data, struct);
    case 'set': return generateSet(data, struct);
    case 'map': return generateMap(data, struct);
    case 'json': return generateJson(data, struct);
    case 'json-list': return generateJsonList(data, struct);
    case 'nbt': return generateNbt(data, struct);
    case 'array': return generateArray(data, struct);
    case 'object': return generateObject(data, struct, false);
    case 'error': return generateError(struct);
    default: return generateError('Unknown component type "' + struct.type + '"');
  }
}

function generateString(data, struct) {
  let $el = $('#components').find('[data-type="string"]').clone();
  $el.attr('data-type', struct.type);
  $el.attr('data-index', struct.id);
  $el.find('[data-name]').attr('data-i18n', struct.translate);
  $el.find('input').val(data);
  return $el;
}

function generateBoolean(data, struct) {
  let $el = $('#components').find('[data-type="boolean"]').clone();
  $el.attr('data-index', struct.id);
  $el.find('[data-name]').attr('data-i18n', struct.translate);
  if (data === true) {
    $el.find('[value="true"]').addClass('active');
  } else if (data === false) {
    $el.find('[value="false"]').addClass('active');
  }
  return $el;
}

function generateRandom(data, struct) {
  let $el = $('#components').find('[data-type="random"]').clone();
  $el.attr('data-index', struct.id);
  $el.find('[data-name]').attr('data-i18n', struct.translate);
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
  return $el;
}

function generateRange(data, struct) {
  let $el = $('#components').find('[data-type="range"]').clone();
  $el.attr('data-index', struct.id);
  $el.find('[data-name]').attr('data-i18n', struct.translate);
  if (typeof data === 'object') {
    $el.find('.range').removeClass('d-none');
    $el.find('.range.min').val(data.min);
    $el.find('.range.max').val(data.max);
  } else {
    $el.find('.exact').removeClass('d-none');
    $el.find('.exact').val(data);
  }
  return $el;
}

function generateBoundary(data, struct) {
  let $el = $('#components').find('[data-type="boundary"]').clone();
  $el.attr('data-index', struct.id);
  $el.find('[data-name]').attr('data-i18n', struct.translate);
  if (data) {
    $el.find('.range.min').val(data.min);
    $el.find('.range.max').val(data.max);
  }
  return $el;
}

function generateEnum(data, struct) {
  let $el = $('#components').find('[data-type="enum"]').clone();
  $el.attr('data-index', struct.id);
  $el.find('[data-name]').attr('data-i18n', struct.translate);
  let collection = struct.values;
  if (typeof struct.values === 'string') {
    collection = collections[struct.values];
  }
  if (struct.unset) {
    $el.find('select').append(setValueAndName($('<option/>'), 'unset', undefined));
  }
  for (let value of collection) {
    if (typeof value === 'object') {
      if (value.require.includes(table.type)) {
        $el.find('select').append(setValueAndName($('<option/>'), value.value, struct.translateValue));
      }
    } else {
      $el.find('select').append(setValueAndName($('<option/>'), value, struct.translateValue));
    }
  }
  $el.find('select').val(data);
  return $el;
}

function generateSet(data, struct) {
  let $el = $('#components').find('[data-type="set"]').clone();
  $el.attr('data-index', struct.id);
  $el.find('[data-name]').attr('data-i18n', struct.translate);
  let collection = struct.values;
  if (typeof struct.values === 'string') {
    collection = collections[struct.values];
  }
  for (let value of collection) {
    let $item = $('<a class="dropdown-item" onclick="addToSet(this, \'' + struct.id + '\')" />');
    setValueAndName($item, value, struct.translateValue);
    $el.find('.dropdown-menu').append($item);
  }
  if (data) {
    let $setContainer = $('<div/>');
    for (let option of data) {
      let $item = $('<button type="button"  onclick="removeFromSet(this, \'' + struct.id + '\')" />').addClass('btn btn-outline-danger bg-light btn-sm mr-2 mt-2');
      setValueAndName($item, option, struct.translateValue);
      $setContainer.append($item);
    }
    $el.append($setContainer);
  }
  return $el;
}

function generateMap(data, struct) {
  let $el = $('#components').find('[data-type="map"]').clone();
  $el.attr('data-index', struct.id).attr('data-item-type', struct.values.type);
  $el.find('[data-name="1"]').attr('data-i18n', struct.translate);
  $el.find('[data-name="2"]').attr('data-i18n', struct.translate + '_add');
  $el.find('input').keypress((e) => {if (e.which == 13) addToMap(e.target);});
  if (data) {
    for (let key of Object.keys(data)) {
      let field = struct.values;
      field.id = key;
      field.translate = key;
      let $item = generateComponent(data[key], field);;
      if (field.type === 'object') {
        let $header = $('<div class="card-header pb-1"></div>');
        $header.append(('<span class="input-group-text mr-3 mb-2 float-left" data-i18n="' + field.translate + '"></span>'));
        $header.append('<button type="button" class="btn btn-danger mb-2 float-right" onclick="removeFromMap(this)" data-i18n="' + struct.translate + '_remove"></button>');
        $item.prepend($header);
      } else {
        $item.append('<div class="input-group-append"><button class="btn btn-outline-danger bg-light" type="button" onclick="removeFromMap(this)" data-i18n="remove"></button></div>');
      }
      $item.attr('data-index', field.id);
      $el.append($item);
    }
  }
  return $el;
}

function setValueAndName($el, value, source) {
  let option = value.split(':').slice(-1)[0];
  option.replace(/\./, '_');
  let name = (source) ? source + '.' + option : option;
  return $el.attr('value', value).attr('data-i18n', name);
}

function generateJson(data, struct) {
  let $el = $('#components').find('[data-type="json"]').clone();
  $el.attr('data-index', struct.id);
  $el.find('[data-name]').attr('data-i18n', struct.translate);
  if (typeof data !== 'string') {
    data = JSON.stringify(data);
  }
  $el.find('textarea').val(data).keydown(e => preventNewline(e));
  return $el;
}

function generateJsonList(data, struct) {
  let $el = $('#components').find('[data-type="json-list"]').clone();
  $el.attr('data-index', struct.id);
  $el.find('[data-name]').attr('data-i18n', struct.translate);
  let jsonList = "";
  if (data) {
    for (let j = 0; j < data.length; j += 1) {
      let value = data[j];
      if (typeof value !== 'string') {
        value = JSON.stringify(value);
      }
      jsonList += value;
      if (j < data.length - 1) {
        jsonList += "\n";
      }
    }
  }
  $el.find('textarea').val(jsonList);
  return $el;
}

function generateNbt(data, struct) {
  let $el = $('#components').find('[data-type="nbt"]').clone();
  $el.attr('data-index', struct.id);
  $el.find('[data-name]').attr('data-i18n', struct.translate);
  $el.find('textarea').val(data).keydown(e => preventNewline(e));
  return $el;
}

function generateError(error) {
  let message = 'Unknown Error';
  if (typeof error === 'object' && typeof error.message === 'string') {
    message = error.message;
  } else if (typeof error === 'string'){
    message = error;
  }
  let $el = $('#components').find('[data-type="error"]').clone();
  $el.find('[data-name]').val(message);
  return $el;
}

function generateArray(data, struct) {
  if (!data || data.length === 0) {
    return undefined;
  }
  let $el = $('<div/>').addClass('mt-3');
  let child = components.find(e => e.id === struct.values);
  for (let i = 0; i < data.length; i += 1) {
    let $child = generateObject(data[i], child, true);
    $child.attr('data-index', i);
    $child.removeAttr('data-type');
    $el.append($child);
  }
  $el.children().first().removeClass('mt-3');
  return $el;
}

function generateObject(data, struct, header) {
  let $el = $('<div/>').addClass('card bg-' + struct.color + ' mt-3');
  let $header = $('<div class="card-header pb-1"></div>');
  if (header) {
    $header.appendTo($el);
    $header.append('<button type="button" class="btn btn-danger mb-2 float-right" onclick="removeComponent(this)" data-i18n="' + struct.id + '_remove"></button>');
  }
  let $body = $('<div class="card-body"></div>').appendTo($el);
  if (!struct.fields) {
    let child = components.find(e => e.id === struct.value);
    return generateObject(data, child, false);
  }
  let validFields = [];
  for (let field of struct.fields) {
    let $field;
    if (field.collapse) {
      $body.append('<button type="button" class="btn btn-light mt-3 dropdown-toggle" onclick="toggleCollapseObject(this)" data-index="' + field.id + '" data-i18n="' + field.translate + '"></button>');
      if (data[field.id] === undefined) {
        $body.append('<div/>');
        continue;
      }
    }
    try {
      $field = generateField(data, field, struct);
    } catch (e) {
      console.error(e);
      $field = generateError('Failed generating "' + field.id + '" field');
    }
    if ($field !== false) {
      validFields.push(field.id);
      if (field.type === 'array') {
        let color = field.color;
        if (color === undefined) {
          color = components.find(e => e.id === field.values).color;
        }
        if (header && field.button === 'header') {
          $header.append('<button type="button" class="btn btn-' + color + ' mr-3 mb-2 float-left" onclick="addComponent(this, \'' + field.id + '\')" data-i18n="' + field.translate + '_add"></button>');
        }
        if (field.button === 'field') {
          $body.append('<button type="button" class="btn btn-' + color + ' mr-3 mt-3" onclick="addComponent(this, \'' + field.id + '\')" data-i18n="' + field.translate + '_add"></button>');
        }
      }
      $body.append($field);
    }
  }
  for (let field of Object.keys(data)) {
    if (!validFields.includes(field)) {
      delete data[field];
    }
  }
  $body.children().first().removeClass('mt-3');
  return $el;
}

function generateField(data, field, parent) {
  if (!luckBased && field.luck_based) {
    return false;
  }
  if (field.require) {
    let passing = false;
    let filter = parent.fields.find(e => e.type === 'enum');
    for (let requirement of field.require) {
      if (typeof requirement === 'string') {
        if (requirement === data[filter.id]) {
          passing = true;
        }
      } else {
        let match = true;
        for (let id in requirement) {
          if (requirement.hasOwnProperty(id)) {
            if (requirement[id] !== data[parent.fields.find(e => e.id === id).id]) {
              match = false;
            }
          }
        }
        if (match) {
          passing = true;
        }
      }
    }
    if (!passing) {
      return false;
    }
  }

  let $field;
  if (data[field.id] === undefined) {
    if (field.type === 'object') {
      data[field.id] = {};
    } else if (field.type === 'enum' && field.default) {
      data[field.id] = field.default;
    }
  }
  try {
    $field = generateComponent(data[field.id], field);
  } catch (e) {
    console.error(e);
    $field = generateError('Failed generating "' + field.id + '" component');
  }
  if ($field) {
    if (field.class) {
      $field.addClass(field.class);
    }
    $field.attr('data-index', field.id);
  }
  return $field;
}

function preventNewline(e) {
  if (e.which === 13) {
    $(e.target).trigger('change');
    e.preventDefault();
  }
}
