/* globals SnapActions, expect, driver, Point, CustomBlockDefinition,
 CustomCommandBlockMorph, ScriptsMorph */
describe('blocks', function() {
    var position = new Point(400, 400);

    beforeEach(function(done) {
        driver.reset(() => {
            driver.selectCategory('control');
            done();
        });
    });

    it('should create block', function(done) {
        driver.addBlock('doIfElse', position)
            .accept(block => {
                expect(!!block).to.be(true);
                done();
            })
            .reject(err => done(err));
    });

    it('should relabel if-else block to if', function(done) {
        var fail = () => done('action rejected!');
        driver.addBlock('doIfElse', position)
            .accept(block => SnapActions.setSelector(block, 'doIf')
                .accept(() => done())
                .reject(fail)
            )
            .reject(fail);
    });

    describe('custom', function() {
        beforeEach(done => {
            driver.reset(() => {
                driver.selectCategory('custom');
                done();
            });
        });

        it('should create (sprite) custom block', function(done) {
            // Create a custom block definition
            var sprite = driver.ide().currentSprite,
                spec = 'sprite block %s',
                definition = new CustomBlockDefinition(spec, sprite);

            // Get the sprite
            definition.category = 'motion';
            SnapActions.addCustomBlock(definition, sprite)
                .accept(() => {
                    driver.addBlock(definition.blockInstance(), position)
                        .accept(() => done());
                });
        });

        it('should be able to attach comment to prototype hat block', function(done) {
            var sprite = driver.ide().currentSprite,
                spec = 'sprite block %s',
                definition = new CustomBlockDefinition(spec, sprite);

            // Get the sprite
            definition.category = 'motion';
            SnapActions.addCustomBlock(definition, sprite).accept(() => {
                driver.selectCategory('custom');
                let block = driver.palette().contents.children
                .find(item => item instanceof CustomCommandBlockMorph);

                // Edit the custom block
                driver.rightClick(block);
                let editBtn = driver.dialog().children.find(item => item.action === 'edit');
                driver.click(editBtn);

                // add comment to the prototype hat morph
                let editor = driver.dialog();
                driver.rightClick(editor);

                let addCmtBtn = driver.dialog().children
                .find(item => item.action === 'addComment');

                driver.click(addCmtBtn);

                // drop it on the prototype hat block
                let scripts = editor.body.children.find(child => child instanceof ScriptsMorph);
                let hatBlock = scripts.children[0];
                driver.click(hatBlock);
                setTimeout(() => {
                    // Verify that the hatBlock.comment value is set
                    if (!hatBlock.comment) return done('hat block has no comment set!');
                    done();
                }, 10);
            });
        });

        // Test attaching a command block to the proto hat block
        it('should be able to attach cmd to prototype hat block', function(done) {
            var sprite = driver.ide().currentSprite,
                spec = 'sprite block %s',
                definition = new CustomBlockDefinition(spec, sprite);

            // Get the sprite
            definition.category = 'motion';
            SnapActions.addCustomBlock(definition, sprite).accept(() => {
                driver.selectCategory('custom');
                let block = driver.palette().contents.children
                .find(item => item instanceof CustomCommandBlockMorph);

                // Edit the custom block
                driver.rightClick(block);
                let editBtn = driver.dialog().children.find(item => item.action === 'edit');
                driver.click(editBtn);

                // add block to the prototype hat morph
                // moveBlock
                driver.selectCategory('motion');
                let forwardBlock = driver.palette().contents.children
                .find(item => item.selector === 'forward');

                let editor = driver.dialog();

                // drop it on the prototype hat block
                let scripts = editor.body.contents;
                let hatBlock = scripts.children[0];
                let dropPosition = hatBlock.bottomAttachPoint()
                    .add(new Point(forwardBlock.width()/2, forwardBlock.height()/2))
                    .subtract(forwardBlock.topAttachPoint().subtract(forwardBlock.topLeft()));

                driver.dragAndDrop(forwardBlock, dropPosition);
                setTimeout(() => {
                    if (!hatBlock.nextBlock()) return done('block not connected!');
                    done();
                }, 10);
            });
        });
    });

    describe('rpc', function() {
        before(done => {
            driver.reset(done);
        });

        it('should populate method with `setField`', function(done) {
            // create rpc block
            driver.addBlock('getJSFromRPCStruct').accept(block => {
                var serviceField = block.inputs()[0];
                // set the service to weather
                SnapActions.setField(serviceField, 'Weather').accept(() => {
                    var methodField = block.inputs()[1];
                    // set the method to `humidity`
                    SnapActions.setField(methodField, 'humidity').accept(() => {
                        var err = null;
                        if (block.inputs().length < 3) err = `argument inputs not created!`;
                        done(err);
                    });
                });
            });
        });
    });
});
