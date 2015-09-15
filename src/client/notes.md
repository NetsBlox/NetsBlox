# Client side notes
+ I am currently trying to create a menu for selecting the game type of the current project. The game type will then determine who shares network communication (at the highest level) and some client libs that will be loaded.

# Game Type Menu
+ Creating a menu
    + This will need to be done every time a new project is created. There is a method called `newProject` in `gui.js` owned by `IDE_Morph` but this is not called on the first load.

    + I will start by creating the menu and showing it on the creation of a new project.
        + I will first find a similar menu (loadProject menu?) on which I can base my menu

        + It will be a combination of the "Sign in" and Open project screen
            + Size and layout of the Sign in menu but the selection options of the Open Project menu
            + There have to be more tools for this kinda stuff...

## Checkpoints:
+ Import libraries for paradigm
    + Lower priority
    + Check out the "Import library" menu
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


# Connect/Disconnect Network Button
## Checkpoints:
+ Create a nice icon for it
    + Probably in `SpriteMorph` (though I will need to draw it programmatically :/)

## Previous Checkpoints:
+ Create the functionality

# Selecting Specific Groups
+ The user should be able to name the groups
+ Otherwise, they can use the default names?
+ Passwords on the groups?

# Misc
+ The user should get feedback about clearing board and marking x -> was it successful?

# Save project info
+ Need to add gameType and paradigm to the project info that gets saved
    + Add to toXML in store.js
    + Deserialize 
    + Also, check that it works in the database

# Additional features
+ Client reconnect should update paradigm
    FIXED

+ Client reconnect should update game type
    FIXED

+ If paradigm instance is empty, it should be removed
    FIXED

+ Clients not leaving groups correctly

+ "respond" block for messages to allow communication between people?

+ It keeps creating new sockets...
    + I don't think the sockets are being closed on the client
    + There are duplicates from the `onclose` being executed when websockets.destroy is called
    FIXED

+ Drag and drop invalid blocks to other actors (Snap bug)

