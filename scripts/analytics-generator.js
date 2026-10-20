'use strict';
hexo.extend.generator.register('analytics-config', function (locals) {
  const analytics = (locals.data.site || {}).analytics || {};
  return { path: 'analytics-config.json', data: JSON.stringify({ enabled: analytics.enabled === true, endpoint: analytics.endpoint || '' }) };
});
