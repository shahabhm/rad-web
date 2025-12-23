const { Strategy: CustomStrategy } = require('passport-custom');
const { logger } = require('@librechat/data-schemas');
const { findUser } = require('~/models');
const { authenticateWithPlanka } = require('~/lib/utils/plankaClient');

/**
 * Planka Passport Strategy
 * Authenticates users via Planka credentials
 */
function setupPlankaStrategy() {
  return new CustomStrategy(async function (req, done) {
    try {
      const { emailOrUsername, password } = req.body;

      if (!emailOrUsername || !password) {
        logger.error('[Planka Strategy] Missing credentials');
        return done(null, false, { message: 'Email/username and password are required' });
      }

      const plankaBaseUrl = process.env.PLANKA_BASE_URL;
      
      if (!plankaBaseUrl) {
        logger.error('[Planka Strategy] PLANKA_BASE_URL not configured');
        return done(null, false, { message: 'Planka integration is not configured' });
      }

      // Authenticate with Planka
      let plankaAuth;
      try {
        plankaAuth = await authenticateWithPlanka(plankaBaseUrl, emailOrUsername, password);
      } catch (error) {
        logger.error('[Planka Strategy] Authentication failed', error);
        return done(null, false, { message: 'Invalid Planka credentials' });
      }

      const { user: plankaUser } = plankaAuth;

      if (!plankaUser || !plankaUser.email) {
        logger.error('[Planka Strategy] No user data from Planka');
        return done(null, false, { message: 'Failed to get user data from Planka' });
      }

      // Find LibreChat user by email
      const librechatUser = await findUser({ email: plankaUser.email });

      if (!librechatUser) {
        logger.error('[Planka Strategy] User not found in LibreChat');
        return done(null, false, { 
          message: 'User not found. Account will be created during Planka login.',
        });
      }

      // Store Planka data for later use in the request
      req.plankaAuth = plankaAuth;

      logger.info(`[Planka Strategy] User ${librechatUser.email} authenticated`);
      return done(null, librechatUser);

    } catch (error) {
      logger.error('[Planka Strategy] Unexpected error', error);
      return done(error);
    }
  });
}

module.exports = setupPlankaStrategy;
