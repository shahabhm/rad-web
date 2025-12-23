const axios = require('axios');
const { logger } = require('@librechat/data-schemas');

/**
 * Planka API Client
 * Handles authentication and API calls to Planka instance
 */

/**
 * Make a request to Planka API
 * @param {Object} auth - Planka authentication
 * @param {string} auth.plankaBaseUrl - Base URL of Planka instance
 * @param {string} auth.accessToken - Planka access token
 * @param {string} path - API endpoint path
 * @param {Object} [options] - Axios options
 * @returns {Promise<any>} Response data
 */
async function plankaFetch(auth, path, options = {}) {
  const url = `${auth.plankaBaseUrl}${path.startsWith('/') ? '' : '/'}${path}`;

  try {
    const response = await axios({
      url,
      timeout: 15000,
      ...options,
      headers: {
        Accept: 'application/json',
        ...(options.headers || {}),
        Authorization: `Bearer ${auth.accessToken}`,
      },
    });

    return response.data;
  } catch (error) {
    if (error.code === 'ECONNABORTED') {
      throw new Error('Planka API timeout after 15 seconds');
    }
    
    const status = error.response?.status || 'unknown';
    const message = error.response?.data || error.message;
    throw new Error(`Planka API error (${status}): ${message}`);
  }
}

/**
 * Authenticate user with Planka using email and password
 * @param {string} plankaBaseUrl - Base URL of Planka instance
 * @param {string} emailOrUsername - User's email or username
 * @param {string} password - User's password
 * @returns {Promise<Object>} Authentication result with access token and user data
 */
async function authenticateWithPlanka(plankaBaseUrl, emailOrUsername, password) {
  try {
    const url = `${plankaBaseUrl}/api/access-tokens`;
    
    const response = await axios.post(
      url,
      {
        emailOrUsername,
        password,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        timeout: 15000,
      },
    );

    // Log the full response for debugging
    console.log('[Planka Auth] ========== RESPONSE DEBUG ==========');
    console.log('[Planka Auth] Full response data:', response.data);
    console.log('[Planka Auth] Response type:', typeof response.data);
    console.log('[Planka Auth] Response keys:', Object.keys(response.data || {}));
    console.log('[Planka Auth] Has item:', !!response.data.item);
    console.log('[Planka Auth] Has included:', !!response.data.included);
    console.log('[Planka Auth] item value:', response.data.item);
    console.log('[Planka Auth] item type:', typeof response.data.item);
    console.log('[Planka Auth] ========== END DEBUG ==========');

    // Handle different response formats
    // Planka returns the JWT token directly as item (string)
    if (typeof response.data.item === 'string') {
      const accessToken = response.data.item;
      
      // Fetch user data using the token
      logger.info('[Planka Auth] Token received, fetching user data...');
      try {
        const userResponse = await axios.get(
          `${plankaBaseUrl}/api/users/me`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              Accept: 'application/json',
            },
            timeout: 15000,
          },
        );

        console.log('[Planka Auth] User data response:', userResponse.data);
        
        const user = userResponse.data.item || userResponse.data;
        
        return {
          accessToken,
          user,
        };
      } catch (userError) {
        logger.error('[Planka Auth] Failed to fetch user data:', userError.message);
        throw new Error('Failed to fetch user data from Planka');
      }
    }

    // Legacy format: response.data.item is an object with accessToken and user
    let authData = response.data.item || response.data;
    
    // If response has both item and included, merge them
    if (response.data.included) {
      logger.info('[Planka Auth] Found included data, processing...');
      // Planka v1.0+ returns user in included array
      const userIncluded = response.data.included.find(item => item.type === 'users');
      if (userIncluded) {
        authData = {
          accessToken: authData.accessToken,
          user: userIncluded,
        };
      }
    }

    // Validate we have the required data
    if (!authData.accessToken) {
      logger.error('[Planka Auth] No access token in response:', response.data);
      throw new Error('No access token returned from Planka');
    }

    if (!authData.user) {
      logger.error('[Planka Auth] No user data in response:', response.data);
      throw new Error('No user data returned from Planka');
    }

    logger.info('[Planka Auth] Successfully authenticated user:', authData.user.email || authData.user.username);
    return authData; // Returns { accessToken, user: {...} }
  } catch (error) {
    logger.error('[Planka Auth]', error.message);
    const status = error.response?.status || 'unknown';
    const message = error.response?.data || error.message;
    throw new Error(`Planka authentication failed (${status}): ${message}`);
  }
}

/**
 * Get current user from Planka
 * @param {Object} auth - Planka authentication
 * @returns {Promise<Object>} User data
 */
async function getCurrentUser(auth) {
  return plankaFetch(auth, '/api/users/me');
}

/**
 * Logout from Planka
 * @param {Object} auth - Planka authentication
 * @returns {Promise<Object>} Logout result
 */
async function logout(auth) {
  return plankaFetch(auth, '/api/access-tokens/me', {
    method: 'DELETE',
  });
}

/**
 * Test Planka connection
 * @param {string} plankaBaseUrl - Base URL of Planka instance
 * @returns {Promise<boolean>} True if connection successful
 */
async function testConnection(plankaBaseUrl) {
  try {
    const response = await axios.get(`${plankaBaseUrl}/api/config`, {
      headers: { Accept: 'application/json' },
      timeout: 5000,
    });
    return response.status === 200;
  } catch (error) {
    logger.error('[Planka Connection Test]', error.message);
    return false;
  }
}

module.exports = {
  plankaFetch,
  authenticateWithPlanka,
  getCurrentUser,
  logout,
  testConnection,
};
