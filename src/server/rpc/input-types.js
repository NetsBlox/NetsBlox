// handles the incoming input arguments for the RPCs. Parses and validates the inputs based on the code docs for the functions

const types = {
    'Number': input => {
        input = parseFloat(input);
        if (isNaN(input)) {
            throw 'Pass in a number.';
        }
        return input;
    },

    'Date': input => {
        input = new Date(input);
        if (isNaN(input.valueOf())) {
            throw 'Pass in a isValid date.';
        }
        return input;
    },

    'Array': input => {
        try {
            input = JSON.parse(input);
        } catch (e) {
            throw 'Make sure you are sending a list.';
        }
        return input;
    },

    'Latitude': input => {
        input = parseFloat(input);
        if (isNaN(input)) {
            throw '';
        } else if (input < -90 || input > 90) {
            throw 'must be between -90 and 90.';
        }
        return input;
    },

    'Longitude': input => {
        input = parseFloat(input);
        if (isNaN(input)) {
            throw '';
        } else if (input < -180 || input > 180) {
            throw 'must be between -180 and 180.';
        }
        return input;
    },
};

module.exports = types;
