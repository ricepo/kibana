
import axios from 'axios';
import moment from 'moment';
import _ from 'lodash';
import { Spinner } from 'spin.js';
import 'spin.js/spin.css';
import dateMath from '@elastic/datemath';
import { timefilter } from 'ui/timefilter';
import { showChart } from './utils';

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


export class ActiveVisualizationProvider {

  containerId = 'active-customers-container';
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

    /* get timeRange */
    /* format dateTime by timezone such as "now/d"(datemath) */
    const from = dateMath.parse(timefilter.getTime().from).format();
    const to = dateMath.parse(timefilter.getTime().to, { roundUp: true }).format();

    /* get filters */
    const region = _.chain(this.vis.searchSource._fields.filter)
      .filter(v => !v.meta.disabled && v.meta.key === 'region.name')
      .map(x => {
        return {
          negate: x.meta.negate,
          params: x.meta.params
        }
      })
      .get('0')
      .value();

    const params = {
      from,
      to,
      region
    };

    const begin = moment();
    /* requset es(elasticsearch) */
    let esData = await getDataFromEs(params)
    const pullDataEnd = moment.now();
    console.log(`获取数据共花费${(pullDataEnd - begin) / 1000}s`)
    esData = _.get(esData,'data.aggregations.createdAt.buckets')

    if(!esData.length){
      spinner.stop();
      return
    }

    let data = {
      potential:[],
      monthly:[],
      weekly:[],
      daily:[],
      xAxis:[]
    }

    let total = [];
    console.log(esData)
    for (let i = 0; i < esData.length; i++) {

      /* get xAxis */
      data.xAxis.push(moment(esData[i]['key_as_string']).format('YYYY/MM/DD'));

      /* Customer array in current week */
      const customers = esData[i]['customers']['buckets'];

      /* Total active customers */
      total = _.unionBy(total, customers, 'key');
      data.potential.push(total.length);

      /* Weekly */
      let weekly = [];

      for (let j = 0; j < 7; j++) {
        weekly = _.unionBy(weekly, _.get(esData, [i - j,'customers','buckets']), 'key');
      }

      data.weekly.push(weekly.length);

      /* Monthly */
      let monthly = [];

      for (let j = 0; j < 30; j++) {
        monthly = _.unionBy(monthly, _.get(esData, [i - j,'customers','buckets']), 'key');
      }

      data.monthly.push(monthly.length);

      /* Daily */
      data.daily.push(_.uniqBy(customers, 'key').length);
    }

    const width = this.el.offsetWidth - this.margin.left - this.margin.right;
    const height = this.el.offsetHeight - this.margin.top - this.margin.bottom;
    const allWidth = this.el.offsetWidth;
    const allHeight = this.el.offsetHeight;
    const measures = { width, height, margin: this.margin, allWidth, allHeight };

    spinner.stop();
    const end = moment.now();
    console.log(`处理数据共花费${(end - pullDataEnd) / 1000}s`)
    console.log(`一共花费${(end - begin) / 1000}s`)
    showChart(measures,this.containerId,data);
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
async function getDataFromEs(params){
  return await axios({
    method: 'post',
    url: '../api/active-customers/query',
    data: {
      ...params
    },
    headers:{
      'kbn-version': '7.5.2'
    }
  });
}
