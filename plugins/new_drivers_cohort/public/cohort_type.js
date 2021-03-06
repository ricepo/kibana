/* The path to ui/vis is in `/src/legacy/ui/public/vis` */
import { visFactory } from 'ui/vis/vis_factory';
import { Schemas } from 'ui/vis/editors/default/schemas';

import { NewDriversCohortVisualizationProvider } from './cohort_visualization';
import './cohort.less';
import optionsTemplate from './options_template.html';
import { Status } from 'ui/vis/update_status';
import { setup } from '../../../src/legacy/core_plugins/visualizations/public/np_ready/public/legacy';

export default function NewDriversCohortTypeProvider(Private) {
  return visFactory.createBaseVisualization({
    name: 'new_drivers_cohort',
    title: 'New drivers cohort',
    icon: 'stopFilled',
    description: 'New drivers cohort analysis',
    visualization: NewDriversCohortVisualizationProvider,
    visConfig: {
      defaults: {
        percentual: false,
        table: true,
        mapColors: 'heatmap',
        period: 'weekly',
      },
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
      optionsTemplate: optionsTemplate,
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
      ]),
    },
  });
}

setup.types.registerVisualization(NewDriversCohortTypeProvider);
