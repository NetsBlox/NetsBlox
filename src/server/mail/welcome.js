const WELCOME_HTML = (nbUser, snapUser) =>
    `<h1>Welcome to NetsBlox!</h1>

    There was a recent NetsBlox login using your Snap! account, ${snapUser}. A NetsBlox account, ${nbUser}, has been created for you so you can save your projects and use all the features NetsBlox has to offer including collaboration, cloud variables, and more :)

    Basically, logging in with your Snap! account will log you into NetsBlox as ${nbUser} so you don't need to remember yet another username and password.

    <h2>FAQ</h2>
    ${snapUser !== nbUser ? `<h3>Why did I get a new username?</h3>\nA NetsBlox account is required for saving NetsBlox projects (as well as other things) and ${snapUser} was already taken.\n\n` : ''}<h3>What is a "linked account"?</h3>
    A linked account enables the user to login using the given account. If I have linked my Snap! account, I can use "Login with Snap!" to login to my NetsBlox account.

    <h3>What does it mean to "unlink Snap! account"?</h3>
    This means that I can no longer use "Login with Snap!" to login to my NetsBlox account. If I use "Login with Snap!" after unlinking the account, it will make a new NetsBlox account and link it to the Snap! account.

    <h3>How can I login if I unlink the account?</h3>
    You can always login using your NetsBlox password. If you have not set up a password, you can use "Reset Password" from the NetsBlox editor.

    <h3>What if I change my password in NetsBlox? Will my password change in Snap!?</h3>
    No. NetsBlox accounts (even those with a linked Snap! account) still can login using their own password. Resetting or changing a password in NetsBlox will change the NetsBlox password. If you would like to change the password for your Snap! account, please do so from the Snap! website.
    `.replace(/\n/g, '<br/>');

module.exports = WELCOME_HTML;
