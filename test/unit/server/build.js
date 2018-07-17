describe('build', function() {
    describe('es5 client js', function() {
        let fs = require('fs'),
            path = require('path'),
            srcPath = path.join(__dirname, '..', '..', '..', 'src', 'browser'),
            ugly = require('uglify-js');

        // Get the given js files
        let devHtml = fs.readFileSync(path.join(srcPath, 'index.dev.html'), 'utf8'),
            re = /text\/javascript" src="(.*)">/,
            match = devHtml.match(re),
            srcFiles = [];

        while (match) {
            srcFiles.push(match[1]);
            devHtml = devHtml.substring(match.index + match[0].length);
            match = devHtml.match(re);
        }

        srcFiles.forEach(filename => {
            it(`should use es5 in ${filename}`, function() {
                this.timeout(5000);
                ugly.minify(path.join(srcPath, filename)).code;
            });
        });
    });
});
