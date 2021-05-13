Deploy with Docker Compose
==========================

The recommended method of deployment is using `docker-compose <https://docs.docker.com/compose/>`__.

Deployment is as simple as downloading the `docker-compose file <https://raw.githubusercontent.com/NetsBlox/NetsBlox/master/docker-compose.yml>`__ and then running:

.. code-block:: sh

    docker-compose up

within the directory containing the ``docker-compose.yml`` file.

This should spin up NetsBlox on port ``8080``.
If you are hosting NetsBlox publicly, I would recommend using a reverse-proxy, like nginx, to route traffic to the public address (like https://editor.netsblox.org) to port ``8080``.

Note: The basic NetsBlox deployment will not have any services available which require a custom API key.
To enable these services, check out :doc:`rpc-support`.
