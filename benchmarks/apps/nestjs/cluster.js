// Runs the NestJS app in N worker processes with the cluster module of Node.js.
const cluster = require('node:cluster');
if (cluster.isPrimary) {
	for (let i = 0; i < (+process.env.WORKERS || 2); i++)
		cluster.fork();
} else
	require('./index.js');
