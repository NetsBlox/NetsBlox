from node:6.9.2
MAINTAINER Brian Broll <brian.broll@vanderbilt.edu>

ENV ENV production
ENV PORT 7000
ENV DEBUG netsblox*

ADD . /netsblox
WORKDIR /netsblox
RUN npm install

CMD ["npm", "start"]
