FROM node:8.15-jessie
MAINTAINER Hamid Zare <hamid.zare@vanderbilt.edu>

ENV ENV production
ENV DEBUG netsblox*
ENV NETSBLOX_BLOB_DIR /blob-data

RUN echo installing dependencies..

RUN apt update
RUN apt install build-essential libgd-dev libcairo2-dev libcairo2-dev libpango1.0-dev libgd2-dev -y

RUN echo compiling and installing Gnuplot..
RUN mkdir /tmp/gnuInstall -p
WORKDIR /tmp/gnuInstall
RUN wget https://downloads.sourceforge.net/project/gnuplot/gnuplot/5.2.0/gnuplot-5.2.0.tar.gz
RUN tar -xzvf gnuplot-5.2.0.tar.gz
WORKDIR gnuplot-5.2.0
RUN ./configure && make && make install
RUN rm -r /tmp/gnuInstall

RUN echo finished installing dependencies

WORKDIR /netsblox
