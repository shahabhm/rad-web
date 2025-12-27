const path = require('path');
const axios = require('axios');
const yaml = require('js-yaml');
const keyBy = require('lodash/keyBy');
const { loadYaml } = require('@librechat/api');
const { logger } = require('@librechat/data-schemas');
const {
  configSchema,
  paramSettings,
  EImageOutputType,
  agentParamSettings,
  validateSettingDefinitions,
} = require('librechat-data-provider');

const projectRoot = path.resolve(__dirname, '..', '..', '..', '..');
const defaultConfigPath = path.resolve(projectRoot, 'librechat.yaml');

let i = 0;

/**
 * Load custom configuration files and caches the object if the `cache` field at root is true.
 * Validation via parsing the config file with the config schema.
 * @function loadCustomConfig
 * @returns {Promise<TCustomConfig | null>} A promise that resolves to null or the custom config object.
 * */
async function loadCustomConfig(printConfig = true) {
  console.log('=== Config Loading Debug ===');
  console.log('1. Load function called');
  console.log('2. Current directory:', process.cwd());
  console.log('3. NODE_ENV:', process.env.NODE_ENV || 'not set');
  console.log('4. CONFIG_PATH:', process.env.CONFIG_PATH || 'not set');
  
  const fs = require('fs');
  const configPath = process.env.CONFIG_PATH || path.resolve(process.cwd(), 'librechat.yaml');
  console.log('5. Using config path:', configPath);
  console.log('6. File exists:', fs.existsSync(configPath));
  
  let customConfig;
  
  if (/^https?:\/\//.test(configPath)) {
    try {
      console.log('7. Loading config from remote URL');
      const response = await axios.get(configPath);
      customConfig = response.data;
      console.log('8. Successfully loaded config from remote URL');
    } catch (error) {
      console.error('9. Error loading remote config:', error.message);
      return null;
    }
  } else {
    if (fs.existsSync(configPath)) {
      try {
        const content = fs.readFileSync(configPath, 'utf8');
        console.log('7. File content (first 200 chars):', content.substring(0, 200));
        
        customConfig = loadYaml(configPath);
        console.log('8. Parsed config:', JSON.stringify(customConfig, null, 2));
        
        if (!customConfig) {
          console.error('9. Failed to parse YAML config');
          return null;
        }
      } catch (err) {
        console.error('9. Error reading/parsing file:', err.message);
        return null;
      }
    } else {
      console.log('7. Config file does not exist at path:', configPath);
      return null;
    }
  }

    if (customConfig.reason || customConfig.stack) {
      i === 0 && logger.error('Config file YAML format is invalid:', customConfig);
      i === 0 && i++;
      return null;
    }
  }

  if (typeof customConfig === 'string') {
    try {
      customConfig = yaml.load(customConfig);
    } catch (parseError) {
      i === 0 && logger.info(`Failed to parse the YAML config from ${configPath}`, parseError);
      i === 0 && i++;
      return null;
    }
  }

  const result = configSchema.strict().safeParse(customConfig);
  if (result?.error?.errors?.some((err) => err?.path && err.path?.includes('imageOutputType'))) {
    throw new Error(
      `
Please specify a correct \`imageOutputType\` value (case-sensitive).

      The available options are:
      - ${EImageOutputType.JPEG}
      - ${EImageOutputType.PNG}
      - ${EImageOutputType.WEBP}
      
      Refer to the latest config file guide for more information:
      https://www.librechat.ai/docs/configuration/librechat_yaml`,
    );
  }
  if (!result.success) {
    let errorMessage = `Invalid custom config file at ${configPath}:
${JSON.stringify(result.error, null, 2)}`;

    logger.error(errorMessage);
    const speechError = result.error.errors.find(
      (err) =>
        err.code === 'unrecognized_keys' &&
        (err.message?.includes('stt') || err.message?.includes('tts')),
    );

    if (speechError) {
      logger.warn(`
The Speech-to-text and Text-to-speech configuration format has recently changed.
If you're getting this error, please refer to the latest documentation:

https://www.librechat.ai/docs/configuration/stt_tts`);
    }

    if (process.env.CONFIG_BYPASS_VALIDATION === 'true') {
      logger.warn(
        'CONFIG_BYPASS_VALIDATION is enabled. Continuing with default configuration despite validation errors.',
      );
      return null;
    }

    logger.error(
      'Exiting due to invalid configuration. Set CONFIG_BYPASS_VALIDATION=true to bypass this check.',
    );
    process.exit(1);
  } else {
    if (printConfig) {
      logger.info('Custom config file loaded:');
      logger.info(JSON.stringify(customConfig, null, 2));
      logger.debug('Custom config:', customConfig);
    }
  }

  (customConfig.endpoints?.custom ?? [])
    .filter((endpoint) => endpoint.customParams)
    .forEach((endpoint) => parseCustomParams(endpoint.name, endpoint.customParams));

  if (result.data.modelSpecs) {
    customConfig.modelSpecs = result.data.modelSpecs;
  }

  return customConfig;
}

// Validate and fill out missing values for custom parameters
function parseCustomParams(endpointName, customParams) {
  const paramEndpoint = customParams.defaultParamsEndpoint;
  customParams.paramDefinitions = customParams.paramDefinitions || [];

  // Checks if `defaultParamsEndpoint` is a key in `paramSettings`.
  const validEndpoints = new Set([
    ...Object.keys(paramSettings),
    ...Object.keys(agentParamSettings),
  ]);
  if (!validEndpoints.has(paramEndpoint)) {
    throw new Error(
      `defaultParamsEndpoint of "${endpointName}" endpoint is invalid. ` +
        `Valid options are ${Array.from(validEndpoints).join(', ')}`,
    );
  }

  // creates default param maps
  const regularParams = paramSettings[paramEndpoint] ?? [];
  const agentParams = agentParamSettings[paramEndpoint] ?? [];
  const defaultParams = regularParams.concat(agentParams);
  const defaultParamsMap = keyBy(defaultParams, 'key');

  // TODO: Remove this check once we support new parameters not part of default parameters.
  // Checks if every key in `paramDefinitions` is valid.
  const validKeys = new Set(Object.keys(defaultParamsMap));
  const paramKeys = customParams.paramDefinitions.map((param) => param.key);
  if (paramKeys.some((key) => !validKeys.has(key))) {
    throw new Error(
      `paramDefinitions of "${endpointName}" endpoint contains invalid key(s). ` +
        `Valid parameter keys are ${Array.from(validKeys).join(', ')}`,
    );
  }

  // Fill out missing values for custom param definitions
  customParams.paramDefinitions = customParams.paramDefinitions.map((param) => {
    return { ...defaultParamsMap[param.key], ...param, optionType: 'custom' };
  });

  try {
    validateSettingDefinitions(customParams.paramDefinitions);
  } catch (e) {
    throw new Error(
      `Custom parameter definitions for "${endpointName}" endpoint is malformed: ${e.message}`,
    );
  }
}

module.exports = loadCustomConfig;
