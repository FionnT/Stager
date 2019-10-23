const electron = require('electron')
const path = require('path')
const fs = require('fs')
const _object = require('lodash/fp/object')
// Renderer process has to get `input` module via `remote`, whereas the main process can get it directly
// input.getPath('userData') will return a string of the user's input data directory path.
const options = {
  storage: undefined,
  default: undefined
}
let database

// handles buffering file and enables referencing, refreshing
const initialise = async (opts) => {
  // removes the need to specify defaults on every call
  // by persisting any passed settings
  if (!opts.default && options.default) opts.default = options.default
  else if (opts.default) options.default = opts.default
  else if (!options.default && !opts.default)
    throw new Error('Please pass a defaults file - it can be empty')

  if (!opts.storage && options.storage) opts.storage = options.storage
  else if (opts.storage) options.storage = opts.storage
  else if (!opts.storage && !opts.storage)
    throw new Error('Please pass a storage location')

  if (!opts.reset && !opts.refresh) {
    return new Promise((resolve, reject) => {
      if (database) resolve(database)
      else {
        try {
          fs.exists(opts.storage, (exists) => {
            if (exists) {
              try {
                database = JSON.parse(fs.readFileSync(opts.storage))
                resolve(database)
              } catch {
                throw new Error(
                  "Couldn't read the file. Make sure it's JSON parsable."
                )
              }
            } else {
              fs.exists(opts.default, (exists) => {
                if (exists) {
                  fs.copyFile(opts.default, opts.storage, (err) => {
                    if (err) reject(err)
                    else {
                      try {
                        database = JSON.parse(fs.readFileSync(opts.storage))
                        resolve(database)
                      } catch {
                        throw new Error(
                          "Couldn't read the file. Make sure it's JSON parsable."
                        )
                      }
                    }
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
  } else if (!opts.reset && opts.refresh) {
    return new Promise((resolve, reject) => {
      fs.exists(opts.storage, (exists) => {
        if (exists) {
          try {
            database = JSON.parse(fs.readFileSync(opts.storage))
            resolve(database)
          } catch {
            reject("Couldn't read the file. Make sure it's JSON parsable.")
          }
        } else reject("Couldn't find the preferences file!")
      })
    })
  } else if (opts.reset) {
    return new Promise((resolve, reject) => {
      fs.copyFile(opts.default, opts.storage, (err) => {
        if (err) reject(err)
        fs.readFileSync(opts.storage, (data) => {
          database = JSON.parse(data)
          resolve(database)
        })
      })
    })
  }
}

// builds the easy syntax passed by a request into a JSON object for merging with main JSON Storage blob
const construct = (selection, value, callback) => {
  let built = {}
  let array = selection.split('.')
  // .split returns length == 1 with 0 matches
  if (array.length == 1) {
    if (typeof value == 'object') {
      built = JSON.parse('{"' + selection + '": {}}')
      built[selection] = value
    } else built = JSON.parse('{' + selection + ':' + value + '}')
  } else {
    try {
      array.forEach((item, index) => {
        let helper = {}
        let passed = item.toString()
        index == array.length - 1
          ? (helper[passed] = value) // assign the last specified object the value passed
          : (helper[passed] = {}) // assign an empty object for parents
        Object.assign(built, helper)
      })
    } catch {
      null
      // last value of array is undefined,
      // so 'Object' throws an error when trying to assign
    }

    for (i = array.length - 1; i > 0; i--) {
      let helper
      let key = Object.keys(built)[i]
      let value = built[key]
      typeof value == 'object'
        ? (helper = JSON.parse('{"' + key + '":' + JSON.stringify(value) + '}')) // convert key with typeof JSON (assigned a value) to string for parsing back to JSON
        : (helper = JSON.parse('{"' + key + '":' + value + '}')) // prevent ""_string_""
      built[Object.keys(built)[i - 1]] = helper
      delete built[Object.keys(built)[i]] // cleanup the bumped item
    }
  }
  callback(built)
}

// Set the key:value pair, or a sub key:value pair if requested
const set = async (selection, value, callback, refresh) => {
  if (selection && typeof selection == 'string' && typeof value !== undefined) {
    await initialise({'refresh': refresh}).then((database) => {
      construct(selection, value, (data) => {
        let output = _object.merge(database, data) // <3 to lodash
        fs.writeFile(options.storage, JSON.stringify(output), (err) => {
          if (typeof callback == 'function') {
            if (err) callback(false, err)
            else callback(true)
          } else {
            if (err) reject(err)
            else return true
          }
        })
      })
    })
  }
}

const reset = async (selection, callback) => {
  let value
  if (
    selection &&
    typeof selection == 'string' &&
    typeof callback == 'function'
  ) {
    fs.readFile(defaults, (err, data) => {
      if (err) callback(false, err)
      else {
        let original = JSON.parse(data)
        let key = 'original.' + selection
        try {
          value = eval(key)
          set(selection, value, callback)
        } catch {
          callback(false, "Couldn't find that setting in defaults.")
        }
      }
    })
  } else if (!selection && !callback) {
    callback(false, 'Please pass parameters.')
  } else if (
    selection &&
    typeof selection !== 'string' &&
    typeof callback == 'function'
  ) {
    callback(
      false,
      'Expected selection to be a string, but got ' + typeof selection
    )
  } else return 'Your parameters were incorrect in an unexpected way.'
}

const get = async (selection, callback, refresh) => {
  let data
  await initialise({'refresh': refresh})
    .then((database) => {
      if (typeof selection !== 'function') {
        let key = 'database.' + selection
        try {
          data = eval(key) // return one pair
          return true
        } catch {
          return true // data = undefined;
        }
      } else {
        data = database // return full json object
        return true
      }
    })
    .catch((err) => {
      callback(false, err)
    })
  if (typeof callback == 'function') {
    if (data) callback(data)
    else callback(false, "Couldn't find that setting in storage.")
  } else return data
}

module.exports = {
  initialise,
  set,
  reset,
  get
}
