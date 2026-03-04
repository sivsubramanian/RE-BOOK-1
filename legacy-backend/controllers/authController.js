// Minimal auth controller for demo only
const users = [];

exports.signup = (req, res) => {
  const { name, email } = req.body;
  if (!name || !email) return res.status(400).json({ error: 'name and email required' });
  const user = { id: `u${users.length + 1}`, name, email };
  users.push(user);
  res.json({ ok: true, user });
};

exports.login = (req, res) => {
  const { email } = req.body;
  const user = users.find(u => u.email === email);
  if (!user) return res.status(404).json({ error: 'User not found' });
  // In a real app return JWT; here return user info
  res.json({ ok: true, user });
};
