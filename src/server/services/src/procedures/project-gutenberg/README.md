# Project Gutenberg Service
For documentation about usage, check out the main NetsBlox (generated) docs.

## Updating the metadata
The `catalog.jsonl` file is generated from the [Project Gutenberg catalog](https://www.gutenberg.org/ebooks/offline_catalogs.html#xmlrdf).
To update, first download the latest RDF file and then create the catalog.jsonl version with:
```
node metadata.js catalog.rdf > catalog.jsonl
```
