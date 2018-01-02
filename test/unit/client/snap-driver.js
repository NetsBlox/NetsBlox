/* globals SpriteMorph, SnapActions, localize */
function SnapDriver(world) {
    this._world = world;
}

// Wait for the client to have a websocket id
SnapDriver.prototype.waitUntilReady = function(cb) {
    if (this.ide().sockets.uuid) {
        return setTimeout(cb);
    }
    setTimeout(this.waitUntilReady.bind(this, cb));
};

// Convenience Getters
SnapDriver.prototype.world = function() {
    return this._world;
};

SnapDriver.prototype.ide = function() {
    return this._world.children[0];
};

SnapDriver.prototype.palette = function() {
    return this.world().children[0].palette;
};

SnapDriver.prototype.dialog = function() {
    var dialogs = this.world().children.slice(1);
    var len = dialogs.length;
    return dialogs[len-1];
};

// Controlling the IDE
SnapDriver.prototype.reset = function(cb) {
    var world = this.world();

    // Close all open dialogs
    var dialogs = world.children.slice(1);
    dialogs.forEach(dialog => dialog.destroy());

    this.ide().exitReplayMode();
    this.waitUntilReady(function() {
        return SnapActions.openProject()
            .accept(() => cb())
            .reject(err => console.error(`could not reset ide: ${err}`));
    });
};

SnapDriver.prototype.selectCategory = function(cat) {
    var categories = this.ide().categories.children;
    var category = categories.find(btn => btn.labelString.toLowerCase() === cat.toLowerCase());

    category.mouseClickLeft();
    return category;
};

SnapDriver.prototype.selectTab = function(cat) {
    let tabs = this.ide().spriteBar.tabBar.children;
    let label = localize(cat.substring(0,1).toUpperCase() + cat.substring(1));
    let tab = tabs.find(tab => tab.labelString === label);

    this.click(tab);
};

SnapDriver.prototype.selectStage = function() {
    var ide = this.ide();

    return ide.selectSprite(ide.stage);
};

SnapDriver.prototype.selectSprite = function(name) {
    var ide = this.ide(),
        sprite = ide.sprites.asArray().find(sprite => sprite.name === name);

    return ide.selectSprite(sprite);
};

SnapDriver.prototype.keys = function(text) {
    let world = this.world();
    let keyboard = world.keyboardReceiver;

    text.split('').forEach(letter => {
        const event = {
            keyCode: letter.charCodeAt(0)
        };
        world.currentKey = event.keyCode;
        keyboard.processKeyPress(event);
        world.currentKey = null;
    });
};

// Add block by spec
SnapDriver.prototype.addBlock = function(spec, position) {
    var block = typeof spec === 'string' ?
        SpriteMorph.prototype.blockForSelector(spec, true) : spec;
    var sprite = this.ide().currentSprite;

    position = position || new Point(400, 400);
    return SnapActions.addBlock(block, sprite.scripts, position);
};

// morphic interactions
SnapDriver.prototype.click = function(morphOrPosition) {
    let hand = this.world().hand;
    let position = morphOrPosition instanceof Point ?
        morphOrPosition : morphOrPosition.center();
    hand.setPosition(position);
    hand.processMouseDown({button: 1});
    hand.processMouseUp();
};

SnapDriver.prototype.rightClick = function(morph) {
    let hand = this.world().hand;
    hand.setPosition(morph.center());
    hand.processMouseDown({button: 2});
    hand.processMouseUp();
};

SnapDriver.prototype.mouseDown = function(position) {
    let hand = this.world().hand;
    hand.setPosition(position);
    hand.processMouseDown({button: 1});
};

SnapDriver.prototype.mouseUp = function(position) {
    let hand = this.world().hand;
    hand.setPosition(position);
    hand.processMouseUp();
};

SnapDriver.prototype.dragAndDrop = function(srcMorph, position) {
    this.mouseDown(srcMorph.center());
    this.world().hand.grab(srcMorph);
    this.mouseUp(position);
};

SnapDriver.prototype.waitUntil = function(fn, callback, maxWait) {
    var startTime = Date.now();
    var check = function() {
        if (fn() || Date.now()-startTime > maxWait) {
            callback(fn());
        } else {
            setTimeout(check, 25);
        }
    };
    maxWait = maxWait || 2000;
    check();
};

// netsblox additions
SnapDriver.prototype.newRole = function(name) {
    this.selectTab('room');

    // Click on the plus icon
    let btn = this.ide().spriteEditor.addRoleBtn;
    this.click(btn);
    this.keys(name);
    let dialog = this.dialog();
    dialog.ok();
};

SnapDriver.prototype.moveToRole = function(name) {
    const role = this.ide().room.roleLabels[name];
    const label = role._label;

    this.selectTab('Room');
    this.click(label.bottomCenter());

    const dialog = this.dialog();
    const moveBtn = dialog.buttons.children.find(btn => btn.action === 'moveToRole');
    this.click(moveBtn);
};
