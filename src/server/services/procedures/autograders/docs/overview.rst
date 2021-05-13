Overview
========

*Note: Autograders are currently experimental! Feel free to use them at your own risk :)
As the following depends on unstable features, they are only available on https://dev.netsblox.org for now.*

The ``Autograders`` service provides capabilities for creating custom autograders in NetsBlox.
Autograders are created similarly to community services.
That is, they expect a configuration dictionary (list of lists) that contains information like the course/grader name and assignments.
Each assignment is expected to have a name and can optionally specify a "starter template" (URL to the assignment XML) as well as tests.
Tests contain the important logic for autograding; the parameters depend upon the type of the test.
Currently, only ``CustomBlockTest`` is supported.

The next sections provide example configurations.
For a practical guide on autograder creation, check out https://editor.netsblox.org/?action=present&Username=brian&ProjectName=Snap!shot%20Autograder&editMode=true&noRun=true.

Configuration Example (using custom blocks)
-------------------------------------------

.. image:: config-example.png
    :alt: Configuration example made in blocks inside NetsBlox
    :align: center

Configuration Example (JSON)
----------------------------

An example configuration is given below.
The configuration is shown in JavaScript.
In NetsBlox, the JSON objects should be represented as a list of key, value pairs (e.g., ``[["name", "Text Analysis"], ["assignments", [...]]]``).

.. include:: example.json.txt

This example defines an autograder for ``Text Analysis`` that consists of a single assignment.
The assignment has two tests which check that the ``is _ between _ and _`` block reports ``true`` in the first case and ``false`` in the second.
