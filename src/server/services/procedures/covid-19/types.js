const types = require('../../input-types');

const VaccineCategories = [
    'total vaccinations',
    'people vaccinated',
    'people fully vaccinated',
    'daily vaccinations raw',
    'daily vaccinations',
    'total vaccinations per hundred',
    'people vaccinated per hundred',
    'people fully vaccinated per hundred',
    'daily vaccinations per million',
];

function registerTypes() {
    types.defineType({
        name: 'VaccineCategory',
        description: 'The type of article to retrieve from the NewYorkTimes service.',
        baseType: 'Enum',
        baseParams: VaccineCategories,
    });
}

module.exports = {registerTypes};
