FROM node:24.15.0-bookworm AS core
ENV METEOR_ALLOW_SUPERUSER=1
WORKDIR /suite
COPY benchmarks/ ./benchmarks/
RUN cd benchmarks && npm ci --no-audit --no-fund && npm ci --prefix apps/totaljs4 --no-audit --no-fund && npm ci --prefix apps/totaljs --no-audit --no-fund && npm ci --prefix apps/express --no-audit --no-fund && npm ci --prefix apps/fastify --no-audit --no-fund && npm ci --prefix apps/adonis --no-audit --no-fund && npm ci --prefix apps/nestjs --no-audit --no-fund
RUN chmod -R a+rX /suite

FROM core AS full
RUN curl --fail --location 'https://install.meteor.com/?release=3.5.2' -o /tmp/install-meteor.sh && sh /tmp/install-meteor.sh
RUN node benchmarks/v2/build-meteor.cjs
RUN chmod -R a+rX /suite
