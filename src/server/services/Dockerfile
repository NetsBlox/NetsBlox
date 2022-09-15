FROM node:lts
MAINTAINER Brian Broll <brian.broll@vanderbilt.edu>

ADD . /netsblox

# Configure apt-get for C++ std lib installation (later)
RUN echo "deb http://deb.debian.org/debian testing main" >> /etc/apt/sources.list && \
	apt-get update

# Fix broken perl setup as described here: https://bugs.debian.org/cgi-bin/bugreport.cgi?bug=993755
RUN cd /tmp && \
	apt-get -y download libcrypt1 && \
	dpkg-deb -x $(ls | grep libcrypt) . && \
	cp -av lib/x86_64-linux-gnu/* /usr/lib/x86_64-linux-gnu/

# Install updated C++ std lib (required for NodeHun)
RUN apt-get install -y libstdc++-10-dev

# Clean up and install NetsBlox dependencies
RUN apt-get clean && \
	rm -rf /tmp/* && \
	cd /netsblox && npm install  # Install netsblox dependencies
WORKDIR /netsblox

CMD ["npm", "start"]
