const cors = require('cors');

// Allow all origins for local development; tighten in production.
module.exports = cors({ origin: true });
