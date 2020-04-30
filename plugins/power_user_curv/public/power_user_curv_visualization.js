
import axios from 'axios';
import moment from 'moment';
import _ from 'lodash';
import dateMath from '@elastic/datemath';
import { timefilter } from 'ui/timefilter';
import { showChart } from './util';
import { Spinner } from 'spin.js';
import 'spin.js/spin.css';
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



export class PowerUserCurvVisualizationProvider {

  containerId = 'power-user-curv-container';
  margin = { top: 20, right: 20, bottom: 40, left: 50 };

  constructor(el, vis) {
    this.vis = vis;
    this.el = el;
    this.container = document.createElement('div');
    this.container.id = this.containerId;
    this.el.appendChild(this.container);
  }

  async render(visData, visParams, status) {

    if (!(status.time || status.data)) return;

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
    /* format dateTime by timezone such as "now/d"(datemath) */
    const from = dateMath.parse(timefilter.getTime().from).format();
    const to = dateMath.parse(timefilter.getTime().to, { roundUp: true }).format();

    const range = { range: { createdAt: { gt: from, lte: to } } };
    const {bool} = buildEsQuery(undefined, querys, filters);

    bool.filter.push(range)
    console.log('bool   ======>',bool)

    const query = {bool}

    const params = {
      query
    };

    /* requset es(elasticsearch) */
    let esData = await getDataFromEs(params);
    esData = _.get(esData, 'data.aggregations.createdAt.buckets');


    if(!esData.length) {
      spinner.stop();
      return;
    }

    /* format the data from es */
    const data  = _.chain(esData)
      .map(v => v.customers.buckets)
      .flatten()
      .groupBy('key')
      .map((v, k) => ({ _id: k, count: _.sumBy(v, 'doc_count') }))
      .groupBy(v => v.count)
      .value();


    /* get xAxis and yAxis */
    data.xAxis = _.keys(data);
    data.yAxis = _.map(data, v => v.length);

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
    url: '../api/power_user_curv/query',
    data: {
      ...params
    },
    headers:{
      'kbn-version': '7.5.2'
    }
  });
}
