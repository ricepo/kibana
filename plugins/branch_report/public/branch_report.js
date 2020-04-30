/* The path to ui/vis is in `/src/legacy/ui/public/vis` */
import { visFactory } from 'ui/vis/vis_factory';
import { Schemas } from 'ui/vis/editors/default/schemas';
import { Status } from 'ui/vis/update_status';
import { setup } from '../../../src/legacy/core_plugins/visualizations/public/np_ready/public/legacy';

import { BranchReportVisualizationProvider } from './branch_report_visualization';

export default function BranchReportProvider() {
  return visFactory.createBaseVisualization({
    name: 'branch_report',
    title: 'Branch Report',
    icon: 'stopFilled',
    description: 'Branch Report',
    visualization: BranchReportVisualizationProvider,
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
      ]),
    },
  });
}

setup.types.registerVisualization(BranchReportProvider);
