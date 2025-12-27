const { CacheKeys } = require('librechat-data-provider');
const { logger, AppService } = require('@librechat/data-schemas');
const { loadAndFormatTools } = require('~/server/services/start/tools');
const loadCustomConfig = require('./loadCustomConfig');
const { setCachedTools } = require('./getCachedTools');
const getLogStores = require('~/cache/getLogStores');
const paths = require('~/config/paths');

const BASE_CONFIG_KEY = '_BASE_';

const loadBaseConfig = async () => {
  /** @type {TCustomConfig} */
  const config = (await loadCustomConfig()) ?? {};
  /** @type {Record<string, FunctionTool>} */
  const systemTools = loadAndFormatTools({
    adminFilter: config.filteredTools,
    adminIncluded: config.includedTools,
    directory: paths.structuredTools,
  });
  return AppService({ config, paths, systemTools });
};

/**
 * Get the app configuration based on user context
 * @param {Object} [options]
 * @param {string} [options.role] - User role for role-based config
 * @param {boolean} [options.refresh] - Force refresh the cache
 * @returns {Promise<AppConfig>}
 */
async function getAppConfig(options = {}) {
  console.log('[Config Debug] getAppConfig called with options:', JSON.stringify(options, null, 2));
  const { role, refresh } = options;

  const cache = getLogStores(CacheKeys.APP_CONFIG);
  const cacheKey = role ? `${CacheKeys.APP_CONFIG}:${role}` : CacheKeys.APP_CONFIG;
  
  console.log(`[Config Debug] Using cache key: ${cacheKey}`);
  console.log(`[Config Debug] Cache refresh requested: ${!!refresh}`);
  
  let appConfig = await cache.get(cacheKey);
  console.log(`[Config Debug] Cached config found: ${!!appConfig}`);

  if (!appConfig || refresh) {
    console.log('[Config Debug] Loading base config...');
    const baseConfig = await loadBaseConfig();
    console.log('[Config Debug] Base config loaded, setting cache...');
    appConfig = baseConfig;
    await cache.set(cacheKey, baseConfig);
    console.log('[Config Debug] Cache updated');
  }

  if (!appConfig) {
    console.log('[Config Debug] No config found in cache, loading base config...');
    appConfig = await loadBaseConfig();

    if (!appConfig) {
      const errorMsg = 'Failed to load app configuration through AppService';
      console.error(`[Config Debug] ${errorMsg}`);
      throw new Error(errorMsg);
    }

    if (appConfig.availableTools) {
      console.log('[Config Debug] Setting cached tools...');
      await setCachedTools(appConfig.availableTools);
    }

    console.log('[Config Debug] Caching loaded config...');
    await cache.set(cacheKey, appConfig);
  }

  // For now, return the base config
  // In the future, this is where we'll apply role-based modifications
  if (role) {
    // TODO: Apply role-based config modifications
    // const roleConfig = await applyRoleBasedConfig(baseConfig, role);
    // await cache.set(cacheKey, roleConfig);
    // return roleConfig;
  }

  return baseConfig;
}

/**
 * Clear the app configuration cache
 * @returns {Promise<boolean>}
 */
async function clearAppConfigCache() {
  const cache = getLogStores(CacheKeys.CONFIG_STORE);
  const cacheKey = CacheKeys.APP_CONFIG;
  return await cache.delete(cacheKey);
}

module.exports = {
  getAppConfig,
  clearAppConfigCache,
};
