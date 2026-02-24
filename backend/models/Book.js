const path = require('path');
const { readJson } = require('../utils/helpers');

const dataPath = path.join(__dirname, '..', 'data', 'books.json');

function findAll({ department, semester, condition, q, limit } = {}) {
  let list = readJson(dataPath) || [];
  if (department) list = list.filter(b => b.department.toLowerCase() === String(department).toLowerCase());
  if (semester) list = list.filter(b => String(b.semester) === String(semester));
  if (condition) list = list.filter(b => b.condition === condition);
  if (q) list = list.filter(b => b.title.toLowerCase().includes(String(q).toLowerCase()) || b.author.toLowerCase().includes(String(q).toLowerCase()));
  if (limit) list = list.slice(0, Number(limit));
  return list;
}

function findById(id) {
  const list = readJson(dataPath) || [];
  return list.find(b => b.id === id);
}

module.exports = { findAll, findById };
