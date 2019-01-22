let test = {};

test.getField = (input, fieldName) => {
    let stringResult = input.reduce((acc, cur) => {
        return acc.concat(cur.find((valuePair) => {
            return valuePair[0] === fieldName;
        })[1]);
    }, []);

    let sample = stringResult[0];
    if (+sample && (+sample).toString().length === sample.length) {
        return stringResult.map((input) => +input);
    }
    return stringResult;
};

test.testValidArray = (rawArray) => {
    if (rawArray === '') {
        return false;
    }
    if (typeof rawArray === 'string' || typeof rawArray === 'number') {
        return true;
    }
    if (Array.isArray(rawArray)) {
        if (rawArray.length === 0) {
            return false;
        }
        return rawArray.filter(test.testValidArray).length === rawArray.length;
    }
    return false;
};

test.testValidDataset = (rawDataset) => {
    if (!(test.testValidArray(rawDataset))) {
        return 'The dataset is blank or has blank or invalid value';
    }
    let xAxis = rawDataset[0][0][0];
    let yAxis = rawDataset[0][1][0];
    for (let i = 0; i < rawDataset.length; i++) {
        let dataPoint = rawDataset[i];
        if (dataPoint.length !== 2) {
            return 'The dataset should only have two types of value';
        }
        if (dataPoint[0].length !== 2 || dataPoint[1].length !== 2) {
            return 'At least one point doesn\'t have both name and value';
        }
        if (dataPoint[0][0] !== xAxis || dataPoint[1][0] !== yAxis) {
            return 'At least one point has name different from xAxis or yAxis';
        }
    }

    let yValue = test.getField(rawDataset, yAxis);
    if (yValue.find((value) => typeof value !== 'number') !== undefined) {
        return 'yAxis values are not valid number';
    }
    return '';
};

test.testMultipleDatasets = (rawDataset, datasetTag) => {
    if (typeof datasetTag !== 'object') {
        return 'datasetTag should be a list of tags';
    }
    let returnedMsg;
    for (let i = 0; i < rawDataset.length; i++) {
        returnedMsg = test.testValidDataset(rawDataset[i]);
        if (returnedMsg !== '') {
            return returnedMsg;
        }
    }
    return '';
};

test.isMultipleDataset = (rawArray) => {
    let numLayers = (rawArray) => {
        if (typeof rawArray !== 'object') {
            return 0;
        }
        return numLayers(rawArray[0]) + 1;
    };

    return numLayers(rawArray) === 4;
};


module.exports = test;