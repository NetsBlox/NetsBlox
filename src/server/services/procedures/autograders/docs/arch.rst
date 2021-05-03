Architecture
============

This page provides an overview of the current architecture for NetsBlox autograders.
There are two main components in the current support for autograders:

- The Autograders service
- Client-side extensions

Autograders Service
-------------------

This service provides the ability to create autograders via specifying a configuration (see :doc:`overview`).
This configuration is then saved in the database.

The autograders service also exposes an endpoint ``/api/autograders/:username/:name.js``.
When an autograder is requested, the configuration is retrieved from the database and then the autograder code is generated and served to the requestor.

Client-side extensions
----------------------

Autograders are supported on the client through the use of client-side extensions.
Currently, these can be loaded only through URL parameters (query string parameters, specifically).
Extensions are simply a list of URLs of JS files to load.
If the URL is not hosted on the origin (i.e., netsblox.org in the public deployment), the user will be asked if the extension is trustworthy.

One important distinction to make is that these are loosely coupled.
Although the Autograders service provides one type of autograder (configurable with a dictionary), other sorts of autograders could be loaded as their own extension.
Ideally, the current autograder will be able to be configured in even richer ways to enable grading some of the more challenging types of assignments - such as drawing or interactive assignments. :)
