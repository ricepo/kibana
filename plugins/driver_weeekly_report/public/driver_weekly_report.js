/* The path to ui/vis is in `/src/legacy/ui/public/vis` */
import { visFactory } from 'ui/vis/vis_factory';
import { Schemas } from 'ui/vis/editors/default/schemas';

import { DriverWeeklyReportVisualizationProvider } from './driver_weekly_report_visualization';
import { setup } from '../../../src/legacy/core_plugins/visualizations/public/np_ready/public/legacy';

export default function DriverWeeklyReportProvider(Private) {
  return visFactory.createBaseVisualization({
    name: 'driver_weeekly_report',
    title: 'Driver Weekly Report',
    icon: 'stopFilled',
    description: 'Driver Weekly Report',
    visualization: DriverWeeklyReportVisualizationProvider,
    visConfig: {
      defaults: {},
    },
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

setup.types.registerVisualization(DriverWeeklyReportProvider);
