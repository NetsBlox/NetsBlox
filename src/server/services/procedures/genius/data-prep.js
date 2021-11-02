const prepare = {};

prepare.SongSearchResult = data => {
    return {
        id: data.id,
        title: data.title,
        'image URL': data.song_art_image_url,
        'thumbnail URL': data.song_art_image_thumbnail_url,
        'artist name': data.artist_names,
        'artist ID': data.primary_artist.id,
        URL: data.url,
    };
};

prepare.Song = data => {
    return {
        id: data.id,
        title: data.title,
        'artist name': data.artist_names,
        description: data.description.plain,
        'release date': data.release_date,
        'image URL': data.song_art_image_url,
        'thumbnail URL': data.song_art_image_thumbnail_url,
        URL: data.url,
    };
};

prepare.Artist = data => {
    return {
        id: data.id,
        name: data.name,
        description: data.description.plain,
        'image URL': data.image_url,
        URL: data.url,
    };
};

module.exports = prepare;
