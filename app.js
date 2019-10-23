// Modules to control application life and create native browser window
const electron = require('electron')
const BrowserWindow = electron.BrowserWindow
const path = require('path')

const app = electron.app
const db = require('./static/modules/db.js')
const defaultPath = path.join(__dirname + '/static/defaults.json')
const storePath = path.join(app.getPath('userData') + '/preferences.json')
db.initialise({'default': defaultPath, 'storage': storePath, 'reset': false})

// console.log(screen.get({name: 'height'}))
db.set('screen', {'width': 1650, 'height': 1500, 'frame': false})
const locals = {
  /* ...*/
}
const setupPug = require('electron-pug')
// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage conpmllected.
let mainWindow

const launch = async () => {
  // initialise pug
  try {
    let pug = await setupPug({pretty: true}, locals)
    pug.on('error', (err) => console.error('electron-pug error', err))
  } catch (err) {
    // Could not initiate 'electron-pug'
  }
  // const {width, height} = screen.get('dimensions')
  // console.log(width, height)
  // Create the browser window.
  // const {width, height} = electron.screen.getPrimaryDisplay().workAreaSize
  db.get(
    'screen',
    (screen) => {
      mainWindow = new BrowserWindow({
        width: screen.width,
        height: screen.height,
        skipTaskbar: screen.skipTaskbar,
        title: screen.title,
        acceptFirstMouse: screen.acceptFirstMouse,
        hasShadow: screen.hasShadow,
        titleBarStyle: screen.titleBarStyle,
        center: screen.center,
        frame: screen.frame,
        resizable: screen.resizable,
        simpleFullscreen: screen.simpleFullscreen,
        webPreferences: {
          devTools: true,
          scrollBounce: true,
          preload: path.join(__dirname, 'preload.js')
        }
      })
      mainWindow.loadFile('static/pages/index.pug')
      // Open the DevTools.
      // mainWindow.webContents.openDevTools()

      // Emitted when the window is closed.
      mainWindow.on('closed', function() {
        // Dereference the window object, usually you would store windows
        // in an array if your app supports multi windows, this is the time
        // when you should delete the corresponding element.
        mainWindow = null
      })
    },
    true
  )

  // and load the index.html of the app.
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', launch)

// Quit when all windows are closed.
app.on('window-all-closed', function() {
  // On macOS it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  // if (process.platform !== "darwin") app.quit();
  app.quit()
})

app.on('activate', function() {
  // On macOS it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (mainWindow === null) createWindow()
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
