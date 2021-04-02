import { getValueFunction, showTable } from './utils';
import axios from 'axios';
import moment from 'moment';
import _ from 'lodash';
import { Spinner } from 'spin.js';
import 'spin.js/spin.css';
import dateMath from '@elastic/datemath';
import { timefilter } from 'ui/timefilter';
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
  position: 'absolute', // Element positioning
};

export class CohortVisualizationProvider {
  constructor(el, vis) {
    this.vis = vis;
    this.el = el;
    
    this.parentContainer = document.createElement('div');
    this.parentContainer.className = 'cohort-parentContainer';

    this.container = document.createElement('div');
    this.container.className = 'cohort-container';
    this.container1 = document.createElement('div');
    this.container1.className = 'cohort-container';
    this.container2 = document.createElement('div');
    this.container2.className = 'cohort-container';
    this.parentContainer.appendChild(this.container);
    this.parentContainer.appendChild(this.container1);
    this.parentContainer.appendChild(this.container2);


    this.el.appendChild(this.parentContainer);
  }

  async render(visData, visParams, status) {
    if (!(status.time || status.data || status.params)) return;

    if (!this.container) return;

    this.container.innerHTML = '';

    const spinner = new Spinner(opts).spin(this.container);

    /**
     * get the filters from filter bar
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

    let interval = null;
    let period = null;
    switch (visParams.period) {
      case 'daily':
        period = 'daily';
        interval = '1d';
        break;
      case 'weekly':
        period = 'weekly';
        interval = '1w';
        break;
      case 'monthly':
        period = 'monthly';
        interval = '1M';
        break;
      default:
        period = 'weekly';
        interval = '1w';
        break;
    }
    const params = {
      interval,
      query,
    };

    const begin = moment.now();

    /* requset es(elasticsearch) */
    let esData = await getDataFromEs(params);

    esData = _.get(esData, 'data.aggregations.date.buckets');

    const pullDataEnd = moment.now();

    console.log(`获取数据共花费${(pullDataEnd - begin) / 1000}s`);

    if (!esData.length) {
      spinner.stop();

      return;
    }

    esData = _.chain(esData)
      .map(v =>
        _.map(v.customer.buckets, x => ({
          daily: moment(v.key_as_string).format('YYYY/MM/DD'),
          weekly: `${moment(v.key_as_string).format('YYYY')}/${moment(v.key_as_string).isoWeeks()}`,
          monthly: moment(v.key_as_string).format('YYYY/MM'),
          date: v.key_as_string,
          _id: x.key,
          orderCount: x.orderCount.value,
          subtotal: x.totalSubtotal.value
        }))
      )
      .flatten()
      .groupBy(v => v[period])
      .values()
      .value();

    /* format the data to generate table */
    const data = [];

    const data1 = [];

    const data2 = [];

    _.map(esData, (d, day) => {
      /* Get number of new customers for the date */
      const newCust = _.filter(d, ['orderCount', 0]);
      const active = _(esData)
        .slice(day + 1) // Get the customer from date after init date
        .map(x => _.intersectionBy(newCust, x, '_id').length)
        .value();

      /* set value which is the last in Array */
      if (!active.length) {
        data.push({
          date: d[0].daily,
          total: newCust.length,
          period: 1,
          value: 0,
        });
      }

      _.forEach(active, (v, k) => {
        data.push({
          date: d[0].daily,
          total: newCust.length,
          period: k + 1,
          value: v,
        });
      });
    });


    _.map(esData, (d, day) => {
      /* Get number of new customers for the date */
      const activeCust = _.filter(d, i => i.orderCount > 0);
      const active = _(esData)
        .slice(day + 1) // Get the customer from date after init date
        .map(x => _.intersectionBy(activeCust, x, '_id').length)
        .value();

      /* set value which is the last in Array */
      if (!active.length) {
        data1.push({
          date: d[0].daily,
          total: activeCust.length,
          period: 1,
          value: 0,
        });
      }

      _.forEach(active, (v, k) => {
        data1.push({
          date: d[0].daily,
          total: activeCust.length,
          period: k + 1,
          value: v,
        });
      });
    });


    _.map(esData, (d, day) => {
      /* Get number of new customers for the date */
      const activeCust = _.filter(d, i => i.orderCount > 0);
      const active = _(esData)
        .slice(day + 1) // Get the customer from date after init date
        .map(x => _.intersectionBy(activeCust, x, '_id'))
        .map(x => _.sumBy(x, 'subtotal'))
        .value();

      /* set value which is the last in Array */
      if (!active.length) {
        data2.push({
          date: d[0].daily,
          total: _.sumBy(activeCust, 'subtotal'),
          period: 1,
          value: 0,
        });
      }

      _.forEach(active, (v, k) => {
        data2.push({
          date: d[0].daily,
          total: _.sumBy(activeCust, 'subtotal'),
          period: k + 1,
          value: v,
        });
      });
    });


    spinner.stop();

    const end = moment.now();

    console.log(`处理数据共花费${(end - pullDataEnd) / 1000}s`);
    console.log(`一共花费${(end - begin) / 1000}s`);

    const valueFn = getValueFunction(this.vis.params);

    showTable(this.vis.params.mapColors, 'd', this.container, data, valueFn);

    showTable(this.vis.params.mapColors, 'd', this.container1, data1, valueFn);

    showTable(this.vis.params.mapColors, 'd', this.container2, data2, valueFn);
  }

  destroy() {
    this.container.parentNode.removeChild(this.container);
    this.container = null;
  }
}

/**
 * get data directly from es
 * @param {Object} (filters and timeRange from kibana)
 */
async function getDataFromEs(params) {
  return await axios({
    method: 'post',
    url: '../api/cohort/query',
    data: { ...params },
    headers: { 'kbn-version': '7.5.2' },
  });
}
