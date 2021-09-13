RPC Argument Types
==================

<%
function getParamName(param) { return typeof(param) === 'object' ? param.name || param : param; }

const MAX_PARAMS = 6;
function formatType(type) {
    const disp = inputTypes[type.name].displayName;
    const params = type.params || [];
    return !params.length ? disp : `${disp}<${params.slice(0, MAX_PARAMS).map(getParamName).join(', ')}${params.length > MAX_PARAMS ? ', ...': ''}>`;
}
%>

<% for (const typeName of Object.keys(inputTypes).sort()) { %>
    <% const type = inputTypes[typeName]; %>
    <% if (type.hidden) continue; %>
.. class:: <%= type.displayName %><% if (type.baseType) { %>(<%= formatType(type.baseType) %>)<% } %>

<%= type.rawDescription %>

    <% if (type.baseType) { %>
**Base Type:** :class:`<%= inputTypes[type.baseType.name].displayName %>`
    <% } %>

    <% if (type.baseType && type.baseType.name === 'Enum') { %>
**Options (case insensitive):** <%= type.baseType.params.map(x => `\`\`${getParamName(x)}\`\``).join(', ') %>
    <% } else if (type.baseType && type.baseType.name === 'Object') { %>
**Fields:**
        <% for (const field of type.baseType.params) { %>
- ``<%= field.name %>: <%= formatType(field.type) %><%= field.optional ? '?' : '' %>``
        <% } %>
    <% } %>
<% } %>
