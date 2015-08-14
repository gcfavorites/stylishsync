# About #
[Stylish Sync](http://code.google.com/p/stylishsync/) is an add-on for
[SeaMonkey](http://www.seamonkey-project.org/) and
[Firefox](http://www.mozilla.com/firefox/) in combination with
the [Stylish](http://userstyles.org) add-on.

It uses the browsers synchronization capabilities to sync your user styles.

As required by Mozilla, here's the add-on's

# Privacy Policy #
This extension uploads Stylish's user styles to the Mozilla sync server.

As with all Mozilla sync data, all items are uploaded in encrypted form and can only be decrypted by the users browser.

## Disclaimer ##
> This program is distributed in the hope that it will be useful, but
> WITHOUT ANY WARRANTY; without even the implied warranty of
> MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  The author
> assumes no liability for damages arising from use of this program OR
> of any data that might be distributed with it.

# Download #
Please download the latest version from the
[Mozilla Add-On Site](https://addons.mozilla.org/en-US/addon/stylishsync/).

Brave beta-testers may obtain a copy of the latest development releases
[here](https://stylishsync.googlecode.com/svn/trunk/versions/stylishsync-latest-dev.xpi) (Mozilla's browsers won't install this directly. Just save it and use '`Install Add-on from file...`' in the add-on manager or drop it onto it).

# Options #
![http://stylishsync.googlecode.com/svn/wiki/screens/stylishsync-options.default.jpg](http://stylishsync.googlecode.com/svn/wiki/screens/stylishsync-options.default.jpg)

  * **Enabled** - Does the same as the check-boxes in Mozilla's Sync-options do. De-selecting it disables `Stylish Sync` on all devices and erases the data from the server.
  * **Synchronize immediately** - Gives style changes a high priority and causes them to be uploaded as soon as possible.
  * **Synchronize Stylish Settings** - Uploads some of Stylish's options. As with all Mozilla's preferences, they are only synchronized on the same browser platform (i.e. _not_ from SeaMonkey to Firefox!)
  * **Backup automatically** - Creates a daily backup in the users [profile folder](http://kb.mozillazine.org/Profile_folder) when the browser is started the first time. By default, backup are kept for two weeks.
  * **Manage Stylish Sync**
    * **Reset...** - Same as `Manage Account > Reset...` in Mozilla's Sync-options, just for Stylish only.
    * **Backup...** - Create a manual backup of all styles.
    * **Restore...** - Restore backup from file. This **replaces all style** and lets the user select how to synchronize them afterwards.
  * **Debug output to error console** - Please activate only when asked to. It might degrade performance quite a bit!