Handling Errors
===============

When using PhoneIoT from NetsBlox, as is the case with many pre-existing NetsBlox services, some operations (e.g. from ``call`` or ``run`` blocks) might fail.
As the programmer, it's your responsibility to handle these failure cases.

Types of Errors
---------------

Depending on the RPC being used, some failures can happen simply because you gave it invalid input.
These types of errors can be fixed by making sure the input is valid before using it.

Other, more difficult errors can happen during networking.
For instance, a data packet might get lost on its way through the internet.
If this happens, your computer will wait a few seconds and eventually give up, returning an error message.
This is called a `dropped packet`.
An easy way to fix a dropped packet error is to simply repeat the operation over and over until success.

Errors in NetsBlox
------------------

Because PhoneIoT is a NetsBlox service, we use the same error handling.
In NetsBlox, each ``call`` or ``run`` block will update the ``error`` variable in the ``Network`` tab.
If the last RPC executed successfully, the ``error`` variable will be empty, otherwise it will have the error message.
Because of this, you can use an ``if (error)`` block after a ``run`` or ``call`` block to check if there was an error.
