
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
  let $pool = $(el).parent().parent();
  table.pools.pop($pool.attr('data-index'));
  $('#structure .pool').each((i, el) => {
    if ($(el).attr('data-index') > $pool.attr('data-index')) {
      $(el).attr('data-index', $(el).attr('data-index') - 1);
    }
  });
  $pool.remove();
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

function updateRollsField(el) {
  let $pool = $(el).parent().parent().parent();
  let value = parseInt($(el).val());
  table.pools[$pool.attr('data-index')].rolls = value;
  invalidated();
}

function invalidated() {
  $('#source').val(JSON.stringify(table, null, indentation));
  $('#source').autogrow();
}

function copySource(el) {
  $('#source').get()[0].select();
  document.execCommand('copy');
}
