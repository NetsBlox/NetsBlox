describe('independent client', function() {
    const _ = require('lodash');
    const assert = require('assert');
    const path = require('path');
    const fs = require('fs').promises;
    const PROJECT_ROOT = path.join(__dirname, '..', '..', '..');
    const BROWSER_ROOT = path.join(PROJECT_ROOT, 'src', 'browser');

    it('should include all required JS files', async function() {
        const required = (await includedJS(path.join(BROWSER_ROOT, 'index.dot')))
            .filter(name => name.startsWith('src'));
        const actual = await includedJS(path.join(BROWSER_ROOT, 'index.dev.html'));
        const missingFiles = _.difference(required, actual);
        assert.equal(
            missingFiles.length,
            0,
            `Missing JS file(s) in index.dev.html: ${missingFiles.join(', ')}`
        );
    });

    async function includedJS(filepath) {
        const re = /text\/javascript" src="(.*)">/;
        let text = await fs.readFile(filepath, 'utf8'),
            match = text.match(re),
            srcFiles = [];

        while (match) {
            srcFiles.push(match[1]);
            text = text.substring(match.index + match[0].length);
            match = text.match(re);
        }
        return srcFiles;
    }
});
