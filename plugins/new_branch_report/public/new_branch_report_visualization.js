
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
  shiftSearch: '../api/new_branch_report/shifts',
  orders: '../api/new_branch_report/orders',

};

export class NewBranchReportVisualizationProvider {
  containerClassName = 'new_branch_report';

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

    const batch = _.chain(this.vis.searchSource._fields.filter)
      .filter(v => !v.meta.disabled && v.meta.key === 'restaurant.delivery.batch.keyword')
      .map(x => ({
        negate: x.meta.negate,
        params: x.meta.params
      }))
      .get('0')
      .value();


    const region = _.chain(this.vis.searchSource._fields.filter)
    .filter(v => !v.meta.disabled && v.meta.key === 'region.name')
    .map(x => ({
      negate: x.meta.negate,
      params: x.meta.params
    }))
    .get('0')
    .value();

    const params1 = {
      from,
      to,
      region,
      batch
    };

    /* Clone params for orders */
    const params2 = _.cloneDeep(params1);

    const begin = moment();
    const shifts = await getSearchDataFromEs(api.shiftSearch, params1, 'start');
    const ordersData = await getSearchDataFromEs(api.orders, params2, 'delivery.finishAt');

    const driverShifts = _.chain(shifts)
      .map('_source')
      .reduce((dr, s) => {

        dr = _.concat(dr, _.map(s.drivers, d => ({ ...s, duration: moment(s.end).diff(s.start, 'minutes'), driver: d })));

        return dr;

      }, [])
      .groupBy('driver.email')
      .value();

    /* Get driver orders  */
    const driverOrders = _.chain(ordersData)
      .map(o => ({ ...o._source, _id: o._id,  }))
      .groupBy('delivery.courier.email')
      .value();

    const totalJobs = {};

    /* Get all jobs of driver for each day */
    _.forEach(driverShifts, (shifts, d) => {

      const hours = _.chain(shifts)
      .map(s => ({ ...s, start: moment(s.start).format('YYYY-MM-DD') }))
      .groupBy('start')
      .map(r => _.get(r, '[0]'))
      .compact()
      .sumBy('driver.summary.jobHours')
      .value();

      totalJobs[d] = hours;
    });


    const unassignDriverShifts = _.chain(shifts)
    .map('_source')
    .filter(s => _.get(s, 'unassignedDrivers.length', 0) > 0)
    .reduce((dr, s) => {

      dr = _.concat(dr, _.map(s.unassignedDrivers, d => ({ ...s, driver: d })));

      return dr;

    }, [])
    .groupBy('driver.email')
    .value();

    const data = {
      driverShifts,
      unassignDriverShifts,
      totalJobs,
      driverOrders
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
/* async function getSearchDataFromEs(api, params) {
  return await axios({
    method: 'post',
    url: api,
    data: { ...params },
    headers: { 'kbn-version': '7.5.2' },
  });
} */


/**
 * get search data directly from es
 * @param {Object} api
 * @param {Object} params (filters and timeRange from kibana)
 */
async function getSearchDataFromEs(api,params,key){

  let data = [];
  await getData(api,params)
  return data;

  async function getData(api,params){

    const a = await axios({
      method: 'post',
      url: api,
      data: {
        ...params
      },
      headers: { 'kbn-version': '7.5.2' },
    });
    const res = a.data.hits.hits;
    data = data.concat(res)
    if(res.length){
      params.from = _.get(res[res.length-1]._source, key) || _.get(res[res.length-1]._source, 'createdAt')
      await getData(api,params)
    }
  }
}
