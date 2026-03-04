// Simple auth middleware for demo purposes
module.exports = function (req, res, next) {
  // Accept a header `x-user` with username for demo
  const userHeader = req.get('x-user');
  if (userHeader) {
    req.user = { name: userHeader };
  }
  next();
};
