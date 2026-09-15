const ActivityLog = require('../models/ActivityLog');

/**
 * Fire-and-forget audit log write. Never throws — a logging failure should
 * never block the underlying action from completing.
 */
async function logActivity({ action, entityType = '', entityLabel = '', details = '', user, userName = '' }) {
  try {
    await ActivityLog.create({
      action,
      entityType,
      entityLabel,
      details,
      user: user?._id || user,
      userName: userName || user?.name || '',
    });
  } catch (err) {
    console.error('Failed to write activity log:', err.message);
  }
}

module.exports = logActivity;
