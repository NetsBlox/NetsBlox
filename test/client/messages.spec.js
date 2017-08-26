/* globals expect, driver, MessageCreatorMorph, PushButtonMorph */
describe('messages', function() {
    before(function() {
        driver.selectCategory('network');
    });

    describe('message type', function() {
        beforeEach(function() {
            driver.reset();
        });

        it('should be able to open the msg type dialog', function() {
            var world = driver.world();
            var palette = driver.palette();
            var isMakeMsgTypeBtn = item => item instanceof PushButtonMorph &&
                item.labelString === 'Make a message type';
            var btn = palette.contents.children.find(isMakeMsgTypeBtn);

            btn.mouseClickLeft();
            var dialog = world.children[world.children.length-1];
            expect(dialog instanceof MessageCreatorMorph).to.be(true);
        });
    });
});
