// The same API as the other apps, with AdonisJS 6 (the files of its official "slim" starter kit, compiled to JavaScript; the routes
// are in start/routes.js and the validation is VineJS, the validator of Adonis). Adonis reads its settings from the environment.
process.env.APP_KEY = process.env.APP_KEY || 'benchmark-only-key-not-a-secret-0123456';
process.env.HOST = '0.0.0.0';
process.env.LOG_LEVEL = 'warn';
process.env.PORT = process.env.PORT || '8311';
import('./bin/server.js');
