// Minimal user model backed by in-memory list (demo only)
const users = [];

function create(user) {
  const u = Object.assign({ id: `u${users.length + 1}` }, user);
  users.push(u);
  return u;
}

function findByEmail(email) {
  return users.find(u => u.email === email);
}

module.exports = { create, findByEmail };
