/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IContextProvider, RequestHandler } from 'src/core/server';
import { Observable } from 'rxjs';
import { take } from 'rxjs/operators';
import { ILicense } from './types';

export function createRouteHandlerContext(
  license$: Observable<ILicense>
): IContextProvider<RequestHandler<any, any, any>, 'licensing'> {
  return async function licensingRouteHandlerContext() {
    const license = await license$.pipe(take(1)).toPromise();
    return { license };
  };
}
