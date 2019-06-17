
$("#source").val('');
$('#tableType').val("minecraft:generic");
$('#indentationSelect').val("2");
let indentation = 2;
let table = {
  type: "minecraft:generic",
  pools: []
};
addPool();

function addPool(el) {
  table.pools.push({
    rolls: 1,
    entries: []
  });
  invalidated();
}

function removePool(el) {
  let index = parseInt($(el).closest('.pool').attr('data-index'));
  if (index === 0) {
    table.pools.shift();
  } else {
    table.pools.splice(index, index);
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
  table.pools[$(el).closest('.pool').attr('data-index')].rolls = data;
  invalidated();
}

function updateTableType() {
  table.type = $('#tableType').val();
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

function generateStructure() {
  $('#structure').html('');

  for (let i = 0; i < table.pools.length; i += 1) {
    let pool = table.pools[i];
    let $pool = $('#poolTemplate').clone();
    $pool.removeAttr('id').attr('data-index', i);
    // Rolls
    let $rolls = $pool.find('.rolls');
    if (typeof pool.rolls === 'object') {
      if (pool.rolls.type && pool.rolls.type.match(/(minecraft:)?binomial/)) {
        $rolls.attr('data-type', 'binomial');
        $rolls.find('.binomial').removeClass('d-none');
        $rolls.find('.binomial.n').val(pool.rolls.n);
        $rolls.find('.binomial.p').val(pool.rolls.p);
      } else {
        $rolls.attr('data-type', 'range');
        $rolls.find('.range').removeClass('d-none');
        $rolls.find('.range.min').val(pool.rolls.min);
        $rolls.find('.range.max').val(pool.rolls.max);
      }
    } else {
      $rolls.attr('data-type', 'exact');
      $rolls.find('.exact').removeClass('d-none');
      $rolls.find('.exact').val(pool.rolls);
    }
    $('#structure').append($pool);
  }
}
