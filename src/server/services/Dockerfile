FROM node:lts
MAINTAINER Brian Broll <brian.broll@vanderbilt.edu>

ADD . /netsblox
RUN cd /netsblox && npm install
WORKDIR /netsblox

CMD ["npm", "start"]
