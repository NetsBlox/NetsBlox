// handles the incoming input arguments for the RPCs. Parses and validates the inputs based on the code docs for the functions

function validate(input, fn) {
    let msg, isValid = true;
    fn(input);
    return {
        value: input,
        isValid: isValid,
        msg: msg
    };
}

const types = {
    'Number': input => {
        let msg = '', isValid = true;
        input = parseFloat(input);
        if (isNaN(input)) {
            msg = 'Pass in a number.';
            isValid = false;
        }
        return {
            value: input,
            isValid,
            msg: msg
        };
    },

    'Date': input => {
        let msg = '', isValid = true;
        input = new Date(input);
        if (isNaN(input.valueOf())) {
            msg = 'Pass in a isValid date.';
            isValid = false;
        }
        return {
            value: input,
            isValid: isValid,
            msg: msg
        };
    },

    'Array': input => {
        let msg = '', isValid = true;
        try {
            input = JSON.parse(input);
        } catch (e) {
            msg = 'Make sure you are sending a list.';
            isValid = false;
        }
        return {
            value: input,
            isValid,
            msg: msg
        };
    },

    'Latitude': input => {
        let msg = '', isValid = true;
        input = parseFloat(input);
        if (isNaN(input)) {
            isValid = false;
        } else if (input < -90 || input > 90) {
            msg = 'must be between -90 and 90.';
            isValid = false;
        }
        return {
            value: input,
            isValid,
            msg: msg
        };
    },

    'Longitude': input => {
        let msg = '', isValid = true;
        input = parseFloat(input);
        if (isNaN(input)) {
            isValid = false;
        } else if (input < -180 || input > 180) {
            msg = 'must be between -180 and 180.';
            isValid = false;
        }
        return {
            value: input,
            isValid,
            msg: msg
        };
    },
};

module.exports = types;
