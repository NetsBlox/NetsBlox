# Description

Basic scraper code forked and modified from https://github.com/markusenglund/j-archive-scraper.

This service pulls data from J! Archive.
However, they don't have an API to access this easily, nor do there seem to be any good APIs for it.
Thus, we just manually scrape and pre-process what we need.
The data is stored as `questions.json` in this direction.

# Updating

First, go to [J! Archive](https://j-archive.com/), open the latest season,
and grab the latest game number (e.g., "#8712 aired ...").
Then run the following commands:

```sh
yarn install
node update.js <latest game number>
```

This will produce three files: `questions.json` with the cached results,
`questions-removed.json` with questions that were filtered out,
and `errors.json` with a list of bad questions (improperly encoded).
The only file needed by the trivia service is another output,
`questions.json.gz`, which is a hierarchically collapsed and compressed
version of `questions.json`.
