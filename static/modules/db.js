const electron = require('electron')
const path = require('path')
const fs = require('fs')
const _object = require('lodash/fp/object')
// Renderer process has to get `input` module via `remote`, whereas the main process can get it directly
// input.getPath('userData') will return a string of the user's input data directory path.
const userPref = path.join(
  (electron.app || electron.remote.app).getPath('userData') +
    '/preferences.json'
)
const defaults = path.join(__dirname, '../defaults.json')
let database

let initialise = new Promise((resolve, reject) => {
  if (database) resolve(database)
  else {
    try {
      fs.exists(userPref, (exists) => {
        if (exists) {
          fs.readFile(userPref, (err, data) => {
            if (err) console.log('here ' + err)
            database = JSON.parse(data)
            resolve(database)
          })
        } else {
          fs.exists(defaults, (exists) => {
            if (exists) {
              fs.copyFile(defaults, userPref, (err) => {
                if (err) console.log(err)
                fs.readFileSync(userPref, (data) => {
                  database = JSON.parse(data)
                  resolve(database)
                })
              })
            }
          })
        }
      })
    } catch (err) {
      reject(err)
    }
  }
})

const get = (options) => {
  return new Promise((resolve, reject) => {
    initialise
      .then((database) => {
        let data
        let key
        if (typeof options == 'object' && Object.keys(options)[0]) {
          if (options.keys) {
            if (options.name) key = 'database.' + options.name.toString()
            else key = 'database'
            options.keys.forEach((entry) => {
              key += '.' + entry
            })
            data = eval(key) // return sub-key (depth < 0) value
            resolve(data)
          } else {
            data = database[options.name.toString()]
            resolve(data)
          } // return depth 0 key value
        } else {
          data = database
          resolve(data)
        } // return all key:value pairs
      })
      .catch((err) => reject(err))
  }).catch((err) => reject(err))
}

// Set the key:value pair, or a sub key:value pair if requested
const set = (options) => {
  return new Promise((resolve, reject) => {
    initialise
      .then((database) => {
        const getDepth = ({children}) =>
          1 + (children ? Math.max(...children.map(getDepth)) : 0)
        const depth = getDepth(options.value)
        let output
        depth
          ? (output = _object.merge(database, options.value)) // merge recursively without overwriting
          : () => {
              database[options.name] = options.value // update single 0 depth key:value pair
              output = database
            }
        fs.writeFile(userPref, JSON.stringify(output), (err) => {
          if (err) reject(err)
          resolve('The file was saved')
        })
      })
      .catch((err) => reject(err))
  }).catch((err) => reject(err))
}

const reset = async (options) => {
  return new Promise((resolve, reject) => {
    initialise.then((database) => {
      fs.readFile(userPref, (err, data) => {
        if (err) console.log('here ' + err)
        original = JSON.parse(data)

        // depth
        //   ? (output = _object.merge(database, options.value)) // merge recursively without overwriting
        //   : () => {
        //       database[options.name] = original[options.name] // update single 0 depth key:value pair
        //       output = database
        //     }
        // resolve(database)
      })
    })
  })
}

module.exports = {
  initialise,
  set,
  get,
  reset
}
