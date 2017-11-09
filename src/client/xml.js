XML_Element.prototype.toString = function (isFormatted, indentationLevel) {
    var result = '',
        indent = '',
        level = indentationLevel || 0,
        key,
        i;

    // spaces for indentation, if any
    if (isFormatted) {
        for (i = 0; i < level; i += 1) {
            indent += this.indentation;
        }
        result += indent;
    }

    if (this.tag === 'CDATA') {
        result += '<![CDATA[' + this.contents + ']]>';
        return result;
    }

    // opening tag
    result += ('<' + this.tag);

    // attributes, if any
    for (key in this.attributes) {
        if (Object.prototype.hasOwnProperty.call(this.attributes, key)
                && this.attributes[key]) {
            // NetsBlox addition: start
            result += ' ' + key + '="' + this.escape(this.attributes[key]) + '"';
            // NetsBlox addition: end
        }
    }

    // contents, subnodes, and closing tag
    if (!this.contents.length && !this.children.length) {
        result += '/>';
    } else {
        result += '>';
        // NetsBlox addition: start
        result += this.escape(this.contents);
        // NetsBlox addition: end
        this.children.forEach(function (element) {
            if (isFormatted) {
                result += '\n';
            }
            result += element.toString(isFormatted, level + 1);
        });
        if (isFormatted && this.children.length) {
            result += ('\n' + indent);
        }
        result += '</' + this.tag + '>';
    }
    return result;
};

