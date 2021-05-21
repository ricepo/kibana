import d3 from 'd3';
import datemath from 'datemath-parser';
import moment from 'moment-timezone';

const tableClassName = 'cohort-table';

const red = '#ff4e61';
const yellow = '#ffef7d';
const green = '#32c77c';
const colors = [red, yellow, green];
const formatTypes = {
  undefined: d => d,
  custom: d3.time.format('%Y/%m/%d %H:%M:%S'),
  auto: d3.time.format('%Y/%m/%d %H:%M:%S'),
  ms: d3.time.format('%Y/%m/%d %H:%M:%S,%L'),
  s: d3.time.format('%Y/%m/%d %H:%M:%S'),
  m: d3.time.format('%Y/%m/%d %H:%M'),
  h: d3.time.format('%Y/%m/%d %H:%M'),
  d: d3.time.format('%Y/%m/%d'),
  w: d3.time.format('%Y/%m/%d'),
  M: d3.time.format('%Y/%m'),
  y: d3.time.format('%Y'),
};

/**
 * @param {number} v
 * @returns {number}
 */
export const round = v => Math.round(v * 100) / 100;

/**
 * @param {object} d
 * @returns {number}
 */
export const cumulativeFn = d => d.cumulativeValue;

/**
 * @param {object} d
 * @returns {number}
 */
export const absoluteFn = d => d.value;

/**
 * @param {string} dateHistogram
 * @returns {function}
 */
export const getFormatTypes = dateHistogram => formatTypes[dateHistogram];

/**
 * @param {string} mapColors
 * @param {string} dateHistogram
 * @param {HTMLElement} element
 * @param {array} data
 * @param {function} valueFn
 */
export function showTable(mapColors, dateHistogram, element, data, valueFn, type) {
  const minMaxesForColumn = [];
  const periodMeans = d3
    .nest()
    .key(d => d.period)
    .entries(data)
    .map(d => {
      const minMax = d3.extent(d.values, valueFn);
      const mean = round(d3.mean(d.values, valueFn));
      const minMaxObj = {
        min: minMax[0],
        max: minMax[1],
        mean,
      };

      minMaxesForColumn.push(minMaxObj);

      return mean;
    });
  const customColumn = dateHistogram ? 'Date' : 'Term';
  const fixedColumns = [customColumn, `Total-${type}`];
  const columns = d3
    .map(data, d => d.period)
    .keys()
    .map(x => parseInt(x, 10));
  const allColumns = fixedColumns.concat(columns);

  /* Initialize the table */
  const del = d3.select(element).selectAll('table');

  del.remove();

  const table = d3
    .select(element)
    .append('table')
    .attr('class', tableClassName);

  const thead = table.append('thead');
  const tbody = table.append('tbody');
  const tfoot = table.append('tfoot');

  thead
    .append('tr')
    .selectAll('th')
    .data(allColumns)
    .enter()
    .append('th')
    .text(column => column);

  const groupedData = d3
    .nest()
    .key(d => d.date)
    .entries(data);
  const rows = tbody
    .selectAll('tr')
    .data(groupedData)
    .enter()
    .append('tr');

  const colorScale = getColorScale(mapColors, data, valueFn);

  rows
    .selectAll('td')
    .data(row => {
      const date = row.key;
      let total = 0;
      const vals = columns.map(period => {
        const d = row.values.find(d => period === d.period);

        if (d) {
          total = round(d.total);

          return valueFn(d);
        }
      });

      return [date, total].concat(vals);
    })
    .enter()
    .append('td')
    .style('background-color', (d, i) => {
      if (i >= 2) {
        // skip first and second columns
        return colorScale(d, minMaxesForColumn[i - 2]);
      }
    })
    .text(d => d);

  const meanOfMeans = round(d3.mean(periodMeans, meanObj => meanObj));
  const meanOfMeansTittle = `Mean (${meanOfMeans})`;
  const allMeans = ['-', meanOfMeansTittle].concat(periodMeans);

  tfoot
    .append('tr')
    .selectAll('td')
    .data(allMeans)
    .enter()
    .append('td')
    .text(d => d);
}

/**
 *
 * @param {boolean} cumulative
 * @param {boolean} percentual
 * @param {boolean} inverse
 * @returns {function}
 */
export function getValueFunction({ cumulative, percentual, inverse }) {
  const valueFn = cumulative ? cumulativeFn : absoluteFn;
  const percentFn = d => (d.total === 0 ? 0 : round((valueFn(d) / d.total) * 100));
  const inverseFn = d => round(100 - (valueFn(d) / d.total) * 100);

  if (percentual) {
    if (inverse) {
      return inverseFn;
    }

    return percentFn;
  }

  return valueFn;
}

/**
 * @param $vis
 * @returns {string|undefined}
 */
export function getDateHistogram($vis) {
  const schema = $vis.aggs.find(agg => agg.schema.name === 'cohort_date');

  if (schema && schema.type.name === 'date_histogram') {
    return schema.params.interval.val;
  }
}

/**
 * @param {array} data
 * @param {function} valueFn
 * @returns {function}
 */
export function getHeatMapColor(data, valueFn) {
  const domain = d3.extent(data, valueFn);

  domain.splice(1, 0, d3.mean(domain));

  return d3.scale
    .linear()
    .domain(domain)
    .range(colors);
}

/**
 * @param {string} d
 * @param {object} column
 * @returns {string}
 */
export function getMeanColor(d, column) {
  return d3.scale
    .linear()
    .domain([column.min, column.mean, column.max])
    .range(colors)(d);
}

/**
 * @param {number} d
 * @param {object} column
 * @returns {string}
 */
export function getAboveAverageColor(d, column) {
  if (d > column.mean) {
    return green;
  } else if (d === column.mean) {
    return yellow;
  } else if (d < column.mean) {
    return red;
  }
}

/**
 * @param {string} mapColors
 * @param {array} data
 * @param {function} valueFn
 * @returns {function}
 */
export function getColorScale(mapColors, data, valueFn) {
  if (mapColors === 'heatmap') {
    return getHeatMapColor(data, valueFn);
  } else if (mapColors === 'mean') {
    return getMeanColor;
  } else if (mapColors === 'aboveAverage') {
    return getAboveAverageColor;
  }

  return () => {};
}

/**
 * format dateTime by timezone
 * @param {String|date} dateTime
 * @param {String} timezone
 * @param {String} format
 */
export function formatDateTime(dateTime, timezone = 'America/New_York', format) {
  return moment(datemath.parse(dateTime))
    .tz(timezone)
    .format(format);
}
