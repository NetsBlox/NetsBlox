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

// Create the tabs
// + Projects (primary)
// + Scripts
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

        this.spriteEditor = new ProjectsMorph(this.table, this.sliderColor);
        this.spriteEditor.color = this.groupColor;
        this.add(this.spriteEditor);
    } else {
        this._createSpriteEditor();
    }
};

// NetsBlox Table
TableMorph.prototype = new SpriteMorph();
TableMorph.prototype.constructor = TableMorph;
TableMorph.uber = SpriteMorph.prototype;

// TODO: Pick better colors
TableMorph.COLORS = [
    '#e57373',
    '#64b5f6',
    '#ce93d8',
    '#4527a0',
    '#0d47a1',
    '#f57c00',
    '#ffe082'
];
TableMorph.SIZE = 300;

function TableMorph() {
    // Get the users at the table
    this._seats = {};

    // REMOVE
    this._seats = {
        'first': 'adam',
        'third': 'brian',
        'four': 'casey',
        'fix': 'derik',
        'asd': 'evan',
        'sda': 'frank',
        'second': 'gerald'
    };  // REMOVE

    this.init();
    this.name = localize('Table');

    // TODO: Make this dynamic
    this.silentSetWidth(TableMorph.SIZE);
    this.silentSetHeight(TableMorph.SIZE);

    // TODO: Set up the websocket manager
    this.update();
}

// 'Inherit' from SpriteMorph
//(function() {
    //var methods = Object.keys(SpriteMorph.prototype);
    //for (var i = methods.length; i--;) {
        //if (StageMorph.prototype[methods[i]]) {
            //TableMorph.prototype[methods[i]] = SpriteMorph.prototype[methods[i]];
        //}
    //}
//})();

TableMorph.prototype.update = function() {
    // TODO: Update the seats, etc
    this.drawNew();
};

TableMorph.prototype.drawNew = function() {
    var cxt,
        padding = 4,
        radius = (Math.min(this.width(), this.height())-padding)/2,
        center = padding + radius;
        

    this.image = newCanvas(this.extent());
    cxt = this.image.getContext('2d');

    // Draw the seats
    var seats = Object.keys(this._seats),
        angleSize = 2*Math.PI/seats.length,
        angle = 0,
        len = TableMorph.COLORS.length;

    for (var i = 0; i < seats.length; i++) {
        cxt.fillStyle = TableMorph.COLORS[i%len];
        cxt.beginPath();
        cxt.moveTo(center, center);

        cxt.arc(center, center, radius, angle, angle+angleSize, false);

        cxt.lineTo(center, center);
        cxt.fill();

        angle += angleSize;
    }

    // Center circle
    cxt.beginPath();
    cxt.arc(center, center, radius/5, 0, 2*Math.PI, false);
    cxt.fillStyle = '#9e9e9e';
    cxt.fill();

    // TODO: Add children for each seat
};

TableMorph.prototype.inheritedVariableNames = function() {
    return [];
};

TableMorph.prototype.createNewSeat = function() {
    console.log('Creating a new seat!');
    // TODO
};

// Create the available blocks
// TODO

// Fix the icon for the table
// TODO

ProjectsMorph.prototype = new ScrollFrameMorph();
ProjectsMorph.prototype.constructor = ProjectsMorph;
ProjectsMorph.uber = ScrollFrameMorph.prototype;

function ProjectsMorph(table, sliderColor) {
    // TODO: Get the table info and update when websockets do stuff
    ProjectsMorph.uber.init.call(this, null, null, sliderColor);
    this.acceptsDrops = false;
    this.table = table;
    // Reset the position
    this.table.silentSetPosition(new Point(0,0));
    this.updateTable();
}

ProjectsMorph.prototype.updateTable = function() {
    // Receive updates about the table from the server
    // TODO
    var padding = 4;

    this.contents.destroy();
    this.contents = new FrameMorph(this);
    this.addBack(this.contents);

    // Draw the table
    this.table.drawNew();
    this.addContents(this.table);

    // Draw the "new seat" button
    var newButton;

    newButton = new PushButtonMorph(
        this.table,
        'createNewSeat',
        new SymbolMorph('pointRight', 12)  // FIXME: make this a "+"
    );
    newButton.padding = 0;
    newButton.corner = 12;
    newButton.color = IDE_Morph.prototype.groupColor;
    newButton.highlightColor = IDE_Morph.prototype.frameColor.darker(50);
    newButton.pressColor = newButton.highlightColor;
    newButton.labelMinExtent = new Point(36, 18);
    newButton.labelShadowOffset = new Point(-1, -1);
    newButton.labelShadowColor = newButton.highlightColor;
    newButton.labelColor = TurtleIconMorph.prototype.labelColor;
    newButton.contrast = this.buttonContrast;
    newButton.drawNew();
    newButton.hint = "Add a seat to the table";
    newButton.fixLayout();
    newButton.setCenter(this.table.center());
    newButton.setLeft(this.table.left() + this.table.width() + padding*4);

    this.addContents(newButton);

    // Draw the "remove seat" button
    // TODO

    //this.changed();
};

// Table Editor
//function Table
