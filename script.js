
$("#source").val('');
$('#indentationSelect').val("2");
let indentation = 2;
let table = {
  pools: []
};
addPool();

function addPool(el) {
  table.pools.push({
    rolls: 1,
    entries: []
  });
  let $pool = $('#poolTemplate').clone();
  $pool.removeAttr('id').attr('data-index', table.pools.length - 1);
  $('#structure').append($pool);
  invalidated();
}

function removePool(el) {
  let $pool = $(el).closest('.pool');
  table.pools.pop($pool.attr('data-index'));
  $('#structure .pool').each((i, el) => {
    if ($(el).attr('data-index') > $pool.attr('data-index')) {
      $(el).attr('data-index', $(el).attr('data-index') - 1);
    }
  });
  $pool.remove();
  invalidated();
}

function updateRollsField(el) {
  let $pool = $(el).closest('.pool')
  let $rolls = $(el).closest('.rolls');
  let data = parseInt($rolls.find('.exact').val());
  if ($rolls.attr('data-type') === 'range') {
    data = {};
    let min = $rolls.find('.range.min').val();
    let max = $rolls.find('.range.max').val();
    if (min) data.min = parseInt(min);
    if (max) data.max = parseInt(max);
  } else if ($rolls.attr('data-type') === 'binomial') {
    data = {type: "minecraft:binomial"};
    let n = $rolls.find('.binomial.n').val();
    let p = $rolls.find('.binomial.p').val();
    if (n) data.n = parseInt(n);
    if (p) data.p = parseFloat(p);
  }
  table.pools[$pool.attr('data-index')].rolls = data;
  invalidated();
}

function switchExact(el) {
  let $rolls = $(el).closest('.rolls');
  $rolls.attr('data-type', 'exact');
  $rolls.find('.exact').removeClass('d-none');
  $rolls.find('.range').addClass('d-none');
  $rolls.find('.binomial').addClass('d-none');
  updateRollsField(el);
}

function switchRange(el) {
  let $rolls = $(el).closest('.rolls');
  $rolls.attr('data-type', 'range');
  $rolls.find('.exact').addClass('d-none');
  $rolls.find('.range').removeClass('d-none');
  $rolls.find('.binomial').addClass('d-none');
  updateRollsField(el);
}

function switchBinomial(el) {
  let $rolls = $(el).closest('.rolls');
  $rolls.attr('data-type', 'binomial');
  $rolls.find('.exact').addClass('d-none');
  $rolls.find('.range').addClass('d-none');
  $rolls.find('.binomial').removeClass('d-none');
  updateRollsField(el);
}

function invalidated() {
  $('#source').val(JSON.stringify(table, null, indentation));
  $('#source').autogrow();
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
