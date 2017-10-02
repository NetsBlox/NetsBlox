from node:6.9.2
MAINTAINER Brian Broll <brian.broll@vanderbilt.edu>

ENV ENV production
ENV DEBUG netsblox*
ENV NETSBLOX_BLOB_DIR /blob-data

RUN apt-get update && apt-get install libcairo2-dev libx11-dev gnuplot -y
ADD . /netsblox
WORKDIR /netsblox
RUN rm -rf node_modules && npm install; \
    mkdir -p src/client/dist; \
    npm run postinstall

EXPOSE 8080

CMD ["npm", "start"]
