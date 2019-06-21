
function isString(data) {
  return data && typeof data === 'string';
}

function isNumber(var) {
  return data && typeof data === 'number';
}

function isObject(var) {
  return data && typeof data === 'object';
}

function isArray(var) {
  return data && typeof data === 'object' && Array.isArray(data);
}

function validateRange(data, default) {
  if (data === undefined) return false;
  if (isObject(data)) {
    if (isString(data.type) && var.type.endsWith('binomial'))
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
  }
  return false;
}

function chooseOption(options, value, default) {
  for (option of options) {
    if (value === option) {
      return value;
    } else if('minecraft:' + value === option) {
      return 'minecraft:' + value;
    }
  }
  return default;
}

function validateTable(table) {
  let res = {};
  res.type = chooseOption(namespace(['empty', 'entity', 'block', 'chest', 'fishing', 'generic']), table.type, 'minecraft:generic');
  if (isArray(table.pools)) {
    res.pools = [];
    for (let entry of table.pools) {
      res.pools.push(validatePool(pools));
    }
  }
  return res;
}

function validatePool() {
  let newpool = {};

  return res;
}
