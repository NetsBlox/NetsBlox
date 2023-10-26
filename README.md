# NetsBlox

NetsBlox is a visual programming language which allows people to develop networked programs.

## Overview
Netsblox is an extension of _Snap!_ which allows users to use some distributed computing concepts and develop network-enabled apps. That is, users can create apps that can interact with other instances of Netsblox. An introduction to the new networking capabilities can be found [here](https://github.com/NetsBlox/NetsBlox/wiki/Introduction-to-Distributed-Programming-in-NetsBlox)

Currently, we have support for _messages_ where a message is like a Snap! event except contains an additional data payload. For example, in the Tic-Tac-Toe example, the user is able to  create a "TicTacToe" message which contains *row* and *column* fields corresponding to the row and column that of the user's move.

Along with the events and messages, we also currently support _remote procedure calls_. RPCs are implemented as REST endpoints on the server which can perform some of the more challenging computation for the student (allowing support to make more complicated apps) as well as providing access to extra utilities not otherwise available to the student.

For example, you can import the `Map utilities` service which gives the user access to Google Maps with a `map of (latitude), (longitude) with zoom (zoom)` block:

![Remote Procedure Returning a Costume](./map-blocks.png)

This results in the stage costume changing:

![Google map costume on the stage](./map-example.png)

## Quick Start
The recommended method of installation is using [Docker Compose](https://docs.docker.com/compose) as explained below. After starting all the services, use the [NetsBlox CLI](https://github.com/NetsBlox/cloud/releases) to configure the deployment. Native installation instructions are also available.

### Docker Compose
First, download the [docker-compose.yml](./docker-compose.yml) file. Then start all the services by running the following from the same directory as the docker-compose.yml file:

```
docker-compose up
```

Finally, navigate to `localhost:8080` in a web browser to try it out!

#### Development with Docker
For development, first make sure the repository was cloned with the submodules (eg, using `git clone --recurse-submodules`). For services and browser development, uncomment the corresponding sections of the docker-compose file (for the [services](https://github.com/NetsBlox/NetsBlox/blob/1efd34b5cbeb333c8f1c2f078e406315ff884ef1/docker-compose.yml#L26-L28) or the [browser](https://github.com/NetsBlox/NetsBlox/blob/1efd34b5cbeb333c8f1c2f078e406315ff884ef1/docker-compose.yml#L40-L42)) then restart the containers as done at the end of the last section.

### Native
To run a native installation, check out the individual submodules and their installation instructions. These can be run in combination with the docker-based deployment by just commenting out the section you would like to run natively and running the given server on the same port.
