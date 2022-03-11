# Example Projects

This directory contains the projects that users can open from the Examples menu in the editor, and are shown on the front of the main [NetsBlox website](https://netsblox.org).

Each example is stored as a directory with the name of the project.
Under this, there are one or more `.xml` files denoting roles.
The Examples loader will combine the roles (plus other preprocessing and boilerplate) when a project is requested.

## Updating Examples



To update or create a new example, follow these steps:
 - Export the project `.xml` file from the NetsBlox client.
 - Open the file in a text editor.
 - For each role, extract the segment `<project>...</project><media>...</media>` and save it in the corresponding role `.xml` file under the project directory.
 - Start your local NetsBlox server and ensure that the updated example opens and runs correctly.