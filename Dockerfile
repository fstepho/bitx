# Built with:
# docker build -t fstepho/bitcore-node .

# Run a testnet node:
# docker run --env NETWORK=testnet --restart=unless-stopped -P -d --network=host -v /root/bitcoin-node --name testnet fstepho/bitcore-node

# Run a livenet node:
# docker run --restart=unless-stopped -P -d --network=host -v /root/bitcoin-node --name livenet fstepho/bitcore-node

FROM ubuntu

ARG MONGO_VERSION=3.2
ARG BWS_VERSION=1.15
ARG NODE_VERSION=4.4.7

ENV NETWORK=livenet
LABEL maintainer Fabien STEPHO "stepho.fabien@gmail.com"

EXPOSE 3001 3232 8333 6667 27017 28017

RUN rm /bin/sh && ln -s /bin/bash /bin/sh

RUN apt-key adv --keyserver hkp://keyserver.ubuntu.com:80 --recv 0C49F3730359A14518585931BC711F9BA15703C6

RUN echo "deb http://repo.mongodb.org/apt/ubuntu xenial/mongodb-org/${MONGO_VERSION} multiverse" | tee /etc/apt/sources.list.d/mongodb-org-${MONGO_VERSION}.list

RUN apt-get update && apt-get install -y --allow-unauthenticated mongodb-org libzmq3-dev curl python build-essential checkinstall git

ENV NVM_DIR /usr/local/nvm

RUN curl -o- https://raw.githubusercontent.com/creationix/nvm/v0.33.2/install.sh | bash \
    && source $NVM_DIR/nvm.sh \
    && nvm install $NODE_VERSION \
    && nvm alias default $NODE_VERSION \
    && nvm use default

ENV NODE_PATH $NVM_DIR/v$NODE_VERSION/lib/node_modules
ENV PATH      $NVM_DIR/versions/node/v$NODE_VERSION/bin:$PATH
ENV BWS_VERSION ${BWS_VERSION}

RUN npm i -g bitcore-node

WORKDIR /root

RUN bitcore-node create bitcoin-node

WORKDIR /root/bitcoin-node
RUN bitcore-node install insight-ui insight-api web

WORKDIR /root

ADD https://github.com/bitpay/bitcore-wallet-service/archive/v${BWS_VERSION}.tar.gz bws.tar.gz

RUN tar zxf bws.tar.gz

# setup bitcore wallet service
COPY bws-config.js /root/bitcore-wallet-service-${BWS_VERSION}/config.js
RUN cd /root/bitcore-wallet-service-${BWS_VERSION} && npm i

# setup dirs for mongo
RUN mkdir -p /root/mongo-data

RUN mkdir -p /root/bitcore-es
RUN cd /root/bitcoin-node/node_modules && ln -s /root/bitcore-es
ENTRYPOINT cd /root/bitcoin-node && bitcore-node start