// The cluster option of Total.run().
require('total5');
Total.run({ port: +process.env.PORT || 8301, release: true, cluster: +process.env.WORKERS || 2 });
