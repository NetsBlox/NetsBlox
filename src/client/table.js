// NetsBlox table stuff
IDE_Morph.prototype.createTable = function() {
    // FIXME
    this.table = new TableMorph();
};

IDE_Morph.prototype._createCorral = IDE_Morph.prototype.createCorral;
IDE_Morph.prototype.createCorral = function() {
    var padding = 5;  // Same as in IDE_Morph.prototype.createCorral
    this._createCorral();

    // Add table morph button
    this.corral.tableIcon = new SpriteIconMorph(this.table);
    this.corral.tableIcon.isDraggable = false;
    this.corral.add(this.corral.tableIcon);

    // Position the
    this.corral.fixLayout = function() {
        this.stageIcon.setCenter(this.center());
        this.stageIcon.setLeft(this.left() + padding);

        this.tableIcon.setCenter(this.center());
        this.tableIcon.setLeft(this.stageIcon.width() + this.left() + padding);

        this.frame.setLeft(this.stageIcon.right() + padding);
        this.frame.setExtent(new Point(
            this.right() - this.frame.left(),
            this.height()
        ));
        this.arrangeIcons();
        this.refresh();
    };

    this.corral.refresh = function() {
        this.stageIcon.refresh();
        this.tableIcon.refresh();
        this.frame.contents.children.forEach(function(icon) {
            icon.refresh();
        });
    };

    // TODO
};

IDE_Morph.prototype._getCurrentTabs = function () {
    if (this.currentSprite === this.table) {
        return ['Projects', 'Scripts'];
    }
    return ['Scripts', 'Costumes', 'Sounds'];
};

// Creating the 'projects' view for the table
IDE_Morph.prototype._createSpriteEditor = IDE_Morph.prototype.createSpriteEditor;
IDE_Morph.prototype.createSpriteEditor = function() {
    if (this.currentTab === 'projects') {
        if (this.spriteEditor) {
            this.spriteEditor.destroy();
        }
        console.log('Creating project view...');
        // TODO:
    } else {
        this._createSpriteEditor();
    }
};

// NetsBlox Table
TableMorph.prototype = new FrameMorph();
//TableMorph.prototype = new SpriteMorph();
TableMorph.prototype.constructor = TableMorph;
TableMorph.uber = FrameMorph.prototype;

function TableMorph() {
    console.log('creating tablemorph..');
    this.init();
    this.name = localize('Table');

    //this.image = newCanvas();
    //this.createImage();
}

// 'Inherit' from SpriteMorph
(function() {
    var methods = Object.keys(SpriteMorph.prototype);
    for (var i = methods.length; i--;) {
        if (StageMorph.prototype[methods[i]]) {
            TableMorph.prototype[methods[i]] = SpriteMorph.prototype[methods[i]];
        }
    }
})();

//TableMorph.prototype.createImage = function() {
    //var cxt = this.image.getContext('2d'),
        //radius = Math.min(this.width(), this.height())/2;

    //cxt.arc(radius, radius, radius, 0, 2*Math.PI, false);
    //cxt.fillStyle = 'blue';
//};

TableMorph.prototype.inheritedVariableNames = function() {
    return [];
};

// Create the tabs
// + Projects (primary)
// + Scripts
// TODO

// Create the available blocks
// TODO

// Fix the icon for the table
// TODO

