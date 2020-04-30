import activeRoute from './server/routes/active';

export default function(kibana) {
  return new kibana.Plugin({
    require: ['elasticsearch'],
    name: 'active_customers',
    uiExports: {
      hacks: ['plugins/active_customers/active_type'],
    },

    config(Joi) {
      return Joi.object({
        enabled: Joi.boolean().default(true),
      }).default();
    },

    init(server, options) {
      // eslint-disable-line no-unused-vars
      // Add server routes and initialize the plugin here
      activeRoute(server);
    },
  });
}
