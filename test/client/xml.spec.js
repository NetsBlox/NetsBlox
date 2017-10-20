/* globals XML_Element, expect */
describe('xml', function() {
    it('should serialized CDATA element correctly', function() {
        var str = '<test><![CDATA[<dontparse>embedded xml contents</dontparse>]]></test>';
        var xml = new XML_Element();
        xml.parseString(str);
        expect(xml.toString()).to.be(str);
    });
});
