/* The path to ui/vis is in `/src/legacy/ui/public/vis` */
import { visFactory } from 'ui/vis/vis_factory';
import { Schemas } from 'ui/vis/editors/default/schemas';
import { Status } from 'ui/vis/update_status';
import { setup } from '../../../src/legacy/core_plugins/visualizations/public/np_ready/public/legacy';

import { L30CurvVisualizationProvider } from './l_30_visualization';

export default function L30CurveProvider(Private) {
  return visFactory.createBaseVisualization({
    name: 'l_30curv',
    title: 'L-30 Curv',
    icon: 'stopFilled',
    description: 'Number of Uniq Active Customer',
    visualization: L30CurvVisualizationProvider,
    visConfig: {
      defaults: {},
    },
    requiresUpdateStatus: [
      // Check for changes in the aggregation configuration for the visualization
      Status.AGGS,
      // Check for changes in the actual data returned from Elasticsearch
      Status.DATA,
      // Check for changes in the parameters (configuration) for the visualization
      Status.PARAMS,
      // Check if the visualization has changes its size
      Status.RESIZE,
      // Check if the time range for the visualization has been changed
      Status.TIME,
      // Check if the UI state of the visualization has been changed
      Status.UI_STATE,
    ],
    hierarchicalData: true,
    editorConfig: {
      schemas: new Schemas([
        {
          group: 'metrics',
          name: 'metric',
          title: 'Total',
          max: 1,
          min: 1,
          aggFilter: ['count', 'sum', 'avg', 'cardinality'],
          defaults: [{ type: 'count', schema: 'metric' }],
        },
        {
          group: 'buckets',
          name: 'active_date',
          title: 'Active Date',
          min: 1,
          max: 1,
          aggFilter: ['date_histogram', 'terms'],
          defaults: [
            {
              type: 'date_histogram',
              schema: 'active_date',
              params: {
                interval: 'd',
                orderBy: '_term',
              },
            },
          ],
        },
      ]),
    },
  });
}

setup.types.registerVisualization(L30CurveProvider);
