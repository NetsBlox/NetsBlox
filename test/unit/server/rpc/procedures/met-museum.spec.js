describe('met-museum', function() {
    const utils = require('../../../../assets/utils');
    var MetMuseum = utils.reqSrc('rpc/procedures/met-museum/met-museum'),
        RPCMock = require('../../../../assets/mock-rpc'),
        metMuseumMock = new RPCMock(MetMuseum);

    // converts a phrase into camel case format
    function toCamelCase(text) {
        // create uppercc
        let cc = text.toLowerCase()
            .split(' ')
            .map((s) => s.charAt(0).toUpperCase() + s.substring(1))
            .join('');
        return cc;
    }

    const featuredFields = [
        'Country',
        'Artist Display Bio',
        'Artist Display Name',
        'Dimensions',
        'Object Name',
        'Classification',
        'Title',
        'Credit Line',
        'Object Date',
        'Medium',
        'Repository',
        'Department',
        'Is Highlight'
    ];

    let autoGenInterface = featuredFields
        .map(attr => ['searchBy' + toCamelCase(attr), ['query']]);

    utils.verifyRPCInterfaces(metMuseumMock, [
        ['getInfo', ['id']],
        ['getImages', ['id']],
        ['advancedSearch', ['field', 'query', 'page', 'limit']],
        ['fields', []],
        ...autoGenInterface,
    ]);
});
