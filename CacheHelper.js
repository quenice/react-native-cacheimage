import {AsyncStorage, DeviceEventEmitter} from "react-native";
import CryptoJS from 'crypto-js'
import RNFetchBlob from 'rn-fetch-blob'

const STORAGE_KEY = 'cache-image-entity'
const TOTAL_DIRECTORYS = 17
const {fs} = RNFetchBlob

const cacheEntity = {
    cacheMap: {},
    latest: false
}

// download image tasks
const taskList = {}

/**
 * urls of downloading
 * {'url':{ing:true, notify:true}}
 */
const downloading = {}

const config = {
    overwrite: false,
    dirsQuantity: TOTAL_DIRECTORYS
}

/**
 * 加法hash算法
 * @param value md5字符串
 * @returns {number} 获得值为[0, dirsQuantity - 1]
 */
const additiveHash = value => {
    let hash = 0
    const chars = value.match(/./g)
    for (let v of chars) {
        hash += parseInt(`0x${v}`, 16)
    }
    return hash % config.dirsQuantity
}

/**
 * 图片存储的基本目录
 * @returns {string}
 */
const getImagesCacheDirectory = () => `${fs.dirs.CacheDir}/cache-images`

const getEncryptedInfo = fileOriginalName => {
    const filename = CryptoJS.MD5(fileOriginalName).toString()
    const directory = additiveHash(filename)
    return {filename, directory}
}

/**
 * 图片存储临时目录
 * @returns {string}
 */
const getTmpDir = () => `${getImagesCacheDirectory()}/tmp`


/**
 * get the final image local path
 * @param originalUri
 * @returns {Promise<*>}
 */
const getImagePath = async (originalUri) => {
    if (!originalUri) return
    await _syncStorage2CacheEntity()
    let {cacheMap = {}} = cacheEntity
    const cachePath = cacheMap[originalUri]
    if (cachePath) {
        const exists = await fs.exists(cachePath).catch(e => printLog(e))
        if (exists) return `file://${cachePath}`
        else return await _fetchImage(originalUri).catch(e => printLog(e))
    }
    return await _fetchImage(originalUri).catch(e => printLog(e))
}

/**
 * fetch image data from newwork and update cache map
 * @param originalUri
 * @returns {Promise<string>}
 * @private
 */
const _fetchImage = async (originalUri) => {
    if (!downloading[originalUri]) {
        downloading[originalUri] = {ing: true}
    } else {
        downloading[originalUri].notify = true
        return
    }

    const {filename, directory} = getEncryptedInfo(originalUri)
    const taskId = `${filename}${parseInt(Math.random(100) * 100)}${new Date().getMilliseconds()}`
    const tmpPath = `${getTmpDir()}/${taskId}`
    const task = RNFetchBlob.config({
        path: tmpPath
    }).fetch('GET', originalUri).catch(e => printLog(e))
    taskList[taskId] = task
    const response = await task.catch(e => printLog(e))
    delete taskList[taskId]
    printLog(response)
    if (!response) return
    const imageExtension = _getImageExtension(response)
    const cacheDir = `${getImagesCacheDirectory()}/${directory}`
    const cachePath = `${cacheDir}/${filename}.${imageExtension}`
    const existsImage = await _moveImage(cacheDir, tmpPath, cachePath).catch(e => printLog(e))
    await _saveCacheKey(originalUri, cachePath).catch(e => printLog(e))
    if (existsImage) {
        response.flush()
    }

    const downloadInfo = downloading[originalUri]
    delete downloading[originalUri]
    if (downloadInfo && downloadInfo.notify) {
        DeviceEventEmitter.emit(event.render, originalUri, `file://${cachePath}`)
    }

    return `file://${cachePath}`
}

/**
 * create tmp dir just once
 * @returns {Promise<void>}
 * @private
 */
const _createTmpDir = async () => {
    const rootDir = getImagesCacheDirectory()
    const tmpDir = getTmpDir()
    const isRootDirExists = await fs.isDir(rootDir).catch(e => printLog(e))
    if (!isRootDirExists) await fs.mkdir(rootDir).catch(e => printLog(e))
    const isTmpDirExists = await fs.isDir(tmpDir).catch(e => printLog(e))
    if (!isTmpDirExists) await fs.mkdir(tmpDir).catch(e => printLog(e))
}

/**
 * move the tmp image file to final local path
 * @param toDir
 * @param from
 * @param to
 * @returns {Promise<void>}
 * @private
 */
const _moveImage = async (toDir, from, to) => {
    const exists = await fs.exists(to).catch(e => printLog(e))
    if (exists) {
        if (config.overwrite) {
            await fs.unlink(to)
        } else {
            return true
        }
    }
    const isDir = await fs.isDir(toDir).catch(e => printLog(e))
    if (!isDir) {
        await fs.mkdir(toDir).catch(e => printLog(e))
    }
    await fs.mv(from, to).catch(e => console.log(e))
    return false
}

/**
 * get the latest CacheEntity
 * @returns {Promise<{update: boolean, map: {}, latest: boolean}>}
 * @private
 */
const _syncStorage2CacheEntity = async () => {
    if (!cacheEntity || !cacheEntity.latest) {
        let entity = await AsyncStorage.getItem(STORAGE_KEY).catch(e => printLog(e))
        if (entity) {
            try {
                entity = JSON.parse(entity)
            } catch (e) {
                entity = {}
            }
        } else {
            entity = {}
        }
        Object.assign(cacheEntity, entity, {latest: true})
    }
}

/**
 * save the pair of original-image-uri and final-cache-path
 * @param originalUri
 * @param cachePath
 * @returns {Promise<void>}
 * @private
 */
const _saveCacheKey = async (originalUri, cachePath) => {
    await _syncStorage2CacheEntity().catch(e => printLog(e))
    const {cacheMap = {}} = cacheEntity
    cacheMap[originalUri] = cachePath
    await _syncCacheEntity2Storage().catch(e => printLog(e))
}

/**
 * sync save CacheEntity to storage
 * @returns {Promise<void>}
 * @private
 */
const _syncCacheEntity2Storage = async () => {
    if (cacheEntity) {
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(cacheEntity)).catch(e => printLog(e))
    }
}

/**
 * get image type
 * @param response
 * @returns {string}
 * @private
 */
const _getImageExtension = (response) => {
    const info = response.info() || {}
    const contentType = info.headers['Content-Type'] || ''
    const matchResult = contentType.match(/image\/(png|jpg|jpeg|bmp|gif|webp|psd);/i)
    return matchResult && matchResult.length >= 2 ? matchResult[1] : 'png'
}

/**
 * register cache image service
 * @returns {Promise<void>}
 */
const register = async (cacheConfig) => {
    _createTmpDir().then().catch(e => printLog(e))
    Object.assign(config, cacheConfig || {})
    let entity = await AsyncStorage.getItem(STORAGE_KEY).catch(e => printLog(e))
    if (entity) {
        try {
            entity = JSON.parse(entity)
        } catch (e) {
            entity = {}
        }
    } else {
        entity = {}
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(entity)).catch(e => printLog(e))
    }
    Object.assign(cacheEntity, entity, {latest: true})
}

const unregister = async () => {
    for (let key in taskList) {
        try {
            taskList[key].cancel()
        } catch (e) {
            printLog(e)
        }
    }
}

/**
 * get all files Recursively
 * @param path
 * @returns {Promise<*>}
 */
const getFiles = async (path) => {
    const exists = await fs.exists(path).catch(() => [])
    if (!exists) return []
    const isDir = await fs.isDir(path).catch(() => false)
    if (isDir) {
        const files = await fs.lstat(path)
        if (!files || files.length === 0) return []
        const tasks = []
        for (const file of files) {
            if (file.type === 'file') {
                tasks.push(file)
            } else {
                tasks.push(getFiles(file.path))
            }
        }
        const filesArr = await Promise.all(tasks)
        let allfiles = []
        for (const f of filesArr) {
            allfiles = allfiles.concat(f)
        }
        return allfiles
    } else {
        return [await fs.stat(path)]
    }
}

/**
 * get the cache size. unit:bytes
 * @returns {Promise<number>}
 */
const getCacheSize = async () => {
    const path = getImagesCacheDirectory()
    const files = await getFiles(path)
    if (!files || files.length === 0) return 0
    let size = 0
    for (let file of files) {
        size += parseInt(file.size)
    }
    return size
}

/**
 * get cache size with format
 * @returns {Promise<string>}
 */
const getCacheSizeFormat = async () => {
    const size = await getCacheSize()
    if (size < 1024 * 1024) {
        return `${parseInt(size / 1024)}KB`
    } else {
        return `${Number(size / (1024 * 1024)).toFixed(2)}MB`
    }
}

/**
 * clear cache
 * @returns {Promise<void>}
 */
const clearCache = async () => {
    const path = getImagesCacheDirectory()
    await fs.unlink(path).catch(e => printLog(e))
    await fs.mkdir(path).catch(e => printLog(e))
    cacheEntity.latest = true
    cacheEntity.cacheMap = {}
    try {
        for (let key in downloading) {
            delete downloading[key]
        }
    } catch (e) {
        printLog(e)
    }

    await _syncCacheEntity2Storage().catch(e => printLog(e))
}

const event = {
    render: 'cacheimage_event_render_image',
}

const pattern = {
    remoteUri: /^(http[s]?)/i
}

const printLog = (v) => {
    if (process.env.NODE_ENV !== 'production') console.log(v)
}

export default {
    register,
    unregister,
    getCacheSize,
    getCacheSizeFormat,
    clearCache,
    getImagePath,
    event,
    pattern,
    printLog,
}