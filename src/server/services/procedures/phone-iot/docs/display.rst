Display
=======

This section covers all of the RPCs that relate to manipulation of the customizable interactive display on the mobile device.
The device display is a large rectangular region called the `canvas`.

Locations on the canvas are defined by ``x`` and ``y`` coordinates that range from ``[0, 100]``.
These coordinates are relative to the size of the display.
Thus, a button at position ``[25, 25]`` and size ``[50, 50]`` will take up a fourth of the screen (half the width and half the height), and will be centered in the canvas.

Many controls take optional parameters, which are specified as a list of pairs (lists of size 2), where each pair is the name of an option and the desired value.
For instance, most controls take one or more optional parameters to control the color of the display.
You can obtain color codes from :ref:`getColor`.

.. _addButton:

``addButton(device, x, y, width, height, text='', options=[])``
---------------------------------------------------------------

Adds a button to the display with the given position and size.
If not specified, the default text for a button is empty, which can be used to just make a colored, unlabeled button.
The text can be modified later via :ref:`setText`.

On success, returns the id of the created control, otherwise gives an error.

Optional parameters:

- ``id`` - The id to use for the control. If not specified, a new one will be automatically generated.
- ``event`` - The name of a message type to be sent each time the button is pressed. You must call :ref:`listenToGUI` to actually receive these messages. If not specified, no event is set. Message fields: ``id``.
- ``style`` - The display style of the button on the screen. This can be ``rectangle`` (default), ``ellipse``, ``square``, or ``circle``. If ``square`` or ``circle`` is used, the height of the control is ignored (height equals width).
- ``color`` - The background color of the button.
- ``textColor`` - The text color of the button.
- ``landscape`` - If set to ``true``, rotates the button ``90`` degrees around its top left corner.
- ``fontSize`` - The size of the font to use for text (default ``1.0``).

.. _addImageDisplay:

``addImageDisplay(device, x, y, width, height, options=[])``
------------------------------------------------------------

Adds an image display wit hthe given position and size.
If not specified, an image display is ``readonly``, meaning that the user cannot modify its content.
If (explicitly) not set to ``readonly``, then the user can click on the image display to change the image to a new picture from the camera.

On success, returns the id of the created control, otherwise gives an error.

Optional parameters:

- ``id`` - The id to use for the control. If not specified, a new one will be automatically generated.
- ``event`` - The name of a message type to be sent each time the user updates the content (only possible if ``readonly = false``). You must call :ref:`listenToGUI` to actually receive these messages. If not specified, no event is set. Message fields: ``id``.
- ``readonly`` - Specifies if the user is allowed to change the content (defaults to ``true``). Regardless of this setting, you can still modify the image programmatically via :ref:`setImage`. Defaults to ``true``.
- ``landscape`` - If set to ``true``, rotates the image display ``90`` degrees around its top left corner.
- ``fit`` - The technique used to fit the image into the display, in case the image and the display have different aspect ratios. This can be ``fit`` (default), ``zoom``, or ``stretch``.

.. _addJoystick:

``addJoystick(device, x, y, width, options=[])``
------------------------------------------------

Adds a joystick control to the canvas at the given position and size.
No height parameter is given because joysticks are always circular (similar to passing ``style = circle`` to :ref:`addButton`).

On success, returns the id of the created control, otherwise gives an error.

Optional parameters:

- ``id`` - The id to use for the control. If not specified, a new one will be automatically generated.
- ``event`` - The name of a message type to be sent each time the user moves the joystick. You must call :ref:`listenToGUI` to actually receive these messages. If not specified, no event is set. Message fields: ``id``, ``x``, ``y``.
- ``color`` - The color of the joystick.
- ``landscape`` - If set to ``true``, the ``x`` and ``y`` values of the joystick are altered so that it acts correctly when in landscape mode. Unlike other controls, this option does not affect where the control is displayed on the screen (no rotation).

.. _addLabel:

``addLabel(device, x, y, text='', options=[])``
-----------------------------------------------

Adds a label control to the canvas at the given position.
If ``text`` is not specified, it default to empty, which can be used to hide the label when nothing needs to be displayed.
The text can be modified later via :ref:`setText`.

Labels do not have a size, so they also don't do text wrapping.
Because of this, you should keep label text relatively short.
If you need a large amount of text written, consider using :ref:`addTextField` with ``readonly = true``.

On success, returns the id of the created control, otherwise gives an error.

Optional parameters:

- ``id`` - The id to use for the control. If not specified, a new one will be automatically generated.
- ``textColor`` - The text color of the label.
- ``align`` - The text alignment to use. If set to ``left``, the text starts at the label position. If set to ``right``, the text ends at the label position. If set to ``center``, the text is centered on the label position.
- ``fontSize`` - The size of the font to use for text (default ``1.0``).
- ``landscape`` - If set to ``true``, rotates the label 90 degrees around the label position so the text appears upright when viewed in landscape.

.. _addRadioButton:

``addRadioButton(device, x, y, text='', options=[])``
-----------------------------------------------------

Adds a radio button to the canvas.
Radio buttons are like toggles (checkboxes), except that they are organized into groups and the user can check at most one radion button from any given group.
These can be used to accept multiple-choice input from the user.

On success, returns the id of the created control, otherwise gives an error.

Optional parameters:

- ``group`` - The name of the group to associate this radio button with. You do not need this value to access the control later. If not specified, defaults to ``main``.
- ``id`` - The id to use for the control. If not specified, a new one will be automatically generated.
- ``event`` - The name of an event to send every time the user clicks the radio button. Note that clicking a radio button always checks it, unlike toggles. You must call :ref:`listenToGUI` to actually receive these messages. If not specified, no event is set. Message fields: ``id``, ``state``.
- ``checked`` - Defaults to ``false``. If set to ``true``, the radio button will be initially checked. Note that, while the user cannot check multiple radio buttons, you are free to do so programmatically.
- ``color`` - The color of the radio button itself.
- ``textColor`` - The text color of the radio button.
- ``fontSize`` - The size of the font to use for text (default ``1.0``). Note that this will also scale up the size of the radio button itself (not just the text).
- ``landscape`` - If set to ``true``, rotates the radio button ``90`` degrees around its top left corner.
- ``readonly`` - If set to ``true``, prevents the user from clicking the radio button. However, you will still be free to update the state programmatically. Defaults to ``false``.

.. _addTextField:

``addTextField(device, x, y, width, height, options=[])``
---------------------------------------------------------

Adds a text field to the canvas.
These are typically used to display large blocks of text, or to accept input text from the user.
If not set to ``readonly``, the user can click on the text field to change its content.

If you have a small amount of text you need to show and would otherwise make this control ``readonly``, consider using :ref:`addLabel` instead.

On success, returns the id of the created control, otherwise gives an error.

Optional parameters:

- ``id`` - The id to use for the control. If not specified, a new one will be automatically generated.
- ``event`` - The name of an event to send every time the user changes the text content (only possible if ``readonly = false``). Note that this event is only sent once the user clicks accept on the new content (you do not get an event for every key press). You must call :ref:`listenToGUI` to actually receive these messages. If not specified, no event is set. Message fields: ``id``, ``text``.
- ``text`` - This can be used to set the initial text of the text field once created. Defaults to empty if not specified.
- ``color`` - The color of the text field border.
- ``textColor`` - The text color of the text field.
- ``readonly`` - If set to ``true``, the user will not be able to edit the content. However, you will still be free to do so programmatically. Defaults to ``false``.
- ``fontSize`` - The size of the font to use for text (default ``1.0``).
- ``align`` - The text alignment to use. This can be ``left`` (default), ``right``, or ``center``.
- ``landscape`` - If set to ``true``, rotates the text field ``90`` degrees around its top left corner.

.. _addToggle:

``addToggle(device, x, y, text='', options=[])``
------------------------------------------------

Adds a toggle control to the canvas at the given location.
The ``text`` parameter can be used to set the initial text shown for the toggle (defaults to empty), but this can be changed later with :ref:`setText`.

On success, returns the id of the created control, otherwise gives an error.

Optional parameters:

- ``style`` - The visual style of the toggle control. This can be ``switch`` (default) for a mobile-style toggle, or ``checkbox`` for a desktop-style toggle.
- ``id`` - The id to use for the control. If not specified, a new one will be automatically generated.
- ``event`` - The name of a message to be sent every time the checkbox is toggled by the user. You must call :ref:`listenToGUI` to actually receive these messages. Message fields: ``id``, ``state``.
- ``checked`` - Defaults to ``false``. If set to ``true``, the toggle will be initially checked.
- ``color`` - The color of the toggle itself.
- ``textColor`` - The text color of the toggle.
- ``fontSize`` - The size of the font to use for text (default ``1.0``). Note that this will also scale up the size of the toggle itself (not just the text).
- ``landscape`` - If set to ``true``, rotates the toggle ``90`` degrees around its top left corner.
- ``readonly`` - If set to ``true``, prevents the user from clicking the toggle. However, you will still be free to update the state programmatically. Defaults to ``false``.

.. _clearControls:

``clearControls(device)``
-------------------------

Removes all controls from the device's canvas.
If you would instead like to remove a specific control, see :ref:`removeControl`.

On success, returns ``OK``, otherwise gives an error.

.. _getImage:

``getImage(device, id, img)``
-----------------------------

Gets the displayed image of an image-like control with the given ID.
This can be used on any control that displays images, which is currently only image displays.

This can be used to retrieve images from the mobile device's camera, by having the user store an image in an image display that has ``readonly = false``.
See the ``readonly`` optional parameter of :ref:`addImageDisplay`.

On success, returns ``OK``, otherwise gives an error.

.. _getJoystickVector:

``getJoystickVector(device, id)``
---------------------------------

Gets the current ``x`` and ``y`` values for the stick position of a joystick control.
Instead of calling this in a loop, it is likely better to use the ``event`` optional parameter of :ref:`addJoystick`.

On success, returns the joystick position, otherwise gives an error.

.. _getText:

``getText(device, id)``
-----------------------

Gets the current text content of the text-like control with the given ID.
This can be used on any control that has text, such as a button, label, or text field.

On success, returns the control's text, otherwise gives an error.

.. _getToggleState:

``getToggleState(device, id)``
------------------------------

Gets the toggle state of a toggleable control.
This can be used on any toggleable control, such as toggles and radio buttons.

On success, returns the current toggle state (``true`` for checked, ``false`` for unchecked), otherwise gives an error.

.. _isPressed:

``isPressed(device, id)``
-------------------------

Checks if the pressable control with the given ID is currently pressed.
This can be used on any pressable control, which currently only includes buttons.

By calling this RPC in a loop, you could perform some action every second while a button is held down.
If you would instead like to receive click events, see the ``event`` optional parameter of :ref:`addButton`.

On success, returns the pressed state (``true`` for pressed, ``false`` for not pressed), otherwise gives an error.

.. _removeControl:

``removeControl(device, id)``
-----------------------------

Removes a control with the given ID if it exists.
If the control does not exist, does nothing (but still counts as success).
If you would instead like to remove all controls, see :ref:`clearControls`.

On success, returns ``OK``, otherwise gives an error.

.. _setImage:

``setImage(device, id, img)``
-----------------------------

Sets the displayed image of an image-like control with the given ID.
This can be used on any control that displays images, which is currently only image displays.

On success, returns ``OK``, otherwise gives an error.

.. _setText:

``setText(device, id, text)``
-----------------------------

Sets the text content of the text-like control with the given ID.
This can be used on any control that has text, such as a button, label, or text field.

On success, returns ``OK``, otherwise gives an error.

.. _setToggleState:

``setToggleState(device, id, state)``
-------------------------------------

Sets the toggle state of a toggleable control with the given ID.
This can be used on any toggleable control, such as toggles and radio buttons.
If ``state`` is ``true``, the toggleable becomes checked, otherwise it is unchecked.

If used on a radio button, it sets the state independent of the control's group.
That is, although the user can't select multiple radio buttons in the same group, you can do so programmatically through this RPC.

On success, returns ``OK``, otherwise gives an error.
