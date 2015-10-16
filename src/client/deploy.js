
// Some basic hacking to get StageMorph to work standalone
StageMorph.prototype.openIn = function(world) {
    var self = this;
    world.add(this);

    // Set size to screen size
    self.setExtent(new Point(world.width(), world.height()));
    self.setPosition(new Point(0,0));

    world.setExtent = function() {
        Morph.prototype.setExtent.apply(world, arguments);
        self.setExtent.apply(self, arguments);
    };

    // REMOVE: Hack for introspection into method calls
    //Object.keys(Morph.prototype).forEach(function(method) {
        //if (typeof world[method] == 'function' && method.indexOf('step') === -1) {
            //world[method] = function() {
            //console.log('world is calling '+ method);
            //return Morph.prototype[method].apply(world, arguments);
            //};
        //}
    //});
};
