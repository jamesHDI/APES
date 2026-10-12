const router = require('express').Router();

router.get('/', (_req, res) => {
  res.json({ status: 'ok', service: 'apes-api' });
});

module.exports = router;
