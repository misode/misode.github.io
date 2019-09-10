
function isString(data) {
  return data != undefined && typeof data === 'string';
}

function isNumber(data) {
  return data != undefined && typeof data === 'number';
}

function isObject(data) {
  return data != undefined && typeof data === 'object' && !Array.isArray(data);
}

function isArray(data) {
  return data != undefined && typeof data === 'object' && Array.isArray(data);
}

function validateRange(data) {
  if (data === undefined) return false;
  if (isObject(data)) {
    if (isString(data.type) && data.type.endsWith('binomial')) {
      if (isNumber(data.n) && isNumber(data.p)) {
        return {
          type: 'minecraft:binomial',
          n: data.n,
          p: data.p
        };
      }
    }
    let res = {};
    if (isNumber(data.min)) res.min = data.min;
    if (isNumber(data.max)) res.max = data.max;
  }
  return false;
}

function chooseOption(options, value, def) {
  for (option of options) {
    if (value === option) {
      return value;
    } else if('minecraft:' + value === option) {
      return 'minecraft:' + value;
    }
  }
  return def;
}

function namespace(list) {
  let res = [];
  for (let item of list) {
    res.push('minecraft:' + item);
  }
  return res;
}

function validateTable(table) {
  let res = {};
  res.type = chooseOption(namespace(['empty', 'entity', 'block', 'chest', 'fishing', 'generic']), table.type, 'minecraft:generic');
  res.pools = [];
  if (isArray(table.pools)) {
    for (let pool of table.pools) {
      res.pools.push(validatePool(pool));
    }
  }
  return res;
}

function validatePool() {
  let res = {};
  res
  return res;
}
