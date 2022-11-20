## Image Backups

As a backup plan in case the data source were to ever be taken offline, the [`downloader.py`](downloader.py) script
was written to quickly download all the images (with metadata already being saved in the CSV file itself).
This was run once and stored in google drive long-term, but the script remains in case the image source is ever updated.
At the time of writing, the total image dataset is around 3.3GB.
Obviously, don't commit the downloaded image files to the repository...
