describe('dataset-test', function() {
    const test = require('../../../../../../src/server/rpc/procedures/utils/dataset-test.js');
    const assert = require('assert');

    let dataset1 = [[['name', 'ellie'], ['age', 15]]];
    let dataset2 = [[['name', 'ellie'], ['ae', 15]]];
    let dataset3 = [[['name', 'ellie'], ['age', '15']]];
    let dataset4 = [[[], ['age', 15]]];
    let dataset5 = [[['name', 'ellie'], ['age', 15], ['extra']]];
    let dataset6 = [[['name'], ['age', 15]]];
    let dataset7 = [[['name', 'ellie'], ['age', 'abc']]];
    let dataset8 = [dataset3, dataset3];

    let msg1 = 'The dataset is blank or has blank or invalid value';
    let msg2 = 'The dataset should only have two types of value';
    let msg3 = 'At least one point doesn\'t have both name and value';
    let msg4 = 'At least one point has name different from xAxis or yAxis';
    let msg5 = 'yAxis values are not valid number';
    describe('dataset test', function() {
        it('should detect invalid array (not blank or invalid values)', function() {
            assert(test.testValidArray(dataset1));
            assert(test.testValidArray(dataset2));
            assert(test.testValidArray(dataset3));
            assert(!(test.testValidArray(dataset4)));
        });

        it ('should detect invalid dataset', function() {
            assert.equal(test.testValidDataset(dataset1, 'name', 'age'), '');
            assert.equal(test.testValidDataset(dataset3, 'name', 'age'), '');
            assert.equal(test.testValidDataset(dataset4, 'name', 'age'), msg1);
            assert.equal(test.testValidDataset(dataset5, 'name', 'age'), msg2);
            assert.equal(test.testValidDataset(dataset6, 'name', 'age'), msg3);
            assert.equal(test.testValidDataset(dataset7, 'name', 'age'), msg5);
        });

        it ('should detect valid multiple dataset', function() {
            assert.equal(test.testMultipleDatasets(dataset8, ['1', '2']), '');
        });

        it ('should get the right field', function() {
            assert.deepEqual(test.getField(dataset1, 'age'), [15]);
        });

        it('should get the right number of layers', function() {
            assert.equal(test.isMultipleDataset(dataset8), true);
            assert.equal(test.isMultipleDataset(dataset1), false);
        });
    });
});
