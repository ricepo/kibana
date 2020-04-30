import echarts from 'echarts';
import _ from 'lodash';

export function showChart(measures, elementId, data) {
  const div = document.getElementById(elementId);
  echarts.dispose(div);
  const myChart = echarts.init(div, undefined, {
    width: measures.allWidth,
    height: measures.allHeight,
  });
  // set options for chart
  const option = {
    title: {
      text: 'Active Customers',
    },
    tooltip: {
      trigger: 'axis',
      formatter: function(data) {
        let res = data[0].name + '<br/>';
        const denominator = _.chain(data)
          .filter({ seriesName: 'Total' })
          .get(['0', 'value'])
          .value();
        for (let i = 0; i < data.length; i++) {
          res += `${data[i].marker} ${data[i].seriesName}：${data[i].value}(${Math.round(
            (data[i].value * 100) / denominator
          )}%)<br/>`;
        }
        return res;
      },
    },
    legend: {
      data: ['Daily', 'Weekly', 'Monthly', 'Total'],
    },
    toolbox: {
      feature: {
        saveAsImage: {},
      },
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true,
    },
    xAxis: [
      {
        type: 'category',
        boundaryGap: false,
        data: data.xAxis,
      },
    ],
    yAxis: [
      {
        type: 'value',
      },
    ],
    series: [
      {
        name: 'Total',
        type: 'line',
        areaStyle: {},
        data: data.potential,
      },
      {
        name: 'Monthly',
        type: 'line',
        areaStyle: {},
        data: data.monthly,
      },
      {
        name: 'Weekly',
        type: 'line',
        areaStyle: {},
        data: data.weekly,
      },
      {
        name: 'Daily',
        type: 'line',
        areaStyle: {},
        data: data.daily,
      },
    ],
  };

  // use options to generate chart
  myChart.setOption(option);
}
