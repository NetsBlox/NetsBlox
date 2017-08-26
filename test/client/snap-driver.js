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
};

SnapDriver.prototype.selectCategory = function(cat) {
    var categories = this.ide().categories.children;
    var category = categories.find(btn => btn.labelString.toLowerCase() === cat.toLowerCase());

    category.mouseClickLeft();
    return category;
};
