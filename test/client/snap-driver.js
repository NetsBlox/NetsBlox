/* globals SpriteMorph, SnapActions */
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

SnapDriver.prototype.selectStage = function() {
    var ide = this.ide();

    return ide.selectSprite(ide.stage);
};

SnapDriver.prototype.selectSprite = function(name) {
    var ide = this.ide(),
        sprite = ide.sprites.asArray().find(sprite => sprite.name === name);

    return ide.selectSprite(sprite);
};

SnapDriver.prototype.selectTab = function(category) {
    this.ide().spriteBar.tabBar.tabTo(category);
};

// Add block by spec
SnapDriver.prototype.addBlock = function(spec, position) {
    var block = typeof spec === 'string' ?
        SpriteMorph.prototype.blockForSelector(spec, true) : spec;
    var sprite = this.ide().currentSprite;

    return SnapActions.addBlock(block, sprite.scripts, position);
};

// morphic interactions
SnapDriver.prototype.click = function(morph) {
    morph.mouseClickLeft();
};
