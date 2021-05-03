Hello Custom Services
=====================

This presents a walkthrough creating a simple service in NetsBlox!
This assumes you are using OSX or linux.

Create the service
------------------

First, set up a local development environment (see :doc:`/adv/installation`).

Creating the server support for a simple service can be done as follows (assuming ``*nix`` shell starting at the project root):

.. code-block:: sh

    cd src/server/services/procedures
    mkdir hello-world
    touch hello-world/hello-world.js

Next, open ``hello-world/hello-world.js`` and add the following code:

.. code-block:: js

    const HelloService = {};

    HelloService.hello = function() {
        return 'world';
    };

    module.exports = HelloService;

Finally, start your NetsBlox server with ``DEBUG=netsblox:* npm start``.

Use it from the browser!
------------------------

Open a browser and navigate to your NetsBlox server address (default is ``http://localhost:8080``).
Switch to the ``Network`` tab and create a ``call`` block.

Click on the first dropdown menu and you should see ``HelloWorld`` as one of the options.
Next, select the second menu and you should receive a list of all valid actions for the rpc, in our case just ``hello``.
After selecting these, click on the block and you should see a dialog responding with ``world``!

Congrats, you have made your first custom service in NetsBlox!

Next Steps
----------

Now that you have created your own minimal service, check out the :doc:`/dev/best-practices` to make it a much more feature-rich and robust service!
