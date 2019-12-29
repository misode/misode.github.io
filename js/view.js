
const themes = ["light", "dark"];

themes.forEach(v => $('#themeList').append(`<a class="dropdown-item" onclick="changeTheme('${v}')" data-i18n="theme.${v}"></a>`));

addListener(updateView);

changeTheme(localStorage.getItem('theme'))
function changeTheme(theme) {
  console.log(theme);
  if (theme === null) {
    theme = 'light';
  }
  $('body').attr('data-style', theme);
  localStorage.setItem('theme', theme);
}

function updateView() {
  if (structure) {
    let {out: sourceOut, component: $component} = generateSourceAndView(table, structure);
    $('#structure').removeClass('d-none').html('');
    $('#descriptionSpan').attr('data-i18n', structure.description);
    $('title').attr('data-i18n', structure.title);
    $('#structure').append($component);
    if (i18next.isInitialized) {
      $('html').localize();
    }
    $('#source').val(JSON.stringify(sourceOut, null, indentation));
  }
}

function generateSourceAndView(data, struct) {
  if (struct.id === 'loot-table') {
    $('#lootTableToolbar').removeClass('d-none');
    $('#structure').attr('data-index', 'pools');
    return generateTable(data, struct);
  } else {
    let {out: sourceOut, component: $component} = generateObject(data, struct);
    $component.removeClass('mt-3');
    return {out: sourceOut, component: $component};
  }
}

function generateTable(data, struct) {
  let out = {};
  let $el = $('<div/>');

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

function generateComponent(data, struct, options) {
  switch (struct.type) {
    case 'string': return generateString(data, struct, options);
    case 'int': return generateString(data, struct, options);
    case 'float': return generateString(data, struct, options);
    case 'string-list': return generateString(data, struct, options);
    case 'chance-list': return generateString(data, struct, options);
    case 'boolean': return generateBoolean(data, struct, options);
    case 'random': return generateRandom(data, struct, options);
    case 'range': return generateRange(data, struct, options);
    case 'boundary': return generateBoundary(data, struct, options);
    case 'enum': return generateEnum(data, struct, options);
    case 'set': return generateSet(data, struct, options);
    case 'map': return generateMap(data, struct, options);
    case 'json': return generateJson(data, struct, options);
    case 'json-list': return generateJsonList(data, struct, options);
    case 'nbt': return generateNbt(data, struct, options);
    case 'array': return generateArray(data, struct, options);
    case 'object': return generateObject(data, struct, options);
    case 'error': return generateError(struct, options);
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
      if (structure.id === 'predicate' || value.require.includes(correctNamespace(table.type))) {
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
    if (data && (data.includes(value))) continue;
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
  return {out: data, component: $el};
}

function generateMap(data, struct) {
  let $el = $('#components').find('[data-type="map"]').clone();
  let $input = $el.find('input')
  let out;
  $el.attr('data-index', struct.id).attr('data-item-type', struct.values.type);
  $el.find('[data-name="1"]').attr('data-i18n', struct.translate);
  $el.find('[data-name="2"]').attr('data-i18n', struct.translate + '_add');
  $input.attr('data-i18n', `[placeholder]${struct.translatePlaceholder}`);
  $input.keypress((e) => {if (e.which == 13) addToMap(e.target);});
  if (data) {
    for (let key of Object.keys(data)) {
      out = out || {}
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
        $item.addClass("ml-3");
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
    let {out: outValue, component: $child} = generateComponent(data[i], child, {header: true});
    out.push(outValue);
    $child.attr('data-index', i);
    $child.removeAttr('data-type');
    $el.append($child);
  }
  $el.children().first().removeClass('mt-3');
  return {out: out, component: $el};
}

function generateObject(data, struct, options) {
  let out = {};
  let $el = $('<div/>').addClass('mt-3');
  let $header = $('<div/>');
  let $body = $('<div/>');
  if (options && options.header) {
    $header.appendTo($el);
    $header.append('<button type="button" class="btn btn-danger mb-2 float-right" onclick="removeComponent(this)" data-i18n="' + struct.id + '_remove"></button>');
    let icon = 'https://cdnjs.cloudflare.com/ajax/libs/octicons/8.5.0/svg/chevron-down.svg';
    if (data._collapse) {
      icon = 'https://cdnjs.cloudflare.com/ajax/libs/octicons/8.5.0/svg/chevron-right.svg';
    }
    $header.append('<button type="button" class="btn btn-outline-dark mr-3 mb-2 float-left" onclick="collapseComponent(this)"><img src="' + icon + '" alt=""></button>');
  }
  let parentFilter = options ? options.filter : undefined;
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
    return generateObject(data, child, options);
  }
  let filter;
  for (let field of struct.fields) {
    if (filter === undefined) {
      filterField = struct.fields.find(e => e.type === 'enum' && e.filter === true);
      if (filterField) {
        filter = data[filterField.id];
      }
    }
    if (!luckBased && field.luckBased) {
      continue;
    }
    if (field.require && !field.require.includes(filter || parentFilter)) {
      continue;
    }
    if (field.collapse) {
      let hasNoValue = data[field.id] === undefined;
      let arrowDirection = hasNoValue ? 'dropright' : 'dropdown'
      $body.append('<span class="' + arrowDirection + '"><button type="button" class="mt-3 btn btn-light dropdown-toggle" onclick="toggleCollapseObject(this)" data-index="' + field.id + '" data-i18n="' + field.translate + '"></button></span>');
      if (field.help) {
        $body.find('span').append(generateTooltip(field.translate));
      }
      if (hasNoValue) {
        $body.append('<div/>');
        continue;
      }
    }
    let outValue, $field;
    try {
      ({out: outValue, component: $field} = generateField(data, field, struct, filter));
    } catch (e) {
      console.error(e);
      ({out: outValue, component: $field} = generateError('Failed generating "' + field.id + '" field'));
    }
    if ($field !== false) {
      out[field.id] = outValue;
      if (field.type === 'array') {
        let color = field.color || components.find(e => e.id === field.values).color;
        let $button = $('<button type="button" class="btn btn-' + color + ' mr-3" onclick="addComponent(this, \'' + field.id + '\')" data-i18n="' + field.translate + '_add"></button>');
        if (options && options.header && field.button === 'header') {
          $header.append($button.addClass('mb-2 float-left'));
        } else if (field.button === 'field') {
          $body.append($button.addClass('mt-3'));
        }
      }
      $body.append($field);
    }
  }
  $body.children().first().children('button').removeClass('mt-3');
  $body.children().first().removeClass('mt-3');
  return {out: out, component: $el};
}

function generateField(data, field, parent, filter) {
  if (data[field.id] === undefined) {
    if (field.type === 'object') {
      data[field.id] = {};
    } else if (field.type === 'enum' && field.default) {
      data[field.id] = field.default;
    }
  }
  try {
    let result = generateComponent(data[field.id], field, {filter});
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
  $el.tooltip({title: i18next.t('help.' + str)});
  return $el;
}

function preventNewline(e) {
  if (e.which === 13) {
    $(e.target).trigger('change');
    e.preventDefault();
  }
}
