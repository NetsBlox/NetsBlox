Installation
============

The recommended method of installation is using `Docker <https://www.docker.com/>`__ as explained below.
Otherwise, native installation instructions are also available.

Docker
------

NetsBlox requires access to MongoDB and a file system (for blob storage).
MongoDB can be started using Docker:

.. code-block:: sh

    docker run -d -p 27017:27017 -v /abs/path/to/data:/data/db mongo

where ``/abs/path/to/data`` is a path on the host machine where the project content and media will be stored.

NetsBlox can then be started with:

.. code-block:: sh

    docker run -it -p 8080:8080 -e MONGO_URI='mongodb://172.17.0.1:27017/netsblox' -v /path/to/directory/for/media:/blob-data netsblox/server

where ``/path/to/directory/for/media`` is the directory on the host machine to store the project content and media.

In order to enable specific RPCs which use external APIs, you may have to set environment variables using the ``-e`` flag (like ``-e GOOGLE_MAPS_KEY=myGoogleMapsKey``) or pass in a list of environment variables through a file using ``--env-file``.
The list of all the environment variables are explained in :doc:`rpc-support`.

Note that addressing directories and files in windows is different from linux.
For example the directory divider is ``\`` as opposed to ``/``.

Next, just navigate to ``localhost:8080`` in a web browser to try it out!

Development with Docker
^^^^^^^^^^^^^^^^^^^^^^^

Setup and start MongoDB as described in the last step.

Pull in and create a container running the base image for NetsBlox:

.. code-block:: sh

    docker run -it -p 8080:8080 -e MONGO_URI='mongodb://172.17.0.1:27017/netsblox' -v my/netsblox/dir/path:/netsblox --name nb-base netsblox/base /bin/bash

Helpful commands:

- start stop the container: ``docker start nb-base`` ``docker stop nb-base``
- attach to the container to run commands: ``docker attach nb-base`` and detach by sending EOF: ``Ctrl+d``

Finally attach to the instance and follow native installation.
You can run the server in dev mode using ``ENV=dev npm run dev``

Access and edit the source files at the address you specified in the beginning ``my/netsblox/dir/path``.

Native
------

Before installing, NetsBlox requires `nodejs <https://nodejs.org/en/>`__ (``>= 8``) and a `MongoDB <https://www.mongodb.com/try?jmp=nav#community>`__ database.
By default, NetsBlox will expect MongoDB to be running locally (this can be changed by setting the ``MONGO_URI`` environment variable).

Server protocol can also be set through ``SERVER_PROTOCOL`` environment variable.
Host should be set using ``HOST=.mydomain.com``.

First clone the repository and install the dependencies.

.. code-block:: sh

    git clone https://github.com/NetsBlox/NetsBlox.git --recursive
    cd NetsBlox
    npm install

Finally, start the server with ``npm start`` and navigate to ``localhost:8080`` in a web browser to try it out!
