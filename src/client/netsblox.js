/*globals DialogBoxMorph*/
// This file contains widgets and resources that are used in the networking
// functionality of netsblox (such as creating the network messages)
var NetworkMessageDialogMorph;

// NetworkMessageDialogMorph ////////////////////////////////////////////////////

// NetworkMessageDialogMorph inherits from DialogBoxMorph:

NetworkMessageDialogMorph.prototype = new DialogBoxMorph();
NetworkMessageDialogMorph.prototype.constructor = NetworkMessageDialogMorph;
NetworkMessageDialogMorph.uber = DialogBoxMorph.prototype;

function NetworkMessageDialogMorph(target, action, environment) {
    this.init(target, action, environment);
}

// TODO: Use the list type of viewing for creating the mock fields for the message
