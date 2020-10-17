import { API } from 'homebridge';

import { PLATFORM_NAME } from './settings';
import { HttpIrTvPlugin } from './HttpIrTvPlugin';

/**
 * This method registers the platform with Homebridge
 */
export = (api: API) => {
  api.registerPlatform(PLATFORM_NAME, HttpIrTvPlugin);
};
