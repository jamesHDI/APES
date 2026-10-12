const router = require('express').Router();

// Feature routes will be introduced module-by-module. Keeping this explicit
// prevents the frontend from reaching the database directly during migration.
router.use('/health', require('./health.routes'));

module.exports = router;
