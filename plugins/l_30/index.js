import l30Route from './server/routes/l_30';

export default function (kibana) {
  return new kibana.Plugin({
    require: ['elasticsearch'],
    name: 'l_30',
    uiExports: {
      hacks: [
        'plugins/l_30/l_30'
      ],
    },

    config(Joi) {
      return Joi.object({
        enabled: Joi.boolean().default(true),
      }).default();
    },

    init(server, options) { // eslint-disable-line no-unused-vars
      // Add server routes and initialize the plugin here
      l30Route(server);
    }
  });
}
