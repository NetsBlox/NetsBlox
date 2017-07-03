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

test.testValidDataset = (rawDataset, xAxis, yAxis) => {
    if (!(test.testValidArray(rawDataset))) {
        return 'The dataset is blank or has blank or invalid value';
    }
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

test.testMultipleDatasets = (rawDataset, xAxis, yAxis) => {
    let returnedMsg;
    for (let i = 0; i < rawDataset.length; i++) {
        returnedMsg = test.testValidDataset(rawDataset[i], xAxis, yAxis);
        if (returnedMsg !== '') {
            return returnedMsg;
        }
    }
    return '';
};

module.exports = test;