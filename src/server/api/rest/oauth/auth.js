/*globals location, document*/
function fromPairs(pairs) {
    const result = {};
    pairs.forEach(pair => {
        const [key, val] = pair;
        result[key] = val;
    });
    return result;
}

function parseQueryString(qs) {
    const pairs = qs.split('&').map(chunk => {
        const argAndVal = chunk.split('=');
        argAndVal[1] = decodeURIComponent(argAndVal[1]);
        return argAndVal;
    });
    return fromPairs(pairs);
}

const queryString = location.href.split('?').pop();
const params = parseQueryString(queryString);
console.log('redirect_uri:', params.redirect_uri);

const allowButton = document.getElementById('allowButton');
allowButton.onclick = async function() {
    const allowForm = document.getElementById('allow');
    allowForm.setAttribute('action', allowForm.getAttribute('action') + '?' + queryString);
    allowForm.submit();
};

const denyButton = document.getElementById('denyButton');
denyButton.onclick = function() {
    const allowForm = document.getElementById('allow');
    const url = allowForm.getAttribute('action') + '?' + queryString +
        '&error=' + encodeURIComponent('access_denied') + '&error_description=' +
        encodeURIComponent('The user denied the request.');
    allowForm.setAttribute('action', url);
    allowForm.submit();
};
