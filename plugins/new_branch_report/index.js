import NewBranchReportRoute from './server/routes/new_branch_report';

export default function(kibana) {
  return new kibana.Plugin({
    require: ['elasticsearch'],
    name: 'new_branch_report',
    uiExports: {
      hacks: ['plugins/new_branch_report/new_branch_report'],
    },


    config(Joi) {
      return Joi.object({
        enabled: Joi.boolean().default(true),
      }).default();
    },

    // eslint-disable-next-line no-unused-vars
    init(server, options) {
      // Add server routes and initialize the plugin here
      NewBranchReportRoute(server);
    },
  });
}
