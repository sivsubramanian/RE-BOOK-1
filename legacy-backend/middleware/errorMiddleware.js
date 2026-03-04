module.exports = function (err, req, res, next) {
  console.error(err && err.stack ? err.stack : err);
  res.status(err && err.status ? err.status : 500).json({ error: err && err.message ? err.message : 'Internal Server Error' });
};
