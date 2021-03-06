/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Type } from '@kbn/config-schema';
import { Authentication, AuthenticationResult, SAMLLoginStep } from '../authentication';
import { defineAuthenticationRoutes } from './authentication';
import {
  httpServerMock,
  httpServiceMock,
  loggingServiceMock,
} from '../../../../../src/core/server/mocks';
import { ConfigType } from '../config';
import { IRouter, RequestHandler, RouteConfig } from '../../../../../src/core/server';
import { LegacyAPI } from '../plugin';
import { authenticationMock } from '../authentication/index.mock';
import { mockAuthenticatedUser } from '../../common/model/authenticated_user.mock';

describe('SAML authentication routes', () => {
  let router: jest.Mocked<IRouter>;
  let authc: jest.Mocked<Authentication>;
  beforeEach(() => {
    router = httpServiceMock.createRouter();
    authc = authenticationMock.create();

    defineAuthenticationRoutes({
      router,
      basePath: httpServiceMock.createBasePath(),
      logger: loggingServiceMock.create().get(),
      config: { authc: { providers: ['saml'] } } as ConfigType,
      authc,
      getLegacyAPI: () => ({ cspRules: 'test-csp-rule' } as LegacyAPI),
    });
  });

  it('does not register any SAML related routes if SAML auth provider is not enabled', () => {
    const testRouter = httpServiceMock.createRouter();
    defineAuthenticationRoutes({
      router: testRouter,
      basePath: httpServiceMock.createBasePath(),
      logger: loggingServiceMock.create().get(),
      config: { authc: { providers: ['basic'] } } as ConfigType,
      authc: authenticationMock.create(),
      getLegacyAPI: () => ({ cspRules: 'test-csp-rule' } as LegacyAPI),
    });

    const samlRoutePathPredicate = ([{ path }]: [{ path: string }, any]) =>
      path.startsWith('/api/security/saml/');
    expect(testRouter.get.mock.calls.find(samlRoutePathPredicate)).toBeUndefined();
    expect(testRouter.post.mock.calls.find(samlRoutePathPredicate)).toBeUndefined();
    expect(testRouter.put.mock.calls.find(samlRoutePathPredicate)).toBeUndefined();
    expect(testRouter.delete.mock.calls.find(samlRoutePathPredicate)).toBeUndefined();
  });

  describe('Assertion consumer service endpoint', () => {
    let routeHandler: RequestHandler<any, any, any>;
    let routeConfig: RouteConfig<any, any, any>;
    beforeEach(() => {
      const [acsRouteConfig, acsRouteHandler] = router.post.mock.calls.find(
        ([{ path }]) => path === '/api/security/saml/callback'
      )!;

      routeConfig = acsRouteConfig;
      routeHandler = acsRouteHandler;
    });

    it('additionally registers BWC route', () => {
      expect(
        router.post.mock.calls.find(([{ path }]) => path === '/api/security/saml/callback')
      ).toBeDefined();
      expect(
        router.post.mock.calls.find(([{ path }]) => path === '/api/security/v1/saml')
      ).toBeDefined();
    });

    it('correctly defines route.', () => {
      expect(routeConfig.options).toEqual({ authRequired: false });
      expect(routeConfig.validate).toEqual({
        body: expect.any(Type),
        query: undefined,
        params: undefined,
      });

      const bodyValidator = (routeConfig.validate as any).body as Type<any>;
      expect(bodyValidator.validate({ SAMLResponse: 'saml-response' })).toEqual({
        SAMLResponse: 'saml-response',
      });

      expect(bodyValidator.validate({ SAMLResponse: 'saml-response', RelayState: '' })).toEqual({
        SAMLResponse: 'saml-response',
        RelayState: '',
      });

      expect(
        bodyValidator.validate({ SAMLResponse: 'saml-response', RelayState: 'relay-state' })
      ).toEqual({ SAMLResponse: 'saml-response', RelayState: 'relay-state' });

      expect(() => bodyValidator.validate({})).toThrowErrorMatchingInlineSnapshot(
        `"[SAMLResponse]: expected value of type [string] but got [undefined]"`
      );

      expect(() =>
        bodyValidator.validate({ SAMLResponse: 'saml-response', UnknownArg: 'arg' })
      ).toThrowErrorMatchingInlineSnapshot(`"[UnknownArg]: definition for this key is missing"`);
    });

    it('returns 500 if authentication throws unhandled exception.', async () => {
      const unhandledException = new Error('Something went wrong.');
      authc.login.mockRejectedValue(unhandledException);

      const internalServerErrorResponse = Symbol('error');
      const responseFactory = httpServerMock.createResponseFactory();
      responseFactory.internalError.mockReturnValue(internalServerErrorResponse as any);

      const request = httpServerMock.createKibanaRequest({
        body: { SAMLResponse: 'saml-response' },
      });

      await expect(routeHandler({} as any, request, responseFactory)).resolves.toBe(
        internalServerErrorResponse
      );

      expect(authc.login).toHaveBeenCalledWith(request, {
        provider: 'saml',
        value: {
          step: SAMLLoginStep.SAMLResponseReceived,
          samlResponse: 'saml-response',
        },
      });
    });

    it('returns 401 if authentication fails.', async () => {
      const failureReason = new Error('Something went wrong.');
      authc.login.mockResolvedValue(AuthenticationResult.failed(failureReason));

      const unauthorizedErrorResponse = Symbol('error');
      const responseFactory = httpServerMock.createResponseFactory();
      responseFactory.unauthorized.mockReturnValue(unauthorizedErrorResponse as any);

      await expect(
        routeHandler(
          {} as any,
          httpServerMock.createKibanaRequest({ body: { SAMLResponse: 'saml-response' } }),
          responseFactory
        )
      ).resolves.toBe(unauthorizedErrorResponse);

      expect(responseFactory.unauthorized).toHaveBeenCalledWith({ body: failureReason });
    });

    it('returns 401 if authentication is not handled.', async () => {
      authc.login.mockResolvedValue(AuthenticationResult.notHandled());

      const unauthorizedErrorResponse = Symbol('error');
      const responseFactory = httpServerMock.createResponseFactory();
      responseFactory.unauthorized.mockReturnValue(unauthorizedErrorResponse as any);

      await expect(
        routeHandler(
          {} as any,
          httpServerMock.createKibanaRequest({ body: { SAMLResponse: 'saml-response' } }),
          responseFactory
        )
      ).resolves.toBe(unauthorizedErrorResponse);

      expect(responseFactory.unauthorized).toHaveBeenCalledWith({ body: undefined });
    });

    it('returns 401 if authentication completes with unexpected result.', async () => {
      authc.login.mockResolvedValue(AuthenticationResult.succeeded(mockAuthenticatedUser()));

      const unauthorizedErrorResponse = Symbol('error');
      const responseFactory = httpServerMock.createResponseFactory();
      responseFactory.unauthorized.mockReturnValue(unauthorizedErrorResponse as any);

      await expect(
        routeHandler(
          {} as any,
          httpServerMock.createKibanaRequest({ body: { SAMLResponse: 'saml-response' } }),
          responseFactory
        )
      ).resolves.toBe(unauthorizedErrorResponse);

      expect(responseFactory.unauthorized).toHaveBeenCalledWith({ body: undefined });
    });

    it('redirects if required by the authentication process.', async () => {
      authc.login.mockResolvedValue(AuthenticationResult.redirectTo('http://redirect-to/path'));

      const redirectResponse = Symbol('error');
      const responseFactory = httpServerMock.createResponseFactory();
      responseFactory.redirected.mockReturnValue(redirectResponse as any);

      const request = httpServerMock.createKibanaRequest({
        body: { SAMLResponse: 'saml-response' },
      });

      await expect(routeHandler({} as any, request, responseFactory)).resolves.toBe(
        redirectResponse
      );

      expect(authc.login).toHaveBeenCalledWith(request, {
        provider: 'saml',
        value: {
          step: SAMLLoginStep.SAMLResponseReceived,
          samlResponse: 'saml-response',
        },
      });

      expect(responseFactory.redirected).toHaveBeenCalledWith({
        headers: { location: 'http://redirect-to/path' },
      });
    });
  });
});
