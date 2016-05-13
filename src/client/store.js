/* global SnapSerializer, SpriteMorph, sizeOf, List, detect, CustomCommandBlockMorph,
   CustomReporterBlockMorph, nop, VariableFrame, StageMorph, Point, isNil,
   WatcherMorph, localize, XML_Element, IDE_Morph, MessageType, MessageFrame*/
NetsBloxSerializer.prototype = new SnapSerializer();
NetsBloxSerializer.prototype.constructor = NetsBloxSerializer;
NetsBloxSerializer.uber = SnapSerializer.prototype;

NetsBloxSerializer.prototype.app = 'NetsBlox 0.7.1, http://netsblox.org';  // Make this version automatic

function NetsBloxSerializer() {
    this.init();
}

NetsBloxSerializer.prototype.serializeRoom = function (name, roles) {
    var roleNames = Object.keys(roles),
        body = '',
        content;

    for (var i = roleNames.length; i--;) {
        content = roles[roleNames[i]];
        body += this.format('<role name="@">', roleNames[i]) +
            content.SourceCode + content.Media + '</role>';
    }
    return this.format('<room name="@" app="@">', name, this.app) +
        body + '</room>';
};

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

NetsBloxSerializer.prototype.openProject = function (project, ide) {
    var stage = ide.stage,
        sprites = [],
        sprite;
    if (!project || !project.stage) {
        return;
    }
    // Only load the projectName if the current name is the default
    if (ide.projectName === 'myRole') {
        ide.setProjectName(project.name);
    }
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

    ide.world().keyboardReceiver = project.stage;
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
            return SpriteMorph.prototype.variableBlock(
                model.attributes['var']
            );
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
                return this.obsoleteBlock(isReporter);
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
            return this.obsoleteBlock(isReporter);
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
    inputs = block.inputs();
    // Try to batch children for the inputs if appropriate. This is
    // used with MessageInputSlotMorph and MessageOutputSlotMorph
    // FIXME
    if (inputs.length < model.children.length) {
        var batch = [],
            skipTypes = ['comment', 'receiver'];

        // While the tag is not 'comment' or 'receiver', group the children
        // into an array.
        for (var i = model.children.length; i--;) {
            if (skipTypes.indexOf(model.children[i].tag) !== -1) {
                break;
            }
            batch = model.children.splice(i,1).concat(batch);
        }

        if (batch.length) {
            // Set the contents for the entire batch
            var self = this,
                vals = batch.map(function(value) {
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
                }),
                input = inputs[++i];

            if (input.setContents) {
                input.setContents(vals[0], vals.slice(1));
            }
        }
    }

    model.children.forEach(function (child, i) {
        if (child.tag === 'comment') {
            block.comment = this.loadComment(child);
            block.comment.block = block;
        } else if (child.tag === 'receiver') {
            nop(); // ignore
        } else {
            this.loadInput(child, inputs[i], block);
        }
    }, this);
    block.cachedInputs = null;
    return block;
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

    model.globalBlocks = model.project.childNamed('blocks');
    if (model.globalBlocks) {
        this.loadCustomBlocks(project.stage, model.globalBlocks, true);
        this.populateCustomBlocks(
            project.stage,
            model.globalBlocks,
            true
        );
    }

    // Add message types
    model.messageTypes = model.stage.childNamed('messageTypes');
    if (model.messageTypes) {
        var messageTypes = model.messageTypes.children;
        messageTypes.forEach(this.loadMessageType.bind(this, project.stage));
    }

    this.loadObject(project.stage, model.stage);

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
    var thumbnail = this.thumbnail(NetsBloxSerializer.prototype.thumbnailSize),
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
        '<project name="@" app="@" version="@">' +
            '<notes>$</notes>' +
            '<thumbnail>$</thumbnail>' +
            '<stage name="@" width="@" height="@" ' +
            'costume="@" tempo="@" threadsafe="@" ' +
            'lines="@" ' +
            'codify="@" ' +
            'inheritance="@" ' +
            'scheduled="@" ~>' +
            '<pentrails>$</pentrails>' +
            '<costumes>%</costumes>' +
            '<sounds>%</sounds>' +
            '<variables>%</variables>' +
            '<blocks>%</blocks>' +
            '<messageTypes>%</messageTypes>' +
            '<scripts>%</scripts><sprites>%</sprites>' +
            '</stage>' +
            '<hidden>$</hidden>' +
            '<headers>%</headers>' +
            '<code>%</code>' +
            '<blocks>%</blocks>' +
            '<variables>%</variables>' +
            '</project>',
        (ide && ide.projectName) ? ide.projectName : localize('Untitled'),
        serializer.app,
        serializer.version,
        (ide && ide.projectNotes) ? ide.projectNotes : '',
        thumbdata,
        this.name,
        StageMorph.prototype.dimensions.x,
        StageMorph.prototype.dimensions.y,
        this.getCostumeIdx(),
        this.getTempo(),
        this.isThreadSafe,
        SpriteMorph.prototype.useFlatLineEnds ? 'flat' : 'round',
        this.enableCodeMapping,
        this.enableInheritance,
        StageMorph.prototype.frameRate !== 0,
        this.trailsCanvas.toDataURL('image/png'),
        serializer.store(this.costumes, this.name + '_cst'),
        serializer.store(this.sounds, this.name + '_snd'),
        serializer.store(this.variables),
        serializer.store(this.customBlocks),
        serializer.store(this.messageTypes),
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
                    serializer.store(ide.globalVariables) : ''
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
