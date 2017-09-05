/* globals SpriteMorph, SnapActions */
function SnapDriver(world) {
    this._world = world;
}

SnapDriver.prototype.world = function() {
    return this._world;
};

SnapDriver.prototype.ide = function() {
    return this._world.children[0];
};

SnapDriver.prototype.palette = function() {
    return this.world().children[0].palette;
};

SnapDriver.prototype.reset = function() {
    var world = this.world();

    // Close all open dialogs
    for (var i = 1; i < world.children.length; i++) {
        world.children[i].destroy();
    }

    this.newProject();
};

SnapDriver.prototype.newProject = function() {
    this.ide().exitReplayMode();
    this.ide().newProject();

    // NetsBlox specific things
    var room = this.ide().room;
    var uuid = this.ide().sockets.uuid;
    room.ownerId = uuid;
    room.roles = {};
    room.roles[this.ide().projectName] = [uuid];
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

SnapDriver.prototype.addBlock = function(spec, position) {
    var block = typeof spec === 'string' ?
        SpriteMorph.prototype.blockForSelector(spec, true) : spec;
    var sprite = this.ide().currentSprite;

    return SnapActions.addBlock(block, sprite.scripts, position);
};
