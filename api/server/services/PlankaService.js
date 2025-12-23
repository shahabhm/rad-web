const { encrypt, decrypt } = require('@librechat/api');
const { logger } = require('@librechat/data-schemas');
const { Key } = require('~/db/models');

/**
 * Planka Service
 * Handles secure storage and retrieval of Planka tokens
 */

const PLANKA_KEY_NAME = 'planka_token';

/**
 * Store Planka access token for a user
 * @param {string} userId - User ID
 * @param {string} accessToken - Planka access token
 * @param {Object} [userData] - Optional user data from Planka
 * @returns {Promise<void>}
 */
async function storePlankaToken(userId, accessToken, userData = null) {
  try {
    const tokenData = {
      accessToken,
      userData,
      connectedAt: new Date(),
    };

    const encryptedValue = await encrypt(JSON.stringify(tokenData));

    await Key.findOneAndUpdate(
      { userId, name: PLANKA_KEY_NAME },
      {
        userId,
        name: PLANKA_KEY_NAME,
        value: encryptedValue,
        updatedAt: new Date(),
      },
      { upsert: true, new: true },
    );

    logger.info(`[Planka] Stored token for user ${userId}`);
  } catch (error) {
    logger.error('[Planka] Error storing token', error);
    throw error;
  }
}

/**
 * Get Planka access token for a user
 * @param {string} userId - User ID
 * @returns {Promise<{accessToken: string, userData: Object}|null>} Token data or null
 */
async function getPlankaToken(userId) {
  try {
    const keyDoc = await Key.findOne({ userId, name: PLANKA_KEY_NAME }).lean();
    
    if (!keyDoc) {
      return null;
    }

    const decryptedValue = await decrypt(keyDoc.value);
    const tokenData = JSON.parse(decryptedValue);
    
    return tokenData;
  } catch (error) {
    logger.error('[Planka] Error retrieving token', error);
    return null;
  }
}

/**
 * Remove Planka token for a user
 * @param {string} userId - User ID
 * @returns {Promise<boolean>} True if token was removed
 */
async function removePlankaToken(userId) {
  try {
    const result = await Key.deleteOne({ userId, name: PLANKA_KEY_NAME });
    logger.info(`[Planka] Removed token for user ${userId}`);
    return result.deletedCount > 0;
  } catch (error) {
    logger.error('[Planka] Error removing token', error);
    return false;
  }
}

/**
 * Check if user has Planka connected
 * @param {string} userId - User ID
 * @returns {Promise<boolean>} True if connected
 */
async function isPlankaConnected(userId) {
  const token = await getPlankaToken(userId);
  return token !== null && !!token.accessToken;
}

module.exports = {
  storePlankaToken,
  getPlankaToken,
  removePlankaToken,
  isPlankaConnected,
  PLANKA_KEY_NAME,
};
