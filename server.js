var hapi = require('hapi');
var inert = require('inert');

var server = new hapi.Server();

server.connection({
  port: 3000,
});

server.register(inert, function(err) {
  if (err) throw err;

  server.route({
    method: 'GET',
    path: '/docs/{param*}',
    handler: {
      directory: {
        path: 'node_modules/swagger-ui/dist',
      },
    },
  });

  server.route({
    method: 'GET',
    path: '/swagger.json',
    handler: function(request, reply) {
      reply.file('swagger.json');  
    },
  });
});

server.start(function(err) {
  if (err) throw err;
});
