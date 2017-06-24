/* global SnapSerializer, SpriteMorph, sizeOf, List, detect, CustomCommandBlockMorph,
   CustomReporterBlockMorph, nop, VariableFrame, StageMorph, Point, isNil,
   WatcherMorph, localize, XML_Element, IDE_Morph, MessageType, MessageFrame,
   MessageInputSlotMorph, HintInputSlotMorph, InputSlotMorph, SnapActions,
   normalizeCanvas, StructInputSlotMorph, BooleanSlotMorph, SVG_Costume, Costume*/
NetsBloxSerializer.prototype = new SnapSerializer();
NetsBloxSerializer.prototype.constructor = NetsBloxSerializer;
NetsBloxSerializer.uber = SnapSerializer.prototype;
SnapSerializer.prototype.thumbnailSize = new Point(640, 480);

NetsBloxSerializer.prototype.app = 'NetsBlox 0.15.4, http://netsblox.org';  // Make this version automatic

function NetsBloxSerializer() {
    this.init();
}

NetsBloxSerializer.prototype.loadMessageType = function (stage, model) {
    var name = model.childNamed('name').contents,
        fields = model.childNamed('fields')
            .children
            .map(function(child) {
                return child.contents;
            });

    stage.addMessageType({
        name: name,
        fields: fields
    });
};

SnapSerializer.prototype.loadValue = function (model) {
    // private
    var v, i, lst, items, el, center, image, name, audio, option, bool,
        myself = this;

    function record() {
        if (Object.prototype.hasOwnProperty.call(
                model.attributes,
                'id'
            )) {
            myself.objects[model.attributes.id] = v;
        }
        if (Object.prototype.hasOwnProperty.call(
                model.attributes,
                'mediaID'
            )) {
            myself.mediaDict[model.attributes.mediaID] = v;
        }
    }
    switch (model.tag) {
    case 'ref':
        if (Object.prototype.hasOwnProperty.call(model.attributes, 'id')) {
            return this.objects[model.attributes.id];
        }
        if (Object.prototype.hasOwnProperty.call(
                model.attributes,
                'mediaID'
            )) {
            return this.mediaDict[model.attributes.mediaID];
        }
        throw new Error('expecting a reference id');
    case 'l':
        option = model.childNamed('option');
        if (option) {
            return [option.contents];
        }
        bool = model.childNamed('bool');
        if (bool) {
            return this.loadValue(bool);
        }
        return model.contents;
    case 'bool':
        return model.contents === 'true';
    case 'list':
        if (model.attributes.hasOwnProperty('linked')) {
            v = new List();
            v.isLinked = true;
            record();
            lst = v;
            items = model.childrenNamed('item');
            items.forEach(function (item, i) {
                var value = item.children[0];
                if (!value) {
                    v.first = 0;
                } else {
                    v.first = myself.loadValue(value);
                }
                var tail = model.childNamed('list') ||
                    model.childNamed('ref');
                if (tail) {
                    v.rest = myself.loadValue(tail);
                } else {
                    if (i < (items.length - 1)) {
                        v.rest = new List();
                        v = v.rest;
                        v.isLinked = true;
                    }
                }
            });
            return lst;
        }
        v = new List();
        record();
        v.contents = model.childrenNamed('item').map(function (item) {
            var value = item.children[0];
            if (!value) {
                return 0;
            }
            return myself.loadValue(value);
        });
        return v;
    case 'sprite':
        v  = new SpriteMorph(myself.project.globalVariables);
        if (model.attributes.id) {
            myself.objects[model.attributes.id] = v;
        }
        if (model.attributes.name) {
            v.name = model.attributes.name;
            myself.project.sprites[model.attributes.name] = v;
        }
        if (model.attributes.idx) {
            v.idx = +model.attributes.idx;
        }
        if (model.attributes.color) {
            v.color = myself.loadColor(model.attributes.color);
        }
        if (model.attributes.pen) {
            v.penPoint = model.attributes.pen;
        }
        if (model.attributes.collabId) {
            v.id = model.attributes.collabId;
        }
        myself.project.stage.add(v);
        v.scale = parseFloat(model.attributes.scale || '1');
        v.rotationStyle = parseFloat(
            model.attributes.rotation || '1'
        );
        v.isDraggable = model.attributes.draggable !== 'false';
        v.isVisible = model.attributes.hidden !== 'true';
        v.heading = parseFloat(model.attributes.heading) || 0;
        v.drawNew();
        v.gotoXY(+model.attributes.x || 0, +model.attributes.y || 0);
        myself.loadObject(v, model);
        myself.loadHistory(model.childNamed('history'));
        return v;
    case 'context':
        v = new Context(null);
        record();
        el = model.childNamed('script');
        if (el) {
            v.expression = this.loadScript(el);
        } else {
            el = model.childNamed('block') ||
                model.childNamed('custom-block');
            if (el) {
                v.expression = this.loadBlock(el);
            } else {
                el = model.childNamed('l');
                if (el) {
                    bool = el.childNamed('bool');
                    if (bool) {
                        v.expression = new BooleanSlotMorph(
                            this.loadValue(bool)
                        );
                    } else {
                        v.expression = new InputSlotMorph(el.contents);
                    }
                }
            }
        }
        if (v.expression instanceof BlockMorph) {
            // bind empty slots to implicit formal parameters
            i = 0;
            v.expression.allEmptySlots().forEach(function (slot) {
                i += 1;
                if (slot instanceof MultiArgMorph) {
                    slot.bindingID = ['arguments'];
                } else {
                    slot.bindingID = i;
                }
            });
            // and remember the number of detected empty slots
            v.emptySlots = i;
        }
        el = model.childNamed('receiver');
        if (el) {
            el = el.childNamed('ref') || el.childNamed('sprite');
            if (el) {
                v.receiver = this.loadValue(el);
            }
        }
        el = model.childNamed('inputs');
        if (el) {
            el.children.forEach(function (item) {
                if (item.tag === 'input') {
                    v.inputs.push(item.contents);
                }
            });
        }
        el = model.childNamed('variables');
        if (el) {
            this.loadVariables(v.variables, el);
        }
        el = model.childNamed('context');
        if (el) {
            v.outerContext = this.loadValue(el);
        }
        if (v.outerContext && v.receiver &&
                !v.outerContext.variables.parentFrame) {
            v.outerContext.variables.parentFrame = v.receiver.variables;
        }
        return v;
    case 'costume':
        center = new Point();
        if (Object.prototype.hasOwnProperty.call(
                model.attributes,
                'center-x'
            )) {
            center.x = parseFloat(model.attributes['center-x']);
        }
        if (Object.prototype.hasOwnProperty.call(
                model.attributes,
                'center-y'
            )) {
            center.y = parseFloat(model.attributes['center-y']);
        }
        if (Object.prototype.hasOwnProperty.call(
                model.attributes,
                'name'
            )) {
            name = model.attributes.name;
        }
        if (Object.prototype.hasOwnProperty.call(
                model.attributes,
                'image'
            )) {
            image = new Image();
            if (model.attributes.image.indexOf('data:image/svg+xml') === 0
                    && !MorphicPreferences.rasterizeSVGs) {
                v = new SVG_Costume(null, name, center);
                image.onload = function () {
                    v.contents = image;
                    v.version = +new Date();
                    // NetsBlox addition: start
                    v.imageData = null;
                    // NetsBlox addition: end
                    if (typeof v.loaded === 'function') {
                        v.loaded();
                    } else {
                        v.loaded = true;
                    }
                };
            } else {
                v = new Costume(null, name, center);
                image.onload = function () {
                    var canvas = newCanvas(
                            new Point(image.width, image.height),
                            true // nonRetina
                        ),
                        context = canvas.getContext('2d');
                    context.drawImage(image, 0, 0);
                    v.contents = canvas;
                    v.version = +new Date();
                    // NetsBlox addition: start
                    v.imageData = null;
                    // NetsBlox addition: end
                    if (typeof v.loaded === 'function') {
                        v.loaded();
                    } else {
                        v.loaded = true;
                    }
                };
            }
            image.src = model.attributes.image;
            // NetsBlox addition: start
            v.imageData = model.attributes.image;
            // NetsBlox addition: end
        }
        v.id = model.attributes.collabId;
        record();
        return v;
    case 'sound':
        audio = new Audio();
        audio.src = model.attributes.sound;
        v = new Sound(audio, model.attributes.name);
        if (Object.prototype.hasOwnProperty.call(
                model.attributes,
                'mediaID'
            )) {
            myself.mediaDict[model.attributes.mediaID] = v;
        }
        v.id = model.attributes.collabId;
        return v;
    }
    return undefined;
};

NetsBloxSerializer.prototype.openProject = function (project, ide) {
    var stage = ide.stage,
        sprites = [],
        sprite;
    if (!project || !project.stage) {
        return;
    }
    // NetsBlox addition: start
    // Only load the projectName if the current name is the default
    if (ide.projectName === 'myRole') {
        ide.setProjectName(project.name);
    }
    // NetsBlox addition: end
    ide.projectNotes = project.notes || '';
    if (ide.globalVariables) {
        ide.globalVariables = project.globalVariables;
    }
    if (stage) {
        stage.destroy();
    }
    ide.add(project.stage);
    ide.stage = project.stage;
    sprites = ide.stage.children.filter(function (child) {
        return child instanceof SpriteMorph;
    });
    sprites.sort(function (x, y) {
        return x.idx - y.idx;
    });

    ide.sprites = new List(sprites);
    sprite = sprites[0] || project.stage;

    if (sizeOf(this.mediaDict) > 0) {
        ide.hasChangedMedia = false;
        this.mediaDict = {};
    } else {
        ide.hasChangedMedia = true;
    }
    project.stage.drawNew();
    ide.createCorral();
    ide.selectSprite(sprite);
    ide.fixLayout();

    // force watchers to update
    //project.stage.watchers().forEach(function (watcher) {
    //  watcher.onNextStep = function () {this.currentValue = null;};
    //})

    SnapActions.loadProject(ide, project.collabStartIndex);
    ide.world().keyboardReceiver = project.stage;
    return project;
};


// It would be good to refactor the MessageInputMorph so we don't have to modify
// loadBlock
NetsBloxSerializer.prototype.loadBlock = function (model, isReporter) {
    // private
    var block, info, inputs, isGlobal, rm, receiver;
    if (model.tag === 'block') {
        if (Object.prototype.hasOwnProperty.call(
                model.attributes,
                'var'
            )) {
            block = SpriteMorph.prototype.variableBlock(
                model.attributes['var']
            );
            block.id = model.attributes.collabId;
            return block;
        }
        block = SpriteMorph.prototype.blockForSelector(model.attributes.s);
    } else if (model.tag === 'custom-block') {
        isGlobal = model.attributes.scope ? false : true;
        receiver = isGlobal ? this.project.stage
            : this.project.sprites[model.attributes.scope];
        rm = model.childNamed('receiver');
        if (rm && rm.children[0]) {
            receiver = this.loadValue(
                model.childNamed('receiver').children[0]
            );
        }
        if (!receiver) {
            if (!isGlobal) {
                receiver = this.project.stage;
            } else {
                block = this.obsoleteBlock(isReporter);
                block.id = model.attributes.collabId;
                return block;
            }
        }
        if (isGlobal) {
            info = detect(receiver.globalBlocks, function (block) {
                return block.blockSpec() === model.attributes.s;
            });
            if (!info && this.project.targetStage) { // importing block files
                info = detect(
                    this.project.targetStage.globalBlocks,
                    function (block) {
                        return block.blockSpec() === model.attributes.s;
                    }
                );
            }
        } else {
            info = detect(receiver.customBlocks, function (block) {
                return block.blockSpec() === model.attributes.s;
            });
        }
        if (!info) {
            block = this.obsoleteBlock(isReporter);
            block.id = model.attributes.collabId;
            return block;
        }
        block = info.type === 'command' ? new CustomCommandBlockMorph(
            info,
            false
        ) : new CustomReporterBlockMorph(
            info,
            info.type === 'predicate',
            false
        );
    }
    if (block === null) {
        block = this.obsoleteBlock(isReporter);
    }
    block.isDraggable = true;
    block.id = model.attributes.collabId;
    inputs = block.inputs();

    // NetsBlox addition: start
    // Try to batch children for the inputs if appropriate. This is
    // used with StructInputSlotMorphs
    if (inputs.length < model.children.length) {
        var struct = detect(inputs, function(input) {
                return input instanceof StructInputSlotMorph;
            }),
            structIndex = inputs.indexOf(struct);

        // Find the StructInputSlotMorph and batch the given value and the extras
        // together
        if (structIndex !== -1) {
            // Set the contents for the entire batch
            var self = this,
                batch,
                batchLength = model.children.length - inputs.length,
                structVals;

            inputs.splice(structIndex, 1);
            batch = model.children.splice(structIndex, structIndex + batchLength + 1);
            structVals = batch.map(function(value) {
                if (value.tag === 'block' || value.tag === 'custom-block') {
                    return self.loadBlock(value);
                }
                if (value.tag === 'script') {
                    return self.loadScript(value);
                }
                if (value.tag === 'color') {
                    return self.loadColor(value);
                }
                return self.loadValue(value) || '';
            });
        }
    }
    // NetsBlox addition: end

    model.children.forEach(function (child, i) {
        if (child.tag === 'variables') {
            this.loadVariables(block.variables, child);
        } else if (child.tag === 'comment') {
            block.comment = this.loadComment(child);
            block.comment.block = block;
        } else if (child.tag === 'receiver') {
            nop(); // ignore
        } else {
            this.loadInput(child, inputs[i], block);
        }
    }, this);
    block.cachedInputs = null;

    // NetsBlox addition: start
    if (struct && structVals) {
        if (struct instanceof MessageInputSlotMorph) {
            var msgType = this.project.stage.messageTypes.getMsgType(structVals[0]);

            struct.setContents(structVals[0], structVals.slice(1), msgType);
        } else {
            struct.setContents(structVals[0], structVals.slice(1));
        }
    }
    // NetsBlox addition: end
    return block;
};

NetsBloxSerializer.prototype.loadInput = function (model, input, block) {
    // private
    var inp, val, myself = this;
    if (model.tag === 'script') {
        inp = this.loadScript(model);
        if (inp) {
            input.add(inp);
            input.fixLayout();
        }
    } else if (model.tag === 'autolambda' && model.children[0]) {
        inp = this.loadBlock(model.children[0], true);
        if (inp) {
            input.silentReplaceInput(input.children[0], inp);
            input.fixLayout();
        }
    } else if (model.tag === 'list') {
        while (input.inputs().length > 0) {
            input.removeInput();
        }
        model.children.forEach(function (item) {
            input.addInput();
            myself.loadInput(
                item,
                input.children[input.children.length - 2],
                input
            );
        });
        input.fixLayout();
    } else if (model.tag === 'block' || model.tag === 'custom-block') {
        block.silentReplaceInput(input, this.loadBlock(model, true));
    } else if (model.tag === 'color') {
        input.setColor(this.loadColor(model.contents));
    } else {
        val = this.loadValue(model);
        if (!isNil(val) && input.setContents) {
            // NetsBlox addition: start
            if (input instanceof MessageInputSlotMorph) {
                var typeName = this.loadValue(model),
                    messageType = this.project.stage.messageTypes.getMsgType(typeName);

                input.setContents(typeName, null, messageType);
            } else {
                input.setContents(this.loadValue(model));
            }
            // NetsBlox addition: end
        }
    }
};

NetsBloxSerializer.prototype.rawLoadProjectModel = function (xmlNode) {
    // private
    var myself = this,
        project = {sprites: {}},
        model,
        nameID;

    this.project = project;

    model = {project: xmlNode };
    if (+xmlNode.attributes.version > this.version) {
        throw 'Project uses newer version of Serializer';
    }

    /* Project Info */

    this.objects = {};
    project.name = model.project.attributes.name;
    if (!project.name) {
        nameID = 1;
        while (
            Object.prototype.hasOwnProperty.call(
                localStorage,
                '-snap-project-Untitled ' + nameID
            )
        ) {
            nameID += 1;
        }
        project.name = 'Untitled ' + nameID;
    }
    model.notes = model.project.childNamed('notes');
    if (model.notes) {
        project.notes = model.notes.contents;
    }
    model.globalVariables = model.project.childNamed('variables');
    project.globalVariables = new VariableFrame();
    project.collabStartIndex = +(model.project.attributes.collabStartIndex || 0);
    this.loadReplayHistory(xmlNode.childNamed('replay'));

    /* Stage */

    model.stage = model.project.require('stage');
    StageMorph.prototype.frameRate = 0;
    if (project.stage) {  // Clean up any previous stage
        project.stage.destroy();
    }
    project.stage = new StageMorph(project.globalVariables);
    if (Object.prototype.hasOwnProperty.call(
            model.stage.attributes,
            'id'
        )) {
        this.objects[model.stage.attributes.id] = project.stage;
    }
    if (model.stage.attributes.name) {
        project.stage.name = model.stage.attributes.name;
    }
    if (model.stage.attributes.scheduled === 'true') {
        project.stage.fps = 30;
        StageMorph.prototype.frameRate = 30;
    }
    model.pentrails = model.stage.childNamed('pentrails');
    if (model.pentrails) {
        project.pentrails = new Image();
        project.pentrails.onload = function () {
            var context = project.stage.trailsCanvas.getContext('2d');
            context.drawImage(project.pentrails, 0, 0);
            project.stage.changed();
        };
        project.pentrails.src = model.pentrails.contents;
    }
    project.stage.setTempo(model.stage.attributes.tempo);
    StageMorph.prototype.dimensions = new Point(480, 360);
    if (model.stage.attributes.width) {
        StageMorph.prototype.dimensions.x =
            Math.max(+model.stage.attributes.width, 480);
    }
    if (model.stage.attributes.height) {
        StageMorph.prototype.dimensions.y =
            Math.max(+model.stage.attributes.height, 180);
    }
    project.stage.id = model.stage.attributes.collabId || null;
    project.stage.setExtent(StageMorph.prototype.dimensions);
    SpriteMorph.prototype.useFlatLineEnds =
        model.stage.attributes.lines === 'flat';
    project.stage.isThreadSafe =
        model.stage.attributes.threadsafe === 'true';
    StageMorph.prototype.enableCodeMapping =
        model.stage.attributes.codify === 'true';
    StageMorph.prototype.enableInheritance =
        model.stage.attributes.inheritance === 'true';

    model.hiddenPrimitives = model.project.childNamed('hidden');
    if (model.hiddenPrimitives) {
        model.hiddenPrimitives.contents.split(' ').forEach(
            function (sel) {
                if (sel) {
                    StageMorph.prototype.hiddenPrimitives[sel] = true;
                }
            }
        );
    }

    model.codeHeaders = model.project.childNamed('headers');
    if (model.codeHeaders) {
        model.codeHeaders.children.forEach(function (xml) {
            StageMorph.prototype.codeHeaders[xml.tag] = xml.contents;
        });
    }

    model.codeMappings = model.project.childNamed('code');
    if (model.codeMappings) {
        model.codeMappings.children.forEach(function (xml) {
            StageMorph.prototype.codeMappings[xml.tag] = xml.contents;
        });
    }

    // Add message types
    model.messageTypes = model.stage.childNamed('messageTypes');
    if (model.messageTypes) {
        var messageTypes = model.messageTypes.children;
        messageTypes.forEach(this.loadMessageType.bind(this, project.stage));
    }

    model.globalBlocks = model.project.childNamed('blocks');
    if (model.globalBlocks) {
        this.loadCustomBlocks(project.stage, model.globalBlocks, true);
        this.populateCustomBlocks(
            project.stage,
            model.globalBlocks,
            true
        );
    }

    this.loadObject(project.stage, model.stage);
    this.loadHistory(xmlNode.childNamed('history'));

    /* Sprites */

    model.sprites = model.stage.require('sprites');
    project.sprites[project.stage.name] = project.stage;

    model.sprites.childrenNamed('sprite').forEach(function (model) {
        myself.loadValue(model);
    });

    // restore inheritance and nesting associations
    myself.project.stage.children.forEach(function (sprite) {
        var exemplar, anchor;
        if (sprite.inheritanceInfo) { // only sprites can inherit
            exemplar = myself.project.sprites[
                sprite.inheritanceInfo.exemplar
            ];
            if (exemplar) {
                sprite.setExemplar(exemplar);
            }
        }
        if (sprite.nestingInfo) { // only sprites may have nesting info
            anchor = myself.project.sprites[sprite.nestingInfo.anchor];
            if (anchor) {
                anchor.attachPart(sprite);
            }
            sprite.rotatesWithAnchor = (sprite.nestingInfo.synch === 'true');
        }
    });
    myself.project.stage.children.forEach(function (sprite) {
        delete sprite.inheritanceInfo;
        if (sprite.nestingInfo) { // only sprites may have nesting info
            sprite.nestingScale = +(sprite.nestingInfo.scale || sprite.scale);
            delete sprite.nestingInfo;
        }
    });

    /* Global Variables */

    if (model.globalVariables) {
        this.loadVariables(
            project.globalVariables,
            model.globalVariables
        );
    }

    this.objects = {};

    /* Watchers */

    model.sprites.childrenNamed('watcher').forEach(function (model) {
        var watcher, color, target, hidden, extX, extY;

        color = myself.loadColor(model.attributes.color);
        target = Object.prototype.hasOwnProperty.call(
            model.attributes,
            'scope'
        ) ? project.sprites[model.attributes.scope] : null;

        // determine whether the watcher is hidden, slightly
        // complicated to retain backward compatibility
        // with former tag format: hidden="hidden"
        // now it's: hidden="true"
        hidden = Object.prototype.hasOwnProperty.call(
            model.attributes,
            'hidden'
        ) && (model.attributes.hidden !== 'false');

        if (Object.prototype.hasOwnProperty.call(
                model.attributes,
                'var'
            )) {
            watcher = new WatcherMorph(
                model.attributes['var'],
                color,
                isNil(target) ? project.globalVariables
                    : target.variables,
                model.attributes['var'],
                hidden
            );
        } else {
            watcher = new WatcherMorph(
                localize(myself.watcherLabels[model.attributes.s]),
                color,
                target,
                model.attributes.s,
                hidden
            );
        }
        watcher.setStyle(model.attributes.style || 'normal');
        if (watcher.style === 'slider') {
            watcher.setSliderMin(model.attributes.min || '1', true);
            watcher.setSliderMax(model.attributes.max || '100', true);
        }
        watcher.setPosition(
            project.stage.topLeft().add(new Point(
                +model.attributes.x || 0,
                +model.attributes.y || 0
            ))
        );
        project.stage.add(watcher);
        watcher.onNextStep = function () {this.currentValue = null; };

        // set watcher's contentsMorph's extent if it is showing a list and
        // its monitor dimensions are given
        if (watcher.currentValue instanceof List) {
            extX = model.attributes.extX;
            if (extX) {
                watcher.cellMorph.contentsMorph.setWidth(+extX);
            }
            extY = model.attributes.extY;
            if (extY) {
                watcher.cellMorph.contentsMorph.setHeight(+extY);
            }
            // adjust my contentsMorph's handle position
            watcher.cellMorph.contentsMorph.handle.drawNew();
        }
    });
    this.objects = {};
    return project;
};

StageMorph.prototype.toXML = function (serializer) {
    var thumbnail = normalizeCanvas(
            this.thumbnail(SnapSerializer.prototype.thumbnailSize),
            true
        ),
        thumbdata,
        ide = this.parentThatIsA(IDE_Morph);

    // catch cross-origin tainting exception when using SVG costumes
    try {
        thumbdata = thumbnail.toDataURL('image/png');
    } catch (error) {
        thumbdata = null;
    }

    function code(key) {
        var str = '';
        Object.keys(StageMorph.prototype[key]).forEach(
            function (selector) {
                str += (
                    '<' + selector + '>' +
                        XML_Element.prototype.escape(
                            StageMorph.prototype[key][selector]
                        ) +
                        '</' + selector + '>'
                );
            }
        );
        return str;
    }

    this.removeAllClones();
    return serializer.format(
        '<project collabStartIndex="@" name="@" app="@" version="@">' +
            '<notes>$</notes>' +
            '<thumbnail>$</thumbnail>' +
            '<stage name="@" width="@" height="@" collabId="@" ' +
            'costume="@" tempo="@" threadsafe="@" ' +
            'lines="@" ' +
            'ternary="@" ' +
            'codify="@" ' +
            'inheritance="@" ' +
            'sublistIDs="@" ' +
            'scheduled="@" ~>' +
            '<pentrails>$</pentrails>' +
            '<costumes>%</costumes>' +
            '<sounds>%</sounds>' +
            '<variables>%</variables>' +
            '<blocks>%</blocks>' +
            // NetsBlox addition: start
            '<messageTypes>%</messageTypes>' +
            // NetsBlox addition: end
            '<scripts>%</scripts><sprites>%</sprites>' +
            '</stage>' +
            '<hidden>$</hidden>' +
            '<headers>%</headers>' +
            '<code>%</code>' +
            '<blocks>%</blocks>' +
            '<variables>%</variables>' +
            '<history>%</history>' +
            '<replay>%</replay>' +
            '</project>',
        SnapActions.lastSeen,
        (ide && ide.projectName) ? ide.projectName : localize('Untitled'),
        serializer.app,
        serializer.version,
        (ide && ide.projectNotes) ? ide.projectNotes : '',
        thumbdata,
        this.name,
        StageMorph.prototype.dimensions.x,
        StageMorph.prototype.dimensions.y,
        this.id,
        this.getCostumeIdx(),
        this.getTempo(),
        this.isThreadSafe,
        SpriteMorph.prototype.useFlatLineEnds ? 'flat' : 'round',
        BooleanSlotMorph.prototype.isTernary,
        this.enableCodeMapping,
        this.enableInheritance,
        this.enableSublistIDs,
        StageMorph.prototype.frameRate !== 0,
        normalizeCanvas(this.trailsCanvas, true).toDataURL('image/png'),
        serializer.store(this.costumes, this.name + '_cst'),
        serializer.store(this.sounds, this.name + '_snd'),
        serializer.store(this.variables),
        serializer.store(this.customBlocks),
        // NetsBlox addition: start
        serializer.store(this.messageTypes),
        // NetsBlox addition: end
        serializer.store(this.scripts),
        serializer.store(this.children),
        Object.keys(StageMorph.prototype.hiddenPrimitives).reduce(
                function (a, b) {return a + ' ' + b; },
                ''
            ),
        code('codeHeaders'),
        code('codeMappings'),
        serializer.store(this.globalBlocks),
        (ide && ide.globalVariables) ?
                    serializer.store(ide.globalVariables) : '',
        serializer.isSavingHistory ? serializer.historyXML(this.id): '',
        serializer.isSavingHistory ? serializer.replayHistory() : ''
    );
};

MessageFrame.prototype.toXML = function (serializer) {
    var myself = this,
        msgTypes = this.names().map(function(name) {
            return myself.getMsgType(name);
        });

    return msgTypes.map(function(type) {
        return serializer.format(
            '<messageType>%</messageType>',
            serializer.store(type)
        );
    }).join('');
};

MessageType.prototype.toXML = function (serializer) {
    var fields = this.fields.map(function(field) {
        return serializer.format(
            '<field>%</field>',
            serializer.escape(field)
        );
    }).join('');

    return serializer.format(
        '<name>%</name>' +
        '<fields>%</fields>',
        serializer.escape(this.name),
        fields
    );
};

HintInputSlotMorph.prototype.toXML = function(serializer) {
    if (this.empty) {
        return serializer.format('<l>$</l>', '');
    }
    return InputSlotMorph.prototype.toXML.call(this, serializer);
};

Costume.prototype.toXML = function (serializer) {
    // Netsblox addition: start
    var imageData = this.imageData;
    if (imageData === null) {
        imageData = this instanceof SVG_Costume ? this.contents.src
            : normalizeCanvas(this.contents).toDataURL('image/png');
    }
    // Netsblox addition: end
    return serializer.format(
        '<costume name="@" collabId="@" center-x="@" center-y="@" image="@" ~/>',
        this.name,
        this.id,
        this.rotationCenter.x,
        this.rotationCenter.y,
        // Netsblox addition: start
        imageData
        // Netsblox addition: end
    );
};

