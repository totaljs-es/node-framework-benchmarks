// The same API as the Express and Fastify apps: GET /hello, GET /users/{id} and POST /validate.
require('total5');
Total.run({ port: +process.env.PORT || 8301, release: true, watcher: false });
