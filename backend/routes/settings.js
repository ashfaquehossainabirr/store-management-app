const express = require('express');
const StoreSettings = require('../models/StoreSettings');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();
router.use(protect);

async function getOrCreate() {
  let settings = await StoreSettings.findOne();
  if (!settings) settings = await StoreSettings.create({});
  return settings;
}

router.get('/', async (req, res) => {
  const settings = await getOrCreate();
  res.json(settings);
});

router.put('/', authorize('admin'), async (req, res) => {
  const settings = await getOrCreate();
  Object.assign(settings, req.body);
  await settings.save();
  res.json(settings);
});

module.exports = router;
