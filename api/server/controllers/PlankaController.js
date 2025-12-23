const { logger } = require('@librechat/data-schemas');
const { createUser, findUser } = require('~/models');
const { authenticateWithPlanka, getCurrentUser } = require('~/lib/utils/plankaClient');
const { storePlankaToken } = require('~/server/services/PlankaService');
const { setAuthTokens } = require('~/server/services/AuthService');

/**
 * Planka Authentication Controller
 * Handles Planka login - creates LibreChat user and links Planka account
 */

/**
 * Login with Planka credentials
 * This creates a LibreChat account if it doesn't exist and links the Planka account
 * 
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
async function plankaLoginController(req, res) {
  try {
    const { emailOrUsername, password } = req.body;

    if (!emailOrUsername || !password) {
      return res.status(400).json({
        message: 'Email/username and password are required',
      });
    }

    const plankaBaseUrl = process.env.PLANKA_BASE_URL;
    
    if (!plankaBaseUrl) {
      logger.error('[Planka Login] PLANKA_BASE_URL not configured');
      return res.status(500).json({
        message: 'Planka integration is not configured',
      });
    }

    // Authenticate with Planka
    let plankaAuth;
    try {
      plankaAuth = await authenticateWithPlanka(plankaBaseUrl, emailOrUsername, password);
    } catch (error) {
      logger.error('[Planka Login] Authentication failed', error);
      return res.status(401).json({
        message: 'Invalid Planka credentials',
      });
    }

    const { accessToken, user: plankaUser } = plankaAuth;

    if (!plankaUser || !plankaUser.email) {
      logger.error('[Planka Login] No user data returned from Planka');
      return res.status(500).json({
        message: 'Failed to get user data from Planka',
      });
    }

    // Check if user already exists in LibreChat
    let librechatUser = await findUser({ email: plankaUser.email });

    if (!librechatUser) {
      // Create new LibreChat user with same credentials
      logger.info(`[Planka Login] Creating new user for ${plankaUser.email}`);
      
      const userId = await createUser({
        email: plankaUser.email,
        name: plankaUser.name || plankaUser.username || emailOrUsername,
        username: plankaUser.username || emailOrUsername.split('@')[0],
        emailVerified: true,
        provider: 'planka',
        password, // Store the same password
      });

      librechatUser = await findUser({ _id: userId });
    }

    if (!librechatUser) {
      logger.error('[Planka Login] Failed to create/find user');
      return res.status(500).json({
        message: 'Failed to create user account',
      });
    }

    // Store Planka token securely
    await storePlankaToken(librechatUser._id.toString(), accessToken, plankaUser);

    logger.info(`[Planka Login] User ${librechatUser.email} logged in successfully`);

    // Generate JWT tokens and set auth cookies
    const token = await setAuthTokens(librechatUser._id, res);

    // Remove sensitive fields
    const { password: _p, totpSecret: _t, __v, ...userResponse } = librechatUser.toObject ? librechatUser.toObject() : librechatUser;
    userResponse.id = librechatUser._id.toString();

    return res.status(200).json({
      token,
      user: {
        ...userResponse,
        plankaConnected: true,
      },
    });

  } catch (error) {
    logger.error('[Planka Login] Unexpected error', error);
    return res.status(500).json({
      message: 'An error occurred during login',
    });
  }
}

/**
 * Link existing LibreChat account with Planka
 * 
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
async function linkPlankaAccountController(req, res) {
  try {
    const { emailOrUsername, password } = req.body;
    const userId = req.user.id;

    if (!emailOrUsername || !password) {
      return res.status(400).json({
        message: 'Email/username and password are required',
      });
    }

    const plankaBaseUrl = process.env.PLANKA_BASE_URL;
    
    if (!plankaBaseUrl) {
      return res.status(500).json({
        message: 'Planka integration is not configured',
      });
    }

    // Authenticate with Planka
    let plankaAuth;
    try {
      plankaAuth = await authenticateWithPlanka(plankaBaseUrl, emailOrUsername, password);
    } catch (error) {
      logger.error('[Planka Link] Authentication failed', error);
      return res.status(401).json({
        message: 'Invalid Planka credentials',
      });
    }

    const { accessToken, user: plankaUser } = plankaAuth;

    // Store Planka token
    await storePlankaToken(userId, accessToken, plankaUser);

    logger.info(`[Planka Link] User ${userId} linked Planka account`);

    return res.status(200).json({
      message: 'Planka account linked successfully',
      plankaUser: {
        email: plankaUser.email,
        name: plankaUser.name,
        username: plankaUser.username,
      },
    });

  } catch (error) {
    logger.error('[Planka Link] Unexpected error', error);
    return res.status(500).json({
      message: 'An error occurred while linking account',
    });
  }
}

/**
 * Unlink Planka account
 * 
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
async function unlinkPlankaAccountController(req, res) {
  try {
    const userId = req.user.id;
    const { removePlankaToken } = require('~/server/services/PlankaService');
    
    await removePlankaToken(userId);

    logger.info(`[Planka Unlink] User ${userId} unlinked Planka account`);

    return res.status(200).json({
      message: 'Planka account unlinked successfully',
    });

  } catch (error) {
    logger.error('[Planka Unlink] Error', error);
    return res.status(500).json({
      message: 'Failed to unlink Planka account',
    });
  }
}

/**
 * Get Planka connection status
 * 
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
async function getPlankaStatusController(req, res) {
  try {
    const userId = req.user.id;
    const { getPlankaToken } = require('~/server/services/PlankaService');
    
    const tokenData = await getPlankaToken(userId);

    return res.status(200).json({
      connected: !!tokenData,
      userData: tokenData?.userData || null,
    });

  } catch (error) {
    logger.error('[Planka Status] Error', error);
    return res.status(500).json({
      message: 'Failed to get Planka status',
    });
  }
}

module.exports = {
  plankaLoginController,
  linkPlankaAccountController,
  unlinkPlankaAccountController,
  getPlankaStatusController,
};
