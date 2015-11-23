# Bugs
+ Sometimes the messages seem to be dropped...
    + Fixed the log messages (though they aren't the problem...)
    + It looks like the receive block isn't working somehow...

    + The blocks are not connecting to their following block...

# Message sending/receiving blocks
+ Do we need networked events?
    + Can we have the same things with simply messages that have no body?
    + Are they achieving the same thing?
    + Roles are then significantly easier (they are their own message type)
    + Changing this. It is discussed in more detail in `concepts.md`

+ Changing type with existing blocks
    + blocks stay on and extra things are added. They should be popped off like lists

+ How does the `MultiArgMorph` work?
    + nvm, I made it my own way. It's not the prettiest implementation but it is effective

# Notes on InputSlotMorph
+ It has:
    + getSpec
    + contents
    + arrow ... ?
    + setContents
        + used in dropDownMenu
    + setChoices
    + fixLayout
    + mouseDownLeft
    + mouseClickLeft

    + reactToKeystroke
    + reactToEdit
    + reactToSliderEdit

    + mapToCode
    + evaluate
    + isEmptySlot

    + drawNew
    + drawRectBorder
    + drawRoundBorder
    + A bunch of menus...


# Custom messages for various paradigms
+ I will make a block for sending raw messages...?
    + Could this present a security issue?
        + I don't believe so bc the same functionality can be done in the browser

# Client side notes
+ I am currently trying to create a menu for selecting the game type of the current project. The game type will then determine who shares network communication (at the highest level) and some client libs that will be loaded.

# Game Type 
## Menu
+ Creating a menu
    + This will need to be done every time a new project is created. There is a method called `newProject` in `gui.js` owned by `IDE_Morph` but this is not called on the first load.

    + I will start by creating the menu and showing it on the creation of a new project.
        + I will first find a similar menu (loadProject menu?) on which I can base my menu

        + It will be a combination of the "Sign in" and Open project screen
            + Size and layout of the Sign in menu but the selection options of the Open Project menu
            + There have to be more tools for this kinda stuff...

## Messages
+ Game types should have an agreed upon message type

## Checkpoints:
+ Import libraries for paradigm
    + Lower priority
    + Check out the "Import library" menu
        + myself.droppedText(myself.getURL(url), name)

        + need to add a path on the server for rpc libraries

+ Add more buttons and stuff to the dialog?
+ Add game type to title bar. Probably in parenthesis

## Previous Checkpoints:
+ Get the popup to show up
+ Request game types from server
+ Add buttons
+ Add list field of game types
+ Set the game type on click
+ update client's game type and paradigm on selection
+ Fix the layout of the dialog box
    + What does fixLayout do?
        + Recalculates the layout based on the latest sizes of the children


# Selecting Specific Groups
+ The user should be able to name the groups
+ Otherwise, they can use the default names?
+ Passwords on the groups?

# Misc
+ The user should get feedback about clearing board and marking x -> was it successful?

# Save project info
+ Need to add gameType and paradigm to the project info that gets saved
    + Add to toXML in store.js
    + deserialize 
    + Also, check that it works in the database

# Additional features
+ "respond" block for messages to allow communication between people?

+ Drag and drop invalid blocks to other actors (Snap bug)

## Finished
+ Costumes not loading from server
    + Missing an entry in object.costumes.contents
        + Is it when loading a sprite?
        + It appears to be happening in rawLoadProjectModel
        + DONE

+ Client reconnect should update paradigm
    FIXED

+ Client reconnect should update game type
    FIXED

+ If paradigm instance is empty, it should be removed
    FIXED

+ Clients not leaving groups correctly
    FIXED

+ It keeps creating new sockets...
    + I don't think the sockets are being closed on the client
    + There are duplicates from the `onclose` being executed when websockets.destroy is called
    FIXED

# Bugs
+ Space bar doesn't trigger the control hat block
    + Hat is not found...
    + No scripts for the child...
        + Did it get added?
            + Yes
        + Somewhere it is getting removed...
        + but it is correct when I drop a new one...
            + Is the scripts morph attached to the correct sprite?
    + There are 2 stages
    + The wrong one is listening to the key events
        + where is the keyboardReceiver set (when loading the stage)?

    + Sometimes it seems that it doesn't detect the key press. Other times, it adds the thread but doesn't seem to be executed
        + One problem at a time...
            + myself.keyboardReceiver and myself.children[0].stage are not the same...
                + They are the same in Snap!
                + This only happens when I add a network receiving block...

        + It happens when the keypressed hat block is created
            + It is broken by the time we get a 'mouseup'
                + ... what about 'mousedown'?
                + There are 2 stages in the ide (not in Snap!)
                + I think stage.destroy is not removing itself from it's parent

    + FIXED: StageMorph wasn't calling it's base class' destroy method

# Connect/Disconnect Network Button
## Checkpoints:

## Previous Checkpoints:
+ Create the functionality
+ Create a nice icon for it
    + Probably in `SymbolMorph` (though I will need to draw it programmatically :/)
    + I think I am going to make a circle with curves on both sides -->   ( ( O ) )
        + Line 8220 is worthwhile
        + Created an icon. Might change it later

# Image data type
+ Should behave like any other data type EXCEPT:
    + set costume should render it
        + How is the costume set currently?
            + What is this Costume type?
            + Could I use this instead of the image type?
                + I can do this by creating an Image with src of the url
                + Creating a canvas and drawing the image on it
                + Creating a costume
                + Then wearing the costume (Snap has support for first class costumes)

    + say blocks should render it
    + think blocks should render it
    + show variable should render it
    + DONE

# RPC dropdowns
+ I decided not to implement this
+ I will need to create a subclass of InputSlotMorph which can...
    + make http requests when `contents` is called
    + have updated `getSpec`

+ How will I create the secondary morph type?
    + I need to know the value of the other InputSlotMorph...
        + Closures, Arguments, Lookup?
        + I am going to try lookup? :/

+ Should I even split them up here? What if I ignored the action + RPC connection?
    + The number of actions would be overwhelming

# Message sending/receiving blocks
+ I will make a complex input type for the block in which the dropdown

+ Custom block receiving
    + I need a read only `TemplateSlotMorph`
        + TSM <- ArgMorph <- SyntaxElementMorph <- Morph

        + Override mouseClickLeft?
            + The ReporterBlockMorph calls this and checks its parent... 

+ Custom block sending
    + How do I create grayed out text?
        + InputSlotMorph <- ArgMorph <- SyntaxElementMorph <- Morph
        + I may need to override `contents` for the InputSlotMorph
            + OW, I might be able to make 

+ Both
    + How can I make a message type dropdown which edits other morphs on select?
        + Is there an `onSelect` callback for InputSlotMorph?
            + `setContents`
    + DONE

+ Import/Export problems
    + This structure is new (an input which modifies the children of the parent)... How can we import these?
        + Can I override silentReplaceInput?
        + We can only load inputs if `inputs[i]` is defined
            + This will lose the info stored in the nodes (for the send message)
        + Can we batch the children into the last input?
        + This is the approach I have taken... Not sure if I like it...
check into `setContents`

    + Fix the problem when a block is contained in an `MessageInputSlotMorph`
        + Is it an import problem?
            + Yes
        + How are other reporter blocks handled?

        + Can I change the message input block to add the nodes to be it's own children (rather than children of it's parent)?
            + Can I load it in a better way?



    + I find this rather annoying... The best way to do this would probably to change the message input field so that it is rendered correctly w/ the subsequent boxes as children.
        + However, when I do this, the layouts are messed up

    + I think I am going to keep it as it currently is. The input should receive the batched children
        + These children should be converted to the correct type:
            + script
            + block
            + value
            + color

    + Fixed the issues

+ Evaluate is not done correctly... How do the variables get resolved
