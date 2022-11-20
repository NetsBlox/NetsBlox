import os
import sys
import json
import threading
import urllib.request

if __name__ == '__main__':
    if len(sys.argv) != 4:
        print(f'usage: {sys.argv[0]} <CSV PATH> <SAVE DIR> <THREADS>')
        sys.exit(1)

    with open(sys.argv[1], 'r') as f:
        content = f.read()

    save_dir = sys.argv[2]
    os.mkdir(save_dir)

    thread_count = int(sys.argv[3])

    urls = set()
    for line in content.splitlines()[1:]:
        vals = [val[1:-1] if val[0] == val[-1] and val[0] == '"' else val for val in line.split(',')]
        if len(vals) == 0 or (len(vals) == 1 and vals[0] == ''): continue
        assert vals[-1].startswith('http'), vals
        urls.add(vals[-1])
    urls = { v: f'{i:05}.jpg' for i, v in enumerate(urls) }

    it = iter(urls.items())
    lock = threading.Lock()

    def thread_fn():
        while True:
            with lock:
                try:
                    url, file_name = next(it)
                except StopIteration:
                    return
            print(f'downloading {file_name}')
            with urllib.request.urlopen(url) as src:
                with open(f'{save_dir}/{file_name}', 'wb') as dst:
                    dst.write(src.read())

    threads = [threading.Thread(target = thread_fn) for _ in range(thread_count)]
    for thread in threads:
        thread.start()
    for thread in threads:
        thread.join()

    print('saving index')
    with open(f'{save_dir}/index.json', 'w') as f:
        json.dump(urls, f)
