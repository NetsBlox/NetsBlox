const COLOR = {};
addColor('LIGHT_GRAY', '#d6d7d9');
addColor('TEAL', '#1B9E77');
addColor('ORANGE', '#D95F02');
addColor('LILAC', '#7570B3');
addColor('MAGENTA', '#E7298A');
addColor('LIME_GREEN', '#66A61E');
addColor('BANANA', '#E6AB02');
addColor('TAN', '#A6761D');
addColor('GRAY', '#666666');

function addColor(name, color) {
    COLOR[name] = `"${color}"`;
}

module.exports = COLOR;
