Command Line Interface
======================

NetsBlox includes a command line tool providing basic management and troubleshooting functionality at ``./bin/netsblox``.
This page details a few useful capabilities of this tool.

User creation and Group Management
----------------------------------

NetsBlox supports the creation of "groups" of users.
Users in a group can only collaborate with others in the same group.
This allows users to be placed in a "sandbox" in which they cannot collaborate with others from outside the group.
In particular, the use of groups can be particularly appropriate when using NetsBlox in a classroom setting with young students.

First, create the users with the ``add-user`` command:

.. code-block:: sh

    ./bin/netsblox add-user <username> <email> <password>

Next, a group will need to be created:

.. code-block:: sh

    ./bin/netsblox groups new <groupId>

The user can be added to the group with:

.. code-block:: sh

    ./bin/netsblox groups add-member <groupId> <username>

Finally, we can test that the group has been created (and contains the given user) with:

.. code-block:: sh

    ./bin/netsblox groups list

    # This command will print one group per line with the group id and all the members.
    # 
    # <groupId>TAB<Comma separated member list>

Alternatively, the `public dashboard <https://github.com/NetsBlox/teacher-dashboard>`__ can be used to manage groups and users.
