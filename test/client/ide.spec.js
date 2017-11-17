/*globals driver, expect, SnapUndo, SnapActions, SnapCloud */
describe('ide', function() {
    before(function(done) {
        driver.reset(done);
    });

    describe('export', function() {
        it('should export locally if only one role', function(done) {
            var ide = driver.ide();
            ide.exportSingleRoleXml = function() {
                delete ide.exportSingleRoleXml;
                done();
            };
            ide.exportProject();
        });

        it('should export correct xml locally', function(done) {
            var ide = driver.ide();
            var local = null;
            ide.exportRoom = function(str) {
                if (!local) {
                    return local = str;
                }

                delete ide.exportRoom;
                if (local !== str) {
                    var index = getFirstDiffChar(local, str);
                    var start = Math.max(index-10, 0);
                    var end = Math.min(index+10, local.length);
                    var msg = `xml mismatch: "${local.slice(start, end)}" and "${str.slice(start, end)}"`;
                    return done(msg)
                }
                done();
            };
            ide.exportSingleRoleXml();
            ide.exportMultiRoleXml();
        });
    });

    describe('lang', function() {

        beforeEach(function(done) {
            driver.reset(done);
        });

        afterEach(function() {
            driver.ide().saveSetting('language', 'en');
        });

        it('should not change replay length on lang change', function(done) {
            SnapActions.addVariable('testVar', true)
                .accept(() => {
                    var len = SnapUndo.allEvents.length;
                    var err;

                    driver.ide().setLanguage('en');
                    setTimeout(function() {  // give the project time to load
                        try {
                            expect(SnapUndo.allEvents.length).to.be(len);
                        } catch(e) {
                            err = e;
                        } finally {
                            done(err);
                        }
                    }, 200);
                });
        });

        it('should not change replay length on ide refresh', function(done) {
            SnapActions.addVariable('testVar', true)
                .accept(() => {
                    var len = SnapUndo.allEvents.length;
                    var err;

                    driver.ide().refreshIDE();
                    setTimeout(function() {  // give the project time to load
                        try {
                            expect(SnapUndo.allEvents.length).to.be(len);
                        } catch(e) {
                            err = e;
                        } finally {
                            done(err);
                        }
                    }, 200);
                });
        });

        it('should not change replay length on toggle dynamic input labels', function(done) {
            SnapActions.addVariable('testVar', true)
                .accept(() => {
                    var len = SnapUndo.allEvents.length;
                    var err;

                    driver.ide().toggleDynamicInputLabels();
                    setTimeout(function() {  // give the project time to load
                        try {
                            expect(SnapUndo.allEvents.length).to.be(len);
                        } catch(e) {
                            err = e;
                        } finally {
                            done(err);
                        }
                    }, 200);
                });
        });

        it('should have unique sprite ids after changing the lang', function(done) {
            var ide = driver.ide();

            // Change the language and create a sprite
            ide.setLanguage('hu');
            var validate = function() {
                var spriteIds = ide.sprites.asArray().map(sprite => sprite.id);
                try {
                    expect(spriteIds.length).to.be(2);
                    expect(spriteIds[0]).to.not.be(spriteIds[1]);
                    done();
                } catch (e) {
                    done(e);
                }
            };

            setTimeout(() => {
                ide.addNewSprite()
                    .accept(() => {
                        validate();
                    })
                    .reject(() => done('addNewSprite action rejected!'));
            }, 150);
        });
    });

    describe('name', function() {
        const BAD_CHARS = ['.', '@'];
        beforeEach(function(done) {
            driver.reset(done);
        });

        BAD_CHARS.forEach(badChar => {
            describe('naming project with ' + badChar + ' symbol', function() {
                it('should not allow from room tab', function(done) {
                    driver.selectTab('room');
                    var roomEditor = driver.ide().spriteEditor.room;
                    var name = 'my' + badChar + 'project';
                    driver.click(roomEditor.titleBox);

                    var dialog = driver.dialog();
                    dialog.body.setContents(name);
                    dialog.ok();

                    dialog = driver.dialog();
                    expect(dialog).to.not.be(null);

                    setTimeout(() => {
                        try {
                            expect(driver.ide().room.name).to.not.be(name);
                            done();
                        } catch (e) {
                            done(e);
                        }
                    }, 50);
                });

                it('should not allow using "save as"', function(done) {
                    driver.ide().saveProjectsBrowser();
                    var dialog = driver.dialog();
                    var name = 'my' + badChar + 'project';
                    dialog.nameField.setContents(name);
                    dialog.accept();

                    dialog = driver.dialog();
                    expect(dialog).to.not.be(null);

                    setTimeout(() => {
                        try {
                            expect(driver.ide().room.name).to.not.be(name);
                            done();
                        } catch (e) {
                            done(e);
                        }
                    }, 50);
                });
            });

            it('should not allow renaming role with ' + badChar, function(done) {
                driver.selectTab('room');
                var roleLabel = driver.ide().spriteEditor.room.roleLabels.myRole._label;
                var name = 'role' + badChar + 'name';

                roleLabel.mouseClickLeft();
                var dialog = driver.dialog();
                dialog.body.setContents(name);
                dialog.ok();

                dialog = driver.dialog();
                expect(dialog).to.not.be(null);
                // verify that the role name didn't change
                setTimeout(() => {
                    try {
                        expect(driver.ide().spriteEditor.room.roleLabels[name]).to.be(undefined);
                        done();
                    } catch (e) {
                        done(e);
                    }
                }, 50);
            });
        });

        describe('creating role', function() {
            BAD_CHARS.forEach(badChar => {
                it('should not allow naming role with ' + badChar, function(done) {
                    driver.selectTab('room');

                    var addRoleBtn = driver.ide().spriteEditor.addRoleBtn;
                    var name = 'role' + badChar + 'name';
                    driver.click(addRoleBtn);

                    var dialog = driver.dialog();
                    dialog.body.setContents(name);
                    dialog.ok();

                    dialog = driver.dialog();
                    expect(dialog).to.not.be(null);
                    // verify that the role name didn't change
                    setTimeout(() => {
                        try {
                            expect(driver.ide().spriteEditor.room.roleLabels[name]).to.be(undefined);
                            done();
                        } catch (e) {
                            done(e);
                        }
                    }, 50);
                });
            });
        });
    });

    describe('saveACopy', function() {
        let username;
        before(function(done) {
            driver.reset(done);
        });

        after(function() {
            SnapCloud.username = username;
        });

        it('should have option to saveACopy if collaborator', function() {
            var ide = driver.ide();

            // make the user a collaborator
            username = SnapCloud.username;
            SnapCloud.username = 'test';

            ide.room.collaborators.push(SnapCloud.username);
            ide.room.ownerId = 'otherUser';

            // Click the project menu
            driver.click(ide.controlBar.projectButton);
            var dialog = driver.dialog();
            var saveACopyBtn = dialog.items.find(item => item[1] === 'saveACopy');
            expect(saveACopyBtn).to.not.be(undefined);
        });
    });

    describe('replay', function() {
        before(function(done) {
            driver.reset(done);
        });

        describe('bug reports', function() {
            it('should play the openProject event', function(done) {
                var ide = driver.ide();
                var checkAtEnd = function() {
                    var err = null;
                    if (ide.replayControls.actionIndex === -1) err = `did not apply openProject!`;
                    done(err);
                };
                driver.addBlock('forward').accept(() => {
                    var events = SnapUndo.allEvents;
                    driver.reset(() => {
                        ide.replayEvents(events);
                        ide.replayControls.jumpToEnd();
                        setTimeout(checkAtEnd, 400);
                    });
                });
            });
        });
    });

    describe.only('tools', function() {
        beforeEach(done => driver.reset(done));

        it('should be able to run the label block', function(done) {
            this.timeout(10000);
            // Import the tools
            var ide = driver.ide();

            // Click the project menu
            driver.click(ide.controlBar.projectButton);
            var dialog = driver.dialog();
            var importBtn = dialog.children.find(child => child.labelString === 'Import tools');

            driver.click(importBtn);
            expect(importBtn).to.not.be(undefined);

            // Try to run the "label" block?
            var runLabel = () => {
                driver.selectCategory('Custom');
                var labelBlock = driver.palette().children[0].children
                    .find(item => item.blockSpec === 'label %txt of size %n')

                if (!labelBlock) return done(`Could not find label block!`);

                driver.click(labelBlock);

                // Wait for some sort of result
                driver.dialog().destroy();
                var sprite = driver.ide().sprites.at(1);
                var startX = sprite.xPosition();
                driver.waitUntil(
                    () => driver.dialog() || sprite.xPosition() !== startX,
                    () => {
                        if (driver.dialog()) return done('label block failed to execute');
                        done();
                    }
                );
            };
            driver.waitUntil(() => driver.dialog(), runLabel, 5000);
        });
    });

    function getFirstDiffChar (str1, str2) {
        for (var i = 0; i < str1.length; i++) {
            if (str1[i] !== str2[i]) {
                return i;
            }
        }
        return -1;
    };
});

