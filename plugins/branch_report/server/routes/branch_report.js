import _ from 'lodash';

/**
 * routes
 */
export default function(server) {
  server.route({
    path: '/api/branch_report/shifts',
    method: 'POST',
    handler(req) {
      const { query, emailArr, batch } = req.payload;
      const searchRequest = {
        index: 'shifts', // you can also change index to another
        size: 0, // size of raw data
        body: {
          query,
          aggs: {
            email: {
              terms: {
                field: 'drivers.email',
                size: 100000, // size of max buckets
                order: { _key: 'asc' },
              },
              aggs: {
                shiftId: {
                  terms: {
                    field: '_id',
                    size: 100000,
                    order: { _key: 'desc' },
                  },
                  aggs: {
                    start: {
                      terms: {
                        field: 'start',
                        size: 100000,
                        order: { _key: 'desc' },
                      },
                      aggs: {
                        end: {
                          terms: {
                            field: 'end',
                            size: 100000,
                            order: { _key: 'desc' },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      };

      if (emailArr.length) {
        searchRequest.body.query.bool.filter.push({ terms: { 'drivers.email': emailArr } });
      }

      if (batch) {
        if (!_.isArray(batch.params)) {
          batch.params = batch.params.query.split();
        }

        if (batch.negate) {
          searchRequest.body.query.bool.must_not.push({ terms:  { 'batch': batch.params } });
        } else {
          searchRequest.body.query.bool.filter.push({ terms:  { 'batch': batch.params } });
        }
      }

      const { callWithRequest } = server.plugins.elasticsearch.getCluster('data');
      const response = callWithRequest(req, 'search', searchRequest);

      return response;
    },
  });

  server.route({
    path: '/api/branch_report/jobs',
    method: 'POST',
    handler(req) {
      const { from, to, emailArr } = req.payload;
      const searchRequest = {
        index: 'jobs',
        size: 0,
        body: {
          query: { bool: { filter: [{ range: { start: { gt: from, lte: to } } }] } },
          aggs: {
            email: {
              terms: {
                field: 'driver.email',
                size: 100000,
                order: { _count: 'desc' },
              },
              aggs: {
                jobId: {
                  terms: {
                    field: '_id',
                    size: 100000,
                    order: { _count: 'desc' },
                  },
                  aggs: {
                    start: {
                      terms: {
                        field: 'start',
                        size: 100000,
                        order: { _count: 'desc' },
                      },
                      aggs: {
                        end: {
                          terms: {
                            field: 'end',
                            size: 100000,
                            order: { _count: 'desc' },
                          },
                          aggs: { duration: { sum: { field: 'duration' } } },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      };

      if (emailArr.length) {
        searchRequest.body.query.bool.filter.push({ terms: { 'driver.email': emailArr } });
      }

      const { callWithRequest } = server.plugins.elasticsearch.getCluster('data');

      /* this is search */
      const response = callWithRequest(req, 'search', searchRequest);

      return response;
    },
  });

  server.route({
    path: '/api/branch_report/orders',
    method: 'POST',
    handler(req) {
      const { query } = req.payload;
      const searchRequest = {
        index: 'orders',
        size: 0,
        body: {
          _source: { include: [] },
          query,
          aggs: {
            email: {
              terms: {
                field: 'delivery.courier.email',
                size: 100000,
                order: { _count: 'desc' },
              },
              aggs: {
                driverid: {
                  terms: {
                    field: 'delivery.courier._id',
                    size: 100000,
                    order: { _count: 'desc' },
                  },
                  aggs: {
                    regionName: {
                      terms: {
                        field: 'region.name',
                        size: 100000,
                        order: { _count: 'desc' },
                      },
                      aggs: {
                        deliveryTimeSum: { sum: { field: 'delivery.time' } },
                        tipSum: { sum: { field: 'fees.tip.amount' } },
                        commissionSum: { sum: { field: 'commission.driver' } },
                        adjustmentSum: { sum: { field: 'adjustments.driver' } },
                        distributionSum: { sum: { field: 'distribution.driver' } },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      };

      /* this is the way to get data from elasticsearch directly */
      const { callWithRequest } = server.plugins.elasticsearch.getCluster('data');
      const response = callWithRequest(req, 'search', searchRequest);

      /* just like GET orders/_count
      const response = await callWithRequest(req,'count'); */
      return response;
    },
  });

  server.route({
    path: '/api/branch_report/shiftEvents',
    method: 'POST',
    handler(req) {
      const { from, to, emailArr } = req.payload;
      const searchRequest = {
        index: 'order_shift_events', // you can also change index to another
        size: 0,
        body: {
          query: {
            bool: {
              filter: [
                { range: { createdAt: { gt: from, lte: to } } },
                { range: { 'data.lateDrop': { gte: 0 } } },
              ],
            },
          },
          aggs: {
            email: {
              terms: {
                field: 'user.email',
                size: 100000,
                order: { _count: 'desc' },
              },
              aggs: {
                data: {
                  range: {
                    field: 'data.lateDrop',
                    ranges: [
                      {
                        from: 0,
                        to: 13,
                        key: 'noCallnoShowDrop',
                      },
                      {
                        from: 13,
                        key: 'lateDrop',
                      },
                    ],
                  },
                },
              },
            },
          },
        },
      };

      if (emailArr.length) {
        searchRequest.body.query.bool.filter.push({ terms: { 'user.email': emailArr } });
      }

      const { callWithRequest } = server.plugins.elasticsearch.getCluster('data');
      const response = callWithRequest(req, 'search', searchRequest);

      return response;
    },
  });

  server.route({
    path: '/api/branch_report/orderEventsFailed',
    method: 'POST',
    handler(req) {
      const { from, to, emailArr, driverArr } = req.payload;
      const searchRequest = {
        index: 'order_delivery_events', // you can also change index to another
        size: 0,
        body: {
          query: {
            bool: {
              filter: [
                { term: { name: 'order.delivery.failed' } },
                { term: { 'data.stop.type': 'pickup' } },
                { range: { createdAt: { gt: from, lte: to } } },
              ],
            },
          },
          aggs: {
            email: {
              terms: {
                field: 'scope.account',
                size: 100000,
                order: { orders: 'desc' },
              },
              aggs: {
                orders: { cardinality: { field: 'scope.order' } },
                restaurantId: {
                  terms: {
                    field: 'scope.restaurant',
                    size: 100000,
                    order: { orders: 'desc' },
                  },
                  aggs: { orders: { cardinality: { field: 'scope.order' } } },
                },
              },
            },
          },
        },
      };

      if (driverArr.length) {
        searchRequest.body.query.bool.filter.push({ terms: { 'scope.account': driverArr } });
      }

      const { callWithRequest } = server.plugins.elasticsearch.getCluster('data');
      const response = callWithRequest(req, 'search', searchRequest);

      return response;
    },
  });

  server.route({
    path: '/api/branch_report/orderEventsEnRoute',
    method: 'POST',
    handler(req) {
      const { from, to, emailArr, driverArr } = req.payload;
      const searchRequest = {
        index: 'order_delivery_events', // you can also change index to another
        size: 0,
        body: {
          query: {
            bool: {
              filter: [
                { term: { name: 'order.delivery.en-route-to-pickup' } },
                { range: { createdAt: { gt: from, lte: to } } },
              ],
            },
          },
          aggs: {
            email: {
              terms: {
                field: 'scope.account',
                size: 100000,
                order: { orders: 'desc' },
              },
              aggs: {
                orders: { cardinality: { field: 'scope.order' } },
                restaurantId: {
                  terms: {
                    field: 'data.stop.order.restaurant._id',
                    size: 100000,
                    order: { orders: 'desc' },
                  },
                  aggs: { orders: { cardinality: { field: 'scope.order' } } },
                },
              },
            },
          },
        },
      };

      if (driverArr.length) {
        searchRequest.body.query.bool.filter.push({ terms: { 'scope.account': driverArr } });
      }

      const { callWithRequest } = server.plugins.elasticsearch.getCluster('data');
      const response = callWithRequest(req, 'search', searchRequest);

      return response;
    },
  });
}
