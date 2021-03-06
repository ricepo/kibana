/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as chromium from './chromium';

export type BrowserType = keyof typeof BROWSERS_BY_TYPE;

export const BROWSERS_BY_TYPE = {
  chromium,
};
