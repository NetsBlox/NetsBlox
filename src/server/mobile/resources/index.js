/*globals IDE_Morph, Morph, WorldMorph, nop, PushButtonMorph, project*/
/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */
// Helper functions
'use strict';

var world;
var getIde = function() {
    var ide = new IDE_Morph();
    // Mock opening in the world
    ide.logo = new Morph();
    ide.categories = new Morph();
    ide.corralBar = new Morph();

    ide.controlBar = new Morph();
    ide.controlBar.fixLayout = nop;
    ide.controlBar.networkButton = new PushButtonMorph();
    ide.world = function() { return {}; };

    return ide;
};

var loadStage = function(text) {
    // Create an ide and load the project. Then remove the stage
    var ide = getIde();
    ide.serializer.openProject(ide.serializer.load(project, ide), ide);

    return ide.stage;
};

var loop = function () {
    world.doOneCycle();
};

var app = {
    // Application Constructor
    initialize: function() {
        this.bindEvents();
    },
    // Bind Event Listeners
    //
    // Bind any events that are required on startup. Common events are:
    // 'load', 'deviceready', 'offline', and 'online'.
    bindEvents: function() {
        document.addEventListener('deviceready', this.onDeviceReady, false);
    },
    // deviceready Event Handler
    //
    // The scope of 'this' is the event. In order to call the 'receivedEvent'
    // function, we must explicitly call 'app.receivedEvent(...);'
    onDeviceReady: function() {
        world = new WorldMorph(document.getElementById('world'));
        world.worldCanvas.focus();
        // Load the stage morph from the TicTacToe Example
        var stage = loadStage(project);
        stage.openIn(world);
        setInterval(loop, 1);
    }
};

app.initialize();
