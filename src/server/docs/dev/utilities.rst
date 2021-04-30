Utilities
=========

This file contains utilities for creating custom services.
Utilities are available `here <https://github.com/NetsBlox/NetsBlox/tree/master/src/server/services/procedures/utils>`__; some documentation can be found below.

CSV Toolset
-----------

We provide a helper for parsing and loading CSV file into NetsBlox database to help development of new services.
If your dataset is not in CSV but is easily convertible, you write a script to convert it to CSV to be able to take advantage of this toolset.

How
^^^

You can find this helper in the RPC utilities directory: ``$PROJECT_ROOT/src/server/rpc/procedures/utils``.
The interface to this helper accepts a few parameters:

- Mongoose model: A mongoose model defined using ``src/server/rpc/advancedStorage.js``
- an options object:
    - ``url`` - a direct url to the CSV file
    - ``filePath`` - file system path to the CSV file
    - ``recParser`` - a function that gets passed each record (or line in the input csv) for optional processing.

Sample
^^^^^^

Here is a sample seed file for a service:

.. include:: example-seed-service.js.txt
