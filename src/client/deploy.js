
// Some adjustments to get StageMorph to work standalone
StageMorph.prototype.openIn = function(world) {
    var self = this;
    world.add(this);

    // Set size to screen size
    self.fill(new Point(world.width(), world.height()));

    world.setExtent = function() {
        Morph.prototype.setExtent.apply(world, arguments);
        self.fill.apply(self, arguments);
    };
};

StageMorph.prototype.fill = function(size) {
    var xRatio = size.x/this.dimensions.x,
        yRatio = size.y/this.dimensions.y,
        ratio = Math.min(xRatio, yRatio);

    this.setExtent(this.dimensions.multiplyBy(ratio));
    this.setScale(ratio);

    // Set the origin
    var x = (size.x - this.width())/2,
        y = (size.y - this.height())/2;

    this.setPosition(new Point(x, y));
    this.changed();
};
