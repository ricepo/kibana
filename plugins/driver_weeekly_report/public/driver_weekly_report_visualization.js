
import axios from 'axios';
import moment from 'moment';
import _ from 'lodash';
import { Spinner } from 'spin.js';
import 'spin.js/spin.css';
import dateMath from '@elastic/datemath';
import { timefilter } from 'ui/timefilter';
import { showChart } from './util';
import { buildEsQuery } from '@kbn/es-query';

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
  position: 'absolute' // Element positioning
};


export class DriverWeeklyReportVisualizationProvider {

  containerId = 'driver-weekly-report-container';
  margin = { top: 20, right: 20, bottom: 40, left: 50 };

  constructor(el, vis) {
    this.vis = vis;
    this.el = el;
    this.container = document.createElement('div');
    this.container.id = this.containerId;
    this.el.appendChild(this.container);
  }

  async render(visData, visParams, status) {

    if (!this.container) return;

    this.container.innerHTML = '';

    const spinner = new Spinner(opts).spin(this.container);

    /**
     * get the filters from filter bar
     */
    let filters = this.vis.searchSource._fields.filter
    const querys = this.vis.searchSource._fields.query

    filters = _.filter(filters,v => !v.meta.disabled)
    

    /* get timeRange */
    /* format dateTime by timezone such as 'now/d'(datemath) */
    const from = dateMath.parse(timefilter.getTime().from).format();
    let to = dateMath.parse(timefilter.getTime().to, { roundUp: true }).format();

    const accounts = await getAccounts();
    const data = {
      totalNew: [],
      active4week: [],
      active2Week: []
    };

    const xAxis = [];
    to = moment(to).endOf('isoWeek').toDate();
    let currentWeek = moment(from).startOf('isoWeek').toDate();

    const range = { range: { createdAt: { 
      gt: moment(currentWeek).subtract(4, 'weeks').toDate(), 
      lte: moment(to).toDate() 
    } } };
    const {bool} = buildEsQuery(undefined, querys, filters);

    bool.filter.push(range)
    console.log('bool   ======>',bool)

    const query = {bool}
    /* Get orders last 4 week */
    const params = {
      query
    };

    let esData = await getDataFromEs(params);

    esData = _.get(esData, 'data.aggregations.date.buckets');

    const driverWeekly = {};

    _.forEach(esData, dr => {
      const key = moment(dr.key_as_string).format('YY-MM-DD');
      driverWeekly[key] = _.map(dr.driver.buckets, d => d.key);
    });

    /* Travel through the each week to get report*/
    while (moment(currentWeek).isBefore(to)) {


      /* last 4 week driver */
      let last4weeksDriver = [];

      _.map([4, 3, 2, 1], w => {

        const key = moment(currentWeek).subtract(w, 'weeks').format('YY-MM-DD');

        last4weeksDriver =   _.chain(_.get(driverWeekly, key, []))
          .concat(last4weeksDriver)
          .uniq()
          .value();

      });

      /* get last 2 week drivers */
      let last2weekDriver = [];

      _.map([2, 1], w => {

        const key = moment(currentWeek).subtract(w, 'weeks').format('YY-MM-DD');

        last2weekDriver =   _.chain(_.get(driverWeekly, key, []))
          .concat(last2weekDriver)
          .uniq()
          .value();

      });

      /* filter orders with last 2 weeks */
      const lastWeek = moment(currentWeek).subtract(7, 'days').format('YY-MM-DD');
      const lastweekDriver = _.get(driverWeekly, lastWeek, []);


      /* Get number of new drivers who get created last 2 weeks and delivered an order */
      const newDriver = _.filter(accounts, a => moment(a.createdAt).isBefore(currentWeek) &&
        moment(a.createdAt).isAfter(moment(currentWeek).subtract(14, 'days').toDate()) &&
        _.includes(lastweekDriver, a._id.toString()));


      xAxis.push(moment(currentWeek).format('YY-MM-DD'));
      data.active4week.push(last4weeksDriver.length);
      data.active2Week.push(_.keys(last2weekDriver).length);
      data.totalNew.push(newDriver.length);

      currentWeek = moment(currentWeek).add(7, 'days').toDate();

    }

    data.xAxis = xAxis;

    const width = this.el.offsetWidth - this.margin.left - this.margin.right;
    const height = this.el.offsetHeight - this.margin.top - this.margin.bottom;
    const allWidth = this.el.offsetWidth;
    const allHeight = this.el.offsetHeight;
    const measures = { width, height, margin: this.margin, allWidth, allHeight };

    spinner.stop();
    showChart(measures, this.containerId, data);
  }

  destroy() {
    this.container.parentNode.removeChild(this.container);
    this.container = null;
  }

};


/**
 * get data directly from es
 * @param {Object} (filters and timeRange from kibana)
 */
async function getDataFromEs(params) {

  return await axios({
    method: 'post',
    url: '../api/driver_weeekly_report/query',
    data: {
      ...params
    },
    headers: {
      'kbn-version': '7.5.2'
    }
  });
}

/**
 * get search data directly from es
 * @param {Object} api
 * @param {Object} params (filters and timeRange from kibana)
 */
async function getAccounts() {
  const a = await axios({
    method: 'get',
    url: '/v1/accounts',
    baseURL: 'https://staging.isengard.ricepo.com',
    params: {
      role: 'region.driver'
    },
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'JWT eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJfaWQiOiJhY2N0X0gxZnVjei1RNyIsImVtYWlsIjoiZGRAcmljZXBvLmNvbSIsInBob25lIjoiKzE0MDgyNTA0NzM5Iiwicm9sZXMiOlt7InNjb3BlIjpudWxsLCJuYW1lIjoicmljZXBvLm1hbmFnZXIifSx7InNjb3BlIjpudWxsLCJuYW1lIjoicmljZXBvLnN1cHBvcnQifSx7InNjb3BlIjoiNTYzNTJmY2MwZDI4OGQwN2YxZTAwMTg0IiwibmFtZSI6InJlZ2lvbi5zdXBwb3J0IiwiZGVzY3JpcHRpb24iOiJhbmNob3JhZ2UsYWsifSx7InNjb3BlIjoiNTYzNTJmY2MwZDI4OGQwN2YxZTAwMTg0IiwibmFtZSI6InJlZ2lvbi5kcml2ZXJNYW5hZ2VyIiwiZGVzY3JpcHRpb24iOiJhbmNob3JhZ2UsYWsifSx7InNjb3BlIjoiNTYzNTJmY2MwZDI4OGQwN2YxZTAwMTg0IiwibmFtZSI6InJlZ2lvbi5kcml2ZXIiLCJkZXNjcmlwdGlvbiI6ImFuY2hvcmFnZSxhayIsInRpbWV6b25lIjoiQW1lcmljYS9BbmNob3JhZ2UifSx7InNjb3BlIjpudWxsLCJuYW1lIjoicmljZXBvLmRlcHV0eSJ9LHsic2NvcGUiOm51bGwsIm5hbWUiOiJyaWNlcG8udGVjaCJ9XSwidHlwZSI6InN0YWZmIiwiaWF0IjoxNTUxNjU0Nzg0LCJleHAiOjYwNDgwMDkxMzcyMTIxMzEsInN1YiI6ImFjY3RfSDFmdWN6LVE3In0.hjLlWVhGnmY8yuR4mMLMJwGvKDPaxWtPuMxTyicOhPw'
    }
  });

  const data = a.data;
  return data;
}
