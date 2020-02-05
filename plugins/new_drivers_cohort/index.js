import newDriverCohortRoute from './server/routes/new_drivers_cohort';

export default function (kibana) {
  return new kibana.Plugin({
    require: ['elasticsearch'],
    name: 'new_drivers_cohort',
    uiExports: {
      hacks: [
        'plugins/new_drivers_cohort/cohort_type'
      ],
    },

    config(Joi) {
      return Joi.object({
        enabled: Joi.boolean().default(true),
      }).default();
    },

    init(server, options) { // eslint-disable-line no-unused-vars
      // Add server routes and initialize the plugin here
      newDriverCohortRoute(server);
    }
  });
}
