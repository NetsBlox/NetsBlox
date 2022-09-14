class BookNotFound extends Error {
    constructor(id) {
        super(`No book found with ID: ${id}`);
    }
}

module.exports = {BookNotFound};
