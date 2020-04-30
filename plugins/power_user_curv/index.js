import powerCurvRoute from './server/routes/power_user_curv';

export default function(kibana) {
  return new kibana.Plugin({
    require: ['elasticsearch'],
    name: 'power_user_curv',
    uiExports: {
      hacks: ['plugins/power_user_curv/power_user_curv'],
    },

    config(Joi) {
      return Joi.object({
        enabled: Joi.boolean().default(true),
      }).default();
    },

    init(server, options) {
      // eslint-disable-line no-unused-vars
      // Add server routes and initialize the plugin here
      powerCurvRoute(server);
    },
  });
}
