let structure;
let components;
let collections;

i18next.on('initialized', () => {
  $('[data-help]').each(function() {
    console.log('ahhh');
    $(this).tooltip({title: i18next.t('$help.' + $(this).attr('data-help'))});
  });
});

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
    let {out: tableOut, component: $table} = generateTable(table, structure);
    $('#structure').append($table);
    if (i18next.isInitialized) {
      $('html').localize();
    }
    $('#source').val(JSON.stringify(tableOut, null, indentation));
  }
}

function generateTable(data, struct) {
  let out = {};
  let $el = $('<div/>');
  $('#structure').removeClass('d-none').html('');

  let type = struct.fields.find(e => e.id === 'type');
  if (type) {
    $('.table-type').removeClass('d-none');
    $('#tableType').html('');
    for (let option of type.values) {
      $('#tableType').append(setValueAndName($('<option/>'), option, type.translateValue));
    }
    $('#tableType').val(data.type ? correctNamespace(data.type) : type.default);
    out.type = data.type;
  } else {
    $('.table-type').addClass('d-none');
  }

  if (data.pools) {
    let {out: outValue, component: $table} = generateComponent(data.pools, struct.fields.find(e => e.id === 'pools'));
    out.pools = outValue;
    $el.append($table);
  }

  $('#luck-based').attr('checked', luckBased);
  return {out: out, component: $el};
}

function generateComponent(data, struct) {
  switch (struct.type) {
    case 'string': return generateString(data, struct);
    case 'int': return generateString(data, struct);
    case 'float': return generateString(data, struct);
    case 'string-list': return generateString(data, struct);
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
  if (struct.help) {
    $el.append(generateTooltip(struct.translate));
  }
  return {out: data, component: $el};
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
  if (struct.help) {
    $el.append(generateTooltip(struct.translate));
  }
  return {out: data, component: $el};
}

function generateRandom(data, struct) {
  let $el = $('#components').find('[data-type="random"]').clone();
  $el.attr('data-index', struct.id);
  $el.find('[data-name]').attr('data-i18n', struct.translate);
  if (typeof data === 'object') {
    if (data.type && correctNamespace(data.type) === 'minecraft:binomial') {
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
  if (struct.help) {
    $el.append(generateTooltip(struct.translate));
  }
  return {out: data, component: $el};
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
  if (struct.help) {
    $el.append(generateTooltip(struct.translate));
  }
  return {out: data, component: $el};
}

function generateBoundary(data, struct) {
  let $el = $('#components').find('[data-type="boundary"]').clone();
  $el.attr('data-index', struct.id);
  $el.find('[data-name]').attr('data-i18n', struct.translate);
  if (data) {
    $el.find('.range.min').val(data.min);
    $el.find('.range.max').val(data.max);
  }
  if (struct.help) {
    $el.append(generateTooltip(struct.translate));
  }
  return {out: data, component: $el};
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
      if (value.require.includes(correctNamespace(table.type))) {
        $el.find('select').append(setValueAndName($('<option/>'), value.value, struct.translateValue));
      }
    } else {
      $el.find('select').append(setValueAndName($('<option/>'), value, struct.translateValue));
    }
  }
  $el.find('select').val(collection.includes(data) ? data : correctNamespace(data));
  if (struct.help) {
    $el.append(generateTooltip(struct.translateValue + '.' + data.replace(/.*:/, '')));
  }
  return {out: data, component: $el};
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
      setValueAndName($item, correctNamespace(option), struct.translateValue);
      $setContainer.append($item);
    }
    $el.append($setContainer);
  }
  return {out: data, component: $el};
}

function generateMap(data, struct) {
  let $el = $('#components').find('[data-type="map"]').clone();
  let out = {};
  $el.attr('data-index', struct.id).attr('data-item-type', struct.values.type);
  $el.find('[data-name="1"]').attr('data-i18n', struct.translate);
  $el.find('[data-name="2"]').attr('data-i18n', struct.translate + '_add');
  $el.find('input').keypress((e) => {if (e.which == 13) addToMap(e.target);});
  if (data) {
    for (let key of Object.keys(data)) {
      let field = struct.values;
      field.id = key;
      field.translate = key;
      let {out: outValue, component: $item} = generateComponent(data[key], field);
      if (field.type === 'object') {
        let $header = $('<div class="card-header pb-1"></div>');
        $header.append(('<span class="input-group-text mr-3 mb-2 float-left" data-i18n="' + field.translate + '"></span>'));
        $header.append('<button type="button" class="btn btn-danger mb-2 float-right" onclick="removeFromMap(this)" data-i18n="' + struct.translate + '_remove"></button>');
        $item.prepend($header);
      } else {
        $item.append('<div class="input-group-append"><button class="btn btn-outline-danger bg-light" type="button" onclick="removeFromMap(this)" data-i18n="remove"></button></div>');
      }
      out[field.id] = outValue;
      $item.attr('data-index', field.id);
      $el.append($item);
    }
  }
  return {out: out, component: $el};
}

function setValueAndName($el, value, source) {
  let option = value.split(':').slice(-1)[0];
  option.replace(/\./, '_');
  let name = (source) ? source + '.' + option : option;
  return $el.attr('value', value).attr('data-i18n', name);
}

function correctNamespace(s) {
  if (typeof s === 'string' && !s.includes(':')) return 'minecraft:' + s;
  return s;
}

function generateJson(data, struct) {
  let $el = $('#components').find('[data-type="json"]').clone();
  $el.attr('data-index', struct.id);
  $el.find('[data-name]').attr('data-i18n', struct.translate);
  if (typeof data !== 'string') {
    data = JSON.stringify(data);
  }
  $el.find('textarea').val(data).keydown(e => preventNewline(e));
  if (struct.help) {
    $el.append(generateTooltip(struct.translate));
  }
  return {out: data, component: $el};
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
  return {out: data, component: $el};
}

function generateNbt(data, struct) {
  let $el = $('#components').find('[data-type="nbt"]').clone();
  $el.attr('data-index', struct.id);
  $el.find('[data-name]').attr('data-i18n', struct.translate);
  $el.find('textarea').val(data).keydown(e => preventNewline(e));
  return {out: data, component: $el};
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
  return {out: undefined, component: $el};
}

function generateArray(data, struct) {
  let out = [];
  if (!data || data.length === 0) {
    return undefined;
  }
  let $el = $('<div/>').addClass('mt-3');
  let child = components.find(e => e.id === struct.values);
  for (let i = 0; i < data.length; i += 1) {
    let {out: outValue, component: $child} = generateObject(data[i], child, true);
    out.push(outValue);
    $child.attr('data-index', i);
    $child.removeAttr('data-type');
    $el.append($child);
  }
  $el.children().first().removeClass('mt-3');
  return {out: out, component: $el};
}

function generateObject(data, struct, header) {
  let out = {};
  let $el = $('<div/>').addClass('mt-3');
  let $header = $('<div/>');
  let $body = $('<div/>');
  if (header) {
    $header.appendTo($el);
    $header.append('<button type="button" class="btn btn-danger mb-2 float-right" onclick="removeComponent(this)" data-i18n="' + struct.id + '_remove"></button>');
    let icon = 'https://cdnjs.cloudflare.com/ajax/libs/octicons/8.5.0/svg/chevron-down.svg';
    if (data._collapse) {
      icon = 'https://cdnjs.cloudflare.com/ajax/libs/octicons/8.5.0/svg/chevron-right.svg';
    }
    $header.append('<button type="button" class="btn btn-outline-dark mr-3 mb-2 float-left" onclick="collapseComponent(this)"><img src="' + icon + '" alt=""></button>');
  }
  if (struct.card !== false) {
    $el.addClass('card bg-' + struct.color);;
    $header.addClass('card-header pb-1');
    $body.addClass('card-body');
  }
  if (!data._collapse) {
    $el.append($body);
  }
  if (!struct.fields) {
    let child = components.find(e => e.id === struct.value);
    return generateObject(data, child, false);
  }
  for (let field of struct.fields) {
    if (field.collapse) {
      $body.append('<button type="button" class="btn btn-light mt-3 dropdown-toggle" onclick="toggleCollapseObject(this)" data-index="' + field.id + '" data-i18n="' + field.translate + '"></button>');
      if (data[field.id] === undefined) {
        $body.append('<div/>');
        continue;
      }
    }
    let outValue, $field;
    try {
      ({out: outValue, component: $field} = generateField(data, field, struct));
    } catch (e) {
      console.error(e);
      ({out: outValue, component: $field} = generateError('Failed generating "' + field.id + '" field'));
    }
    if ($field !== false) {
      out[field.id] = outValue;
      if (field.type === 'array') {
        let color = field.color || components.find(e => e.id === field.values).color;
        let $button = $('<button type="button" class="btn btn-' + color + ' mr-3" onclick="addComponent(this, \'' + field.id + '\')" data-i18n="' + field.translate + '_add"></button>');
        if (header && field.button === 'header') {
          $header.append($button.addClass('mb-2 float-left'));
        } else if (field.button === 'field') {
          $body.append($button.addClass('mt-3'));
        }
      }
      $body.append($field);
    }
  }
  $body.children().first().removeClass('mt-3');
  return {out: out, component: $el};
}

function generateField(data, field, parent) {
  if (!luckBased && field.luckBased) {
    return false;
  }
  if (field.require) {
    let passing = false;
    let filter = parent.fields.find(e => e.type === 'enum');
    for (let requirement of field.require) {
      if (typeof requirement === 'string') {
        if (requirement === correctNamespace(data[filter.id])) {
          passing = true;
        }
      } else {
        let match = true;
        for (let id in requirement) {
          if (requirement.hasOwnProperty(id)) {
            if (requirement[id] !== correctNamespace(data[parent.fields.find(e => e.id === id).id])) {
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
      return {out: undefined, component: false};
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
    let result = generateComponent(data[field.id], field);
    if (result) {
      let {out: out, component: $field} = result;
      if (field.class) {
        $field.addClass(field.class);
      }
      $field.attr('data-index', field.id);
      return {out: out, component: $field};
    }
  } catch (e) {
    console.error(e);
    return generateError('Failed generating "' + field.id + '" component');
  }
  return false;
}

function generateTooltip(str) {
  let $el = $('<button type="button" class="btn help-tooltip ml-2" data-toggle="tooltip" data-help="' + str + '">?</button>');
  $el.tooltip({title: i18next.t('$help.' + str)});
  return $el;
}

function preventNewline(e) {
  if (e.which === 13) {
    $(e.target).trigger('change');
    e.preventDefault();
  }
}
