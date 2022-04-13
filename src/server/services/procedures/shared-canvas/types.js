const types = require('../../input-types');
const { getCanvas } = require('./storage');

function defineTypes() {
    types.defineType({
        name: 'SharedCanvasX',
        description: 'An X coordinate used by the :doc:`/services/SharedCanvas/index` service. This should be at least zero and less then the canvas width.',
        baseType: 'Integer',
        parser: async val => {
            const canvas = await getCanvas();
            const width = canvas.bitmap.width;
            if (val < 0) throw Error(`X coord must be at least 0 (got ${val})`);
            if (val >= width) throw Error(`X coord must be less than canvas width (${width}) (got ${val})`);
            return val;
        },
    });
    types.defineType({
        name: 'SharedCanvasY',
        description: 'A Y coordinate used by the :doc:`/services/SharedCanvas/index` service. This should be at least zero and less then the canvas height.',
        baseType: 'Integer',
        parser: async val => {
            const canvas = await getCanvas();
            const height = canvas.bitmap.height;
            if (val < 0) throw Error(`Y coord must be at least 0 (got ${val})`);
            if (val >= height) throw Error(`Y coord must be less than canvas height (${height}) (got ${val})`);
            return val;
        },
    });
    types.defineType({
        name: 'SharedCanvasColor',
        description: 'A color value used by the :doc:`/services/SharedCanvas/index` service. This is a list of three integers ``[0-255]`` denoting the red, green, and blue (RGB) intensities.',
        baseType: 'Array',
        baseParams: [{name: 'BoundedInteger', params: [0, 255]}, 3, 3],
    });
}

module.exports = {
    defineTypes,
};
