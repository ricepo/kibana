
import axios from 'axios';
import dateMath from '@elastic/datemath';
import { timefilter } from 'ui/timefilter';
import _ from 'lodash';
import { Spinner } from 'spin.js';
import 'spin.js/spin.css';
import moment from 'moment';
import { buildEsQuery } from '@kbn/es-query';

import { showTable } from './util';

/* Options for the loading spinner */
const opts = {
  lines: 13, // The number of lines to draw
  length: 38, // The length of each line
  width: 17, // The line thickness
  radius: 45, // The radius of the inner circle
  scale: 1, // Scales overall size of the spinner
  corners: 1, // Corner roundness (0..1)
  color: '#242222', // CSS color or array of colors
  fadeColor: 'transparent', // CSS color or array of colors
  speed: 1, // Rounds per second
  rotate: 0, // The rotation offset
  animation: 'spinner-line-fade-default', // The CSS animation name for the lines
  direction: 1, // 1: clockwise, -1: counterclockwise
  zIndex: 2e9, // The z-index (defaults to 2000000000)
  className: 'spinner', // The CSS class to assign to the spinner
  top: '50%', // Top position relative to parent
  left: '50%', // Left position relative to parent
  shadow: '0 0 1px transparent', // Box-shadow for the lines
  position: 'absolute', // Element positioning
};

const api = {
  jobsSearch: '../api/branch_report/jobs',
  shiftSearch: '../api/branch_report/shifts',
  orders: '../api/branch_report/orders',
  shiftEventsSearch: '../api/branch_report/shiftEvents',
  orderEventsSearch: '../api/branch_report/orderEventsFailed',
  orderEventsRouteSearch: '../api/branch_report/orderEventsEnRoute',
};

export class BranchReportVisualizationProvider {
  containerClassName = 'branch_report';

  constructor(el, vis) {
    this.vis = vis;
    this.el = el;
    this.container = document.createElement('div');
    this.container.className = this.containerClassName;
    this.el.appendChild(this.container);
  }

  async render(visData, visParams, status) {
    if (!(status.time || status.data)) return;

    if (!this.container) return;

    this.container.innerHTML = '';

    const spinner = new Spinner(opts).spin(this.container);

    /**
     * get the filters and querys from filter bar
     */
    let filters = this.vis.searchSource._fields.filter;
    const querys = this.vis.searchSource._fields.query;

    filters = _.filter(filters, v => !v.meta.disabled);

    /* get timeRange */
    /* format dateTime by timezone such as "now/d"(datemath) */
    const from = dateMath.parse(timefilter.getTime().from).format();
    const to = dateMath.parse(timefilter.getTime().to, { roundUp: true }).format();

    const range = { range: { createdAt: { gt: from, lte: to } } };
    const { bool } = buildEsQuery(undefined, querys, filters);

    bool.filter.push(range);
    console.log('bool   ======>', bool);

    const query = { bool };

    const params1 = {
      query,
    };

    const begin = moment();
    let ordersData = await getSearchDataFromEs(api.orders, params1);
    const emailArr = [];
    const driverArr = [];

    ordersData = _.chain(ordersData)
      .get('data.aggregations.email.buckets')
      .map(v => {
        emailArr.push(v.key);

        const driverid = _.get(v, 'driverid.buckets[0].key');
        const data = _.get(v, 'driverid.buckets[0].regionName.buckets[0]');

        driverArr.push(driverid);

        return {
          adjustmentSum: data.adjustmentSum.value,
          commissionSum: data.commissionSum.value,
          deliveryTimeSum: data.deliveryTimeSum.value,
          distributionSum: data.distributionSum.value,
          tipSum: data.tipSum.value,
          orders: data.doc_count,
          regionName: data.key,
          email: v.key,
          driverid,
        };
      })
      .value();

    const params2 = {
      from,
      to,
      emailArr,
      driverArr,
    };

    const promises = [
      getSearchDataFromEs(api.jobsSearch, params2),
      getSearchDataFromEs(api.shiftSearch, params2),
      getSearchDataFromEs(api.shiftEventsSearch, params2),
      getSearchDataFromEs(api.orderEventsSearch, params2),
      getSearchDataFromEs(api.orderEventsRouteSearch, params2),
    ];

    /* Get payment signed string */
    let [esDataJobs, shifts, shiftEvents, orderEvents, orderEventsEnRoute] = await Promise.all(
      promises
    );

    esDataJobs = _.chain(esDataJobs)
      .get('data.aggregations.email.buckets')
      .map(v =>
        _.map(v.jobId.buckets, x => ({
          start: _.get(x, 'start.buckets[0].key_as_string'),
          end: _.get(x, 'start.buckets[0].end.buckets[0].key_as_string'),
          duration: _.get(x, 'start.buckets[0].end.buckets[0].duration.value'),
          email: v.key,
        }))
      )
      .flatten()
      .groupBy(v => v.email)
      .value();

    shifts = _.chain(shifts)
      .get('data.aggregations.email.buckets')
      .map(v =>
        _.map(v.shiftId.buckets, x => ({
          start: _.get(x, 'start.buckets[0].key_as_string'),
          end: _.get(x, 'start.buckets[0].end.buckets[0].key_as_string'),
          email: v.key,
        }))
      )
      .flatten()
      .groupBy(v => v.email)
      .value();

    shiftEvents = _.chain(shiftEvents)
      .get('data.aggregations.email.buckets')
      .map(v => ({
        email: v.key,
        noCallnoShowDrop: _.get(
          _.find(v.data.buckets, o => o.key === 'noCallnoShowDrop'),
          'doc_count'
        ),
        lateDrop: _.get(_.find(v.data.buckets, o => o.key === 'lateDrop'), 'doc_count'),
      }))
      .keyBy('email')
      .value();

    orderEvents = _.chain(orderEvents)
      .get('data.aggregations.email.buckets')
      .map(v =>
        _.map(v.restaurantId.buckets, x => ({
          restaurantId: x.key,
          orders: x.orders.value,
          email: v.key,
          ordersTotal: v.orders.value,
        }))
      )
      .flatten()
      .groupBy(v => v.email)
      .value();

    orderEventsEnRoute = _.chain(orderEventsEnRoute)
      .get('data.aggregations.email.buckets')
      .map(v =>
        _.map(v.restaurantId.buckets, x => ({
          restaurantId: x.key,
          orders: x.orders.value,
          email: v.key,
          ordersTotal: v.orders.value,
        }))
      )
      .flatten()
      .groupBy(v => v.email)
      .value();

    const data = {
      orders: ordersData,
      jobs: esDataJobs,
      shifts,
      shiftEvents,
      orderEvents,
      orderEventsEnRoute,
    };

    /* Stop the loading */
    spinner.stop();

    const pullDataEnd = moment.now();

    console.log(`The time spent on requesting is${(pullDataEnd - begin) / 1000}s`);

    showTable(this.container, data);
  }

  destroy() {
    this.container.parentNode.removeChild(this.container);
    this.container = null;
  }
}

/**
 * get search data directly from es
 * @param {Object} api
 * @param {Object} params (filters and timeRange from kibana)
 */
async function getSearchDataFromEs(api, params) {
  return await axios({
    method: 'post',
    url: api,
    data: { ...params },
    headers: { 'kbn-version': '7.5.2' },
  });
}
