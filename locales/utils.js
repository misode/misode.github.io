/* 
 * Sort keys in all locale files. 
 * Usage:
 * $ node ./locales/utils.js sort
 * 
 * ---
 * 
 * Adds missing keys to other locale files from "en.json". 
 * Usage:
 * $ node ./locales/utils.js sync
 * 
 */

const { join } = require('path')
const { promises: fs } = require('fs')

let counter = 0

const localesPath = __dirname
const enFilePath = join(localesPath, 'en.json')

const main = async (cb1, cb2) => {
    const enFile = await fs.readFile(enFilePath, { encoding: 'utf8' })
    const enJson = JSON.parse(enFile)
    const localeFilePaths = (await fs.readdir(localesPath))
        .filter(v => v !== 'en.json' && v.endsWith('.json'))
        .map(v => join(localesPath, v))
    cb1(enJson, enFilePath)
    for (const path of localeFilePaths) {
        const file = await fs.readFile(path, { encoding: 'utf8' })
        const json = JSON.parse(file)
        cb2(enJson, json, path)
    }
}

const write = async (path, obj) => {
    fs.writeFile(path, JSON.stringify(sort(obj), undefined, '\t') + '\n')
}

const sort = (obj) => {
    if (typeof obj === 'object') {
        const keys = Object.keys(obj).sort()
        const ans = {}
        for (let i = 0; i < keys.length; i++) {
            const key = keys[i]
            ans[key] = sort(obj[key])
        }
        return ans
    }
    return obj
}
const sortCb1 = (enJson, enFilePath) => {
    write(enFilePath, sort(enJson))
}
const sortCb2 = (_, json, path) => {
    write(path, sort(json))
}

const syncCb1 = () => undefined
const syncCb2 = (enJson, json, path) => {
    const walker = (enJson, json, path = '.') => {
        for (const key in enJson) {
            if (json[key] === undefined) {
                json[key] = enJson[key]
                console.log(`Added missing key ‘${path}/${key}’.`)
                counter++
            } else if (typeof enJson[key] === 'object') {
                walker(enJson[key], json[key], `${path}/${key}`)
            }
        }
    }
    walker(enJson, json)
    write(path, json)
    console.log(`Added ${counter} keys to ‘${path}’.`)
}

switch (process.argv[2]) {
    case 'sync':
        main(syncCb1, syncCb2)
        break
    case 'sort':
        main(sortCb1, sortCb2)
        break
    default:
        throw `Unexpected argument ‘${process.argv[2]}’.`
}
