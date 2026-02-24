const path = require('path');
const { readJson, writeJson } = require('../utils/helpers');

const dataPath = path.join(__dirname, '..', 'data', 'transactions.json');

function findAll() {
  return readJson(dataPath) || [];
}

function create(payload) {
  const list = readJson(dataPath) || [];
  const id = `t${list.length + 1}`;
  const entry = Object.assign({ id }, payload);
  list.unshift(entry);
  writeJson(dataPath, list);
  return entry;
}

module.exports = { findAll, create };
