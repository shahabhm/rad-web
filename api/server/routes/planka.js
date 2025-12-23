const express = require('express');
const { logger } = require('@librechat/data-schemas');
const {
  plankaLoginController,
  linkPlankaAccountController,
  unlinkPlankaAccountController,
  getPlankaStatusController,
} = require('~/server/controllers/PlankaController');
const middleware = require('~/server/middleware');

const router = express.Router();

// Check if Planka integration is enabled
const isPlankaEnabled = () => {
  return !!(
    process.env.PLANKA_BASE_URL &&
    process.env.PLANKA_INTEGRATION_ENABLED === 'true'
  );
};

// Middleware to check if Planka is enabled
const checkPlankaEnabled = (req, res, next) => {
  if (!isPlankaEnabled()) {
    return res.status(503).json({
      message: 'Planka integration is not enabled',
    });
  }
  next();
};

/**
 * @route POST /api/planka/login
 * @desc Login with Planka credentials - creates LibreChat account if needed
 * @access Public
 */
router.post(
  '/login',
  middleware.loginLimiter,
  middleware.checkBan,
  checkPlankaEnabled,
  plankaLoginController,
);

/**
 * @route POST /api/planka/link
 * @desc Link existing LibreChat account with Planka
 * @access Private
 */
router.post(
  '/link',
  middleware.requireJwtAuth,
  checkPlankaEnabled,
  linkPlankaAccountController,
);

/**
 * @route POST /api/planka/unlink
 * @desc Unlink Planka account from LibreChat
 * @access Private
 */
router.post(
  '/unlink',
  middleware.requireJwtAuth,
  checkPlankaEnabled,
  unlinkPlankaAccountController,
);

/**
 * @route GET /api/planka/status
 * @desc Get Planka connection status for current user
 * @access Private
 */
router.get(
  '/status',
  middleware.requireJwtAuth,
  checkPlankaEnabled,
  getPlankaStatusController,
);

/**
 * @route GET /api/planka/config
 * @desc Get Planka integration configuration
 * @access Public
 */
router.get('/config', (req, res) => {
  res.json({
    enabled: isPlankaEnabled(),
    baseUrl: isPlankaEnabled() ? process.env.PLANKA_BASE_URL : null,
  });
});

module.exports = router;
