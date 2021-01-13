/*globals location, document*/
const queryString = location.href.split('?').pop();
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
