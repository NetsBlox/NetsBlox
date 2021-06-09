async function* dropUntil(stream, fn) {
    let isPassing = false;
    for await (const item of stream) {
        if (!isPassing) {
            isPassing = await fn(item);
        }
        if (isPassing) {
            yield item;
        }
    }
}

async function* filter(stream, fn) {
    for await (const item of stream) {
        if (await fn(item)) {
            yield item;
        }
    }
}

async function* takeWhile(stream, fn, includeNext=false) {
    let lastItem;
    for await (const item of stream) {
        if (await fn(item)) {
            yield item;
        } else {
            lastItem = item;
            break;
        }
    }
    if (includeNext) {
        yield lastItem;
    }
}

async function* chunkWith(stream, fn) {
    const first = (await stream.next()).value
    let chunkID = fn(first);
    let chunk = [first];
    for await (const item of stream) {
        const id = await fn(item);
        if (id === chunkID) {
            chunk.push(item);
        } else {
            yield chunk;
            chunk = [item];
            chunkID = id;
        }
    }

    if (chunk.length) {
        yield chunk;
    }
}

async function* chunk(stream, size) {
    let nextChunk = [];
    for await (const item of stream) {
        if (nextChunk.length < size) {
            nextChunk.push(item);
        } else {
            yield nextChunk;
            nextChunk = [];
        }
    }

    if (nextChunk.length) {
        yield nextChunk;
    }
}

async function collect(stream, fn) {
    const results = [];
    for await (const item of stream) {
        results.push(item);
    }
    return results;
}

module.exports = {takeWhile, dropUntil, collect, chunkWith, chunk, filter};
